const STORAGE_KEY = "japanese-reset-reports-v1";
const STATE_KEY = "japanese-reset-state-v1";

const sampleReport = {
  date: "2026-07-30",
  duration: 28,
  score: 76,
  metrics: { fluency: 72, grammar: 74, vocabulary: 78, naturalness: 71 },
  topics: ["日常生活", "家务", "最近的状态"],
  words: [
    { japanese: "余裕（よゆう）", meaning: "余力，从容", example: "最近忙しくて、練習する余裕がなかった。" },
    { japanese: "通りかかる", meaning: "碰巧经过", example: "昨日、駅前を通りかかった。" },
    { japanese: "片づける", meaning: "整理，收拾", example: "週末に部屋を片づけたい。" },
    { japanese: "結局（けっきょく）", meaning: "结果，到头来", example: "結局、出前を頼んだ。" }
  ],
  patterns: [
    { pattern: "～ようと思ってたのに", meaning: "本来打算做，却没有实现", example: "今日はご飯を作ろうと思ってたのに、疲れすぎて出前を頼んだ。", translation: "本来今天打算做饭，但太累了就点了外卖。" },
    { pattern: "～ばいいかわからない", meaning: "不知道该怎么做", example: "どこに置けばいいかわからない。", translation: "不知道该放在哪里。" },
    { pattern: "～ようとしたら", meaning: "正准备做某事时", example: "出かけようとしたら、雨が降り出した。", translation: "正准备出门时，下起雨来了。" }
  ],
  errors: [
    { type: "动词表达", original: "目を覚めたら、もう一時間になった。", corrected: "目が覚めたら、もう1時間も経ってた。", note: "表示时间经过，用「時間が経つ」，不是「時間になる」。" },
    { type: "搭配", original: "ゴミを捨てて忘れてしまった。", corrected: "ゴミを出し忘れてた。", note: "「出し忘れる」表示忘记把垃圾拿出去扔。" },
    { type: "助词", original: "子どもは早起きが難しそうだ。", corrected: "子どもが朝早く起きるのが難しくなってきたみたい。", note: "描述孩子做某事逐渐变难，这个结构更自然。" }
  ],
  reflection: "今天能够围绕家务和最近的状态持续表达。主要问题不是不知道意思，而是开口时容易先按中文结构组织，导致动词搭配和助词不自然。已经会使用「～と思ってたのに」表达预期与结果的反差。",
  nextSteps: ["用今天的三个句型各说一个自己的真实例子", "重点复习「時間が経つ」和「出し忘れる」", "下次练习加入购物或孩子学校的真实话题"]
};

const reportPrompt = `请根据我们刚才的日语口语练习，生成一份可导入 Japanese Reset 的学习日报。

只输出合法 JSON，不要使用 Markdown 代码块，不要添加解释。严格使用以下结构：
{
  "date": "YYYY-MM-DD",
  "duration": 练习分钟数,
  "score": 0到100,
  "metrics": {
    "fluency": 0到100,
    "grammar": 0到100,
    "vocabulary": 0到100,
    "naturalness": 0到100
  },
  "topics": ["中文话题1", "中文话题2"],
  "words": [
    {
      "japanese": "日语单词，必要时附假名",
      "meaning": "中文意思",
      "example": "来自本次对话或贴近我生活的日语例句"
    }
  ],
  "patterns": [
    {
      "pattern": "核心日语句型",
      "meaning": "中文用法",
      "example": "自然日语例句",
      "translation": "中文翻译"
    }
  ],
  "errors": [
    {
      "type": "助词/语法/搭配/用词/表达结构",
      "original": "我实际说错或不自然的原句",
      "corrected": "自然口语修改句",
      "note": "简洁说明，不要对口语中过于细小的问题吹毛求疵"
    }
  ],
  "reflection": "100至180字中文复盘，说明本次能表达什么、真正卡在哪里、有什么进步",
  "nextSteps": ["下一次可直接执行的建议1", "建议2", "建议3"]
}

要求：
1. 只记录本次对话中真实出现的内容，不要虚构错误。
2. 单词选择真正值得复用的，每次3至8个。
3. 句型选择能迁移到日常生活的，每次2至5个。
4. 如果我的说法在日常口语中可以接受，不要为了书面标准强行纠正。
5. corrected 优先给日本人日常会说的版本。`;

const liveEndPrompt = `今天的口语训练结束。请根据刚才真实发生的对话，生成一份可导入 Japanese Reset 的学习日报。

只输出合法 JSON，不要使用 Markdown 代码块，不要添加解释。使用 Japanese Reset 标准日报字段，并额外加入：
"spokenSentences": [
  {
    "japanese": "我今天实际成功说出来的日语",
    "meaning": "中文意思"
  }
],
"stuckItems": [
  {
    "prompt": "当时想表达的中文意思或场景",
    "original": "我当时卡住、错误或不自然的实际表达",
    "corrected": "简单、正确、容易再次说出的版本",
    "note": "只说明真正影响理解的硬伤"
  }
],
"sessionMode": "场景训练/自由聊天/历史纠错",
"duration": 实际练习分钟数

要求：
1. 只记录我真实说过的内容，不要虚构句子或错误。
2. 如果我的说法正确且能理解，不要因为还有更地道的版本而判错。
3. corrected 优先给简单、正确、容易脱口而出的版本，不追求母语级表达。
4. spokenSentences 记录我真正独立说出来的句子。
5. stuckItems 只记录明显卡住或存在硬伤、值得下次重练的内容。
6. 其余字段继续包含 date、score、metrics、topics、words、patterns、errors、reflection、nextSteps。`;

let reports = load(STORAGE_KEY, []);
let state = load(STATE_KEY, { savedWords: [], savedPatterns: [], masteredWords: [], masteredErrors: [] });
let currentTab = "home";
let listFilter = "all";
let reviewIndex = 0;
let reviewRevealed = false;
let reviewQueue = [];
let phraseCategory = "全部";
let libraryMode = "words";
let librarySource = "personal";
let speakingIndex = 0;
let speakingRevealed = false;
let speakingMode = "scene";
let reflexIndex = 0;
let reflexRevealed = false;
let activeRecording = null;
let recordingChunks = [];
let playbackUrl = "";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}
function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function latest() { return reports[0]; }
function allItems(key) {
  const map = new Map();
  reports.forEach(report => (report[key] || []).forEach(item => {
    const id = key === "errors" ? `${item.original}|${item.corrected}` : item.japanese || item.pattern;
    if (!map.has(id)) map.set(id, { ...item, id, count: 1, date: report.date });
    else map.get(id).count += 1;
  }));
  return [...map.values()];
}
function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", { month:"long", day:"numeric", weekday:"short" }).format(new Date(`${date}T12:00:00`));
}
function todayText() {
  return new Intl.DateTimeFormat("zh-CN", { month:"long", day:"numeric", weekday:"short" }).format(new Date());
}
function render() {
  renderNav();
  const pages = { home: renderHome, live: renderLive, speaking: renderSpeaking, phrases: renderPhrases, errors: renderErrors, library: renderLibrary, me: renderMe };
  pages[currentTab]();
  window.scrollTo({ top:0, behavior:"instant" });
}
function renderNav() {
  const tabs = [
    ["home","🏠","首页"],["live","◉","Live陪练"],["speaking","🎙","今日开口"],["phrases","💬","场景"],["errors","🪄","纠错"],["library","🌿","词句"],["me","☕","记录"]
  ];
  document.getElementById("nav").innerHTML = tabs.map(([id, icon, label]) =>
    `<button class="nav-btn ${currentTab===id?"active":""}" onclick="go('${id}')"><span class="nav-icon">${icon}</span><span>${label}</span></button>`
  ).join("");
}
function go(tab) { currentTab = tab; listFilter = "all"; render(); }

function dailySpeakingItems() {
  const imported = reports.flatMap((r,ri)=>(r.stuckItems||[]).map((x,xi)=>({
    id:`imported-${r.date}-${ri}-${xi}`,
    group:"历史卡点",
    prompt:x.prompt || x.meaning || "把上次卡住的内容重新说一次。",
    simple:x.corrected || "",
    easy:x.corrected || "",
    lifelines:["～て……","で……","～んですが……"]
  })));
  const source = [...imported.slice(0,4), ...speakingPrompts];
  const now=new Date();
  const daySeed=now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate();
  const hash=id=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))%997,0);
  return source.sort((a,b)=>((hash(a.id)+daySeed)%101)-((hash(b.id)+daySeed)%101)).slice(0,10);
}

function dailyReflexItems(){
  const now=new Date();
  const seed=now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate();
  const hash=id=>[...id].reduce((n,c)=>(n*33+c.charCodeAt(0))%1009,0);
  const categories=["授受动词","て形连接","助词反射","固定搭配"];
  const picked=categories.flatMap(category=>reflexDrills.filter(x=>x.category===category).sort((a,b)=>((hash(a.id)+seed)%97)-((hash(b.id)+seed)%97)).slice(0,category==="固定搭配"?4:2));
  return picked.slice(0,10);
}

function renderSpeaking() {
  if(speakingMode==="reflex") return renderReflex();
  state.speakingRatings = state.speakingRatings || {};
  const items=dailySpeakingItems();
  if(speakingIndex>=items.length) speakingIndex=0;
  const p=items[speakingIndex];
  const completed=items.filter(x=>state.speakingRatings[x.id]).length;
  const rating=state.speakingRatings[p.id];
  document.getElementById("app").innerHTML=`<main class="page speaking-page">
    <div class="section-head speaking-top"><div><h1 class="page-title">今日开口</h1><p class="page-subtitle">意思说清楚、没有硬伤、卡住后能继续，就算通过。</p></div><span class="daily-count">${completed}/10</span></div>
    <div class="speaking-mode-tabs"><button class="active" onclick="setSpeakingMode('scene')">场景开口</button><button onclick="setSpeakingMode('reflex')">基础反射</button></div>
    <div class="daily-progress"><i style="width:${completed*10}%"></i></div>
    <section class="card speaking-card">
      <div class="speaking-meta"><span>${esc(p.group)}</span><b>${speakingIndex+1} / ${items.length}</b></div>
      <span class="speak-instruction">先不要看答案，直接用日语说</span>
      <h2>${esc(p.prompt)}</h2>
      <div class="lifeline-title">卡住时，可以从这里接下去</div>
      <div class="lifeline-row">${p.lifelines.map(x=>`<button onclick='showLifeline(${JSON.stringify(x)})'>${esc(x)}</button>`).join("")}<button onclick="openAllLifelines()">更多</button></div>
      <div id="lifeline-hint" class="lifeline-hint"></div>
      <div class="recorder">
        <button id="record-btn" class="record-btn" onclick="toggleRecording()">● 开始录音</button>
        <span id="record-status">建议说20至30秒，可以分成几个短句。</span>
      </div>
      <div id="playback-wrap">${playbackUrl?`<audio controls src="${playbackUrl}"></audio>`:""}</div>
      ${speakingRevealed?`<div class="answer-panel">
        <div class="answer-block primary-answer"><small>简单正确版｜做到这个程度就通过</small><p>${esc(p.easy)}</p><button class="mini-btn" onclick='speak(${JSON.stringify(p.easy)})'>▷ 听一遍</button></div>
        <details><summary>查看完整自然版，不要求背诵</summary><p>${esc(p.simple)}</p></details>
      </div>`:`<button class="secondary full reveal-answer" onclick="revealSpeaking()">我说完了，查看简单正确版</button>`}
      ${speakingRevealed?`<div class="self-check"><span>这次说得怎么样？</span><div><button class="${rating==="stuck"?"active":""}" onclick="rateSpeaking('stuck')">卡住了</button><button class="${rating==="finished"?"active":""}" onclick="rateSpeaking('finished')">说完了</button><button class="${rating==="instant"?"active":""}" onclick="rateSpeaking('instant')">脱口而出</button></div></div>`:""}
    </section>
    <div class="speaking-nav"><button class="secondary" onclick="moveSpeaking(-1)">上一题</button><button class="primary" onclick="moveSpeaking(1)">下一题</button></div>
  </main>`;
}

function renderReflex(){
  state.reflexRatings=state.reflexRatings||{};
  const items=dailyReflexItems();
  if(reflexIndex>=items.length)reflexIndex=0;
  const p=items[reflexIndex],rating=state.reflexRatings[p.id];
  const completed=items.filter(x=>state.reflexRatings[x.id]).length;
  document.getElementById("app").innerHTML=`<main class="page speaking-page">
    <div class="section-head speaking-top"><div><h1 class="page-title">今日开口</h1><p class="page-subtitle">不背大长句，把基础结构练成不用思考的口腔反射。</p></div><span class="daily-count">${completed}/10</span></div>
    <div class="speaking-mode-tabs"><button onclick="setSpeakingMode('scene')">场景开口</button><button class="active" onclick="setSpeakingMode('reflex')">基础反射</button></div>
    <div class="daily-progress"><i style="width:${completed*10}%"></i></div>
    <section class="card reflex-card">
      <div class="speaking-meta"><span>${esc(p.category)}</span><b>${reflexIndex+1} / ${items.length}</b></div>
      <span class="speak-instruction">看中文，尽量马上说出日语</span>
      <h2>${esc(p.prompt)}</h2>
      ${reflexRevealed?`<div class="answer-panel"><div class="answer-block primary-answer"><small>简单正确版</small><p>${esc(p.answer)}</p><button class="mini-btn" onclick='speak(${JSON.stringify(p.answer)})'>▷ 听一遍</button></div><div class="reflex-note">${esc(p.note)}</div></div>`:`<button class="secondary full reveal-answer" onclick="revealReflex()">我说完了，查看答案</button>`}
      ${reflexRevealed?`<div class="self-check"><span>这次需要想多久？</span><div><button class="${rating==="stuck"?"active":""}" onclick="rateReflex('stuck')">需要想很久</button><button class="${rating==="finished"?"active":""}" onclick="rateReflex('finished')">能说出来</button><button class="${rating==="instant"?"active":""}" onclick="rateReflex('instant')">脱口而出</button></div></div>`:""}
    </section>
    <div class="speaking-nav"><button class="secondary" onclick="moveReflex(-1)">上一题</button><button class="primary" onclick="moveReflex(1)">下一题</button></div>
    <section class="card reflex-overview"><div><b>${reflexDrills.filter(x=>x.category==="授受动词").length}</b><span>授受动词</span></div><div><b>${reflexDrills.filter(x=>x.category==="て形连接").length}</b><span>て形连接</span></div><div><b>${reflexDrills.filter(x=>x.category==="助词反射").length}</b><span>助词</span></div><div><b>${reflexDrills.filter(x=>x.category==="固定搭配").length}</b><span>固定搭配</span></div></section>
  </main>`;
}
function setSpeakingMode(mode){speakingMode=mode;speakingRevealed=false;reflexRevealed=false;renderSpeaking()}
function revealReflex(){reflexRevealed=true;renderReflex()}
function moveReflex(step){reflexIndex=(reflexIndex+step+dailyReflexItems().length)%dailyReflexItems().length;reflexRevealed=false;renderReflex()}
function rateReflex(rating){
  const p=dailyReflexItems()[reflexIndex];
  state.reflexRatings=state.reflexRatings||{};state.reflexRatings[p.id]=rating;persist();
  setTimeout(()=>moveReflex(1),180);
}

function revealSpeaking(){speakingRevealed=true;renderSpeaking()}
function moveSpeaking(step){
  speakingIndex=(speakingIndex+step+dailySpeakingItems().length)%dailySpeakingItems().length;
  speakingRevealed=false; stopRecordingIfNeeded(); renderSpeaking();
}
function rateSpeaking(rating){
  const p=dailySpeakingItems()[speakingIndex];
  state.speakingRatings=state.speakingRatings||{};
  state.speakingRatings[p.id]=rating; persist();
  setTimeout(()=>moveSpeaking(1),180);
}
function showLifeline(word){
  const item=lifelineWords.find(x=>x.word===word);
  document.getElementById("lifeline-hint").innerHTML=item?`<b>${esc(item.word)}</b> ${esc(item.hint)}<small>${esc(item.example)}</small>`:"";
}
function openAllLifelines(){
  document.getElementById("modal-root").innerHTML=`<div class="modal-backdrop" onclick="backdropClose(event)"><section class="modal"><div class="modal-handle"></div><div class="modal-head"><h2>口语续命连接词</h2><button class="close-btn" onclick="closeModal()">×</button></div><p class="modal-copy">不需要组成漂亮的长句。选一个接下去，把意思说完。</p><div class="lifeline-library">${lifelineWords.map(x=>`<button onclick='useLifelineFromModal(${JSON.stringify(x.word)})'><b>${esc(x.word)}</b><span>${esc(x.hint)}</span><small>${esc(x.example)}</small></button>`).join("")}</div></section></div>`;
}
function useLifelineFromModal(word){closeModal();showLifeline(word)}

function liveSetupFields(){
  return `<p class="page-subtitle">Japanese Reset负责安排与复盘，ChatGPT Live负责自然发音、追问和即时纠错。</p>
    <label class="field-label">训练模式</label>
    <div class="choice-grid mode-choice">
      <button class="active" data-value="场景训练" onclick="selectLiveChoice(this,'mode-choice')">场景训练<small>围绕真实生活完成任务</small></button>
      <button data-value="自由聊天" onclick="selectLiveChoice(this,'mode-choice')">自由聊天<small>围绕近况自然追问</small></button>
      <button data-value="历史纠错" onclick="selectLiveChoice(this,'mode-choice')">历史纠错<small>重说以前卡住的内容</small></button>
    </div>
    <label class="field-label">练习时长</label>
    <div class="choice-grid duration-choice">
      <button data-value="5" onclick="selectLiveChoice(this,'duration-choice')">5分钟</button>
      <button class="active" data-value="10" onclick="selectLiveChoice(this,'duration-choice')">10分钟</button>
      <button data-value="20" onclick="selectLiveChoice(this,'duration-choice')">20分钟</button>
    </div>
    <label class="field-label" for="live-goal">今天特别想练什么</label>
    <input id="live-goal" class="text-input" placeholder="可以不填，例如：孩子学校、最近的生活">
    <div id="live-message" class="message"></div>
    <div class="live-primary-actions"><button class="primary" onclick="copyLiveTask()">1. 复制今日任务</button><button class="secondary" onclick="openChatGPTProject()">2. 打开ChatGPT</button></div>
    <section class="live-howto"><b>进入【上进吧】以后</b><p>粘贴任务，启动Voice，直接开始说。ChatGPT会等待你的停顿，只纠正影响理解的硬伤。</p></section>
    <div class="end-session-box"><b>练习结束以后</b><p>复制结束指令发给ChatGPT，它会生成包含真实表达和卡点的日报JSON。</p><button class="mini-btn" onclick="copyLiveEndPrompt()">3. 复制结束复盘指令</button><button class="mini-btn" onclick="openImport()">4. 导入复盘JSON</button></div>`;
}
function renderLive(){
  document.getElementById("app").innerHTML=`<main class="page live-page">
    <div class="live-hero"><span>CHATGPT LIVE × JAPANESE RESET</span><h1>真实语音陪练</h1><p>不追求母语级表达。说清楚、接得下去、没有硬伤，就算通过。</p></div>
    <section class="card live-config">${liveSetupFields()}</section>
    <section class="card live-standard"><h2>本次陪练标准</h2><div><span>1</span><p><b>先让你说完</b>停顿3至5秒，不马上替你回答。</p></div><div><span>2</span><p><b>卡住只给一个提示</b>用续命连接词帮助你接下去。</p></div><div><span>3</span><p><b>只纠真正的硬伤</b>正确且能理解的表达直接通过。</p></div></section>
  </main>`;
}
function selectLiveChoice(button,className){
  document.querySelectorAll(`.${className} button`).forEach(x=>x.classList.remove("active"));
  button.classList.add("active");
}
function getLiveConfig(){
  return {
    mode:document.querySelector(".mode-choice button.active")?.dataset.value||"场景训练",
    duration:document.querySelector(".duration-choice button.active")?.dataset.value||"10",
    goal:document.getElementById("live-goal")?.value.trim()||""
  };
}
function buildLiveTask(config){
  const daily=dailySpeakingItems().slice(0,config.duration==="5"?4:config.duration==="20"?10:7);
  const weak=reports.flatMap(r=>r.stuckItems||[]).slice(0,5);
  const modeNotes={
    "场景训练":"使用下面的生活场景逐步与我对话。不要让我翻译标准答案，要像真实交流一样追问。",
    "自由聊天":"从我的近况开始自然聊天，根据我的回答继续追问，不要把对话变成考试。",
    "历史纠错":"优先让我重新表达过去卡住或说错的内容，但不要先展示答案。"
  };
  return `开始今天的 Japanese Reset 日语口语训练。

训练模式：${config.mode}
训练时长：约${config.duration}分钟
今天的目标：${config.goal||"正确、顺利地把意思说出来"}

你的教学标准：
1. 主要用日语和我交流，难度控制在N3以内。
2. 我的目标不是母语级自然，而是正确、顺利、能让人听懂。
3. 我停顿时先等3至5秒，不要马上替我回答。
4. 如果我卡住，只给一个关键词或续命连接词，例如「で」「でも」「～て」「～んですが」「結局」。
5. 接受我把一个意思拆成几个短句，不要求完整漂亮的长句。
6. 不要打断每个小错误。等我把意思说完，只纠正影响理解的硬伤。
7. 纠错时先肯定我已经表达清楚的部分，再给一个简单正确版，让我立即重新说一次。
8. 不要一次讲很多语法，不要连续给多个更地道版本。
9. 每次只问一个问题，听完我的回答再继续。
10. ${modeNotes[config.mode]}

可使用的今日场景：
${daily.map((x,i)=>`${i+1}. ${x.prompt}`).join("\n")}

${weak.length?`最近仍然卡住的内容：\n${weak.map((x,i)=>`${i+1}. ${x.prompt}｜简单正确版：${x.corrected}`).join("\n")}`:""}

现在直接用日语开始，不要复述这些规则，也不要先解释课程安排。`;
}
async function copyLiveTask(){
  const config=getLiveConfig();
  try{await navigator.clipboard.writeText(buildLiveTask(config));document.getElementById("live-message").textContent="今日陪练任务已复制";}
  catch{document.getElementById("live-message").textContent="复制失败，请检查浏览器权限";}
}
function openChatGPTProject(){
  window.open("https://chatgpt.com/","_blank","noopener");
}
async function copyLiveEndPrompt(){
  try{await navigator.clipboard.writeText(liveEndPrompt);toast("结束复盘指令已复制")}
  catch{toast("复制失败，请检查浏览器权限")}
}

async function toggleRecording(){
  if(activeRecording){activeRecording.stop();return}
  if(!navigator.mediaDevices?.getUserMedia) return toast("当前浏览器不支持录音");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    recordingChunks=[];
    const recorder=new MediaRecorder(stream);
    activeRecording=recorder;
    recorder.ondataavailable=e=>{if(e.data.size)recordingChunks.push(e.data)};
    recorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(playbackUrl) URL.revokeObjectURL(playbackUrl);
      playbackUrl=URL.createObjectURL(new Blob(recordingChunks,{type:recorder.mimeType||"audio/webm"}));
      activeRecording=null;renderSpeaking();
    };
    recorder.start();
    document.getElementById("record-btn").textContent="■ 停止录音";
    document.getElementById("record-btn").classList.add("recording");
    document.getElementById("record-status").textContent="正在录音。允许停顿，想办法继续说完。";
  }catch{toast("没有取得麦克风权限")}
}
function stopRecordingIfNeeded(){
  if(activeRecording){activeRecording.stop();activeRecording=null}
  if(playbackUrl){URL.revokeObjectURL(playbackUrl);playbackUrl=""}
}

function renderPhrases() {
  state.savedPhrases = state.savedPhrases || [];
  state.masteredPhrases = state.masteredPhrases || [];
  const categories = ["全部", ...new Set(phraseBank.map(x=>x.category))];
  const items = phraseCategory === "全部" ? phraseBank : phraseBank.filter(x=>x.category===phraseCategory);
  document.getElementById("app").innerHTML = `<main class="page phrase-page">
    <h1 class="page-title">场景表达</h1><p class="page-subtitle">基础表达负责快速应对。先把事情办明白，再逐步补充原因和细节。</p>
    <div class="phrase-summary"><div><strong>${phraseBank.length}</strong><span>常用表达</span></div><div><strong>${categories.length-1}</strong><span>生活场景</span></div><div><strong>${state.masteredPhrases.length}</strong><span>已经会说</span></div></div>
    <div class="category-scroll">${categories.map(x=>`<button class="${phraseCategory===x?"active":""}" onclick='setPhraseCategory(${JSON.stringify(x)})'>${esc(x)}</button>`).join("")}</div>
    <div class="phrase-list">${items.map(phraseCard).join("")}</div>
  </main>`;
}
function phraseCard(p) {
  const saved=state.savedPhrases.includes(p.id), mastered=state.masteredPhrases.includes(p.id);
  return `<article class="item-card phrase-card ${mastered?"mastered":""}">
    <span class="type-badge">${esc(p.category)}</span>
    <p class="jp-main">${esc(p.japanese)}</p><p class="meaning">${esc(p.meaning)}</p>
    <div class="item-actions"><button class="mini-btn" onclick='speak(${JSON.stringify(p.japanese)})'>▷ 听发音</button><button class="mini-btn ${saved?"saved":""}" onclick='togglePhrase("saved",${JSON.stringify(p.id)})'>${saved?"已收藏":"收藏"}</button><button class="mini-btn ${mastered?"mastered-btn":""}" onclick='togglePhrase("mastered",${JSON.stringify(p.id)})'>${mastered?"✓ 会说了":"标记会说"}</button></div>
  </article>`;
}
function setPhraseCategory(category){phraseCategory=category;renderPhrases()}
function togglePhrase(type,id){
  const key=type==="saved"?"savedPhrases":"masteredPhrases";
  state[key]=state[key]||[];
  state[key]=state[key].includes(id)?state[key].filter(x=>x!==id):[...state[key],id];
  persist();renderPhrases();
}

function renderLibrary(){
  const personalItems=allItems(libraryMode);
  const recommendedItems=libraryMode==="words"?recommendedWords:recommendedPatterns;
  const items=librarySource==="personal"?personalItems:recommendedItems;
  document.getElementById("app").innerHTML=`<main class="page">
    <h1 class="page-title">我的词句</h1><p class="page-subtitle">这里保存你在真实练习里遇到的个人词汇和可复用句型。</p>
    <div class="segmented source-tabs"><button class="${librarySource==="personal"?"active":""}" onclick="setLibrarySource('personal')">我的练习记录</button><button class="${librarySource==="recommended"?"active":""}" onclick="setLibrarySource('recommended')">推荐扩展词句</button></div>
    <div class="segmented"><button class="${libraryMode==="words"?"active":""}" onclick="setLibraryMode('words')">单词</button><button class="${libraryMode==="patterns"?"active":""}" onclick="setLibraryMode('patterns')">句型</button></div>
    <div class="library-count">共 ${items.length} 条</div><div id="library-content"></div>
  </main>`;
  document.getElementById("library-content").innerHTML=items.length
    ? items.map(libraryMode==="words"?wordCard:patternCard).join("")
    : emptyList(libraryMode==="words"?"这里暂时没有单词":"这里暂时没有句型");
}
function setLibraryMode(mode){libraryMode=mode;renderLibrary()}
function setLibrarySource(source){librarySource=source;renderLibrary()}

function renderHome() {
  const r = latest();
  if (!r) {
    document.getElementById("app").innerHTML = `<main class="page">
      <header class="topbar"><div class="hello"><small>${todayText()} · 今日も少しだけ</small><h1>こんばんは。</h1></div><div class="avatar">日</div></header>
      <section class="card quote"><span class="label">TODAY'S LINE · 今日のひとこと</span><blockquote>話せなかったのではなく、まだ口から出てこなかっただけ。</blockquote><p>不是不会，只是这次还没有从嘴里出来。</p></section>
      <section class="card empty"><div class="empty-mark">話</div><h2>第一份学习记录，从这里开始</h2><p>完成一次 ChatGPT 日语口语练习后，让它按固定模板生成日报，再粘贴导入。单词、句型和真实犯过的错误会自动沉淀下来。</p><button class="primary full" onclick="openImport()">导入第一次练习</button><button class="secondary full" style="margin-top:9px" onclick="loadDemo()">先看看演示数据</button></section>
    </main>`;
    return;
  }
  const words = allItems("words"), patterns = allItems("patterns"), errors = allItems("errors");
  const totalMinutes = reports.reduce((n,item)=>n+Number(item.duration||0),0);
  const completedPlans = (state.planChecks || []).filter(Boolean).length;
  const stage = reports.length < 5 ? "重新开口" : reports.length < 15 ? "建立语感" : "自然表达";
  const stageProgress = Math.min(100, reports.length < 5 ? reports.length * 20 : reports.length < 15 ? (reports.length-5)*10 : 100);
  document.getElementById("app").innerHTML = `<main class="page">
    <header class="topbar workspace-head"><div class="hello"><small>${todayText()} · 今日も少しだけ</small><h1>我的日语工作台</h1></div><div class="header-badges"><span>🔥 ${reports.length}</span><span>⭐ ${words.length + patterns.length}</span><div class="avatar">日</div></div></header>
    <div class="date-line"><span class="dot"></span>已整理 ${reports.length} 次练习 · 累计开口 ${totalMinutes} 分钟</div>
    <section class="card daily-start" onclick="go('speaking')">
      <div><span class="tiny-label">TODAY'S SPEAKING</span><h2>今天开口10次</h2><p>不追求完美。意思说清楚，卡住后能接下去，就算完成。</p></div>
      <button class="primary">开始训练</button>
    </section>

    <section class="card stage-card">
      <div class="section-head"><h2>🌱 我的成长阶段</h2><button class="text-btn" onclick="go('me')">查看成长记录 ›</button></div>
      <div class="stage-grid">
        <div class="stage-step done"><span>🌰</span><b>唤醒日语</b><small>找回熟悉的声音</small></div>
        <div class="stage-step active"><span>🌱</span><b>${stage}</b><small>当前阶段</small></div>
        <div class="stage-step"><span>🌿</span><b>自在交流</b><small>让表达更自然</small></div>
      </div>
      <div class="stage-progress"><i style="width:${stageProgress}%"></i></div>
      <p class="stage-copy">现在不追求一次说得完美，而是把想说的话稳定地说出来。</p>
    </section>

    <div class="workbench-grid">
      <section class="card focus-card">
        <div class="section-head"><h2>📌 本次重点</h2><span class="soft-label">${formatDate(r.date)}</span></div>
        <div class="focus-tags">
          <span>💬 ${esc(r.topics[0] || "日常表达")}</span>
          <span>🌿 ${r.words.length} 个新词</span>
          <span>🧩 ${r.patterns.length} 个句型</span>
          <span>🪄 ${r.errors.length} 项纠错</span>
        </div>
      </section>
      <section class="card today-card">
        <div class="section-head"><h2>📝 今日计划</h2><strong>${completedPlans}/${Math.min(3,r.nextSteps.length)}</strong></div>
        <div class="plan-progress"><i style="width:${Math.round(completedPlans/Math.max(1,Math.min(3,r.nextSteps.length))*100)}%"></i></div>
        ${r.nextSteps.slice(0,3).map((x,i)=>`<button class="plan-row ${(state.planChecks||[])[i]?"checked":""}" onclick="togglePlan(${i})"><span>${(state.planChecks||[])[i]?"✓":""}</span><b>${esc(x)}</b></button>`).join("")}
      </section>
    </div>

    <section class="card quote compact-quote"><span class="label">TODAY'S LINE · 今日のひとこと</span><blockquote>少しずつ、口から戻す。</blockquote><p>一点一点，把日语重新叫回来。</p></section>
    ${(r.spokenSentences||[]).length?`<section class="card spoken-output"><div class="section-head"><h2>本次真正说出来的句子</h2><span class="soft-label">${r.spokenSentences.length}句</span></div>${r.spokenSentences.slice(0,4).map(x=>`<div><b>${esc(x.japanese)}</b><span>${esc(x.meaning||"")}</span></div>`).join("")}</section>`:""}
    <section class="card">
      <div class="section-head"><h2>📊 最近一次学习概览</h2><button class="text-btn" onclick="go('me')">成长记录 ›</button></div>
      <div class="overview-grid">
        <div class="score-ring" style="--score:${r.score}%"><div><strong>${r.score}</strong><span>综合评分</span></div></div>
        <div class="score-items">${metric("流利度",r.metrics.fluency)}${metric("语法",r.metrics.grammar)}${metric("词汇",r.metrics.vocabulary)}${metric("自然度",r.metrics.naturalness)}</div>
      </div>
      <div class="session-meta"><div><strong>${r.duration}<small>m</small></strong><span>开口时间</span></div><div><strong>${r.words.length}</strong><span>新单词</span></div><div><strong>${r.errors.length}</strong><span>真实纠错</span></div></div>
    </section>
    <section class="card"><div class="section-head"><h2>💬 本次对话主题</h2></div><div class="tag-row">${r.topics.map(x=>`<span class="tag"># ${esc(x)}</span>`).join("")}</div></section>
    <section class="card learning-card">
      <div class="learning-row" onclick="libraryMode='words';go('library')"><div class="learning-icon">🌱</div><div><b>${words.length} 个个人单词</b><p>${words.slice(0,3).map(x=>x.japanese).join(" · ")}</p></div><span class="arrow">›</span></div>
      <div class="learning-row" onclick="libraryMode='patterns';go('library')"><div class="learning-icon">🧩</div><div><b>${patterns.length} 个自然句型</b><p>${patterns.slice(0,2).map(x=>x.pattern).join(" · ")}</p></div><span class="arrow">›</span></div>
      <div class="learning-row" onclick="go('errors')"><div class="learning-icon">🪄</div><div><b>${errors.length} 项真实纠错</b><p>${errors.slice(0,3).map(x=>x.type).join(" · ")}</p></div><span class="arrow">›</span></div>
    </section>
    <div class="dashboard-columns">
      <section class="card reflection"><span class="tiny-label">🪞 本次整体复盘</span><p>${esc(r.reflection)}</p></section>
      <section class="card suggestion"><span class="tiny-label">🌙 下一次学习建议</span><ul>${r.nextSteps.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>
    </div>
    <button class="floating-import" aria-label="导入新日报" onclick="openImport()">＋</button>
  </main>`;
}
function metric(name,value) {
  return `<div class="metric"><div class="metric-head"><span>${name}</span><b>${value}</b></div><div class="track"><i style="width:${value}%"></i></div></div>`;
}

function togglePlan(index) {
  state.planChecks = state.planChecks || [];
  state.planChecks[index] = !state.planChecks[index];
  persist();
  renderHome();
}

function renderWords() {
  const items = allItems("words");
  const shown = listFilter === "saved" ? items.filter(x=>state.savedWords.includes(x.id)) :
    listFilter === "review" ? items.filter(x=>!state.masteredWords.includes(x.id)) : items;
  document.getElementById("app").innerHTML = `<main class="page">
    <h1 class="page-title">我的单词</h1><p class="page-subtitle">不是背一份通用词表，只留下你真正想说却没说出来的词。</p>
    <div class="segmented">${filterBtn("all","全部")}${filterBtn("review","待复习")}${filterBtn("saved","已收藏")}</div>
    ${shown.length ? shown.map(wordCard).join("") : emptyList("这里暂时没有单词")}
    ${items.length ? `<button class="primary full" onclick="startReview()">开始复习 ${items.filter(x=>!state.masteredWords.includes(x.id)).length} 个单词</button>` : ""}
  </main>`;
}
function wordCard(w) {
  return `<article class="item-card"><div class="item-top"><div><p class="jp-main">${esc(w.japanese)}</p><p class="meaning">${esc(w.meaning)}</p></div><span class="count-pill">${w.count?`出现 ${w.count} 次`:esc(w.category||"推荐")}</span></div>
    <div class="item-note">${esc(w.example)}</div><div class="item-actions"><button class="mini-btn" onclick='speak(${JSON.stringify(w.japanese)})'>▷ 听发音</button><button class="mini-btn ${state.savedWords.includes(w.id)?"saved":""}" onclick='toggleSaved("word",${JSON.stringify(w.id)})'>${state.savedWords.includes(w.id)?"已收藏":"收藏"}</button></div></article>`;
}
function filterBtn(id,label) { return `<button class="${listFilter===id?"active":""}" onclick="setFilter('${id}')">${label}</button>`; }
function setFilter(id) { listFilter=id; render(); }

function renderErrors() {
  let items = allItems("errors");
  const types = ["all", ...new Set(items.map(x=>x.type))];
  if (listFilter !== "all") items = items.filter(x=>x.type===listFilter);
  document.getElementById("app").innerHTML = `<main class="page">
    <h1 class="page-title">真实纠错</h1><p class="page-subtitle">只记录你在对话中真正犯过的错误。看见重复模式，比一次改对更重要。</p>
    <div class="segmented">${types.slice(0,4).map((x,i)=>filterBtn(x,i===0?"全部":x)).join("")}</div>
    ${items.length ? items.map(errorCard).join("") : emptyList("这里暂时没有纠错记录")}
  </main>`;
}
function errorCard(e) {
  return `<article class="item-card"><span class="type-badge">${esc(e.type)}</span><span class="count-pill" style="float:right">出现 ${e.count} 次</span>
    <div class="original"><small>你当时的表达</small>${esc(e.original)}</div>
    <div class="corrected"><small>更自然的说法</small>${esc(e.corrected)}</div>
    <div class="item-note">${esc(e.note)}</div><div class="item-actions"><button class="mini-btn" onclick='speak(${JSON.stringify(e.corrected)})'>▷ 听自然表达</button></div></article>`;
}

function renderPatterns() {
  let items = allItems("patterns");
  if (listFilter === "saved") items = items.filter(x=>state.savedPatterns.includes(x.id));
  document.getElementById("app").innerHTML = `<main class="page">
    <h1 class="page-title">我的句型</h1><p class="page-subtitle">把说过的话变成可以反复调用的表达结构，而不是用完就消失。</p>
    <div class="segmented">${filterBtn("all","全部句型")}${filterBtn("saved","已收藏")}</div>
    ${items.length ? items.map(patternCard).join("") : emptyList("这里暂时没有句型")}
  </main>`;
}
function patternCard(p) {
  return `<article class="item-card"><div class="item-top"><div><p class="jp-main">${esc(p.pattern)}</p><p class="meaning">${esc(p.meaning)}</p></div><span class="count-pill">${p.count?`出现 ${p.count} 次`:esc(p.category||"推荐")}</span></div>
    <div class="pattern-example"><b>${esc(p.example)}</b><span>${esc(p.translation)}</span></div>
    <div class="item-actions"><button class="mini-btn" onclick='speak(${JSON.stringify(p.example)})'>▷ 听例句</button><button class="mini-btn ${state.savedPatterns.includes(p.id)?"saved":""}" onclick='toggleSaved("pattern",${JSON.stringify(p.id)})'>${state.savedPatterns.includes(p.id)?"已收藏":"收藏"}</button></div></article>`;
}

function renderMe() {
  const totalMinutes = reports.reduce((n,r)=>n+Number(r.duration||0),0);
  const avg = reports.length ? Math.round(reports.reduce((n,r)=>n+Number(r.score||0),0)/reports.length) : 0;
  document.getElementById("app").innerHTML = `<main class="page">
    <h1 class="page-title">成长记录</h1><p class="page-subtitle">语言进步很少发生在一夜之间。这里保存每一次开口留下的证据。</p>
    <section class="card progress-card"><span class="tiny-label" style="color:#d8e4db">JAPANESE RESET</span><h2>${totalMinutes} min</h2><p>共完成 ${reports.length} 次练习 · 平均评分 ${avg}</p></section>
    <section class="card"><div class="section-head"><h2>练习记录</h2><button class="text-btn" onclick="openPrompt()">日报模板</button></div>
      ${reports.length ? reports.map(historyRow).join("") : `<p class="page-subtitle">还没有导入练习记录。</p>`}
    </section>
    <button class="primary full" onclick="openImport()">导入新的学习日报</button>
    <button class="secondary full" style="margin-top:9px" onclick="openPrompt()">复制 ChatGPT 日报提示词</button>
  </main>`;
}
function historyRow(r) {
  const d = new Date(`${r.date}T12:00:00`);
  return `<div class="history-row"><div class="history-date"><span>${d.getMonth()+1}月</span><b>${d.getDate()}</b></div><div class="history-body"><b>${r.topics.join(" · ")}</b><p>${r.duration} 分钟 · ${(r.spokenSentences||[]).length} 句真实输出 · ${(r.stuckItems||[]).length} 项待重练 · 评分 ${r.score}</p></div></div>`;
}
function emptyList(text) { return `<section class="card empty"><div class="empty-mark">日</div><p>${text}</p></section>`; }

function toggleSaved(type,id) {
  const key = type === "word" ? "savedWords" : "savedPatterns";
  state[key] = state[key].includes(id) ? state[key].filter(x=>x!==id) : [...state[key],id];
  persist(); render();
}
function speak(text) {
  if (!("speechSynthesis" in window)) return toast("当前浏览器不支持朗读");
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/（.*?）/g,""));
  utterance.lang = "ja-JP"; utterance.rate = .86;
  speechSynthesis.speak(utterance);
}

function openImport() {
  document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" onclick="backdropClose(event)"><section class="modal">
    <div class="modal-handle"></div><div class="modal-head"><h2>导入学习日报</h2><button class="close-btn" onclick="closeModal()">×</button></div>
    <p class="modal-copy">可以粘贴一份 JSON 日报，也可以粘贴由多份日报组成的历史批量包。数据只保存在你的设备中。</p>
    <textarea id="report-input" placeholder='粘贴以 { "date": ... } 或 [ { "date": ... } ] 开头的内容'></textarea>
    <div id="import-message" class="message"></div>
    <div class="modal-actions"><button class="secondary" onclick="openPrompt()">查看模板</button><button class="primary" onclick="importReport()">导入并整理</button></div>
  </section></div>`;
}
function openPrompt() {
  document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" onclick="backdropClose(event)"><section class="modal">
    <div class="modal-handle"></div><div class="modal-head"><h2>学习日报提示词</h2><button class="close-btn" onclick="closeModal()">×</button></div>
    <p class="modal-copy">每次日语 Live 结束后，把下面这段发给 ChatGPT。得到 JSON 后，再导入 Japanese Reset。</p>
    <div class="prompt-box" id="prompt-text">${esc(reportPrompt)}</div>
    <button class="primary full" style="margin-top:12px" onclick="copyPrompt()">复制完整提示词</button>
  </section></div>`;
}
async function copyPrompt() {
  try { await navigator.clipboard.writeText(reportPrompt); toast("提示词已复制"); }
  catch { toast("复制失败，请长按文字复制"); }
}
function importReport() {
  const input = document.getElementById("report-input");
  const message = document.getElementById("import-message");
  try {
    const text = input.value.trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
    const parsed = JSON.parse(text);
    const incoming = Array.isArray(parsed) ? parsed : [parsed];
    if (!incoming.length) throw new Error("历史包中没有学习日报");
    incoming.forEach(validateReport);
    const existingIds = new Set(reports.map(r=>r.id).filter(Boolean));
    const normalized = incoming.map(normalizeReport).filter(r=>!existingIds.has(r.id));
    if (!normalized.length) throw new Error("这些练习已经导入过了");
    reports = [...normalized, ...reports];
    reports.sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
    persist(); closeModal(); currentTab="home"; render(); toast(`已导入 ${normalized.length} 份学习记录`);
  } catch (error) { message.textContent = `无法导入：${error.message}`; }
}
function validateReport(r) {
  const required = ["date","duration","score","metrics","topics","words","patterns","errors","reflection","nextSteps"];
  required.forEach(k=>{ if (r[k] === undefined) throw new Error(`缺少 ${k}`); });
  ["fluency","grammar","vocabulary","naturalness"].forEach(k=>{ if (r.metrics[k]===undefined) throw new Error(`metrics 缺少 ${k}`); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error("date 必须是 YYYY-MM-DD");
  if (![r.topics,r.words,r.patterns,r.errors,r.nextSteps].every(Array.isArray)) throw new Error("列表字段格式不正确");
  if (r.spokenSentences!==undefined&&!Array.isArray(r.spokenSentences)) throw new Error("spokenSentences 格式不正确");
  if (r.stuckItems!==undefined&&!Array.isArray(r.stuckItems)) throw new Error("stuckItems 格式不正确");
}
function normalizeReport(r) {
  const score = n => Math.max(0,Math.min(100,Number(n)||0));
  return { ...r, id:r.id || `${r.date}-${Date.now()}`, duration:Number(r.duration)||0, score:score(r.score), metrics:{
    fluency:score(r.metrics.fluency), grammar:score(r.metrics.grammar), vocabulary:score(r.metrics.vocabulary), naturalness:score(r.metrics.naturalness)
  }};
}
function closeModal() { document.getElementById("modal-root").innerHTML=""; }
function backdropClose(e) { if (e.target.classList.contains("modal-backdrop")) closeModal(); }
function loadDemo() { reports=[sampleReport]; persist(); render(); toast("已载入一份演示日报"); }
function toast(text) {
  document.querySelector(".toast")?.remove();
  const el=document.createElement("div"); el.className="toast"; el.textContent=text; document.body.appendChild(el);
  setTimeout(()=>el.remove(),1800);
}

function startReview() {
  const items=allItems("words").filter(x=>!state.masteredWords.includes(x.id));
  if (!items.length) return toast("目前没有待复习单词");
  reviewQueue=items; reviewIndex=0; reviewRevealed=false; renderReview();
}
function renderReview() {
  const w=reviewQueue[reviewIndex];
  document.getElementById("app").innerHTML=`<main class="page">
    <div class="section-head"><button class="text-btn" onclick="render()">‹ 返回</button><span class="page-subtitle" style="margin:0">${reviewIndex+1} / ${reviewQueue.length}</span></div>
    <section class="card review-card"><span class="tiny-label">先说出意思或造一个句子</span><p class="jp-main">${esc(w.japanese)}</p>
      <button class="mini-btn" onclick='speak(${JSON.stringify(w.japanese)})'>▷ 听发音</button>
      <div class="reveal">${reviewRevealed?`<div><b>${esc(w.meaning)}</b><p>${esc(w.example)}</p></div>`:`<button class="secondary" onclick="revealReview()">显示答案</button>`}</div>
      ${reviewRevealed?`<div class="review-options"><button onclick="reviewRate('again')">没想起</button><button onclick="reviewRate('almost')">有点卡</button><button onclick="reviewRate('got')">会了</button></div>`:""}
    </section></main>`;
}
function revealReview(){reviewRevealed=true;renderReview()}
function reviewRate(rate){
  if(rate==="got") state.masteredWords=[...new Set([...state.masteredWords,reviewQueue[reviewIndex].id])];
  persist();
  reviewIndex++;
  if(reviewIndex>=reviewQueue.length){render();toast("本轮复习完成");return}
  reviewRevealed=false;renderReview();
}

render();
