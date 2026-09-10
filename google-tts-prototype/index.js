const {GoogleAuth}=require("google-auth-library");
const {createHash}=require("crypto");

const MODEL="gemini-3.1-flash-tts-preview";
const LANGUAGE_CODE="ja-JP";
const VOICE="Achernar";
const CACHE_VERSION=`${MODEL}:${VOICE}:v1`;
const ALLOWED_ORIGIN="https://feiwangliu.github.io";
const MAX_BODY_BYTES=20000;
const MAX_CLIPS=12;
const MAX_FULL_TEXT_LENGTH=1800;
const MAX_SENTENCE_TEXT_LENGTH=400;
const MAX_TOTAL_TEXT_LENGTH=3500;
const STYLE=`Japanese woman, late 30s to early 40s. Native Tokyo Japanese. Confident, grounded, and conversational. A clear, crisp, lively voice with a slightly lower-to-mid pitch. The tone should feel bright and clean rather than soft, muffled, breathy, or husky. Clear consonant attacks and articulate speech, while keeping the phrasing smooth and naturally connected. Speak at a normal everyday volume with relaxed confidence. Natural Japanese rhythm, pitch movement, and conversational emphasis. Speak casually and comfortably to a friend she knows well. Normal conversational speed. Sound engaged and expressive, especially when the speaker has an opinion or finds something amusing. Not timid, shy, hesitant, breathy, overly gentle, cute, husky, theatrical, or overly polished. Not a narrator, presenter, anime character, or language teacher.`;
const auth=new GoogleAuth({scopes:["https://www.googleapis.com/auth/cloud-platform"]});

function setCors(req,res){
  const origin=req.get("origin");
  if(origin===ALLOWED_ORIGIN)res.set("Access-Control-Allow-Origin",origin);
  res.set("Vary","Origin");
  res.set("Access-Control-Allow-Methods","POST, OPTIONS");
  res.set("Access-Control-Allow-Headers","Content-Type");
  res.set("Cache-Control","no-store");
}

async function synthesize(text){
  const client=await auth.getClient();
  const response=await client.request({
    url:"https://texttospeech.googleapis.com/v1/text:synthesize",
    method:"POST",
    data:{
      input:{text,prompt:STYLE},
      voice:{languageCode:LANGUAGE_CODE,name:VOICE,modelName:MODEL},
      audioConfig:{audioEncoding:"MP3"}
    }
  });
  if(!response.data?.audioContent)throw new Error("Google TTS returned no audio");
  return response.data.audioContent;
}

function requestError(message,status=400){const error=new Error(message);error.status=status;return error;}
function validateRequest(req){
  const contentLength=Number(req.get("content-length")||0);
  if(contentLength>MAX_BODY_BYTES)throw requestError("Request too large",413);
  const body=req.body;
  if(!body||typeof body!=="object"||Array.isArray(body))throw requestError("Invalid request");
  if(Buffer.byteLength(JSON.stringify(body))>MAX_BODY_BYTES)throw requestError("Request too large",413);
  if(Object.keys(body).some(key=>!["passageId","clips"].includes(key)))throw requestError("Unexpected request field");
  if(typeof body.passageId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(body.passageId))throw requestError("Invalid passageId");
  if(!Array.isArray(body.clips)||!body.clips.length||body.clips.length>MAX_CLIPS)throw requestError("Invalid clips");
  const seen=new Set();let fullCount=0,totalLength=0;
  const clips=body.clips.map(clip=>{
    if(!clip||typeof clip!=="object"||Array.isArray(clip))throw requestError("Invalid clip");
    if(Object.keys(clip).some(key=>!["clipId","kind","text"].includes(key)))throw requestError("Unexpected clip field");
    if(!["full","sentence"].includes(clip.kind))throw requestError("Invalid clip kind");
    if(typeof clip.text!=="string"||!clip.text.trim()||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(clip.text)||!/[\u3040-\u30ff\u3400-\u9fff]/u.test(clip.text))throw requestError("Invalid Japanese text");
    const expectedClipId=`${clip.kind}:${createHash("sha256").update(clip.text).digest("hex")}`;
    if(clip.clipId!==expectedClipId||seen.has(clip.clipId))throw requestError("Invalid clipId");
    const maximum=clip.kind==="full"?MAX_FULL_TEXT_LENGTH:MAX_SENTENCE_TEXT_LENGTH;
    if(clip.text.length>maximum)throw requestError("Text too long",413);
    if(clip.kind==="full"&&++fullCount>1)throw requestError("Only one full clip is allowed");
    seen.add(clip.clipId);totalLength+=clip.text.length;
    return {clipId:clip.clipId,kind:clip.kind,text:clip.text};
  });
  if(totalLength>MAX_TOTAL_TEXT_LENGTH)throw requestError("Total text too long",413);
  return {passageId:body.passageId,clips};
}

exports.generateShadowingAudio=async(req,res)=>{
  setCors(req,res);
  if(req.method==="OPTIONS")return res.status(204).send("");
  if(req.get("origin")!==ALLOWED_ORIGIN)return res.status(403).json({error:"Origin not allowed"});
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  let request;
  try{request=validateRequest(req);}catch(error){return res.status(error.status||400).json({error:error.message});}
  try{
    const clips=await Promise.all(request.clips.map(async clip=>{
      try{return {clipId:clip.clipId,audio:await synthesize(clip.text)};}
      catch(error){console.error("TTS clip failed",request.passageId,clip.clipId,error.message);return {clipId:clip.clipId,error:"Generation failed"};}
    }));
    return res.json({version:CACHE_VERSION,mimeType:"audio/mpeg",clips});
  }catch(error){
    console.error("TTS generation failed",error.message);
    return res.status(502).json({error:"Natural speech generation failed"});
  }
};
