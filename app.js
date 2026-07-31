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

let reports = load(STORAGE_KEY, []);
let state = load(STATE_KEY, { savedWords: [], savedPatterns: [], masteredWords: [], masteredErrors: [] });
let currentTab = "home";
let listFilter = "all";
let reviewIndex = 0;
let reviewRevealed = false;
let reviewQueue = [];

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
  const pages = { home: renderHome, words: renderWords, errors: renderErrors, patterns: renderPatterns, me: renderMe };
  pages[currentTab]();
  window.scrollTo({ top:0, behavior:"instant" });
}
function renderNav() {
  const tabs = [
    ["home","🏠","首页"],["words","🌿","单词"],["errors","🪄","纠错"],["patterns","🧩","句型"],["me","☕","我的"]
  ];
  document.getElementById("nav").innerHTML = tabs.map(([id, icon, label]) =>
    `<button class="nav-btn ${currentTab===id?"active":""}" onclick="go('${id}')"><span class="nav-icon">${icon}</span><span>${label}</span></button>`
  ).join("");
}
function go(tab) { currentTab = tab; listFilter = "all"; render(); }

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
  document.getElementById("app").innerHTML = `<main class="page">
    <header class="topbar"><div class="hello"><small>${todayText()} · 今日も少しだけ</small><h1>こんばんは。</h1></div><div class="avatar">日</div></header>
    <div class="date-line"><span class="dot"></span>已导入 ${reports.length} 次日语学习记录</div>
    <section class="card quote"><span class="label">TODAY'S LINE · 今日のひとこと</span><blockquote>少しずつ、口から戻す。</blockquote><p>一点一点，把日语重新叫回来。</p></section>
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
      <div class="learning-row" onclick="go('words')"><div class="learning-icon">🌱</div><div><b>${words.length} 个个人单词</b><p>${words.slice(0,3).map(x=>x.japanese).join(" · ")}</p></div><span class="arrow">›</span></div>
      <div class="learning-row" onclick="go('patterns')"><div class="learning-icon">🧩</div><div><b>${patterns.length} 个自然句型</b><p>${patterns.slice(0,2).map(x=>x.pattern).join(" · ")}</p></div><span class="arrow">›</span></div>
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
  return `<article class="item-card"><div class="item-top"><div><p class="jp-main">${esc(w.japanese)}</p><p class="meaning">${esc(w.meaning)}</p></div><span class="count-pill">出现 ${w.count} 次</span></div>
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
  return `<article class="item-card"><div class="item-top"><div><p class="jp-main">${esc(p.pattern)}</p><p class="meaning">${esc(p.meaning)}</p></div><span class="count-pill">出现 ${p.count} 次</span></div>
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
  return `<div class="history-row"><div class="history-date"><span>${d.getMonth()+1}月</span><b>${d.getDate()}</b></div><div class="history-body"><b>${r.topics.join(" · ")}</b><p>${r.duration} 分钟 · ${r.words.length} 个单词 · ${r.errors.length} 项纠错 · 评分 ${r.score}</p></div></div>`;
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
    <p class="modal-copy">把 ChatGPT 在每次 Live 练习后生成的 JSON 日报完整粘贴到这里。数据只保存在你的设备中。</p>
    <textarea id="report-input" placeholder='粘贴以 { "date": ... } 开头的日报'></textarea>
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
    const report = JSON.parse(text);
    validateReport(report);
    reports = [normalizeReport(report), ...reports];
    reports.sort((a,b)=>(b.date+b.id).localeCompare(a.date+a.id));
    persist(); closeModal(); currentTab="home"; render(); toast("学习日报已导入");
  } catch (error) { message.textContent = `无法导入：${error.message}`; }
}
function validateReport(r) {
  const required = ["date","duration","score","metrics","topics","words","patterns","errors","reflection","nextSteps"];
  required.forEach(k=>{ if (r[k] === undefined) throw new Error(`缺少 ${k}`); });
  ["fluency","grammar","vocabulary","naturalness"].forEach(k=>{ if (r.metrics[k]===undefined) throw new Error(`metrics 缺少 ${k}`); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error("date 必须是 YYYY-MM-DD");
  if (![r.topics,r.words,r.patterns,r.errors,r.nextSteps].every(Array.isArray)) throw new Error("列表字段格式不正确");
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
