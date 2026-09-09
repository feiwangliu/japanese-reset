const {GoogleAuth}=require("google-auth-library");

const MODEL="gemini-3.1-flash-tts-preview";
const LANGUAGE_CODE="ja-JP";
const VOICE="Achernar";
const CACHE_VERSION=`${MODEL}:${VOICE}:v1`;
const ALLOWED_ORIGIN="https://feiwangliu.github.io";
const STYLE=`Japanese woman, late 30s to early 40s. Native Tokyo Japanese. Confident, grounded, and conversational. A clear, crisp, lively voice with a slightly lower-to-mid pitch. The tone should feel bright and clean rather than soft, muffled, breathy, or husky. Clear consonant attacks and articulate speech, while keeping the phrasing smooth and naturally connected. Speak at a normal everyday volume with relaxed confidence. Natural Japanese rhythm, pitch movement, and conversational emphasis. Speak casually and comfortably to a friend she knows well. Normal conversational speed. Sound engaged and expressive, especially when the speaker has an opinion or finds something amusing. Not timid, shy, hesitant, breathy, overly gentle, cute, husky, theatrical, or overly polished. Not a narrator, presenter, anime character, or language teacher.`;
const PASSAGE={
  id:"real-breakfast",
  full:"うちの子は、朝はあまり食欲がありません。おにぎりを半分食べる日もあれば、チキンを二つだけ食べる日もあります。学校で十時半におやつが出るので、朝ごはんは無理にたくさん食べさせていません。昼ごはんと夜ごはんはよく食べるので、今はそれでいいかなと思っています。",
  sentences:[
    "うちの子は、朝はあまり食欲がありません。",
    "おにぎりを半分食べる日もあれば、チキンを二つだけ食べる日もあります。",
    "学校で十時半におやつが出るので、朝ごはんは無理にたくさん食べさせていません。",
    "昼ごはんと夜ごはんはよく食べるので、今はそれでいいかなと思っています。"
  ]
};
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

exports.generateShadowingAudio=async(req,res)=>{
  setCors(req,res);
  if(req.method==="OPTIONS")return res.status(204).send("");
  if(req.get("origin")!==ALLOWED_ORIGIN)return res.status(403).json({error:"Origin not allowed"});
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(req.body?.passageId!==PASSAGE.id)return res.status(400).json({error:"Unknown passage"});
  try{
    const [full,...sentences]=await Promise.all([PASSAGE.full,...PASSAGE.sentences].map(synthesize));
    return res.json({version:CACHE_VERSION,mimeType:"audio/mpeg",full,sentences});
  }catch(error){
    console.error("TTS generation failed",error.message);
    return res.status(502).json({error:"Natural speech generation failed"});
  }
};
