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
state={
  savedWords:[],savedPatterns:[],savedPhrases:[],masteredWords:[],masteredErrors:[],masteredPhrases:[],
  ...state
};
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
let speakingMode = "daily";
let resourceMode = "phrases";
let resourceQuery = "";
let dailyIndex = 0;
let dailyRevealed = false;
let reflexIndex = 0;
let reflexRevealed = false;
let reflexRound = 0;
let reflexRoundAnswered = new Set();
let reflexRoundDone = false;
let reflexRoundItems = [];
let reflexOnlyStuck = false;
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
function uiIcon(name, className="") {
  const paths={
    sprout:'<path d="M12 21v-8M12 13c-5 0-8-3-8-7 5 0 8 2 8 7zM12 10c0-5 3-8 8-8 0 5-3 8-8 8z"/>',
    seed:'<path d="M12 21c-5-4-7-9-4-13 3-4 8-4 11 0 3 5-1 10-7 13z"/><path d="M12 17V9"/>',
    leaf:'<path d="M4 18C5 8 11 3 21 3c0 10-6 16-17 15zM5 18c5-5 9-8 14-11"/>',
    pin:'<path d="m8 3 8 2-2 5 4 4-6 1-5 6 1-7-4-4 6-1z"/>',
    chat:'<path d="M5 17.5 3.5 21l4-1.4A8.5 8.5 0 1 0 5 17.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
    book:'<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23z"/>',
    correct:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8.5"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/>',
    note:'<path d="M9 18V5l10-2v12M9 15c-3-1-6 0-6 3s4 3 6 0M19 12c-3-1-6 0-6 3s4 3 6 0"/>',
    play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
    mic:'<rect x="8" y="3" width="8" height="13" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/>'
  };
  return `<svg class="line-icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.sprout}</svg>`;
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
  document.body.dataset.page=currentTab;
  renderNav();
  const pages = { home: renderHome, live: renderLive, speaking: renderSpeaking, resources: renderResources, phrases: renderPhrases, errors: renderErrors, library: renderLibrary, me: renderMe };
  pages[currentTab]();
  window.scrollTo({ top:0, behavior:"instant" });
}
function renderNav() {
  const navIcons = {
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M9.5 20v-6h5v6"/></svg>',
    live:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="13" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"/></svg>',
    speaking:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17.5 3.5 21l4-1.4A8.5 8.5 0 1 0 5 17.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>',
    resources:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23z"/></svg>',
    errors:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8.5"/></svg>',
    library:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23z"/></svg>',
    me:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>'
  };
  const tabs = [["home","首页"],["speaking","今日训练"],["live","Live陪练"],["resources","词句库"],["me","记录"]];
  document.getElementById("nav").innerHTML = tabs.map(([id, label]) =>
    `<button class="nav-btn ${currentTab===id?"active":""}" onclick="go('${id}')"><span class="nav-icon">${navIcons[id]}</span><span>${label}</span></button>`
  ).join("");
}
function go(tab) {
  if(tab==="phrases"||tab==="errors"||tab==="library"){
    resourceMode=tab==="phrases"?"phrases":tab==="errors"?"errors":libraryMode;
    tab="resources";
  }
  currentTab = tab; listFilter = "all"; render();
}
function startDailyTraining(){speakingMode="daily";go("speaking")}

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
  if(reflexRoundItems.length)return reflexRoundItems;
  const now=new Date();
  const seed=now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate();
  const hash=id=>[...id].reduce((n,c)=>(n*33+c.charCodeAt(0))%1009,0);
  state.reflexRatings=state.reflexRatings||{};
  state.reflexSeen=state.reflexSeen||[];
  const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const ratingOf=item=>{
    const value=state.reflexRatings[item.id];
    return typeof value==="string"?{rating:value,nextDue:today}:value||null;
  };
  const priority=item=>{
    const record=ratingOf(item);
    if(!state.reflexSeen.includes(item.id))return 0;
    if(record?.rating==="stuck")return 1;
    if(record?.nextDue && record.nextDue<=today)return 2;
    if(record?.rating==="finished")return 3;
    return 4;
  };
  const pool=reflexOnlyStuck?reflexDrills.filter(item=>ratingOf(item)?.rating==="stuck"):reflexDrills;
  const ordered=[...pool].sort((a,b)=>priority(a)-priority(b)||((hash(a.id)+seed+reflexRound*137)%1009)-((hash(b.id)+seed+reflexRound*137)%1009));
  const selected=[],counts={};
  for(const item of ordered){
    if((counts[item.category]||0)>=2)continue;
    selected.push(item);counts[item.category]=(counts[item.category]||0)+1;
    if(selected.length===10)break;
  }
  if(selected.length<10){
    for(const item of ordered){
      if(selected.includes(item))continue;
      selected.push(item);
      if(selected.length===10)break;
    }
  }
  reflexRoundItems=selected;
  return reflexRoundItems;
}

function localDateISO(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function addDateDays(dateText,days){
  const date=new Date(`${dateText}T12:00:00`);date.setDate(date.getDate()+days);return localDateISO(date);
}
function stableHash(value){return [...String(value)].reduce((n,c)=>(n*33+c.charCodeAt(0))%1000003,17)}
function dailyPracticePool(){
  const reflex=reflexDrills.map(x=>({
    id:`reflex:${x.id}`,kind:"reflex",type:x.category||"基础反射",sourceId:x.id,prompt:x.prompt,answer:x.answer,note:x.note||"",lifelines:[],
    weak:x.category==="手部动作"
  }));
  const imported=reports.flatMap((r,ri)=>(r.stuckItems||[]).map((x,xi)=>({
    id:`stuck:${r.date}:${stableHash(x.prompt||x.corrected||`${ri}-${xi}`)}`,kind:"repair",type:"历史卡点",
    prompt:x.prompt||"把上次卡住的意思重新说出来。",answer:x.corrected||"",note:x.note||x.original||"",lifelines:["～て……","で……","～んですが……"]
  })));
  const scene=speakingPrompts.map(x=>({
    id:`scene:${x.id}`,kind:"scene",type:x.group||"场景开口",sourceId:x.id,prompt:x.prompt,answer:x.easy||x.simple,
    detail:x.simple||"",note:"",lifelines:x.lifelines||[]
  }));
  const errors=allItems("errors").map(x=>({
    id:`error:${stableHash(x.id)}`,kind:"repair",type:x.type||"真实纠错",
    prompt:`把这句话重新说成简单正确的日语：${x.original}`,answer:x.corrected,note:x.note||"",lifelines:[]
  }));
  return {reflex,scene,repair:[...imported,...errors]};
}
function selectDailyGroup(items,count,seed,recent){
  state.practiceRatings=state.practiceRatings||{};
  const today=localDateISO();
  const rank=item=>{
    const record=state.practiceRatings[item.id];
    if(record?.rating==="stuck"&&record.nextDue<=today)return 0;
    if(record?.nextDue&&record.nextDue<=today)return 1;
    if(!record&&item.weak)return 1.5;
    if(!record)return 2;
    if(recent.has(item.id))return 5;
    return record.rating==="instant"?4:3;
  };
  return [...items].sort((a,b)=>rank(a)-rank(b)||((stableHash(a.id)+seed)%1000003)-((stableHash(b.id)+seed)%1000003)).slice(0,count);
}
function getDailySession(){
  const contentVersion="20260824f";
  state.dailyGoal=[10,15,20].includes(Number(state.dailyGoal))?Number(state.dailyGoal):10;
  state.dailySessions=state.dailySessions||{};
  const today=localDateISO(),key=`${today}:${state.dailyGoal}`;
  const pool=dailyPracticePool(),all=[...pool.reflex,...pool.scene,...pool.repair],byId=new Map(all.map(x=>[x.id,x]));
  let session=state.dailySessions[key];
  if(session&&session.version===contentVersion&&session.ids.every(id=>byId.has(id)))return {...session,key,items:session.ids.map(id=>byId.get(id))};
  const recent=new Set(Object.values(state.dailySessions).filter(x=>x.date!==today).slice(-7).flatMap(x=>x.ids||[]));
  const counts=state.dailyGoal===20?[10,6,4]:state.dailyGoal===15?[7,5,3]:[5,3,2];
  const seed=Number(today.replaceAll("-",""))+state.dailyGoal*97;
  const items=[...selectDailyGroup(pool.reflex,counts[0],seed,recent),...selectDailyGroup(pool.scene,counts[1],seed+211,recent),...selectDailyGroup(pool.repair,counts[2],seed+419,recent)];
  session={date:today,goal:state.dailyGoal,version:contentVersion,ids:items.map(x=>x.id),ratings:{}};
  state.dailySessions[key]=session;
  const keys=Object.keys(state.dailySessions).sort();
  keys.slice(0,Math.max(0,keys.length-21)).forEach(old=>delete state.dailySessions[old]);
  persist();
  return {...session,key,items};
}
function dailySessionStats(){
  const session=getDailySession(),ratings=state.dailySessions[session.key].ratings||{};
  const values=Object.values(ratings);
  return {total:session.items.length,completed:values.length,instant:values.filter(x=>x==="instant").length,stuck:values.filter(x=>x==="stuck").length};
}
function setDailyGoal(goal){
  state.dailyGoal=Number(goal);dailyIndex=0;dailyRevealed=false;persist();renderDaily();
}
function renderDaily(){
  const session=getDailySession(),stored=state.dailySessions[session.key],completed=Object.keys(stored.ratings||{}).length;
  if(completed>=session.items.length){
    const stats=dailySessionStats();
    document.getElementById("app").innerHTML=`<main class="page speaking-page">
      <div class="section-head speaking-top"><div><h1 class="page-title">今日训练完成</h1><p class="page-subtitle">系统会把卡住的内容放进下一次复习。</p></div><span class="daily-count">${stats.completed}/${stats.total}</span></div>
      <section class="card reflex-card daily-finish"><span class="tiny-label">TODAY COMPLETE</span><h2>今天已经真正开口 ${stats.completed} 次</h2><div class="daily-result-grid"><div><b>${stats.instant}</b><span>脱口而出</span></div><div><b>${stats.completed-stats.instant-stats.stuck}</b><span>能说出来</span></div><div><b>${stats.stuck}</b><span>仍然卡住</span></div></div><p>卡住的题明天出现，能说出来的3天后复习，脱口而出的7天后再确认。</p><div class="item-actions"><button class="primary" onclick="setSpeakingMode('reflex')">继续专项练习</button><button class="secondary" onclick="go('home')">返回首页</button></div></section>
    </main>`;return;
  }
  if(dailyIndex>=session.items.length||stored.ratings?.[session.items[dailyIndex]?.id])dailyIndex=session.items.findIndex(x=>!stored.ratings?.[x.id]);
  const p=session.items[dailyIndex],rating=stored.ratings?.[p.id];
  const groupCounts=session.items.reduce((m,x)=>(m[x.kind]=(m[x.kind]||0)+1,m),{});
  document.getElementById("app").innerHTML=`<main class="page speaking-page">
    <div class="section-head speaking-top"><div><h1 class="page-title">今日训练</h1><p class="page-subtitle">基础反射、真实场景和历史卡点已经混合排好。</p></div><span class="daily-count">${completed}/${session.items.length}</span></div>
    <div class="speaking-mode-tabs"><button class="active" onclick="setSpeakingMode('daily')">今日安排</button><button onclick="setSpeakingMode('scene')">场景专项</button><button onclick="setSpeakingMode('reflex')">反射专项</button></div>
    <div class="daily-goal-row"><span>今天练习量</span><div>${[10,15,20].map(n=>`<button class="${state.dailyGoal===n?"active":""}" onclick="setDailyGoal(${n})">${n}题</button>`).join("")}</div></div>
    <div class="daily-progress"><i style="width:${Math.round(completed/session.items.length*100)}%"></i></div>
    <div class="daily-mix-strip"><span>基础反射 ${groupCounts.reflex||0}</span><span>场景 ${groupCounts.scene||0}</span><span>历史纠错 ${groupCounts.repair||0}</span></div>
    <section class="card speaking-card daily-practice-card">
      <div class="speaking-meta"><span>${esc(p.type)}</span><b>${dailyIndex+1} / ${session.items.length}</b></div>
      <span class="speak-instruction">先直接说，卡住也可以停顿后接下去</span><h2>${esc(p.prompt)}</h2>
      ${p.lifelines.length?`<div class="lifeline-row">${p.lifelines.map(x=>`<button onclick='showLifeline(${JSON.stringify(x)})'>${esc(x)}</button>`).join("")}</div><div id="lifeline-hint" class="lifeline-hint"></div>`:""}
      ${dailyRevealed?`<div class="answer-panel"><div class="answer-block primary-answer"><small>简单正确版</small><p>${esc(p.answer)}</p><button class="mini-btn" onclick='speak(${JSON.stringify(p.answer)})'>${uiIcon("play")}听一遍</button></div>${p.detail?`<details><summary>查看完整自然版，不要求背诵</summary><p>${esc(p.detail)}</p></details>`:""}${p.note?`<div class="reflex-note">${esc(p.note)}</div>`:""}</div>`:`<button class="secondary full reveal-answer" onclick="dailyRevealed=true;renderDaily()">我说完了，查看答案</button>`}
      ${dailyRevealed?`<div class="self-check"><span>这次需要想多久？</span><div><button class="${rating==="stuck"?"active":""}" onclick="rateDaily('stuck')">卡住了</button><button class="${rating==="finished"?"active":""}" onclick="rateDaily('finished')">能说出来</button><button class="${rating==="instant"?"active":""}" onclick="rateDaily('instant')">脱口而出</button></div></div>`:""}
    </section>
    <div class="speaking-nav"><button class="secondary" onclick="moveDaily(-1)">上一题</button><button class="primary" onclick="moveDaily(1)">下一题</button></div>
  </main>`;
}
function moveDaily(step){
  const items=getDailySession().items;dailyIndex=(dailyIndex+step+items.length)%items.length;dailyRevealed=false;renderDaily();
}
function rateDaily(rating){
  const session=getDailySession(),p=session.items[dailyIndex],today=localDateISO();
  state.practiceRatings=state.practiceRatings||{};
  const previous=state.practiceRatings[p.id],streak=rating==="instant"?(previous?.rating==="instant"?(previous.streak||1)+1:1):0;
  const nextDue=addDateDays(today,rating==="stuck"?1:rating==="finished"?3:7);
  state.practiceRatings[p.id]={rating,lastDate:today,nextDue,streak};
  state.dailySessions[session.key].ratings[p.id]=rating;
  if(p.kind==="reflex"){
    state.reflexRatings=state.reflexRatings||{};state.reflexRatings[p.sourceId]={rating,lastDate:today,nextDue,streak};
    state.reflexSeen=state.reflexSeen||[];if(!state.reflexSeen.includes(p.sourceId))state.reflexSeen.push(p.sourceId);
  }
  if(p.kind==="scene"){state.speakingRatings=state.speakingRatings||{};state.speakingRatings[p.sourceId]=rating}
  persist();dailyRevealed=false;
  const next=session.items.findIndex((x,i)=>i>dailyIndex&&!state.dailySessions[session.key].ratings[x.id]);
  dailyIndex=next>=0?next:0;setTimeout(renderDaily,160);
}

function renderSpeaking() {
  if(speakingMode==="daily") return renderDaily();
  if(speakingMode==="reflex") return renderReflex();
  state.speakingRatings = state.speakingRatings || {};
  const items=dailySpeakingItems();
  if(speakingIndex>=items.length) speakingIndex=0;
  const p=items[speakingIndex];
  const completed=items.filter(x=>state.speakingRatings[x.id]).length;
  const rating=state.speakingRatings[p.id];
  document.getElementById("app").innerHTML=`<main class="page speaking-page">
    <div class="section-head speaking-top"><div><h1 class="page-title">今日开口</h1><p class="page-subtitle">意思说清楚、没有硬伤、卡住后能继续，就算通过。</p></div><span class="daily-count">${completed}/10</span></div>
    <div class="speaking-mode-tabs"><button onclick="setSpeakingMode('daily')">今日安排</button><button class="active" onclick="setSpeakingMode('scene')">场景专项</button><button onclick="setSpeakingMode('reflex')">反射专项</button></div>
    <div class="daily-progress"><i style="width:${completed*10}%"></i></div>
    <section class="card speaking-card">
      <div class="speaking-meta"><span>${esc(p.group)}</span><b>${speakingIndex+1} / ${items.length}</b></div>
      <span class="speak-instruction">先不要看答案，直接用日语说</span>
      <h2>${esc(p.prompt)}</h2>
      <div class="lifeline-title">卡住时，可以从这里接下去</div>
      <div class="lifeline-row">${p.lifelines.map(x=>`<button onclick='showLifeline(${JSON.stringify(x)})'>${esc(x)}</button>`).join("")}<button onclick="openAllLifelines()">更多</button></div>
      <div id="lifeline-hint" class="lifeline-hint"></div>
      <div class="recorder">
        <button id="record-btn" class="record-btn" onclick="toggleRecording()">${uiIcon("mic")}开始录音</button>
        <span id="record-status">建议说20至30秒，可以分成几个短句。</span>
      </div>
      <div id="playback-wrap">${playbackUrl?`<audio controls src="${playbackUrl}"></audio>`:""}</div>
      ${speakingRevealed?`<div class="answer-panel">
        <div class="answer-block primary-answer"><small>简单正确版｜做到这个程度就通过</small><p>${esc(p.easy)}</p><button class="mini-btn" onclick='speak(${JSON.stringify(p.easy)})'>${uiIcon("play")}听一遍</button></div>
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
  if(reflexRoundDone){
    document.getElementById("app").innerHTML=`<main class="page speaking-page">
      <div class="section-head speaking-top"><div><h1 class="page-title">基础反射</h1><p class="page-subtitle">这一组已经完成。下一组会优先使用新题和仍然卡住的题。</p></div><span class="daily-count">10/10</span></div>
      <div class="daily-progress"><i style="width:100%"></i></div>
      <section class="card reflex-card reflex-finish"><span class="tiny-label">ROUND COMPLETE</span><h2>这一轮结束</h2><p>继续练新题，或者只复习刚才需要想很久的结构。</p><div class="item-actions"><button class="primary" onclick="nextReflexRound()">再来10题</button><button class="secondary" onclick="retryStuckReflex()">只练卡住的</button></div></section>
    </main>`;
    return;
  }
  const p=items[reflexIndex],stored=state.reflexRatings[p.id];
  const rating=typeof stored==="string"?stored:stored?.rating;
  const completed=reflexRoundAnswered.size;
  const categories=[...new Set(reflexDrills.map(x=>x.category))];
  document.getElementById("app").innerHTML=`<main class="page speaking-page">
    <div class="section-head speaking-top"><div><h1 class="page-title">今日开口</h1><p class="page-subtitle">不背大长句，把基础结构练成不用思考的口腔反射。</p></div><span class="daily-count">${completed}/10</span></div>
    <div class="speaking-mode-tabs"><button onclick="setSpeakingMode('daily')">今日安排</button><button onclick="setSpeakingMode('scene')">场景专项</button><button class="active" onclick="setSpeakingMode('reflex')">反射专项</button></div>
    <div class="daily-progress"><i style="width:${completed*10}%"></i></div>
    <div class="reflex-trail" aria-label="本轮进度">${items.map((item,i)=>`<span class="reflex-sticker ${reflexRoundAnswered.has(item.id)?"done":""} ${i===reflexIndex?"current":""}">${i+1}</span>`).join("")}</div>
    <section class="card reflex-card">
      <div class="speaking-meta"><span>${esc(p.category)}</span><b>${reflexIndex+1} / ${items.length}</b></div>
      <span class="speak-instruction">看中文，尽量马上说出日语</span>
      <h2>${esc(p.prompt)}</h2>
      ${reflexRevealed?`<div class="answer-panel"><div class="answer-block primary-answer"><small>简单正确版</small><p>${esc(p.answer)}</p><button class="mini-btn" onclick='speak(${JSON.stringify(p.answer)})'>${uiIcon("play")}听一遍</button></div><div class="reflex-note">${esc(p.note)}</div></div>`:`<button class="secondary full reveal-answer" onclick="revealReflex()">我说完了，查看答案</button>`}
      ${reflexRevealed?`<div class="self-check"><span>这次需要想多久？</span><div><button class="${rating==="stuck"?"active":""}" onclick="rateReflex('stuck')">需要想很久</button><button class="${rating==="finished"?"active":""}" onclick="rateReflex('finished')">能说出来</button><button class="${rating==="instant"?"active":""}" onclick="rateReflex('instant')">脱口而出</button></div></div>`:""}
    </section>
    <div class="speaking-nav"><button class="secondary" onclick="moveReflex(-1)">上一题</button><button class="primary" onclick="moveReflex(1)">下一题</button></div>
    <section class="card reflex-overview">${categories.map(category=>`<div><b>${reflexDrills.filter(x=>x.category===category).length}</b><span>${esc(category)}</span></div>`).join("")}</section>
  </main>`;
}
function setSpeakingMode(mode){speakingMode=mode;speakingRevealed=false;reflexRevealed=false;dailyRevealed=false;renderSpeaking()}
function revealReflex(){reflexRevealed=true;renderReflex()}
function moveReflex(step){reflexIndex=(reflexIndex+step+dailyReflexItems().length)%dailyReflexItems().length;reflexRevealed=false;renderReflex()}
function rateReflex(rating){
  const p=dailyReflexItems()[reflexIndex];
  const now=new Date(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const previous=state.reflexRatings?.[p.id];
  const previousRating=typeof previous==="string"?previous:previous?.rating;
  const streak=rating==="instant"?(previousRating==="instant"?(previous?.streak||1)+1:1):0;
  const days=rating==="stuck"?1:rating==="finished"?3:7;
  const due=new Date(now);due.setDate(due.getDate()+days);
  const nextDue=`${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,"0")}-${String(due.getDate()).padStart(2,"0")}`;
  state.reflexRatings=state.reflexRatings||{};
  state.reflexRatings[p.id]={rating,lastDate:date,nextDue,streak};
  state.reflexSeen=state.reflexSeen||[];
  if(!state.reflexSeen.includes(p.id))state.reflexSeen.push(p.id);
  reflexRoundAnswered.add(p.id);persist();
  if(reflexRoundAnswered.size>=dailyReflexItems().length){reflexRoundDone=true;setTimeout(renderReflex,180)}
  else setTimeout(()=>moveReflex(1),180);
}

function nextReflexRound(){
  reflexRound+=1;reflexIndex=0;reflexRevealed=false;reflexRoundAnswered=new Set();reflexRoundDone=false;reflexRoundItems=[];reflexOnlyStuck=false;renderReflex();
}
function retryStuckReflex(){
  reflexRound+=1;reflexIndex=0;reflexRevealed=false;reflexRoundAnswered=new Set();reflexRoundDone=false;reflexRoundItems=[];reflexOnlyStuck=true;
  if(!reflexDrills.some(item=>state.reflexRatings?.[item.id]?.rating==="stuck")){reflexOnlyStuck=false;}
  renderReflex();
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

function resourceTabs(){
  const tabs=[["phrases","场景表达"],["words","单词"],["patterns","句型"],["errors","真实纠错"],["lifelines","续命词"]];
  return `<div class="resource-tabs">${tabs.map(([id,label])=>`<button class="${resourceMode===id?"active":""}" onclick="setResourceMode('${id}')">${label}</button>`).join("")}</div>`;
}
function resourceHeader(title,subtitle){
  return `<h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p>${resourceTabs()}<div class="resource-search"><span>搜索</span><input value="${esc(resourceQuery)}" placeholder="输入中文或日语" oninput="resourceQuery=this.value;filterResourceCards(this.value)"></div>`;
}
function renderResources(){
  if(resourceMode==="phrases")return renderPhrases();
  if(resourceMode==="errors")return renderErrors();
  if(resourceMode==="lifelines")return renderLifelines();
  libraryMode=resourceMode;return renderLibrary();
}
function setResourceMode(mode){resourceMode=mode;listFilter="all";renderResources()}
function filterResourceCards(value=resourceQuery){
  const query=String(value).trim().toLowerCase();let visible=0;
  document.querySelectorAll("[data-search]").forEach(card=>{const show=!query||card.dataset.search.toLowerCase().includes(query);card.hidden=!show;if(show)visible++});
  const count=document.querySelector(".resource-visible-count");if(count)count.textContent=`显示 ${visible} 条`;
}
function renderLifelines(){
  document.getElementById("app").innerHTML=`<main class="page resource-page">${resourceHeader("口语续命词","卡住时先接下去，不需要一次组成漂亮的长句。")}
    <div class="library-count resource-visible-count">显示 ${lifelineWords.length} 条</div><div class="lifeline-library resource-lifelines">${lifelineWords.map(x=>`<button data-search="${esc(`${x.word} ${x.hint} ${x.example}`)}"><b>${esc(x.word)}</b><span>${esc(x.hint)}</span><small>${esc(x.example)}</small><i onclick='speak(${JSON.stringify(x.example)})'>听例句</i></button>`).join("")}</div></main>`;
  filterResourceCards();
}

function renderPhrases() {
  state.savedPhrases = state.savedPhrases || [];
  state.masteredPhrases = state.masteredPhrases || [];
  const categories = ["全部", ...new Set(phraseBank.map(x=>x.category))];
  const items = phraseCategory === "全部" ? phraseBank : phraseBank.filter(x=>x.category===phraseCategory);
  document.getElementById("app").innerHTML = `<main class="page phrase-page resource-page">
    ${resourceHeader("场景表达","基础表达负责快速应对。先把事情办明白，再逐步补充原因和细节。")}
    <div class="phrase-summary"><div><strong>${phraseBank.length}</strong><span>常用表达</span></div><div><strong>${categories.length-1}</strong><span>生活场景</span></div><div><strong>${state.masteredPhrases.length}</strong><span>已经会说</span></div></div>
    <div class="category-scroll">${categories.map(x=>`<button class="${phraseCategory===x?"active":""}" onclick='setPhraseCategory(${JSON.stringify(x)})'>${esc(x)}</button>`).join("")}</div>
    <div class="library-count resource-visible-count">显示 ${items.length} 条</div><div class="phrase-list">${items.map(phraseCard).join("")}</div>
  </main>`;
  filterResourceCards();
}
function phraseCard(p) {
  const saved=state.savedPhrases.includes(p.id), mastered=state.masteredPhrases.includes(p.id);
  return `<article class="item-card phrase-card ${mastered?"mastered":""}" data-search="${esc(`${p.category} ${p.japanese} ${p.meaning}`)}">
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
  persist();renderResources();
}

function renderLibrary(){
  const personalItems=allItems(libraryMode);
  const recommendedItems=libraryMode==="words"?recommendedWords:recommendedPatterns;
  const items=librarySource==="personal"?personalItems:recommendedItems;
  document.getElementById("app").innerHTML=`<main class="page resource-page">
    ${resourceHeader(libraryMode==="words"?"我的单词":"我的句型",libraryMode==="words"?"真正想说却没说出来的词，会在这里反复出现。":"把说过的话沉淀成可以反复调用的表达模型。")}
    <div class="segmented source-tabs"><button class="${librarySource==="personal"?"active":""}" onclick="setLibrarySource('personal')">我的练习记录</button><button class="${librarySource==="recommended"?"active":""}" onclick="setLibrarySource('recommended')">推荐扩展词句</button></div>
    <div class="segmented resource-filter"><button class="${listFilter==="all"?"active":""}" onclick="setFilter('all')">全部</button><button class="${listFilter==="review"?"active":""}" onclick="setFilter('review')">待复习</button><button class="${listFilter==="saved"?"active":""}" onclick="setFilter('saved')">已收藏</button></div>
    <div class="library-count resource-visible-count">显示 ${items.length} 条</div><div id="library-content"></div>
  </main>`;
  let shown=items;
  if(listFilter==="saved")shown=libraryMode==="words"?items.filter(x=>state.savedWords.includes(x.id)):items.filter(x=>state.savedPatterns.includes(x.id));
  if(listFilter==="review")shown=items.filter(x=>isLibraryDue(libraryMode,x.id));
  document.getElementById("library-content").innerHTML=shown.length
    ? shown.map(libraryMode==="words"?wordCard:patternCard).join("")
    : emptyList(libraryMode==="words"?"这里暂时没有单词":"这里暂时没有句型");
  const dueCount=items.filter(x=>isLibraryDue(libraryMode,x.id)).length;
  if(items.length)document.getElementById("library-content").insertAdjacentHTML("afterend",`<button class="primary full resource-review-btn" onclick="startLibraryReview('${libraryMode}')">随机复习 ${Math.min(10,dueCount||items.length)} 条</button>`);
  filterResourceCards();
}
function isLibraryDue(mode,id){
  const record=(state.libraryReview||{})[`${mode}:${id}`];return !record||!record.nextDue||record.nextDue<=localDateISO();
}
function setLibraryMode(mode){libraryMode=mode;resourceMode=mode;renderResources()}
function setLibrarySource(source){librarySource=source;renderResources()}

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
  const dailyStats=dailySessionStats();
  document.getElementById("app").innerHTML = `<main class="page">
    <header class="topbar workspace-head"><div class="hello"><small>${todayText()} · 今日も少しだけ</small><h1>我的日语工作台</h1></div><div class="header-badges"><span>🔥 ${reports.length}</span><span>⭐ ${words.length + patterns.length}</span><div class="avatar">日</div></div></header>
    <div class="date-line"><span class="dot"></span>已整理 ${reports.length} 次练习 · 累计开口 ${totalMinutes} 分钟</div>
    <section class="card daily-start" onclick="startDailyTraining()">
      <div><span class="tiny-label">TODAY'S SPEAKING</span><h2>今天开口${dailyStats.total}次</h2><p>基础反射、生活场景和历史卡点已经自动排好。</p><div class="daily-home-progress"><i style="width:${Math.round(dailyStats.completed/Math.max(1,dailyStats.total)*100)}%"></i></div><small>${dailyStats.completed} / ${dailyStats.total} 已完成</small></div>
      <button class="primary">开始训练</button>
    </section>

    <section class="card stage-card">
      <div class="section-head"><h2>${uiIcon("sprout")}我的成长阶段</h2><button class="text-btn" onclick="go('me')">查看成长记录 ›</button></div>
      <div class="stage-grid">
        <div class="stage-step done"><span>${uiIcon("seed")}</span><b>唤醒日语</b><small>找回熟悉的声音</small></div>
        <div class="stage-step active"><span>${uiIcon("sprout")}</span><b>${stage}</b><small>当前阶段</small></div>
        <div class="stage-step"><span>${uiIcon("leaf")}</span><b>自在交流</b><small>让表达更自然</small></div>
      </div>
      <div class="stage-progress"><i style="width:${stageProgress}%"></i></div>
      <p class="stage-copy">现在不追求一次说得完美，而是把想说的话稳定地说出来。</p>
    </section>

    <div class="workbench-grid">
      <section class="card focus-card">
        <div class="section-head"><h2>${uiIcon("pin")}本次重点</h2><span class="soft-label">${formatDate(r.date)}</span></div>
        <div class="focus-tags">
          <span>${uiIcon("chat")} ${esc(r.topics[0] || "日常表达")}</span>
          <span>${uiIcon("leaf")} ${r.words.length} 个新词</span>
          <span>${uiIcon("book")} ${r.patterns.length} 个句型</span>
          <span>${uiIcon("correct")} ${r.errors.length} 项纠错</span>
        </div>
      </section>
      <section class="card today-card">
        <div class="section-head"><h2>${uiIcon("calendar")}今日计划</h2><strong>${completedPlans}/${Math.min(3,r.nextSteps.length)}</strong></div>
        <div class="plan-progress"><i style="width:${Math.round(completedPlans/Math.max(1,Math.min(3,r.nextSteps.length))*100)}%"></i></div>
        ${r.nextSteps.slice(0,3).map((x,i)=>`<button class="plan-row ${(state.planChecks||[])[i]?"checked":""}" onclick="togglePlan(${i})"><span>${(state.planChecks||[])[i]?"✓":""}</span><b>${esc(x)}</b></button>`).join("")}
      </section>
    </div>

    <section class="card quote compact-quote"><span class="label">TODAY'S LINE · 今日のひとこと</span><blockquote>少しずつ、口から戻す。</blockquote><p>一点一点，把日语重新叫回来。</p></section>
    ${(r.spokenSentences||[]).length?`<section class="card spoken-output"><div class="section-head"><h2>本次真正说出来的句子</h2><span class="soft-label">${r.spokenSentences.length}句</span></div>${r.spokenSentences.slice(0,4).map(x=>`<div><b>${esc(x.japanese)}</b><span>${esc(x.meaning||"")}</span></div>`).join("")}</section>`:""}
    <section class="card">
      <div class="section-head"><h2>${uiIcon("chart")}最近一次学习概览</h2><button class="text-btn" onclick="go('me')">成长记录 ›</button></div>
      <div class="overview-grid">
        <div class="score-ring" style="--score:${r.score}%"><div><strong>${r.score}</strong><span>综合评分</span></div></div>
        <div class="score-items">${metric("流利度",r.metrics.fluency)}${metric("语法",r.metrics.grammar)}${metric("词汇",r.metrics.vocabulary)}${metric("自然度",r.metrics.naturalness)}</div>
      </div>
      <div class="session-meta"><div><strong>${r.duration}<small>m</small></strong><span>开口时间</span></div><div><strong>${r.words.length}</strong><span>新单词</span></div><div><strong>${r.errors.length}</strong><span>真实纠错</span></div></div>
    </section>
    <section class="card"><div class="section-head"><h2>${uiIcon("chat")}本次对话主题</h2></div><div class="tag-row">${r.topics.map(x=>`<span class="tag"># ${esc(x)}</span>`).join("")}</div></section>
    <section class="card learning-card">
      <div class="learning-row" onclick="resourceMode='words';go('resources')"><div class="learning-icon">${uiIcon("leaf")}</div><div><b>${words.length} 个个人单词</b><p>${words.slice(0,3).map(x=>x.japanese).join(" · ")}</p></div><span class="arrow">›</span></div>
      <div class="learning-row" onclick="resourceMode='patterns';go('resources')"><div class="learning-icon">${uiIcon("book")}</div><div><b>${patterns.length} 个自然句型</b><p>${patterns.slice(0,2).map(x=>x.pattern).join(" · ")}</p></div><span class="arrow">›</span></div>
      <div class="learning-row" onclick="go('errors')"><div class="learning-icon">${uiIcon("correct")}</div><div><b>${errors.length} 项真实纠错</b><p>${errors.slice(0,3).map(x=>x.type).join(" · ")}</p></div><span class="arrow">›</span></div>
    </section>
    <div class="dashboard-columns">
      <section class="card reflection"><span class="tiny-label">${uiIcon("correct")}本次整体复盘</span><p>${esc(r.reflection)}</p></section>
      <section class="card suggestion"><span class="tiny-label">${uiIcon("moon")}下一次学习建议</span><ul>${r.nextSteps.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>
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
  return `<article class="item-card" data-search="${esc(`${w.japanese} ${w.meaning} ${w.example||""} ${w.category||""}`)}"><div class="item-top"><div><p class="jp-main">${esc(w.japanese)}</p><p class="meaning">${esc(w.meaning)}</p></div><span class="count-pill">${w.count?`出现 ${w.count} 次`:esc(w.category||"推荐")}</span></div>
    <div class="item-note">${esc(w.example)}</div><div class="item-actions"><button class="mini-btn" onclick='speak(${JSON.stringify(w.japanese)})'>▷ 听发音</button><button class="mini-btn ${state.savedWords.includes(w.id)?"saved":""}" onclick='toggleSaved("word",${JSON.stringify(w.id)})'>${state.savedWords.includes(w.id)?"已收藏":"收藏"}</button></div></article>`;
}
function filterBtn(id,label) { return `<button class="${listFilter===id?"active":""}" onclick="setFilter('${id}')">${label}</button>`; }
function setFilter(id) { listFilter=id; render(); }

function renderErrors() {
  let items = allItems("errors");
  const types = ["all", ...new Set(items.map(x=>x.type))];
  if (listFilter !== "all") items = items.filter(x=>x.type===listFilter);
  document.getElementById("app").innerHTML = `<main class="page resource-page">
    ${resourceHeader("真实纠错","只记录你在对话中真正犯过的错误。看见重复模式，比一次改对更重要。")}
    <div class="segmented">${types.slice(0,4).map((x,i)=>filterBtn(x,i===0?"全部":x)).join("")}</div>
    <div class="library-count resource-visible-count">显示 ${items.length} 条</div>
    ${items.length ? items.map(errorCard).join("") : emptyList("这里暂时没有纠错记录")}
  </main>`;
  filterResourceCards();
}
function errorCard(e) {
  return `<article class="item-card" data-search="${esc(`${e.type} ${e.original} ${e.corrected} ${e.note||""}`)}"><span class="type-badge">${esc(e.type)}</span><span class="count-pill" style="float:right">出现 ${e.count} 次</span>
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
  return `<article class="item-card" data-search="${esc(`${p.pattern} ${p.meaning} ${p.example||""} ${p.translation||""} ${p.category||""}`)}"><div class="item-top"><div><p class="jp-main">${esc(p.pattern)}</p><p class="meaning">${esc(p.meaning)}</p></div><span class="count-pill">${p.count?`出现 ${p.count} 次`:esc(p.category||"推荐")}</span></div>
    <div class="pattern-example"><b>${esc(p.example)}</b><span>${esc(p.translation)}</span></div>
    <div class="item-actions"><button class="mini-btn" onclick='speak(${JSON.stringify(p.example)})'>▷ 听例句</button><button class="mini-btn ${state.savedPatterns.includes(p.id)?"saved":""}" onclick='toggleSaved("pattern",${JSON.stringify(p.id)})'>${state.savedPatterns.includes(p.id)?"已收藏":"收藏"}</button></div></article>`;
}

function renderMe() {
  const totalMinutes = reports.reduce((n,r)=>n+Number(r.duration||0),0);
  const avg = reports.length ? Math.round(reports.reduce((n,r)=>n+Number(r.score||0),0)/reports.length) : 0;
  const practiceRecords=Object.values(state.practiceRatings||{}),today=localDateISO();
  const dailyAnswers=Object.values(state.dailySessions||{}).reduce((n,s)=>n+Object.keys(s.ratings||{}).length,0);
  const instant=practiceRecords.filter(x=>x.rating==="instant").length;
  const stuck=practiceRecords.filter(x=>x.rating==="stuck").length;
  const mastered=practiceRecords.filter(x=>x.rating==="instant"&&(x.streak||0)>=3).length;
  const due=practiceRecords.filter(x=>x.nextDue&&x.nextDue<=today).length;
  document.getElementById("app").innerHTML = `<main class="page">
    <h1 class="page-title">成长记录</h1><p class="page-subtitle">语言进步很少发生在一夜之间。这里保存每一次开口留下的证据。</p>
    <section class="card progress-card"><span class="tiny-label" style="color:#d8e4db">JAPANESE RESET</span><h2>${dailyAnswers} 次真实开口</h2><p>Live累计 ${totalMinutes} 分钟 · 已整理 ${reports.length} 次对话</p></section>
    <section class="card useful-metrics"><div class="section-head"><h2>真正有用的进度</h2><span class="soft-label">平均评分 ${avg}</span></div><div class="daily-result-grid"><div><b>${instant}</b><span>脱口而出</span></div><div><b>${stuck}</b><span>仍然卡住</span></div><div><b>${due}</b><span>今日待复习</span></div><div><b>${mastered}</b><span>稳定掌握</span></div></div></section>
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
    const incoming = (Array.isArray(parsed) ? parsed : [parsed]).map(r=>({...r,date:r.date||localDateISO()}));
    if (!incoming.length) throw new Error("历史包中没有学习日报");
    incoming.forEach(validateReport);
    const existingIds = new Set(reports.map(r=>r.id).filter(Boolean));
    const existingFingerprints=new Set(reports.map(reportFingerprint));
    const normalized = incoming.map(normalizeReport).filter(r=>!existingIds.has(r.id)&&!existingFingerprints.has(reportFingerprint(r)));
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
  return { ...r, id:r.id || `${r.date}-${stableHash(reportFingerprint(r))}`, duration:Number(r.duration)||0, score:score(r.score), metrics:{
    fluency:score(r.metrics.fluency), grammar:score(r.metrics.grammar), vocabulary:score(r.metrics.vocabulary), naturalness:score(r.metrics.naturalness)
  }};
}
function reportFingerprint(r){return JSON.stringify([r.date,Number(r.duration)||0,r.topics||[],r.spokenSentences||[],r.reflection||""])}
function closeModal() { document.getElementById("modal-root").innerHTML=""; }
function backdropClose(e) { if (e.target.classList.contains("modal-backdrop")) closeModal(); }
function loadDemo() { reports=[sampleReport]; persist(); render(); toast("已载入一份演示日报"); }
function toast(text) {
  document.querySelector(".toast")?.remove();
  const el=document.createElement("div"); el.className="toast"; el.textContent=text; document.body.appendChild(el);
  setTimeout(()=>el.remove(),1800);
}

function startReview() {
  return startLibraryReview("words");
}
function startLibraryReview(mode) {
  const personal=allItems(mode),recommended=mode==="words"?recommendedWords:recommendedPatterns;
  let items=(librarySource==="recommended"?recommended:personal).filter(x=>isLibraryDue(mode,x.id));
  if(!items.length)items=librarySource==="recommended"?recommended:personal;
  items=[...items].sort((a,b)=>stableHash(`${localDateISO()}:${a.id}`)-stableHash(`${localDateISO()}:${b.id}`)).slice(0,10);
  items=items.map(x=>mode==="words"?{...x,reviewMode:"words"}:{...x,japanese:x.pattern,example:x.example,reviewMode:"patterns"});
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
  const item=reviewQueue[reviewIndex],today=localDateISO(),days=rate==="again"?1:rate==="almost"?3:7;
  state.libraryReview=state.libraryReview||{};
  state.libraryReview[`${item.reviewMode||"words"}:${item.id}`]={rating:rate,lastDate:today,nextDue:addDateDays(today,days)};
  if(rate==="got"&&(item.reviewMode||"words")==="words") state.masteredWords=[...new Set([...state.masteredWords,item.id])];
  persist();
  reviewIndex++;
  if(reviewIndex>=reviewQueue.length){render();toast("本轮复习完成");return}
  reviewRevealed=false;renderReview();
}

render();
