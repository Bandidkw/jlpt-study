

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}


// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
let currentLevel='n5', activeCat='ทั้งหมด';
let deck=[], wrongSet=[], idx=0, right=0, wrong=0, flipped=false;
let currentMode='flash';   // 'flash' | 'quiz' | 'srs'
let quizAnswered=false;

// ══════════════════════════════════════════════════════════
//  LOCALSTORAGE  — สถิติ + SRS + Streak
// ══════════════════════════════════════════════════════════
function loadLS(k,def){try{const v=localStorage.getItem(k);return v!=null?JSON.parse(v):def;}catch{return def;}}
function saveLS(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

// SRS: {word -> {ease, interval, due, reps}}
function getSRS(){return loadLS('jlpt_srs',{});}
function saveSRS(d){saveLS('jlpt_srs',d);}

// Streak: {dates:[...], lastDate:'YYYY-MM-DD'}
function getStreak(){return loadLS('jlpt_streak',{dates:[],lastDate:''});}
function saveStreak(d){saveLS('jlpt_streak',d);}

// Lifetime stats
function getLifeStats(){return loadLS('jlpt_life',{sessions:0,totalRight:0,totalWrong:0});}
function saveLifeStats(d){saveLS('jlpt_life',d);}

function todayStr(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function markTodayDone(){
  const s=getStreak(), today=todayStr();
  if(!s.dates.includes(today)) s.dates.push(today);
  s.lastDate=today;
  saveStreak(s);
}

function renderStreakRow(){
  const s=getStreak(), today=todayStr();
  const el=document.getElementById('streak-row');
  if(!el) return;
  // แสดง 7 วันล่าสุด
  const days=['อา','จ','อ','พ','พฤ','ศ','ส'];
  let html='';
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const dow=days[d.getDay()];
    const done=s.dates.includes(ds);
    const isToday=ds===today;
    html+=`<div class="streak-dot ${isToday?'today':done?'done':'empty'}" title="${ds}">${dow}</div>`;
  }
  // แสดง streak count
  let streak=0;
  for(let i=0;i<30;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(s.dates.includes(ds)) streak++; else break;
  }
  if(streak>0) html+=`<div style="font-size:12px;color:#f39c12;margin-left:6px;display:flex;align-items:center">🔥 ${streak}</div>`;
  el.innerHTML=html;
}

// ══════════════════════════════════════════════════════════
//  SRS ALGORITHM  (SM-2 simplified)
// ══════════════════════════════════════════════════════════
function srsKey(d){ return d.w||d.k; }

function srsUpdate(d, ok){
  const srs=getSRS();
  const key=srsKey(d);
  let r=srs[key]||{ease:2.5,interval:1,due:0,reps:0};
  if(ok){
    r.reps++;
    r.interval = r.reps===1?1: r.reps===2?3: Math.round(r.interval*r.ease);
    r.ease=Math.max(1.3, r.ease+(0.1-(5-4)*(0.08+(5-4)*0.02)));
  } else {
    r.reps=0; r.interval=1; r.ease=Math.max(1.3,r.ease-0.2);
  }
  r.due=Date.now()+(r.interval*24*60*60*1000);
  srs[key]=r;
  saveSRS(srs);
}

function isDue(d){
  const srs=getSRS();
  const r=srs[srsKey(d)];
  if(!r) return true;  // ใหม่ = ถือว่า due
  return Date.now()>=r.due;
}

function srsLabel(d){
  const srs=getSRS();
  const r=srs[srsKey(d)];
  if(!r) return '<span class="srs-badge srs-new">ใหม่</span>';
  if(Date.now()>=r.due) return '<span class="srs-badge srs-due">ถึงเวลาทบทวน</span>';
  const days=Math.ceil((r.due-Date.now())/(24*60*60*1000));
  return `<span class="srs-badge srs-ok">ทบทวนใน ${days} วัน</span>`;
}

// ══════════════════════════════════════════════════════════
//  MODE SELECTOR
// ══════════════════════════════════════════════════════════
function setMode(m){
  lockScroll();
  currentMode=m;
  ['flash','quiz','srs'].forEach(x=>{
    const el=document.getElementById('mt-'+x);
    if(el) el.className='mode-tab'+(m===x?' active':'');
  });
  startAll();
}

// ══════════════════════════════════════════════════════════
//  BASE DATA
// ══════════════════════════════════════════════════════════
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function getBase(){
  if(currentLevel==='n5') return n5;
  if(currentLevel==='vocab5') return vocab5;
  if(currentLevel==='scene') return [...scenes];   // สำเนา: shuffle() สลับ array ในที่เดิม ต้องไม่ทำลายลำดับบทสนทนา
  if(currentLevel==='n4') return n4;
  if(currentLevel==='n3') return n3;
  if(currentLevel==='grammar5') return grammar5;
  if(currentLevel==='hiragana') return hiragana;
  if(currentLevel==='katakana') return katakana;
  return [...n5,...n4,...n3];
}

function getSource(){
  let base=getBase();
  const isKanaMode=currentLevel==='hiragana'||currentLevel==='katakana';
  if(activeCat!=='ทั้งหมด') base=base.filter(d=>isKanaMode?d.row===activeCat:d.cat===activeCat);
  if(currentMode==='srs'){
    const due=base.filter(d=>isDue(d));
    return shuffle(due.length>0?due:base).slice(0,30);
  }
  return shuffle(base);
}

function getCats(){
  if(currentLevel==='hiragana'||currentLevel==='katakana'){
    const rows=new Set(getBase().map(d=>d.row));
    return['ทั้งหมด',...rows];
  }
  const s=new Set(getBase().map(d=>d.cat));
  return['ทั้งหมด',...s];
}

// ══════════════════════════════════════════════════════════
//  LEVEL / FILTER
// ══════════════════════════════════════════════════════════
function switchLevel(lv){
  if(currentLevel===lv) return;  // กดซ้ำ level เดิม → ไม่ทำอะไร
  lockScroll();
  currentLevel=lv; activeCat='ทั้งหมด';
  ['n5','vocab5','scene','n4','n3','grammar5','hiragana','katakana','all'].forEach(l=>{
    const t=document.getElementById('tab-'+l);
    if(t) t.className='level-tab';
  });
  document.getElementById('tab-'+lv).className='level-tab active-'+lv;
  const pf=document.getElementById('prog');
  const pfMap={n5:'pf-n5',vocab5:'pf-vocab5',scene:'pf-scene',n4:'pf-n4',n3:'pf-n3',
               grammar5:'pf-grammar5',hiragana:'pf-hiragana',katakana:'pf-katakana',all:'pf-n3'};
  pf.className='progress-fill '+(pfMap[lv]||'pf-n3');
  renderFilters(); startAll();
}


const CAT_EMOJI={
  'ทั้งหมด':'🗂️','การกระทำ':'⚡','พื้นฐาน':'📌','คน':'👤','เวลา':'⏰',
  'ธรรมชาติ':'🌿','สถานที่':'📍','ตัวเลข':'🔢','ร่างกาย':'🫁',
  'กริยา':'🏃','การทักทาย':'👋','ครอบครัว':'👨‍👩‍👧','สรรพนาม':'💬',
  'บ้าน':'🏠','อาหาร':'🍜','การเดินทาง':'🚆','โรงเรียน':'📚',
  'ช้อปปิ้ง':'🛍️','สี':'🎨','คุณศัพท์':'✨','สำนวน':'💭',
  'ปริมาณ':'📊','ทิศทาง':'🧭','งานอดิเรก':'🎮','ประเทศ':'🌏',
  'ประโยคสำคัญ':'🗣️','การทำงาน':'💼','อนุภาค':'🔗','รูปประโยค':'📝','te-form':'🔄','ない-form':'🚫','ความต้องการ':'💫','ความสามารถ':'💪','ความรู้สึก':'❤️','คำถาม':'❓','อื่นๆ':'🌟',
};
function renderFilters(){
  const cats=getCats();
  const base=getBase();
  const lvClass='active-'+(currentLevel==='all'?'n3':currentLevel);
  const container=document.getElementById('filters');

  // ถ้ายังไม่มี chip หรือ level/cat list เปลี่ยน → สร้างใหม่
  const existingCats=[...container.querySelectorAll('.filter-chip')].map(b=>b.dataset.cat);
  const storedLevel=container.dataset.level||'';
  const needRebuild = storedLevel !== currentLevel ||
                      existingCats.length !== cats.length ||
                      cats.some((c,i)=>c!==existingCats[i]);
  container.dataset.level=currentLevel;

  if(needRebuild){
    container.innerHTML=cats.map(c=>{
      const isKM=currentLevel==='hiragana'||currentLevel==='katakana';
    const cnt=c==='ทั้งหมด'?base.length:base.filter(d=>isKM?d.row===c:d.cat===c).length;
      const em=CAT_EMOJI[c]||'•';
      const isAct=c===activeCat;
      return `<button class="filter-chip${isAct?' '+lvClass:''}" onclick="event.preventDefault();setFilter('${c}')" data-cat="${c}">
        ${em} ${c}<span class="chip-count">${cnt}</span>
      </button>`;
    }).join('');
    return;
  }

  // ถ้า chip มีอยู่แล้ว → อัปเดตเฉพาะ class (ไม่ rebuild DOM)
  container.querySelectorAll('.filter-chip').forEach(btn=>{
    const c=btn.dataset.cat;
    const isAct=c===activeCat;
    btn.className='filter-chip'+(isAct?' '+lvClass:'');
  });
}

function filterChips(q){
  const btns=document.querySelectorAll('.filter-chip');
  btns.forEach(b=>{
    const cat=b.dataset.cat||'';
    b.style.display=(cat==='ทั้งหมด'||cat.includes(q)||CAT_EMOJI[cat]?.includes(q))?'':'none';
  });
}

function setFilter(c){
  if(activeCat===c) return;  // กดซ้ำ cat เดิม → ไม่ทำอะไร
  lockScroll(); activeCat=c; renderFilters(); startAll();
}

// ══════════════════════════════════════════════════════════
//  START SESSION
// ══════════════════════════════════════════════════════════
function startAll(){
  lockScroll();
  deck=getSource(); wrongSet=[]; idx=0; right=0; wrong=0;
  updateStats(); renderCard();
  document.getElementById('mode-label').innerHTML=
    currentMode==='srs'?'<span class="mode-badge">🔁 SRS Mode</span>':
    currentMode==='quiz'?'<span class="mode-badge">🎯 Quiz Mode</span>':'';
  const lblMap={n5:'N5 คันจิ',vocab5:'N5 คำศัพท์',scene:'สถานการณ์จริง',n4:'N4',n3:'N3',all:'ทุกระดับ',grammar5:'N5 ไวยากรณ์',hiragana:'ฮิรางานะ',katakana:'คาตาคานะ'};
  const lbl=lblMap[currentLevel]||currentLevel.toUpperCase();
  document.getElementById('section-info').textContent=
    lbl+(activeCat!=='ทั้งหมด'?' · '+activeCat:'')+' · '+deck.length+' ตัว';
  renderStreakRow();
  renderSceneBar();
}

function startWrong(){
  if(wrongSet.length===0) return;
  deck=shuffle([...wrongSet]); wrongSet=[]; idx=0; right=0; wrong=0;
  updateStats(); renderCard();
  document.getElementById('mode-label').innerHTML='<span class="mode-badge" style="color:#e74c3c;border-color:#e74c3c">🔴 ทบทวนผิด</span>';
}

// ══════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════
function updateStats(){
  document.getElementById('s-total').textContent=idx;
  document.getElementById('s-right').textContent=right;
  document.getElementById('s-wrong').textContent=wrong;
  const pct=idx>0?Math.round((right/idx)*100):0;
  document.getElementById('s-pct').textContent=(idx>0?pct:'—')+'%';
  const prog=deck.length>0?Math.round((idx/deck.length)*100):0;
  document.getElementById('prog').style.width=prog+'%';
}

// ══════════════════════════════════════════════════════════
//  RENDER CARD  (Flashcard mode)
// ══════════════════════════════════════════════════════════
function renderCard(){
  if(idx>=deck.length){renderDone();return;}
  flipped=false; quizAnswered=false;
  const d=deck[idx];
  if(currentMode==='quiz'){renderQuiz(d);return;}
  const isGrammar=!!d.p;
  const isKana2=!!d.c&&!d.p;
  const isVocab=!!d.w&&!d.c&&!d.p;
  const dispWord=isKana2?d.c:isVocab?(d.k||d.w):d.k;
  if(autoSpeak){setTimeout(()=>speakCard(false),250);}
  const speakRow=`<div class="speak-row">
    <button class="speak-btn" onclick="event.stopPropagation();speakCard(false)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
    <button class="speak-slow-btn" onclick="event.stopPropagation();speakCard(true)">0.6x</button>
    <button class="speak-auto-btn${autoSpeak?' active':''}" id="auto-speak-btn" onclick="event.stopPropagation();toggleAutoSpeak()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> อัตโนมัติ</button>
  </div>`;
  if(isGrammar){
    document.getElementById('main').innerHTML=`
      <div class="card" id="card" onclick="flipCard()">
        <div class="grammar-cat-badge">${d.cat}</div>
        <div class="grammar-pattern">${d.p}</div>
        <div class="grammar-reading">${d.r}</div>
        <div class="card-hint">แตะเพื่อดูความหมาย + ตัวอย่าง (${idx+1}/${deck.length})</div>
      </div>
      <div id="reveal"></div>`;
    return;
  }
  if(isKana2){
    document.getElementById('main').innerHTML=`
      <div class="card" id="card" onclick="flipCard()">
        <div class="kana-row-badge">${d.row}</div>
        <div class="kana-big">${d.c}</div>
        ${speakRow}
        <div class="card-hint">แตะเพื่อดูคำอ่าน (${idx+1}/${deck.length})</div>
      </div>
      <div id="reveal"></div>`;
    return;
  }
  document.getElementById('main').innerHTML=`
    <div class="card" id="card" onclick="flipCard()">
      ${srsLabel(d)}${whoBadge(d)}
      <div class="${isVocab?'vocab-big':'kanji-big'}${d.who?' phrase':''}">${dispWord}</div>
      ${isVocab&&d.k?`<div style="color:#666;font-size:13px;text-align:center;margin-top:-4px">${d.w}</div>`:''}
      ${speakRow}
      <div class="card-hint">แตะเพื่อดูความหมาย (${idx+1}/${deck.length})</div>
    </div>
    <div id="reveal"></div>`;
}

// ══════════════════════════════════════════════════════════
//  FLIP CARD
// ══════════════════════════════════════════════════════════


const catColors={
  'ตัวเลข':'background:#0c2a4a;color:#5ba3e8',
  'เวลา':'background:#0a2a14;color:#4caf70',
  'ธรรมชาติ':'background:#052a1e;color:#3dbf90',
  'คน':'background:#2a0a1e;color:#d47aa0',
  'สถานที่':'background:#2a1a00;color:#e0a030',
  'ร่างกาย':'background:#2a1008;color:#e07850',
  'พื้นฐาน':'background:#1a0a2a;color:#9a80e0',
  'การกระทำ':'background:#1e1e1e;color:#aaa',
  'การทักทาย':'background:#0a2a2a;color:#40c0b0',
  'สรรพนาม':'background:#1a0a3a;color:#b090f0',
  'ครอบครัว':'background:#2a0a2a;color:#e080c0',
  'บ้าน':'background:#1a1a00;color:#c0b030',
  'อาหาร':'background:#2a1500;color:#f09040',
  'การเดินทาง':'background:#002a1a;color:#40d080',
  'โรงเรียน':'background:#002020;color:#30b0c0',
  'ช้อปปิ้ง':'background:#2a002a;color:#d060d0',
  'สี':'background:#0a0a2a;color:#8090f0',
  'คุณศัพท์':'background:#2a1a00;color:#e0a040',
  'กริยา':'background:#001a2a;color:#40a0e0',
  'ธรรมชาติ':'background:#012a10;color:#50d070',
  'ทิศทาง':'background:#1a1a2a;color:#90a0d0',
  'ปริมาณ':'background:#2a1a1a;color:#d09090',
  'สำนวน':'background:#1a2a1a;color:#80c080',
  'งานอดิเรก':'background:#2a1a2a;color:#c080b0',
  'ประเทศ':'background:#002a2a;color:#40c0c0'
};

function flipCard(){
  if(flipped) return; flipped=true;
  const d=deck[idx];
  const isGrammarF=!!d.p;
  const isKana2F=!!d.c&&!d.p;
  const cc=catColors[d.cat]||'background:#222;color:#aaa';
  // ── Grammar branch ────────────────────────────────────────
  if(isGrammarF){
    if(autoSpeak){speak(d.p,false);}
    document.getElementById('card').innerHTML=`
      <div class="grammar-cat-badge">${d.cat}</div>
      <div class="grammar-pattern">${d.p}</div>
      <div class="grammar-reading">${d.r}</div>
      <div class="grammar-meaning">${d.th}</div>
      <div class="grammar-ex">
        <div class="grammar-ex-jp">${d.ex}</div>
        <div class="grammar-ex-th">${d.ext}</div>
      </div>`;
    document.getElementById('reveal').innerHTML=`
      <div class="btn-row">
        <button class="btn-wrong" onclick="answer(false)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>ยังไม่แม่น</button>
        <button class="btn-right" onclick="answer(true)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>จำได้!</button>
      </div>`;
    return;
  }
  // ── Kana branch ───────────────────────────────────────────
  if(isKana2F){
    if(autoSpeak){speakCard(false);}
    document.getElementById('card').innerHTML=`
      <div class="kana-row-badge">${d.row}</div>
      <div class="kana-big">${d.c}</div>
      <div class="kana-romaji">${d.r}</div>`;
    document.getElementById('reveal').innerHTML=`
      <div class="speak-row" style="margin-bottom:6px">
        <button class="speak-btn" onclick="speakCard(false)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
        <button class="speak-slow-btn" onclick="speakCard(true)">0.6x</button>
      </div>
      <div class="btn-row">
        <button class="btn-wrong" onclick="answer(false)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>ยังไม่แม่น</button>
        <button class="btn-right" onclick="answer(true)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>จำได้!</button>
      </div>`;
    return;
  }
  // ── Kanji / Vocab branch ──────────────────────────────────
  if(autoSpeak){speakCard(false);}
  const isVocab=!!d.w&&!d.c&&!d.p;
  const dispWord2=isVocab?(d.k||d.w):d.k;
  document.getElementById('card').innerHTML=`
    <div class="${isVocab?'vocab-big':'kanji-big'}${d.who?' phrase':''}">${dispWord2}</div>
    <div style="text-align:center">
      ${isVocab&&d.k?`<div style="color:#aaa;font-size:14px;margin-bottom:4px">${d.w}　(${d.r})</div>`:''}
      <div class="meaning">${d.th}</div>
      <div class="readings">${isVocab?(d.k?'':'อ่านว่า: '+d.r):'音: '+d.on+' | 訓: '+d.kun}</div>
      <span class="cat-badge" style="${cc}">${d.cat}</span>${whoBadge(d)}
    </div>`;
  document.getElementById('reveal').innerHTML=`
    <div class="speak-row" style="margin-bottom:6px">
      <button class="speak-btn" onclick="speakCard(false)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
      <button class="speak-slow-btn" onclick="speakCard(true)">0.6x</button>
    </div>
    <div class="btn-row">
      <button class="btn-wrong" onclick="answer(false)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>ยังไม่แม่น</button>
      <button class="btn-right" onclick="answer(true)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>จำได้!</button>
    </div>`;
}
function renderQuiz(d){
  const isVocab=!!d.w;
  const isGrammarQ0=!!d.p;
  const dispWord=isGrammarQ0?d.p:(d.c&&!d.p)?d.c:(isVocab?(d.k||d.w):d.k);   // ไวยากรณ์ใช้ p, คานะใช้ c
  if(autoSpeak){setTimeout(()=>speakCard(false),250);}
  // สร้างตัวเลือก: 1 ถูก + 3 หลอก
  const isKanaQ=!!d.c&&!d.p;
  const isGrammarQ=!!d.p;
  const pool=getBase().filter(x=>x!==d);
  shuffle(pool);
  const wrongs=pool.slice(0,3).map(x=>isKanaQ?x.r:x.th);
  const correct=isKanaQ?d.r:d.th;
  const choices=shuffle([correct,...wrongs]);

  document.getElementById('main').innerHTML=`
    <div class="card" style="cursor:default;min-height:${isKanaQ?'140':'120'}px">
      ${isKanaQ?'':srsLabel(d)+whoBadge(d)}
      <div class="${isKanaQ?'kana-big':'quiz-question'}${(d.who||isGrammarQ0)?' phrase-q':''}">${dispWord}</div>
      ${isGrammarQ0?`<div class="quiz-question-sub">${d.r}</div>`:''}
      ${(d.k&&!d.w&&!d.c&&!d.p)?`<div class="quiz-question-sub">音: ${d.on} | 訓: ${d.kun}</div>`:''}
      ${!isKanaQ&&isVocab&&d.k?`<div class="quiz-question-sub">${d.w}</div>`:''}
      ${isKanaQ?`<div class="kana-hint">เลือกคำอ่านที่ถูกต้อง</div>`:''}
    </div>
    <div class="quiz-choices" id="qchoices">
      ${choices.map((c,i)=>`
        <button class="quiz-btn" id="qb-${i}" onclick="quizAnswer(${i},'${c.replace(/'/g,"\'")}','${correct.replace(/'/g,"\'")}')">
          ${c}
        </button>`).join('')}
    </div>
    <div id="quiz-next-wrap"></div>
    <div class="card-feedback" id="qfeedback">(${idx+1}/${deck.length})</div>`;
}

function quizAnswer(i,chosen,correct){
  if(quizAnswered) return;
  quizAnswered=true;
  const d=deck[idx];
  const ok=chosen===correct;
  // ไฮไลท์ปุ่ม
  document.querySelectorAll('.quiz-btn').forEach((btn,j)=>{
    const txt=btn.textContent.trim();
    if(txt===correct) btn.classList.add('correct');
    else if(j===i&&!ok) btn.classList.add('wrong');
    else btn.classList.add('reveal');
    btn.onclick=null;
  });
  document.getElementById('qfeedback').innerHTML=
    ok?'<span style="color:#2ecc71;font-size:16px">✅ ถูกต้อง!</span>':
       '<span style="color:#e74c3c;font-size:16px">❌ ผิด — คำตอบคือ: '+correct+'</span>';
  // ปุ่มถัดไป
  document.getElementById('quiz-next-wrap').innerHTML=
    `<button class="quiz-next" onclick="answer(${ok})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>ถัดไป</button>`;
}

// ══════════════════════════════════════════════════════════
//  ANSWER
// ══════════════════════════════════════════════════════════
function answer(ok){
  const d=deck[idx];
  if(ok) right++; else { wrong++; wrongSet.push(d); }
  srsUpdate(d, ok);   // อัปเดต SRS ทุกครั้ง
  idx++; updateStats(); renderCard();
}

// ══════════════════════════════════════════════════════════
//  SESSION DONE
// ══════════════════════════════════════════════════════════
function renderDone(){
  // บันทึก streak + lifetime stats
  markTodayDone();
  const life=getLifeStats();
  life.sessions++; life.totalRight+=right; life.totalWrong+=wrong;
  saveLifeStats(life);
  renderStreakRow();

  const pct=right+wrong>0?Math.round(right/(right+wrong)*100):0;
  const wrongCount=wrongSet.length;
  document.getElementById('main').innerHTML=`
    <div class="done-wrap">
      <div class="done-title">${pct>=80?'🎉 เยี่ยมมาก!':pct>=60?'👍 ทำได้ดี':'💪 สู้ต่อไป!'}</div>
      <div class="done-sub">ผ่านไปแล้ว ${deck.length} ใบ</div>
      <div class="done-grid">
        <div class="done-card">
          <div class="done-num" style="color:#2ecc71">${right}</div>
          <div class="done-lbl">✅ จำได้</div>
        </div>
        <div class="done-card">
          <div class="done-num" style="color:#e74c3c">${wrong}</div>
          <div class="done-lbl">❌ ยังไม่แม่น</div>
        </div>
        <div class="done-card">
          <div class="done-num" style="color:#9b59b6">${pct}%</div>
          <div class="done-lbl">แม่นยำ</div>
        </div>
        <div class="done-card">
          <div class="done-num" style="color:#f39c12">${life.sessions}</div>
          <div class="done-lbl">เซสชั่นรวม</div>
        </div>
      </div>
      <div class="done-actions">
        ${wrongCount>0?`<button class="done-btn danger" onclick="startWrong()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>ทบทวน ${wrongCount} ใบที่ผิด</button>`:''}
        <button class="done-btn secondary" onclick="event.preventDefault();setMode('srs')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>โหมด SRS ทบทวน</button>
        <button class="done-btn primary" onclick="startAll()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>เริ่มใหม่</button>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  KEYBOARD
// ══════════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();if(!flipped&&currentMode==='flash') flipCard();}
  if(e.code==='ArrowRight'&&flipped) answer(true);
  if(e.code==='ArrowLeft'&&flipped) answer(false);
  if(e.code==='KeyS') speakCard(false);
  if(e.code==='KeyD') speakCard(true);
});

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════

let autoSpeak=loadLS('jlpt_autospeak',false);
let jaVoice=null;
function initVoice(){const vs=speechSynthesis.getVoices();jaVoice=vs.find(v=>v.lang==='ja-JP'&&v.localService)||vs.find(v=>v.lang==='ja-JP')||vs.find(v=>v.lang.startsWith('ja'))||null;}
speechSynthesis.addEventListener('voiceschanged',initVoice);
initVoice();
function speak(text,slow){if(!text)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=slow?0.6:0.85;u.pitch=1;if(jaVoice)u.voice=jaVoice;speechSynthesis.speak(u);}
function speakCard(slow){if(idx>=deck.length)return;const d=deck[idx];speak(d.p||d.c||(d.who&&d.w)||d.k||d.w||d.on||'',slow);}
function toggleAutoSpeak(){autoSpeak=!autoSpeak;saveLS('jlpt_autospeak',autoSpeak);const b=document.getElementById('auto-speak-btn');if(b)b.className='speak-auto-btn'+(autoSpeak?' active':'');}


function lockScroll(){
  const el = document.documentElement;
  const y = el.scrollTop || window.scrollY;
  // lock ทันที ก่อน DOM เปลี่ยน
  el.style.scrollBehavior = 'auto';
  requestAnimationFrame(()=>{
    el.scrollTop = y;
    window.scrollTo(0, y);
    // lock ซ้ำหลัง reflow
    setTimeout(()=>{
      el.scrollTop = y;
      window.scrollTo(0, y);
    }, 80);
  });
}

Object.keys(SCENE_INFO).forEach(k=>{CAT_EMOJI[k]=SCENE_INFO[k].emoji;});

function whoBadge(d){
  if(!d||!d.who) return '';
  return d.who==='me'
    ? '<span class="who-badge who-me">🗣️ เราพูด</span>'
    : '<span class="who-badge who-they">👂 อีกฝ่ายพูด</span>';
}

// ── แถบปุ่มเปิดตัวดูบทสนทนา ──
function renderSceneBar(){
  const el=document.getElementById('scene-bar');
  if(!el) return;
  if(currentLevel!=='scene'){el.innerHTML='';return;}
  if(activeCat==='ทั้งหมด'){
    el.innerHTML='<div class="scene-hint">เลือกสถานการณ์ด้านบน แล้วกด 📖 เพื่อดูบทสนทนาทั้งบทและฟังเสียงต่อเนื่อง</div>';
    return;
  }
  el.innerHTML='<button class="scene-open-btn" onclick="openScene()">📖 ดูบทสนทนา "'+activeCat+'"</button>';
}

// ── ตัวดูบทสนทนา ──
let sceneToken=0;
function openScene(){
  const items=scenes.filter(d=>d.cat===activeCat);
  if(!items.length) return;
  const info=SCENE_INFO[activeCat]||{emoji:'',tip:''};
  document.getElementById('scene-title').textContent=(info.emoji?info.emoji+' ':'')+activeCat;
  document.getElementById('scene-tip').textContent=info.tip||'';
  document.getElementById('scene-tip').style.display=info.tip?'':'none';
  document.getElementById('scene-list').innerHTML=items.map((d,i)=>`
    <div class="scene-line ${d.who==='me'?'sl-me':'sl-they'}" id="sl-${i}">
      <div class="scene-who">${d.who==='me'?'🗣️ เราพูด':'👂 อีกฝ่ายพูด'}</div>
      <div class="scene-jp">${d.k||d.w}</div>
      ${d.k?`<div class="scene-kana">${d.w}</div>`:''}
      <div class="scene-ro">${d.r}</div>
      <div class="scene-th">${d.th}</div>
      <div class="speak-row" style="margin-top:6px">
        <button class="speak-btn" onclick="speak(scenes.filter(x=>x.cat===activeCat)[${i}].w,false)" aria-label="ฟัง">&#9654;</button>
        <button class="speak-slow-btn" onclick="speak(scenes.filter(x=>x.cat===activeCat)[${i}].w,true)">0.6x</button>
      </div>
    </div>`).join('');
  document.getElementById('scene-modal').classList.add('open');
}
function closeScene(){
  sceneToken++;
  try{speechSynthesis.cancel();}catch{}
  document.querySelectorAll('.scene-line.playing').forEach(e=>e.classList.remove('playing'));
  const b=document.getElementById('scene-play-btn');
  if(b) b.textContent='▶ เล่นทั้งบท';
  const m=document.getElementById('scene-modal');
  if(m) m.classList.remove('open');
}
function playScene(){
  const b=document.getElementById('scene-play-btn');
  if(b&&b.dataset.playing==='1'){stopScene();return;}
  const items=scenes.filter(d=>d.cat===activeCat);
  const my=++sceneToken;
  if(b){b.dataset.playing='1';b.textContent='⏹ หยุด';}
  let i=0;
  const next=()=>{
    if(my!==sceneToken) return;
    document.querySelectorAll('.scene-line.playing').forEach(e=>e.classList.remove('playing'));
    if(i>=items.length){stopScene(true);return;}
    const row=document.getElementById('sl-'+i);
    if(row){row.classList.add('playing');row.scrollIntoView({block:'center',behavior:'smooth'});}
    const u=new SpeechSynthesisUtterance(items[i].w);
    u.lang='ja-JP'; u.rate=0.85;
    if(typeof jaVoice!=='undefined'&&jaVoice) u.voice=jaVoice;
    const go=()=>{i++;setTimeout(next,450);};
    u.onend=go; u.onerror=go;
    try{speechSynthesis.cancel();speechSynthesis.speak(u);}catch{stopScene();}
  };
  next();
}
function stopScene(done){
  sceneToken++;
  try{speechSynthesis.cancel();}catch{}
  document.querySelectorAll('.scene-line.playing').forEach(e=>e.classList.remove('playing'));
  const b=document.getElementById('scene-play-btn');
  if(b){b.dataset.playing='0';b.textContent='▶ เล่นทั้งบท';}
}

// ══════════════════════════════════════════════════════════
//  BACKUP / RESTORE / PERSIST / PWA
// ══════════════════════════════════════════════════════════
const BACKUP_KEYS=['jlpt_srs','jlpt_streak','jlpt_life','jlpt_autospeak'];
const BACKUP_META='jlpt_lastbackup';        // ไม่รวมในไฟล์สำรอง
const BACKUP_SNOOZE='jlpt_backup_snooze';   // ไม่รวมในไฟล์สำรอง
const BACKUP_REMIND_DAYS=14;
let persistState=null;                      // true | false | null (ไม่รองรับ/ยังไม่รู้)

function buildBackup(){
  const data={};
  BACKUP_KEYS.forEach(k=>{
    try{const v=localStorage.getItem(k);if(v!==null)data[k]=JSON.parse(v);}catch{}
  });
  return {app:'jlpt-study',version:1,exportedAt:new Date().toISOString(),data};
}

function setBackupMsg(text,type){
  const el=document.getElementById('backup-msg');
  if(!el)return;
  el.textContent=text||'';
  el.className='backup-msg'+(type?' '+type:'');
}

function markBackedUp(){
  saveLS(BACKUP_META,Date.now());
  renderBackupBanner();
  renderBackupInfo();
}

function renderBackupInfo(){
  const el=document.getElementById('backup-info');
  if(!el)return;
  const cards=Object.keys(getSRS()).length;
  const last=loadLS(BACKUP_META,0);
  let lastTxt='<span class="warn">ยังไม่เคยสำรอง</span>';
  if(last){
    const days=Math.floor((Date.now()-last)/86400000);
    const d=new Date(last);
    const ds=d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
    lastTxt=ds+(days>=BACKUP_REMIND_DAYS?` <span class="warn">(${days} วันที่แล้ว)</span>`:days>0?` (${days} วันที่แล้ว)`:' (วันนี้)');
  }
  let pTxt='<span class="warn">ไม่ทราบสถานะ / ไม่รองรับ</span>';
  if(persistState===true)pTxt='<span class="ok">เบราว์เซอร์รับปากเก็บถาวรแล้ว</span>';
  else if(persistState===false)pTxt='<span class="warn">ยังไม่ได้รับการรับรอง ควรสำรองสม่ำเสมอ</span>';
  el.innerHTML=`การ์ด SRS ที่บันทึกไว้: <b>${cards}</b><br>สำรองล่าสุด: <b>${lastTxt}</b><br>การเก็บข้อมูลถาวร: ${pTxt}`;
}

function renderBackupBanner(){
  const el=document.getElementById('backup-banner');
  if(!el)return;
  const hasData=Object.keys(getSRS()).length>0||getStreak().dates.length>0;
  const last=loadLS(BACKUP_META,0);
  const days=last?Math.floor((Date.now()-last)/86400000):null;
  const snooze=loadLS(BACKUP_SNOOZE,0);
  if(!hasData||Date.now()<snooze||(last&&days<BACKUP_REMIND_DAYS)){el.innerHTML='';return;}
  const msg=last?`ยังไม่ได้สำรองข้อมูลมา ${days} วันแล้ว`:'ยังไม่เคยสำรองข้อมูลเลย';
  el.innerHTML=`<div class="backup-banner"><span>💾 ${msg}</span><button onclick="openBackup()">สำรองเลย</button><button class="ghost" onclick="snoozeBackup()">ไว้ก่อน</button></div>`;
}

function snoozeBackup(){
  saveLS(BACKUP_SNOOZE,Date.now()+3*86400000);
  renderBackupBanner();
}

function openBackup(){
  const m=document.getElementById('backup-modal');
  if(!m)return;
  setBackupMsg('');
  renderBackupInfo();
  m.classList.add('open');
}
function closeBackup(){
  const m=document.getElementById('backup-modal');
  if(m)m.classList.remove('open');
}

async function exportBackup(){
  const text=JSON.stringify(buildBackup(),null,2);
  const name='jlpt-backup-'+todayStr()+'.json';
  // 1) iOS/Android: เปิด Share Sheet (บันทึกลง Files / AirDrop / ส่งให้ตัวเอง)
  try{
    const file=new File([text],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:'สำรองข้อมูล JLPT'});
      markBackedUp();
      setBackupMsg('ส่งออกไฟล์สำรองแล้ว','ok');
      return;
    }
  }catch(e){
    if(e&&e.name==='AbortError')return;   // ผู้ใช้กดยกเลิก
  }
  // 2) เบราว์เซอร์ทั่วไป: ดาวน์โหลดไฟล์
  try{
    const blob=new Blob([text],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    markBackedUp();
    setBackupMsg('ดาวน์โหลดไฟล์สำรองแล้ว','ok');
  }catch{
    setBackupMsg('ส่งออกไฟล์ไม่สำเร็จ ลองใช้ "คัดลอกข้อมูล" แทน','err');
  }
}

async function copyBackup(){
  const text=JSON.stringify(buildBackup());
  const ta=document.getElementById('backup-text');
  if(ta){ta.value=text;}
  try{
    await navigator.clipboard.writeText(text);
    markBackedUp();
    setBackupMsg('คัดลอกข้อมูลแล้ว นำไปวางเก็บไว้ในที่ปลอดภัย (เช่น Notes)','ok');
  }catch{
    if(ta){ta.focus();ta.select();}
    setBackupMsg('คัดลอกอัตโนมัติไม่ได้ ให้กดค้างที่ช่องข้อความแล้วเลือกคัดลอกเอง','err');
  }
}

function parseBackup(text){
  let obj;
  try{obj=JSON.parse(text);}catch{throw new Error('ข้อมูลที่ให้มาอ่านเป็น JSON ไม่ได้');}
  if(!obj||obj.app!=='jlpt-study'||typeof obj.data!=='object'||obj.data===null)
    throw new Error('ไม่ใช่ไฟล์สำรองของแอปนี้');
  const d=obj.data,out={};
  const isNum=v=>typeof v==='number'&&isFinite(v);
  if('jlpt_srs' in d){
    const s=d.jlpt_srs;
    if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('ข้อมูล SRS ในไฟล์ไม่ถูกต้อง');
    for(const k of Object.keys(s)){
      const r=s[k];
      if(!r||!isNum(r.ease)||!isNum(r.interval)||!isNum(r.due)||!isNum(r.reps))
        throw new Error('ข้อมูล SRS ในไฟล์เสียหาย (การ์ด '+k+')');
    }
    out.jlpt_srs=s;
  }
  if('jlpt_streak' in d){
    const s=d.jlpt_streak;
    if(!s||!Array.isArray(s.dates)||!s.dates.every(x=>typeof x==='string'))
      throw new Error('ข้อมูล streak ในไฟล์ไม่ถูกต้อง');
    out.jlpt_streak={dates:s.dates,lastDate:typeof s.lastDate==='string'?s.lastDate:''};
  }
  if('jlpt_life' in d){
    const l=d.jlpt_life;
    if(!l||!isNum(l.sessions)||!isNum(l.totalRight)||!isNum(l.totalWrong))
      throw new Error('ข้อมูลสถิติรวมในไฟล์ไม่ถูกต้อง');
    out.jlpt_life={sessions:l.sessions,totalRight:l.totalRight,totalWrong:l.totalWrong};
  }
  if('jlpt_autospeak' in d)out.jlpt_autospeak=!!d.jlpt_autospeak;
  if(Object.keys(out).length===0)throw new Error('ไม่พบข้อมูลที่นำเข้าได้ในไฟล์');
  return out;
}

function applyImport(text){
  try{
    const out=parseBackup(text);
    const n=Object.keys(out.jlpt_srs||{}).length;
    const msg='นำเข้าข้อมูลสำรอง'+(out.jlpt_srs?' ('+n+' การ์ด SRS)':'')+'?\nข้อมูลปัจจุบันในเครื่องนี้จะถูกแทนที่';
    if(!confirm(msg))return;
    saveLS('jlpt_prev_before_import',buildBackup());   // กันพลาด: เก็บข้อมูลเดิมไว้ 1 ชุด
    Object.keys(out).forEach(k=>saveLS(k,out[k]));
    saveLS(BACKUP_META,Date.now());
    setBackupMsg('นำเข้าสำเร็จ กำลังโหลดใหม่...','ok');
    setTimeout(()=>location.reload(),700);
  }catch(e){
    setBackupMsg(e.message||'นำเข้าไม่สำเร็จ','err');
  }
}

function importFile(input){
  const f=input.files&&input.files[0];
  if(!f)return;
  const reader=new FileReader();
  reader.onload=()=>{applyImport(String(reader.result||''));input.value='';};
  reader.onerror=()=>{setBackupMsg('อ่านไฟล์ไม่สำเร็จ','err');input.value='';};
  reader.readAsText(f);
}

function importFromTextarea(){
  const ta=document.getElementById('backup-text');
  const t=ta?ta.value.trim():'';
  if(!t){setBackupMsg('ยังไม่ได้วางข้อมูลในช่องข้อความ','err');return;}
  applyImport(t);
}

async function initPersist(){
  try{
    if(navigator.storage&&navigator.storage.persist){
      persistState=(await navigator.storage.persisted())||(await navigator.storage.persist());
    }
  }catch{persistState=null;}
  renderBackupInfo();
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeBackup();closeScene();}});

// PWA: Service Worker (ใช้ได้เมื่อเปิดผ่าน http/https เท่านั้น ไม่ใช่ไฟล์ในเครื่อง)
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

initPersist();
renderBackupBanner();

renderFilters();
startAll();

