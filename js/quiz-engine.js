/* ══════════════════════════════════════════════════════════
   QUIZ TESTING ENGINE (4 MODES, TIMER, RESULTS, REPAIR)
   ══════════════════════════════════════════════════════════ */

//  DATA & STORAGE
// ══════════════════════════════════════════════════════════
const DEFAULT_WORDS = [
  {
    id: "ex_1",
    jp: "学生",
    rd: "がくせい",
    th: "นักเรียน, นักศึกษา",
    ch: "ตัวอย่าง",
    ex: true,
  },
  { id: "ex_2", jp: "本", rd: "ほん", th: "หนังสือ", ch: "ตัวอย่าง", ex: true },
  {
    id: "ex_3",
    jp: "先生",
    rd: "せんせい",
    th: "ครู, อาจารย์",
    ch: "ตัวอย่าง",
    ex: true,
  },
  {
    id: "ex_4",
    jp: "日本語",
    rd: "にほんご",
    th: "ภาษาญี่ปุ่น",
    ch: "ตัวอย่าง",
    ex: true,
  },
  {
    id: "ex_5",
    jp: "友達",
    rd: "ともだち",
    th: "เพื่อน",
    ch: "ตัวอย่าง",
    ex: true,
  },
  {
    id: "ex_6",
    jp: "学校",
    rd: "がっこう",
    th: "โรงเรียน",
    ch: "ตัวอย่าง",
    ex: true,
  },
  {
    id: "ex_7",
    jp: "食べる",
    rd: "たべる",
    th: "กิน, รับประทาน",
    ch: "ตัวอย่าง",
    ex: true,
  },
  { id: "ex_8", jp: "行く", rd: "いく", th: "ไป", ch: "ตัวอย่าง", ex: true },
  {
    id: "ex_9",
    jp: "見る",
    rd: "みる",
    th: "ดู, มอง",
    ch: "ตัวอย่าง",
    ex: true,
  },
  {
    id: "ex_10",
    jp: "車",
    rd: "くるま",
    th: "รถยนต์",
    ch: "ตัวอย่าง",
    ex: true,
  },
];

function loadLS(k, def) {
  try {
    const v = localStorage.getItem(k);
    return v != null ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}
function saveLS(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
}

function getCustomWords() {
  const w = loadLS("jlpt_custom_words", null);
  if (w === null) {
    saveLS("jlpt_custom_words", DEFAULT_WORDS);
    return DEFAULT_WORDS;
  }
  return w;
}
function saveCustomWords(words) {
  saveLS("jlpt_custom_words", words);
  updateWordsTabBadge();
}

function getMasteryStore() {
  return loadLS("jlpt_mastery_v2", {});
}
function saveMasteryStore(m) {
  saveLS("jlpt_mastery_v2", m);
}

// ══════════════════════════════════════════════════════════
//  APP STATE
// ══════════════════════════════════════════════════════════
let currentLevel = "custom";
let currentTab = "test"; // 'test' | 'words'
let selectedChapters = []; // [] = ทุกบท, or array of selected chapter names e.g. ['บท 1', 'บท 2']
let statusFilter = "all"; // 'all' | 'repair' | 'untested'
let currentSubCat = "ทุกบท"; // backward compatibility alias
let questionDirection = "mixed"; // 'mixed' | 'm1' (jp->th) | 'm2' (th->jp) | 'm3' (kanji->rd)
let questionCountMode = 10; // 10 | 20 | 'all'

// Phase 1: Modalities & Speed Run State
let quizInteraction = "choice"; // 'choice' | 'typing' | 'listening' | 'speedrun'
let speedRunTimeLeft = 60;
let speedRunTimerId = null;
let currentCombo = 0;
let maxCombo = 0;
let speedRunPoints = 0;
let speedRunMasteryUpdated = new Set(); // ป้องกัน mastery update ซ้ำบนการ์ดซ้ำใน speedrun

// Quiz session state
let quizDeck = [];
let quizIdx = 0;
let quizScore = 0;
let quizFastCount = 0;
let quizSlowCount = 0;
let quizWrongCount = 0;
let quizMistakes = [];
let quizSlowItems = [];
let quizTimerId = null;
let qStartTime = 0;
let currentElapsedMs = 0;
let quizAnswered = false;

// ══════════════════════════════════════════════════════════
//  MASTERY LOGIC (แม่น / นิ่ง / ซ่อม / ยังไม่ทดสอบ)
// ══════════════════════════════════════════════════════════
function itemKey(item) {
  return (
    (item.id || item.jp || item.w || item.k || item.c || item.p || "") +
    "_" +
    (item.rd || item.r || "")
  );
}

function getMasteryStatus(item) {
  const store = getMasteryStore();
  const k = itemKey(item);
  const m = store[k];
  if (!m || !m.last) return "untested";
  if (m.last === "w") return "repair";
  if (m.st >= 2) return "mastered";
  return "learning"; // st === 1
}

function updateItemMastery(item, isCorrect, elapsedMs) {
  const store = getMasteryStore();
  const k = itemKey(item);
  const m = store[k] || { ok: 0, no: 0, st: 0, last: "", tm: 0 };
  if (isCorrect) {
    m.ok = (m.ok || 0) + 1;
    m.st = (m.st || 0) + 1;
    m.last = "c";
  } else {
    m.no = (m.no || 0) + 1;
    m.st = 0;
    m.last = "w";
  }
  m.tm = elapsedMs;
  store[k] = m;
  saveMasteryStore(store);
}

// ══════════════════════════════════════════════════════════

//  DATA RESOLVER
// ══════════════════════════════════════════════════════════
function getPoolForLevel(level) {
  if (level === "custom") {
    return getCustomWords().map((w) => ({
      jp: w.jp,
      rd: w.rd || "",
      th: w.th,
      ch: w.ch || "ทั่วไป",
      ex: !!w.ex,
      id: w.id,
    }));
  }
  if (level === "vocab5") {
    return vocab5.map((v) => ({
      jp: v.k || v.w,
      rd: v.w || v.r || "",
      th: v.th,
      ch: v.cat || "N5",
      id: v.w,
    }));
  }
  if (level === "n5") {
    return n5.map((k) => ({
      jp: k.k,
      rd: [k.on, k.kun].filter(Boolean).join(" / "),
      th: k.th,
      ch: k.cat || "N5 คันจิ",
      id: k.k,
    }));
  }
  if (level === "grammar5") {
    return grammar5.map((g) => ({
      jp: g.p,
      rd: g.r || "",
      th: g.th,
      ch: g.cat || "ไวยากรณ์",
      id: g.p,
    }));
  }
  if (level === "scene") {
    return scenes.map((s, i) => ({
      jp: s.k || s.w,
      rd: s.w,
      th: s.th,
      ch: s.cat || "สถานการณ์",
      id: "sc_" + i,
    }));
  }
  if (level === "hiragana") {
    return hiragana.map((h) => ({
      jp: h.c,
      rd: h.r,
      th: h.r,
      ch: h.row || "ฮิรางานะ",
      id: "h_" + h.c,
    }));
  }
  if (level === "katakana") {
    return katakana.map((k) => ({
      jp: k.c,
      rd: k.r,
      th: k.r,
      ch: k.row || "คาตาคานะ",
      id: "k_" + k.c,
    }));
  }
  if (level === "n4") {
    return n4.map((k) => ({
      jp: k.k,
      rd: [k.on, k.kun].filter(Boolean).join(" / "),
      th: k.th,
      ch: k.cat || "N4",
      id: k.k,
    }));
  }
  if (level === "n3") {
    return n3.map((k) => ({
      jp: k.k,
      rd: [k.on, k.kun].filter(Boolean).join(" / "),
      th: k.th,
      ch: k.cat || "N3",
      id: k.k,
    }));
  }
  return [];
}

// ══════════════════════════════════════════════════════════

//  QUIZ RUNNER ENGINE
// ══════════════════════════════════════════════════════════
function shuffleArr(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function startQuiz() {
  // Use custom pool if provided (for review list)
  let pool = window.customQuizPool || getPoolForLevel(currentLevel);

  // Clear custom pool after using
  if (window.customQuizPool) {
    delete window.customQuizPool;
  }

  if (pool.length < 2) {
    alert("ต้องมีคำศัพท์อย่างน้อย 2 คำเพื่อเริ่มทำแบบทดสอบ");
    return;
  }

  // Clear previous timers
  clearInterval(quizTimerId);
  clearInterval(speedRunTimerId);

  let subPool = pool;
  if (selectedChapters.length > 0) {
    subPool = subPool.filter((p) => selectedChapters.includes(p.ch));
  }
  if (statusFilter === "repair") {
    subPool = subPool.filter((p) => getMasteryStatus(p) === "repair");
    if (subPool.length === 0) {
      alert("ไม่มีคำที่ต้องซ่อมในชุดบทที่เลือกในขณะนี้! (ยอดเยี่ยมมาก)");
      return;
    }
  } else if (statusFilter === "untested") {
    subPool = subPool.filter((p) => getMasteryStatus(p) === "untested");
    if (subPool.length === 0) {
      alert("ทดสอบครบทุกคำในชุดบทที่เลือกแล้ว!");
      return;
    }
  }

  if (subPool.length === 0) {
    alert("ไม่มีคำศัพท์ในชุดบทที่เลือก");
    return;
  }

  const prioritized = [...subPool].map((item) => {
    const st = getMasteryStatus(item);
    let baseRank = 3;
    if (st === "repair") baseRank = 0;
    else if (st === "untested") baseRank = 1;
    else if (st === "learning") baseRank = 2;
    return { item, weight: baseRank + Math.random() * 1.5 };
  });

  prioritized.sort((a, b) => a.weight - b.weight);

  if (quizInteraction === "speedrun") {
    // In Speed Run: 60s mode, deck has ample items
    quizDeck = shuffleArr([
      ...prioritized.map((p) => p.item),
      ...prioritized.map((p) => p.item),
      ...prioritized.map((p) => p.item),
    ]);
    speedRunTimeLeft = 60;
    currentCombo = 0;
    maxCombo = 0;
    speedRunPoints = 0;
    speedRunMasteryUpdated = new Set();
  } else {
    let limit = prioritized.length;
    if (typeof questionCountMode === "number")
      limit = Math.min(questionCountMode, prioritized.length);
    quizDeck = prioritized.slice(0, limit).map((p) => p.item);
  }

  quizIdx = 0;
  quizScore = 0;
  quizFastCount = 0;
  quizSlowCount = 0;
  quizWrongCount = 0;
  quizMistakes = [];
  quizSlowItems = [];

  if (quizInteraction === "speedrun") {
    startSpeedRunTimer();
  }

  renderQuizQuestion();
}

function startRepairQuiz() {
  const pool = getPoolForLevel(currentLevel);
  if (pool.length < 1) {
    return;
  }

  // Clear previous timers
  clearInterval(quizTimerId);
  clearInterval(speedRunTimerId);

  let chapterPool = pool;
  if (selectedChapters.length > 0) {
    chapterPool = pool.filter((p) => selectedChapters.includes(p.ch));
  }

  const repairItems = shuffleArr(
    chapterPool.filter((p) => getMasteryStatus(p) === "repair"),
  );
  const isKana = currentLevel === "hiragana" || currentLevel === "katakana";
  const unit = isKana ? "ตัว" : "คำ";
  if (repairItems.length === 0) {
    alert(`ยอดเยี่ยมมาก! ไม่มี${unit}ที่ต้องซ่อมในหมวดที่เลือกในขณะนี้`);
    return;
  }

  let limit = repairItems.length;
  if (quizInteraction === "speedrun") {
    quizDeck = shuffleArr([...repairItems, ...repairItems, ...repairItems]);
    speedRunTimeLeft = 60;
    currentCombo = 0;
    maxCombo = 0;
    speedRunPoints = 0;
    speedRunMasteryUpdated = new Set();
  } else {
    if (typeof questionCountMode === "number") {
      limit = Math.min(questionCountMode, repairItems.length);
    }
    quizDeck = repairItems.slice(0, limit);
  }

  quizIdx = 0;
  quizScore = 0;
  quizFastCount = 0;
  quizSlowCount = 0;
  quizWrongCount = 0;
  quizMistakes = [];
  quizSlowItems = [];

  if (quizInteraction === "speedrun") {
    startSpeedRunTimer();
  }

  renderQuizQuestion();
}

function startRemainingUntested() {
  const pool = getPoolForLevel(currentLevel);
  if (pool.length < 2) {
    alert("ต้องมีคำศัพท์อย่างน้อย 2 คำเพื่อเริ่มทำแบบทดสอบ");
    return;
  }

  // Clear previous timers
  clearInterval(quizTimerId);
  clearInterval(speedRunTimerId);

  let chapterPool = pool;
  if (selectedChapters.length > 0) {
    chapterPool = pool.filter((p) => selectedChapters.includes(p.ch));
  }

  const remainingUntested = shuffleArr(
    chapterPool.filter((p) => getMasteryStatus(p) === "untested"),
  );
  if (remainingUntested.length === 0) {
    alert("ยอดเยี่ยมมาก! คุณได้ทดสอบครบทุกคำในบทที่เลือกแล้ว");
    return;
  }

  let limit = remainingUntested.length;
  if (quizInteraction === "speedrun") {
    quizDeck = shuffleArr([
      ...remainingUntested,
      ...remainingUntested,
      ...remainingUntested,
    ]);
    speedRunTimeLeft = 60;
    currentCombo = 0;
    maxCombo = 0;
    speedRunPoints = 0;
    speedRunMasteryUpdated = new Set();
  } else {
    if (typeof questionCountMode === "number") {
      limit = Math.min(questionCountMode, remainingUntested.length);
    }
    quizDeck = remainingUntested.slice(0, limit);
  }

  quizIdx = 0;
  quizScore = 0;
  quizFastCount = 0;
  quizSlowCount = 0;
  quizWrongCount = 0;
  quizMistakes = [];
  quizSlowItems = [];

  if (quizInteraction === "speedrun") {
    startSpeedRunTimer();
  }

  renderQuizQuestion();
}

function startSpeedRunTimer() {
  clearInterval(speedRunTimerId);
  speedRunTimerId = setInterval(() => {
    speedRunTimeLeft--;
    const barEl = document.getElementById("speedrun-progress-fill");
    const txtEl = document.getElementById("speedrun-timer-txt");
    if (barEl) {
      barEl.style.width = (speedRunTimeLeft / 60) * 100 + "%";
    }
    if (txtEl) {
      txtEl.textContent = `${speedRunTimeLeft}s`;
    }
    if (speedRunTimeLeft <= 0) {
      clearInterval(speedRunTimerId);
      clearInterval(quizTimerId);
      renderQuizSummary();
    }
  }, 1000);
}

function renderQuizQuestion() {
  clearInterval(quizTimerId);
  quizAnswered = false;

  if (quizIdx >= quizDeck.length) {
    clearInterval(speedRunTimerId);
    renderQuizSummary();
    return;
  }

  const item = quizDeck[quizIdx];
  const allPool = getPoolForLevel(currentLevel);
  const isSpeedRun = quizInteraction === "speedrun";
  const isListening = quizInteraction === "listening";
  const isTyping = quizInteraction === "typing";
  const speedThreshold = isTyping ? 6000 : 4000;

  let dir = questionDirection;
  if (isListening) {
    dir = "m1";
  } else if (isTyping) {
    dir = "m3";
  } else if (dir === "mixed") {
    const hasKanji = !!(item.jp && item.rd && item.jp !== item.rd);
    const availableDirs = ["m1", "m2"];
    if (hasKanji) availableDirs.push("m3");
    dir = availableDirs[Math.floor(Math.random() * availableDirs.length)];
  }

  let questionPrompt = "";
  let questionSub = "";
  let correctAnswer = "";
  let dirBadge = "คำ → ความหมาย";

  if (isListening) {
    dirBadge = "🎧 ควิซการฟัง";
    questionPrompt = `
      <div class="listening-pulse-box">
        <div class="listening-icon-pulse" onclick="speakJp('${item.jp}')" title="แตะเพื่อฟังเสียงซ้ำ">🎧</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:4px;">กำลังเล่นเสียงอ่าน... แตะหูฟังเพื่อฟังซ้ำ</div>
      </div>
    `;
    correctAnswer = item.th;
  } else if (isTyping) {
    dirBadge = "⌨️ พิมพ์คำอ่าน (โรมาจิ)";
    const isBig = item.jp.length <= 4;
    questionPrompt = `<div class="${isBig ? "q-text-large" : "q-text-medium"}">${formatJpText(item.jp)}</div>`;

    // ไม่แสดงความหมายหากเป็นฮิรางานะ/คาตาคานะ หรือความหมายตรงกับคำอ่าน เพื่อไม่ให้เฉลยคำตอบ
    const isKana = currentLevel === "hiragana" || currentLevel === "katakana";
    const isRedundant =
      !item.th ||
      isKana ||
      item.th.startsWith("เสียงอ่าน") ||
      normalizeRomaji(item.th) === normalizeRomaji(item.rd || "");
    if (!isRedundant) {
      questionSub = `<div class="q-sub-text" style="color:#cbd5e1;">ความหมาย: ${item.th}</div>`;
    } else {
      questionSub = "";
    }
    correctAnswer = item.rd || kanaToRomaji(item.jp);
  } else if (dir === "m2") {
    dirBadge = "ความหมาย → คำ";
    questionPrompt = `<div class="q-text-thai">${item.th}</div>`;
    correctAnswer = item.jp;
  } else if (dir === "m3" && item.rd) {
    dirBadge = "คันจิ → เสียงอ่าน";
    questionPrompt = `<div class="q-text-large">${formatJpText(item.jp)}</div>`;
    correctAnswer = item.rd;
  } else {
    dirBadge = isSpeedRun ? "⚡ สปีดรัน" : "คำ → ความหมาย";
    const isBig = item.jp.length <= 4;
    questionPrompt = `<div class="${isBig ? "q-text-large" : "q-text-medium"}">${formatJpText(item.jp)}</div>`;
    if (
      item.rd &&
      item.rd !== item.jp &&
      currentLevel !== "hiragana" &&
      currentLevel !== "katakana"
    ) {
      questionSub = `<div class="q-sub-text">（${item.rd}）</div>`;
    }
    correctAnswer = item.th;
  }

  let choicesHtml = "";
  if (!isTyping) {
    const others = allPool.filter((o) => itemKey(o) !== itemKey(item));
    others.sort((a, b) => {
      const wa = (a.ch === item.ch ? 0 : 2) + Math.random();
      const wb = (b.ch === item.ch ? 0 : 2) + Math.random();
      return wa - wb;
    });

    const wrongChoices = [];
    for (let candidate of others) {
      let val = "";
      if (dir === "m2") val = candidate.jp;
      else if (dir === "m3") val = candidate.rd || candidate.jp;
      else val = candidate.th;

      if (val && val !== correctAnswer && !wrongChoices.includes(val)) {
        wrongChoices.push(val);
        if (wrongChoices.length >= 3) break;
      }
    }

    const choices = shuffleArr([correctAnswer, ...wrongChoices]);
    choicesHtml = `
      <div class="choices-grid" id="choices-grid">
        ${choices
          .map(
            (c, i) => `
          <button class="choice-btn" id="choice-${i}" onclick="submitQuizAnswer(${i}, '${escapeQuotes(c)}', '${escapeQuotes(correctAnswer)}')">
            <span class="choice-key">[${i + 1}]</span>
            <span>${formatJpText(c)}</span>
          </button>
        `,
          )
          .join("")}
      </div>
    `;
  } else {
    choicesHtml = `
      <div class="typing-wrap">
        <input type="text" id="typing-input" class="typing-input" placeholder="พิมพ์เสียงอ่านโรมาจิ แล้วกด Enter..." autocomplete="off" autofocus>
        <button class="btn-typing-submit" onclick="submitTypingAnswer()">ส่ง (Enter)</button>
      </div>
    `;
  }

  let topHeaderHtml = "";
  if (isSpeedRun) {
    topHeaderHtml = `
      <div class="speedrun-bar-wrap">
        <div class="speedrun-bar" id="speedrun-progress-fill" style="width: ${(speedRunTimeLeft / 60) * 100}%;"></div>
      </div>
      <div class="quiz-header" style="margin-bottom:8px;">
        <span class="timer-badge" style="color:#f59e0b;font-size:14px;">
          ⏳ <span id="speedrun-timer-txt">${speedRunTimeLeft}s</span>
        </span>
        <span class="combo-badge" id="speedrun-combo-txt">
          🔥 x${currentCombo || 1} Combo
        </span>
        <span class="speedrun-score-txt" id="speedrun-score-txt">
          🏆 ${speedRunPoints} pt
        </span>
      </div>
    `;
  } else {
    topHeaderHtml = `
      <div class="quiz-header">
        <span class="q-progress-lbl">ข้อ ${quizIdx + 1} / ${quizDeck.length}</span>
        <span class="q-mode-badge">${dirBadge}</span>
        <div class="timer-badge">
          <span class="timer-dot" id="live-timer-dot"></span>
          <span id="live-timer-txt">0.0s</span>
        </div>
      </div>
    `;
  }

  const container = document.getElementById("main-content");
  container.innerHTML = `
    <div class="quiz-card">
      ${topHeaderHtml}

      <div class="question-box">
        ${questionPrompt}
        ${questionSub}
        ${
          !isListening
            ? `
          <button class="q-audio-btn" onclick="speakJp('${item.jp}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            ฟังเสียง
          </button>
        `
            : ""
        }
      </div>

      ${choicesHtml}

      <div id="quiz-feedback-wrap"></div>
    </div>
  `;

  qStartTime = Date.now();
  currentElapsedMs = 0;
  quizTimerId = setInterval(() => {
    currentElapsedMs = Date.now() - qStartTime;
    const sec = (currentElapsedMs / 1000).toFixed(1);
    const txtEl = document.getElementById("live-timer-txt");
    const dotEl = document.getElementById("live-timer-dot");
    if (txtEl) txtEl.textContent = `${sec}s`;
    if (dotEl && currentElapsedMs > speedThreshold) {
      dotEl.className = "timer-dot slow";
    }
  }, 100);

  setTimeout(() => speakJp(item.jp), isListening ? 100 : 250);

  if (isTyping) {
    const inp = document.getElementById("typing-input");
    if (inp) {
      inp.focus();
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitTypingAnswer();
        }
      });
    }
  }
}

function submitTypingAnswer() {
  if (quizAnswered) return;
  const inp = document.getElementById("typing-input");
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;

  quizAnswered = true;
  clearInterval(quizTimerId);
  const elapsedMs = Date.now() - qStartTime;
  const item = quizDeck[quizIdx];
  const isCorrect = checkRomajiMatch(val, item.rd, item.jp);
  const isFast = isCorrect && elapsedMs <= 6000;

  updateItemMastery(item, isCorrect, elapsedMs);

  inp.disabled = true;
  const fbWrap = document.getElementById("quiz-feedback-wrap");
  const targetRom = kanaToRomaji(item.rd || item.jp);

  if (isCorrect) {
    inp.className = "typing-input correct";
    quizScore++;
    if (isFast) {
      quizFastCount++;
      fbWrap.innerHTML = `
        <div class="feedback-box fb-fast">
          ⚡ <b>แม่นยำและรวดเร็ว!</b> [${item.rd ? `${item.rd} · ` : ""}${targetRom}] (${(elapsedMs / 1000).toFixed(1)} วิ)
        </div>
      `;
      setTimeout(() => {
        quizIdx++;
        renderQuizQuestion();
      }, 800);
      return;
    } else {
      quizSlowCount++;
      quizSlowItems.push({
        item,
        elapsedMs,
        correctVal: `${item.rd ? `${item.rd} · ` : ""}${targetRom}`,
      });
      const showMeaning =
        item.th &&
        currentLevel !== "hiragana" &&
        currentLevel !== "katakana" &&
        !item.th.startsWith("เสียงอ่าน") &&
        normalizeRomaji(item.th) !== normalizeRomaji(item.rd || "");
      fbWrap.innerHTML = `
        <div class="feedback-box fb-slow">
          ✓ <b>ถูกต้อง</b> (${targetRom}) แต่ใช้เวลา ${(elapsedMs / 1000).toFixed(1)} วินาที (&gt; 6 วิ)
          ${showMeaning ? `<div style="font-size:12px;margin-top:4px;color:#cbd5e1;">${formatJpText(item.jp)} = ${item.th}</div>` : ""}
        </div>
        <button class="btn-next-q" onclick="advanceNext()">ถัดไป (Enter) →</button>
      `;
    }
  } else {
    inp.className = "typing-input wrong";
    quizWrongCount++;
    quizMistakes.push({
      item,
      elapsedMs,
      correctVal: `${item.rd ? `${item.rd} · ` : ""}${targetRom}`,
    });
    const showMeaning =
      item.th &&
      currentLevel !== "hiragana" &&
      currentLevel !== "katakana" &&
      !item.th.startsWith("เสียงอ่าน") &&
      normalizeRomaji(item.th) !== normalizeRomaji(item.rd || "");
    fbWrap.innerHTML = `
      <div class="feedback-box fb-wrong">
        ✕ <b>คำอ่านที่ถูกต้องคือ: ${item.rd ? `${item.rd} · ` : ""}${targetRom}</b>
        ${showMeaning ? `<div style="font-size:12px;margin-top:4px;color:#fca5a5;">${formatJpText(item.jp)} = ${item.th}</div>` : ""}
      </div>
      <button class="btn-next-q" onclick="advanceNext()">ถัดไป (Enter) →</button>
    `;
  }
}

function escapeQuotes(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function submitQuizAnswer(chosenIdx, chosenVal, correctVal) {
  if (quizAnswered) return;
  quizAnswered = true;
  clearInterval(quizTimerId);
  const elapsedMs = Date.now() - qStartTime;
  const isCorrect = chosenVal === correctVal;
  const isFast = isCorrect && elapsedMs <= 4000;
  const item = quizDeck[quizIdx];
  const isSpeedRun = quizInteraction === "speedrun";

  // Speed Run: อัปเดต mastery เฉพาะครั้งแรกที่เจอการ์ดนี้ ป้องกัน duplicate overwrite
  const itemKey_ = itemKey(item);
  if (!isSpeedRun || !speedRunMasteryUpdated.has(itemKey_)) {
    updateItemMastery(item, isCorrect, elapsedMs);
    if (isSpeedRun) speedRunMasteryUpdated.add(itemKey_);
  }

  document.querySelectorAll(".choice-btn").forEach((btn, idx) => {
    const textSpan = btn.querySelector("span:last-child");
    const val = textSpan ? textSpan.textContent.trim() : btn.textContent.trim();
    if (val === correctVal) {
      btn.className = "choice-btn correct";
    } else if (idx === chosenIdx && !isCorrect) {
      btn.className = "choice-btn wrong";
    } else {
      btn.className = "choice-btn reveal";
    }
    btn.onclick = null;
  });

  const fbWrap = document.getElementById("quiz-feedback-wrap");

  if (isSpeedRun) {
    if (isCorrect) {
      quizScore++;
      currentCombo++;
      maxCombo = Math.max(maxCombo, currentCombo);
      const mult = currentCombo >= 6 ? 2.0 : currentCombo >= 3 ? 1.5 : 1.0;
      speedRunPoints += Math.round(100 * mult);
      fbWrap.innerHTML = `
        <div class="feedback-box fb-fast" style="padding:8px 12px;margin-top:10px;">
          ⚡ <b>ถูกต้อง!</b> +${Math.round(100 * mult)} pt ${currentCombo >= 3 ? `(Combo x${mult})` : ""}
        </div>
      `;
      setTimeout(() => {
        quizIdx++;
        renderQuizQuestion();
      }, 350);
    } else {
      quizWrongCount++;
      quizMistakes.push({ item, elapsedMs, correctVal });
      currentCombo = 0;
      fbWrap.innerHTML = `
        <div class="feedback-box fb-wrong" style="padding:8px 12px;margin-top:10px;">
          ✕ คำตอบคือ: ${correctVal}
        </div>
      `;
      setTimeout(() => {
        quizIdx++;
        renderQuizQuestion();
      }, 650);
    }
    return;
  }

  if (isCorrect) {
    quizScore++;
    if (isFast) {
      quizFastCount++;
      fbWrap.innerHTML = `
        <div class="feedback-box fb-fast">
          ⚡ <b>แม่นยำและรวดเร็ว!</b> (${(elapsedMs / 1000).toFixed(1)} วิ)
        </div>
      `;
      setTimeout(() => {
        quizIdx++;
        renderQuizQuestion();
      }, 800);
      return;
    } else {
      quizSlowCount++;
      quizSlowItems.push({ item, elapsedMs, correctVal });
      fbWrap.innerHTML = `
        <div class="feedback-box fb-slow">
          ✓ <b>ถูกต้อง</b> แต่ใช้เวลา ${(elapsedMs / 1000).toFixed(1)} วินาที (ช้ากว่า 4 วิ)
          <div style="font-size:12px;margin-top:4px;color:#cbd5e1;">${item.jp} ${item.rd ? `(${item.rd})` : ""} = ${item.th}</div>
        </div>
        <button class="btn-next-q" onclick="advanceNext()">ถัดไป →</button>
      `;
    }
  } else {
    quizWrongCount++;
    quizMistakes.push({ item, elapsedMs, correctVal });
    fbWrap.innerHTML = `
      <div class="feedback-box fb-wrong">
        ✕ <b>คำตอบที่ถูกต้องคือ: ${correctVal}</b>
        <div style="font-size:12px;margin-top:4px;color:#fca5a5;">${item.jp} ${item.rd ? `(${item.rd})` : ""} = ${item.th}</div>
      </div>
      <button class="btn-next-q" onclick="advanceNext()">ถัดไป →</button>
    `;
  }
}

function advanceNext() {
  quizIdx++;
  renderQuizQuestion();
}

document.addEventListener("keydown", (e) => {
  if (!quizDeck || quizDeck.length === 0 || quizIdx >= quizDeck.length) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (["1", "2", "3", "4"].includes(e.key)) {
    const idx = parseInt(e.key) - 1;
    const btn = document.getElementById(`choice-${idx}`);
    if (btn && !quizAnswered) {
      btn.click();
    }
  } else if (e.key === "Enter" || e.key === " ") {
    if (quizAnswered) {
      const nextBtn = document.querySelector(".btn-next-q");
      if (nextBtn) nextBtn.click();
    }
  }
});

// ══════════════════════════════════════════════════════════
//  QUIZ SUMMARY
// ══════════════════════════════════════════════════════════
function renderQuizSummary() {
  clearInterval(speedRunTimerId);
  clearInterval(quizTimerId);
  const container = document.getElementById("main-content");
  const total = quizIdx || 1;
  const pct = Math.round((quizScore / total) * 100);

  // Remaining untested in selected chapters
  const pool = getPoolForLevel(currentLevel);
  let chapterPool = pool;
  if (selectedChapters.length > 0) {
    chapterPool = pool.filter((p) => selectedChapters.includes(p.ch));
  }
  const remainingUntested = chapterPool.filter(
    (p) => getMasteryStatus(p) === "untested",
  );
  const nextBatchCount = Math.min(
    typeof questionCountMode === "number"
      ? questionCountMode
      : remainingUntested.length,
    remainingUntested.length,
  );

  const levelNames = {
    custom: "คำศัพท์ของฉัน",
    vocab5: "คำศัพท์ JLPT N5",
    n5: "คันจิ JLPT N5",
    grammar5: "ไวยากรณ์ JLPT N5",
    scene: "บทสนทนาสถานการณ์จริง",
    hiragana: "ฮิรางานะ",
    katakana: "คาตาคานะ",
    n4: "JLPT N4",
    n3: "JLPT N3",
  };
  const levelName = levelNames[currentLevel] || "ภาษาญี่ปุ่น";

  let chDisplayLabel = "";
  if (selectedChapters.length === 0) {
    chDisplayLabel = "ทุกบท";
  } else if (selectedChapters.length <= 3) {
    chDisplayLabel = selectedChapters.join(", ");
  } else {
    chDisplayLabel = `${selectedChapters.slice(0, 2).join(", ")} และอีก ${selectedChapters.length - 2} บท`;
  }
  if (statusFilter === "repair") {
    chDisplayLabel += " (ที่ยังติด)";
  } else if (statusFilter === "untested") {
    chDisplayLabel += " (ยังไม่เคยทดสอบ)";
  }

  const isKana = currentLevel === "hiragana" || currentLevel === "katakana";
  const unitName = isKana ? "ตัว" : "คำ";
  const unitWord = isKana ? "ตัว" : "ข้อ";

  const topicBadgeHtml = `
    <div style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:4px 14px;border-radius:20px;background:#162035;border:1px solid #23314f;color:#94a3b8;font-size:12.5px;margin-bottom:12px;">
      <span><b>${levelName}</b></span>
      <span style="color:#475569;">·</span>
      <span style="color:#60a5fa;">หัวข้อ: <b>${chDisplayLabel}</b></span>
    </div>
  `;

  let mistakesHtml = "";
  if (quizMistakes.length > 0) {
    mistakesHtml = `
      <div class="mistake-list" style="border-left:3px solid #ef4444;margin-bottom:12px;">
        <div class="mistake-title" style="color:#f87171;">✕ ${isKana ? "ตัว" : "คำ"}ที่ต้องซ่อม (ตอบผิด ${quizMistakes.length} ${unitName})</div>
        ${quizMistakes
          .map((m) => {
            const showMeaning =
              m.item.th &&
              currentLevel !== "hiragana" &&
              currentLevel !== "katakana" &&
              !m.item.th.startsWith("เสียงอ่าน") &&
              normalizeRomaji(m.item.th) !== normalizeRomaji(m.item.rd || "");
            return `
          <div class="mistake-item">
            <div>
              <b>${formatJpText(m.item.jp)}</b> ${m.item.rd ? `<span style="color:#94a3b8">(${m.item.rd})</span>` : ""}
              ${showMeaning ? `<div style="font-size:12px;color:#38bdf8">${m.item.th}</div>` : ""}
              <div style="font-size:11.5px;color:#fca5a5;margin-top:2px;">คำตอบที่ถูก: ${m.correctVal}</div>
            </div>
            <button class="q-audio-btn" onclick="speakJp('${m.item.jp}')">🔊</button>
          </div>
        `;
          })
          .join("")}
      </div>
    `;
  }

  let slowItemsHtml = "";
  if (quizSlowItems.length > 0) {
    slowItemsHtml = `
      <div class="mistake-list" style="border-left:3px solid #f59e0b;margin-bottom:12px;">
        <div class="mistake-title" style="color:#fbbf24;">⏳ ${isKana ? "ตัว" : "คำ"}ที่ตอบช้าเกินเกณฑ์ (${quizSlowItems.length} ${unitName})</div>
        ${quizSlowItems
          .map((s) => {
            const showMeaning =
              s.item.th &&
              currentLevel !== "hiragana" &&
              currentLevel !== "katakana" &&
              !s.item.th.startsWith("เสียงอ่าน") &&
              normalizeRomaji(s.item.th) !== normalizeRomaji(s.item.rd || "");
            return `
          <div class="mistake-item">
            <div>
              <b>${formatJpText(s.item.jp)}</b> ${s.item.rd ? `<span style="color:#94a3b8">(${s.item.rd})</span>` : ""}
              ${showMeaning ? `<div style="font-size:12px;color:#38bdf8">${s.item.th}</div>` : ""}
              <div style="font-size:11.5px;color:#fcd34d;margin-top:2px;">ใช้เวลา ${(s.elapsedMs / 1000).toFixed(1)} วินาที</div>
            </div>
            <button class="q-audio-btn" onclick="speakJp('${s.item.jp}')">🔊</button>
          </div>
        `;
          })
          .join("")}
      </div>
    `;
  }

  if (quizInteraction === "speedrun") {
    let rank = "D";
    let rankColor = "#94a3b8";
    let rankTitle = "กำลังพัฒนา";
    if (speedRunPoints >= 2500) {
      rank = "S";
      rankColor = "#f59e0b";
      rankTitle = "ระดับเซียน ความเร็วสูงสุด!";
    } else if (speedRunPoints >= 1800) {
      rank = "A";
      rankColor = "#10b981";
      rankTitle = "ยอดเยี่ยม แม่นยำรวดเร็ว";
    } else if (speedRunPoints >= 1200) {
      rank = "B";
      rankColor = "#3b82f6";
      rankTitle = "ดีมาก ผ่านเกณฑ์";
    } else if (speedRunPoints >= 600) {
      rank = "C";
      rankColor = "#a855f7";
      rankTitle = "ปานกลาง ฝึกฝนเพิ่ม";
    }

    container.innerHTML = `
      <div class="quiz-card summary-container">
        <div style="font-size:14px;color:#f59e0b;font-weight:600;margin-bottom:6px;">⚡ สรุปผล SPEED RUN 60 วินาที</div>
        ${topicBadgeHtml}
        <div class="score-circle" style="color:${rankColor};font-size:68px;">${rank}</div>
        <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:4px;">${rankTitle}</div>
        <div class="summary-sub">ทำคะแนนได้ <b>${speedRunPoints}</b> คะแนน (ตอบทั้งหมด ${total} ข้อ)</div>

        <div class="summary-stats-grid">
          <div class="sum-stat-card">
            <div class="sum-stat-n" style="color:#10b981;">${quizScore}</div>
            <div class="sum-stat-l">ตอบถูก (${pct}%)</div>
          </div>
          <div class="sum-stat-card">
            <div class="sum-stat-n" style="color:#f59e0b;">x${maxCombo}</div>
            <div class="sum-stat-l">Max Combo สูงสุด</div>
          </div>
          <div class="sum-stat-card">
            <div class="sum-stat-n" style="color:#ef4444;">${quizWrongCount}</div>
            <div class="sum-stat-l">ตอบผิด</div>
          </div>
        </div>

        ${mistakesHtml}
        ${slowItemsHtml}

        ${
          remainingUntested.length > 0
            ? `
          <div style="background:#0f2b38;border:1.5px solid #0284c7;border-radius:12px;padding:14px 16px;margin:14px 0;text-align:center;">
            <div style="font-size:14px;color:#e0f2fe;font-weight:600;">
              📌 ยังเหลืออีก <span style="color:#38bdf8;font-size:17px;font-weight:700;">${remainingUntested.length}</span> คำ ที่ยังไม่ได้ทดสอบ
            </div>
            <div style="margin:8px 0 12px;display:inline-flex;align-items:center;gap:6px;padding:3px 12px;background:#162e4a;border:1px solid #0284c755;border-radius:20px;font-size:12px;color:#bae6fd;">
              <span>หัวข้อ:</span>
              <b style="color:#ffffff;">${chDisplayLabel}</b>
              <span style="color:#64748b;">·</span>
              <span>ทั้งหมด ${chapterPool.length} คำ</span>
            </div>
            <div>
              <button class="btn-primary-cta" style="background:#0284c7;box-shadow:0 0 16px rgba(2,132,199,0.35);margin:0;" onclick="startRemainingUntested()">
                ⏩ ทดสอบข้อที่ยังไม่ได้ทำต่อ (${remainingUntested.length} คำที่เหลือ)
              </button>
            </div>
          </div>
        `
            : `
          <div style="background:#064e3b2b;border:1.5px solid #10b98155;border-radius:12px;padding:14px 16px;margin:14px 0;text-align:center;">
            <div style="color:#6ee7b7;font-size:14px;font-weight:600;">
              🎉 ยินดีด้วย! คุณทดสอบ${isKana ? "ตัวอักษร" : "คำศัพท์"}ครบทุก${unitName}แล้ว (${chapterPool.length} ${unitName})
            </div>
            <div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:3px 12px;background:#064e3b77;border:1px solid #10b98166;border-radius:20px;font-size:12px;color:#a7f3d0;">
              <span>หัวข้อ:</span>
              <b style="color:#ffffff;">${chDisplayLabel}</b>
            </div>
          </div>
        `
        }

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${
            quizMistakes.length > 0
              ? `
            <button class="btn-primary-cta" style="background:#dc2626;" onclick="retryMistakes()">
              ซ่อมเฉพาะ${unitWord}ที่ผิด (${quizMistakes.length} ${unitName})
            </button>
          `
              : ""
          }
          <button class="btn-primary-cta" style="background:#f59e0b;" onclick="startQuiz()">
            ⚡ เริ่มสปีดรันอีกรอบ
          </button>
          <button class="btn-export" style="justify-content:center;padding:12px;" onclick="renderMain()">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Standard / Typing / Listening Summary
  const isTyping = quizInteraction === "typing";
  const isListening = quizInteraction === "listening";
  const modeTitle = isTyping
    ? "สรุปผลโหมดพิมพ์คำอ่าน"
    : isListening
      ? "สรุปผลโหมดควิซการฟัง"
      : "สรุปผลการทดสอบ";
  const speedLabel = isTyping ? "แม่นและเร็ว (≤ 6วิ)" : "แม่นและเร็ว (≤ 4วิ)";

  container.innerHTML = `
    <div class="quiz-card summary-container">
      <div style="font-size:13px;color:#38bdf8;font-weight:600;margin-bottom:6px;">${modeTitle}</div>
      ${topicBadgeHtml}
      <div class="score-circle">${pct}%</div>
      <div class="summary-sub">ตอบถูก ${quizScore} จากทั้งหมด ${total} ข้อ</div>

      <div class="summary-stats-grid">
        <div class="sum-stat-card">
          <div class="sum-stat-n" style="color:#10b981;">${quizFastCount}</div>
          <div class="sum-stat-l">${speedLabel}</div>
        </div>
        <div class="sum-stat-card">
          <div class="sum-stat-n" style="color:#f59e0b;">${quizSlowCount}</div>
          <div class="sum-stat-l">ตอบช้า</div>
        </div>
        <div class="sum-stat-card">
          <div class="sum-stat-n" style="color:#ef4444;">${quizWrongCount}</div>
          <div class="sum-stat-l">ต้องซ่อม (ตอบผิด)</div>
        </div>
      </div>

      ${mistakesHtml}
      ${slowItemsHtml}

      ${
        remainingUntested.length > 0
          ? `
        <div style="background:#0f2b38;border:1.5px solid #0284c7;border-radius:12px;padding:14px 16px;margin:14px 0;text-align:center;">
          <div style="font-size:14px;color:#e0f2fe;font-weight:600;">
            📌 ยังเหลืออีก <span style="color:#38bdf8;font-size:18px;font-weight:700;">${remainingUntested.length}</span> คำ ที่ยังไม่ได้ทดสอบ
          </div>
          <div style="margin:8px 0 12px;display:inline-flex;align-items:center;gap:6px;padding:3px 12px;background:#162e4a;border:1px solid #0284c755;border-radius:20px;font-size:12px;color:#bae6fd;">
            <span>หัวข้อ:</span>
            <b style="color:#ffffff;">${chDisplayLabel}</b>
            <span style="color:#64748b;">·</span>
            <span>ทั้งหมด ${chapterPool.length} คำ · ทำต่อรอบละ ${nextBatchCount} ข้อ</span>
          </div>
          <div>
            <button class="btn-primary-cta" style="background:#0284c7;box-shadow:0 0 16px rgba(2,132,199,0.4);margin:0;" onclick="startRemainingUntested()">
              ⏩ ทำข้อที่ยังไม่ได้ทำต่อ (${nextBatchCount} ข้อ)
            </button>
          </div>
        </div>
      `
          : `
        <div style="background:#064e3b2b;border:1.5px solid #10b98155;border-radius:12px;padding:14px 16px;margin:14px 0;text-align:center;">
          <div style="color:#6ee7b7;font-size:14px;font-weight:600;">
            🎉 ยินดีด้วย! คุณทดสอบ${isKana ? "ตัวอักษร" : "คำศัพท์"}ครบทุก${unitName}แล้ว (${chapterPool.length} ${unitName})
          </div>
          <div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:3px 12px;background:#064e3b77;border:1px solid #10b98166;border-radius:20px;font-size:12px;color:#a7f3d0;">
            <span>หัวข้อ:</span>
            <b style="color:#ffffff;">${chDisplayLabel}</b>
          </div>
        </div>
      `
      }

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${
          quizMistakes.length > 0
            ? `
          <button class="btn-primary-cta" style="background:#dc2626;" onclick="retryMistakes()">
            🔧 ซ่อมเฉพาะ${unitWord}ที่ผิด (${quizMistakes.length} ${unitName})
          </button>
        `
            : ""
        }
        ${
          quizSlowItems.length > 0
            ? `
          <button class="btn-primary-cta" style="background:#d97706;" onclick="retrySlowItems()">
            ฝึกเฉพาะ${unitWord}ที่ตอบช้า (${quizSlowItems.length} ${unitName})
          </button>
        `
            : ""
        }
        <button class="btn-primary-cta" onclick="startQuiz()">
          ทดสอบชุดนี้อีกครั้ง (สุ่มใหม่)
        </button>
        <button class="btn-export" style="justify-content:center;padding:12px;" onclick="renderMain()">
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  `;
}

function retryMistakes() {
  quizDeck = quizMistakes.map((m) => m.item);
  quizIdx = 0;
  quizScore = 0;
  quizFastCount = 0;
  quizSlowCount = 0;
  quizWrongCount = 0;
  quizMistakes = [];
  quizSlowItems = [];
  renderQuizQuestion();
}

function retrySlowItems() {
  quizDeck = quizSlowItems.map((s) => s.item);
  quizIdx = 0;
  quizScore = 0;
  quizFastCount = 0;
  quizSlowCount = 0;
  quizWrongCount = 0;
  quizMistakes = [];
  quizSlowItems = [];
  renderQuizQuestion();
}

// ══════════════════════════════════════════════════════════
