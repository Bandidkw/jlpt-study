/* ══════════════════════════════════════════════════════════
   QUIZ VOCABULARY MANAGER & ROUTING
   ══════════════════════════════════════════════════════════ */

//  UI NAVIGATION
// ══════════════════════════════════════════════════════════
function switchLevel(lv) {
  currentLevel = lv;
  selectedChapters = [];
  statusFilter = "all";
  currentSubCat = "ทุกบท";

  updateNavCapsuleState(lv);

  const titleEl = document.getElementById("page-title");
  const subEl = document.getElementById("page-sub");
  const wordsTab = document.getElementById("tab-words");
  const navTabs = document.querySelector(".nav-tabs");

  if (lv === "overview") {
    if (navTabs) navTabs.style.display = "none";
    if (titleEl) titleEl.textContent = "ภาพรวมการเรียนภาษาญี่ปุ่น";
    if (subEl)
      subEl.textContent =
        "ติดตามสถิติความจำ ความคืบหน้าของอักษรคานะ คำศัพท์ N5–N3 และฝึกซ้อมจุดที่ติดขัดได้ทันที";
  } else {
    if (navTabs) navTabs.style.display = "flex";
    if (lv === "custom") {
      titleEl.textContent = "ควิซคำศัพท์ญี่ปุ่น";
      subEl.textContent =
        "เพิ่มศัพท์ของแต่ละบทที่กำลังเรียน แล้วสุ่มทดสอบความหมาย คำ และเสียงอ่านของคันจิ ระบบจับเวลาและจำว่าคำไหนยังติดให้";
      wordsTab.textContent = `คำศัพท์ของฉัน (${getCustomWords().length})`;
    } else {
      const mapName = {
        vocab5: "ควิซคำศัพท์ JLPT N5",
        n5: "ควิซคันจิ JLPT N5",
        grammar5: "ควิซไวยากรณ์ JLPT N5",
        scene: "ควิซบทสนทนาสถานการณ์จริง",
        hiragana: "ควิซฮิรางานะ",
        katakana: "ควิซคาตาคานะ",
        n4: "ควิซ JLPT N4",
        n3: "ควิซ JLPT N3",
      };
      titleEl.textContent = mapName[lv] || "ควิซภาษาญี่ปุ่น";
      subEl.textContent =
        "สุ่มทดสอบความหมาย เสียงอ่าน และการจำคำศัพท์ พร้อมระบบจับเวลาและจำคำที่ยังติด";
      wordsTab.textContent = `คลังคำศัพท์ (${getPoolForLevel(lv).length})`;
    }
  }

  renderMain();
}

function setAppTab(tab) {
  currentTab = tab;
  document.getElementById("tab-test").className =
    "nav-tab" + (tab === "test" ? " active" : "");
  document.getElementById("tab-words").className =
    "nav-tab" + (tab === "words" ? " active" : "");
  renderMain();
}

function updateWordsTabBadge() {
  const wordsTab = document.getElementById("tab-words");
  if (!wordsTab) return;
  if (currentLevel === "custom") {
    wordsTab.innerHTML = `คำศัพท์ของฉัน (<span id="my-words-count">${getCustomWords().length}</span>)`;
  } else {
    wordsTab.textContent = `คลังคำศัพท์ (${getPoolForLevel(currentLevel).length})`;
  }
}

// ══════════════════════════════════════════════════════════
//  RENDER MAIN VIEW
// ══════════════════════════════════════════════════════════
function renderMain() {
  const container = document.getElementById("main-content");
  if (currentLevel === "overview") {
    renderOverviewDashboard(container);
  } else if (currentTab === "test") {
    renderTestHome(container);
  } else {
    renderWordsManager(container);
  }
}

// ══════════════════════════════════════════════════════════
//  OVERVIEW DASHBOARD VIEW
// ══════════════════════════════════════════════════════════
function renderOverviewDashboard(container) {
  // 1. Calculate stats across levels
  const levels = [
    { key: "hiragana", name: "ฮิรางานะ (Hiragana)", icon: "あ", cat: "kana" },
    { key: "katakana", name: "คาตาคานะ (Katakana)", icon: "ア", cat: "kana" },
    { key: "n5", name: "คันจิ N5 (Kanji)", icon: "漢", cat: "jlpt" },
    { key: "vocab5", name: "คำศัพท์ N5 (Vocab)", icon: "語", cat: "jlpt" },
    { key: "grammar5", name: "ไวยากรณ์ N5 (Grammar)", icon: "文", cat: "jlpt" },
    { key: "custom", name: "คำศัพท์ของฉัน", icon: "✏️", cat: "my" }
  ];

  let totalItemsCount = 0;
  let totalMasteredCount = 0;
  let totalRepairCount = 0;

  const levelStats = levels.map((lv) => {
    const pool = getPoolForLevel(lv.key);
    let mastered = 0, learning = 0, repair = 0, untested = 0;
    pool.forEach((item) => {
      const st = getMasteryStatus(item);
      if (st === "mastered") mastered++;
      else if (st === "learning") learning++;
      else if (st === "repair") repair++;
      else untested++;
    });
    totalItemsCount += pool.length;
    totalMasteredCount += mastered;
    totalRepairCount += repair;
    const pct = pool.length > 0 ? Math.round((mastered / pool.length) * 100) : 0;
    return { ...lv, total: pool.length, mastered, learning, repair, untested, pct };
  });

  const overallMasteryPct = totalItemsCount > 0 ? Math.round((totalMasteredCount / totalItemsCount) * 100) : 0;
  const reviewCount = getReviewList().length;

  container.innerHTML = `
    <!-- WELCOME / QUICK STATUS HERO -->
    <div class="overview-hero-card">
      <div class="overview-hero-content">
        <div class="overview-badge-tag">📊 ภาพรวมสถานะการเรียนรู้</div>
        <h2 class="overview-hero-title">ความแม่นยำรวม ${overallMasteryPct}%</h2>
        <p class="overview-hero-desc">จำแม่นยำแล้ว <b>${totalMasteredCount}</b> จากคลังทั้งหมด <b>${totalItemsCount}</b> รายการ</p>
      </div>
      <div class="overview-ring-box">
        <div class="overview-stat-circle">${overallMasteryPct}%</div>
      </div>
    </div>

    <!-- QUICK ACTIONS ROW -->
    <div class="overview-actions-grid">
      ${
        totalRepairCount > 0
          ? `
        <div class="overview-action-card danger" onclick="selectNavLevel('custom', event); setTimeout(startRepairQuiz, 100);">
          <div class="overview-act-icon">🔧</div>
          <div class="overview-act-info">
            <div class="overview-act-title">คำที่ต้องซ่อมค้างอยู่ (${totalRepairCount})</div>
            <div class="overview-act-sub">กดเพื่อเริ่มควิซซ่อมข้อที่ตอบผิด</div>
          </div>
          <span class="overview-act-arrow">→</span>
        </div>
      `
          : `
        <div class="overview-action-card ok" onclick="selectNavLevel('hiragana', event);">
          <div class="overview-act-icon">🌸</div>
          <div class="overview-act-info">
            <div class="overview-act-title">ฝึกอักษรคานะ</div>
            <div class="overview-act-sub">ฮิรางานะ & คาตาคานะ พื้นฐาน</div>
          </div>
          <span class="overview-act-arrow">→</span>
        </div>
      `
      }

      <div class="overview-action-card purple" onclick="selectNavLevel('flashcard', event);">
        <div class="overview-act-icon">🃏</div>
        <div class="overview-act-info">
          <div class="overview-act-title">ทบทวน Flashcard / SRS</div>
          <div class="overview-act-sub">ระบบจำระยะยาว SM-2</div>
        </div>
        <span class="overview-act-arrow">→</span>
      </div>

      ${
        reviewCount > 0
          ? `
        <div class="overview-action-card gold" onclick="openReviewModal();">
          <div class="overview-act-icon">🔁</div>
          <div class="overview-act-info">
            <div class="overview-act-title">รายการทบทวน (${reviewCount} คำ)</div>
            <div class="overview-act-sub">คำที่ปักหมุดไว้สำหรับเน้นจำ</div>
          </div>
          <span class="overview-act-arrow">→</span>
        </div>
      `
          : ""
      }
    </div>

    <!-- PROGRESS BY CATEGORY SECTION -->
    <div class="quiz-card" style="margin-top:16px;">
      <div class="progress-card-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>🎯 ความก้าวหน้ารายหมวดหมู่</span>
        <span style="font-size:12px;color:#94a3b8;font-weight:normal;">แตะที่การ์ดเพื่อเริ่มฝึก</span>
      </div>
      
      <div class="overview-category-list">
        ${levelStats
          .map(
            (st) => `
          <div class="overview-cat-item" onclick="selectNavLevel('${st.key}', event)">
            <div class="overview-cat-head">
              <div class="overview-cat-badge">
                <span class="overview-cat-symbol">${st.icon}</span>
                <span class="overview-cat-name">${st.name}</span>
              </div>
              <div class="overview-cat-metrics">
                <span style="color:#10b981;">แม่น ${st.mastered}</span> · 
                <span style="color:#ef4444;">ซ่อม ${st.repair}</span> · 
                <span style="color:#94a3b8;">${st.total} ทั้งหมด</span>
                <b style="color:#fff;margin-left:8px;font-size:13.5px;">${st.pct}%</b>
              </div>
            </div>

            <div class="multi-seg-bar" style="margin-bottom:0;height:7px;">
              <div class="seg seg-mastered" style="width: ${(st.mastered / (st.total || 1)) * 100}%;"></div>
              <div class="seg seg-learning" style="width: ${(st.learning / (st.total || 1)) * 100}%;"></div>
              <div class="seg seg-repair" style="width: ${(st.repair / (st.total || 1)) * 100}%;"></div>
              <div class="seg seg-untested" style="width: ${(st.untested / (st.total || 1)) * 100}%;"></div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// ── TEST HOME (Exact Look of the User's Screenshot) ──
function renderTestHome(container) {
  const pool = getPoolForLevel(currentLevel);
  const totalCount = pool.length;
  const chapters = [...new Set(pool.map((p) => p.ch).filter(Boolean))];

  // Base pool of selected chapters (or all if none selected)
  let chapterPool = pool;
  if (selectedChapters.length > 0) {
    chapterPool = pool.filter((p) => selectedChapters.includes(p.ch));
  }

  // Count repair and untested based on chapterPool
  const cRepair = chapterPool.filter(
    (p) => getMasteryStatus(p) === "repair",
  ).length;
  const cUntested = chapterPool.filter(
    (p) => getMasteryStatus(p) === "untested",
  ).length;

  // Filtered pool applying statusFilter
  let filteredPool = chapterPool;
  if (statusFilter === "repair") {
    filteredPool = chapterPool.filter((p) => getMasteryStatus(p) === "repair");
  } else if (statusFilter === "untested") {
    filteredPool = chapterPool.filter(
      (p) => getMasteryStatus(p) === "untested",
    );
  }

  // Dynamic label
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

  let fMastered = 0,
    fLearning = 0,
    fRepair = 0,
    fUntested = 0;
  filteredPool.forEach((item) => {
    const st = getMasteryStatus(item);
    if (st === "mastered") fMastered++;
    else if (st === "learning") fLearning++;
    else if (st === "repair") fRepair++;
    else fUntested++;
  });

  const fTotal = filteredPool.length || 1;
  const pMas = (fMastered / fTotal) * 100;
  const pLea = (fLearning / fTotal) * 100;
  const pRep = (fRepair / fTotal) * 100;
  const pUnt = (fUntested / fTotal) * 100;

  const isAllActive = selectedChapters.length === 0 && statusFilter === "all";
  const isRepairActive = statusFilter === "repair";
  const isUntestedActive = statusFilter === "untested";

  const isKana = currentLevel === "hiragana" || currentLevel === "katakana";
  const unitName = isKana ? "ตัว" : "คำ";
  const unitWord = isKana ? "ตัว" : "ข้อ";

  let chaptersChipsHtml = "";
  if (chapters.length > 0) {
    chaptersChipsHtml = chapters
      .map((ch) => {
        const cnt = pool.filter((p) => p.ch === ch).length;
        const isAct = selectedChapters.includes(ch);
        return `<button class="chip${isAct ? " active" : ""}" onclick="toggleChapter('${ch}')">${ch} (${cnt})</button>`;
      })
      .join("");
  }

  container.innerHTML = `
    <!-- CARD 1: TEST SETUP -->
    <div class="quiz-card">
      <!-- โหมดการทดสอบ (Phase 1) -->
      <div class="section-group">
        <div class="section-label">โหมดการทดสอบ</div>
        <div class="chips-row">
          <button class="chip${quizInteraction === "choice" ? " active" : ""}" onclick="selectInteraction('choice')">🎯 4 ตัวเลือก</button>
          <button class="chip${quizInteraction === "typing" ? " active" : ""}" onclick="selectInteraction('typing')">⌨️ พิมพ์คำอ่าน (Typing)</button>
          <button class="chip${quizInteraction === "listening" ? " active" : ""}" onclick="selectInteraction('listening')">🎧 ควิซการฟัง (Listening)</button>
          <button class="chip${quizInteraction === "speedrun" ? " active" : ""}" onclick="selectInteraction('speedrun')">⚡ สปีดรัน 60 วิ (Speed Run)</button>
        </div>
      </div>

      <!-- ชุดคำที่จะทดสอบ -->
      <div class="section-group">
        <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>ชุดคำที่จะทดสอบ ${selectedChapters.length > 1 ? `<span style="color:#60a5fa;font-size:11.5px;">(เลือก ${selectedChapters.length} บท)</span>` : ""}</span>
          ${selectedChapters.length > 0 || statusFilter !== "all" ? `<button onclick="toggleChapter('ทุกบท')" style="background:none;border:none;color:#94a3b8;font-size:11.5px;cursor:pointer;text-decoration:underline;">ล้างการเลือก</button>` : ""}
        </div>
        <div class="chips-row">
          <button class="chip${isAllActive ? " active" : ""}" onclick="toggleChapter('ทุกบท')">ทุกบท (${totalCount})</button>
          ${chaptersChipsHtml}
          <button class="chip${isRepairActive ? " active" : ""}" onclick="toggleStatusFilter('repair')">ที่ยังติด (${cRepair})</button>
          <span id="review-chip-container">
          ${(() => {
            const reviewCount = getReviewList().length;
            if (reviewCount > 0) {
              return `<button class="chip review-chip-btn" style="background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.4);color:#fbbf24;" onclick="startReviewQuiz()">🔁 ทบทวนซ้ำ (${reviewCount})</button>`;
            }
            return "";
          })()}
          </span>
          <button class="chip${isUntestedActive ? " active" : ""}" onclick="toggleStatusFilter('untested')">ยังไม่เคยทดสอบ (${cUntested})</button>
        </div>
        ${
          cRepair > 0
            ? `
          <div style="margin-top:10px;padding:9px 12px;background:#2a0e14;border:1px solid #dc2626;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12.5px;color:#fca5a5;">⚠️ มี <b>${cRepair} ${unitName}</b> ที่ต้องซ่อม (ตอบผิดล่าสุด)</span>
            <button type="button" onclick="startRepairQuiz()" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s;">
              🔧 ซ่อมเฉพาะ${unitWord}ที่ผิด (${cRepair} ${unitName})
            </button>
          </div>
        `
            : ""
        }
        ${
          cUntested > 0
            ? `
          <div style="margin-top:10px;padding:9px 12px;background:#0f2b38;border:1px solid #0284c7;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12.5px;color:#bae6fd;">💡 มี <b>${cUntested} ${unitName}</b> ในบทที่เลือกที่ยังไม่ได้ทดสอบ</span>
            <button type="button" onclick="startRemainingUntested()" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s;">
              ⏩ ทำเฉพาะข้อที่ยังไม่ได้ทำ (${Math.min(typeof questionCountMode === "number" ? questionCountMode : cUntested, cUntested)} ข้อ)
            </button>
          </div>
        `
            : ""
        }
      </div>

      <!-- รูปแบบคำถาม (ซ่อนในโหมดฟังและพิมพ์เพื่อความกระชับ) -->
      <div class="section-group" style="${quizInteraction === "listening" || quizInteraction === "typing" ? "display:none;" : ""}">
        <div class="section-label">รูปแบบคำถาม</div>
        <div class="chips-row">
          <button class="chip${questionDirection === "mixed" ? " active" : ""}" onclick="selectDirection('mixed')">ผสม</button>
          <button class="chip${questionDirection === "m1" ? " active" : ""}" onclick="selectDirection('m1')">คำ → ความหมาย</button>
          <button class="chip${questionDirection === "m2" ? " active" : ""}" onclick="selectDirection('m2')">ความหมาย → คำ</button>
          <button class="chip${questionDirection === "m3" ? " active" : ""}" onclick="selectDirection('m3')">คันจิ → เสียงอ่าน</button>
        </div>
      </div>

      <!-- จำนวนข้อ -->
      <div class="section-group" style="${quizInteraction === "speedrun" ? "display:none;" : ""}">
        <div class="section-label">จำนวนข้อ</div>
        <div class="chips-row">
          <button class="chip${questionCountMode === 10 ? " active" : ""}" onclick="selectCountMode(10)">10 ข้อ</button>
          <button class="chip${questionCountMode === 20 ? " active" : ""}" onclick="selectCountMode(20)">20 ข้อ</button>
          ${filteredPool.length >= 30 ? `<button class="chip${questionCountMode === 30 ? " active" : ""}" onclick="selectCountMode(30)">30 ข้อ</button>` : ""}
          ${filteredPool.length >= 50 ? `<button class="chip${questionCountMode === 50 ? " active" : ""}" onclick="selectCountMode(50)">50 ข้อ</button>` : ""}
          <button class="chip${questionCountMode === "all" ? " active" : ""}" onclick="selectCountMode('all')">ทั้งหมด (${filteredPool.length})</button>
        </div>
      </div>

      <!-- START BUTTON -->
      <button class="btn-primary-cta" onclick="startQuiz()">
        ${quizInteraction === "speedrun" ? "⚡ เริ่มสปีดรัน 60 วินาที" : "เริ่มทดสอบ"}
      </button>

      <!-- CAPTION -->
      <div class="btn-caption">
        ${
          quizInteraction === "typing"
            ? "โหมดพิมพ์คำอ่าน: พิมพ์โรมาจิหรือฮิรางานะ ตอบถูกภายใน 6 วินาทีนับว่าเร็ว และเลื่อนข้ออัตโนมัติ"
            : quizInteraction === "listening"
              ? "โหมดควิซการฟัง: ฟังเสียงอ่านภาษาญี่ปุ่นแล้วเลือกความหมายไทย ตอบถูกภายใน 4 วินาทีนับว่าเร็ว"
              : quizInteraction === "speedrun"
                ? "โหมดสปีดรัน: ตอบให้ได้มากที่สุดภายใน 60 วินาที ตอบถูกติดกันเพื่อสะสม Combo ตัวคูณคะแนน!"
                : "สามารถกดเลือกหลายบทพร้อมกันเพื่อจัดชุดทดสอบเฉพาะกลุ่มได้ ตอบถูกภายใน 4 วินาทีนับว่าเร็ว"
        }
      </div>
    </div>

    <!-- CARD 2: PROGRESS / MASTERY -->
    <div class="quiz-card">
      <div class="progress-card-title">ความคืบหน้าแต่ละบท</div>
      <div class="progress-summary-row">
        <span class="progress-ch-name">${chDisplayLabel} · ${filteredPool.length} คำ</span>
        <span class="progress-stats-txt">
          แม่น ${fMastered} · นิ่ง ${fLearning} · ซ่อม ${fRepair} · ยังไม่ทดสอบ ${fUntested}
        </span>
      </div>
      
      <!-- MULTI-SEGMENT PROGRESS BAR -->
      <div class="multi-seg-bar">
        <div class="seg seg-mastered" style="width: ${pMas}%;"></div>
        <div class="seg seg-learning" style="width: ${pLea}%;"></div>
        <div class="seg seg-repair" style="width: ${pRep}%;"></div>
        <div class="seg seg-untested" style="width: ${pUnt}%;"></div>
      </div>

      <!-- LEGEND -->
      <div class="legend-grid">
        <div class="legend-item">
          <span class="legend-dot dot-mastered"></span>
          <span>แม่นแล้ว: ถูกติดกัน 2 ครั้งขึ้นไป</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-learning"></span>
          <span>กำลังนิ่ง: ถูกล่าสุด 1 ครั้ง</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-repair"></span>
          <span>ต้องซ่อม: ล่าสุดตอบผิด</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-untested"></span>
          <span>ยังไม่ทดสอบ</span>
        </div>
      </div>
    </div>
  `;
}

function toggleChapter(ch) {
  if (ch === "ทุกบท") {
    selectedChapters = [];
    statusFilter = "all";
    currentSubCat = "ทุกบท";
  } else {
    const idx = selectedChapters.indexOf(ch);
    if (idx >= 0) {
      selectedChapters.splice(idx, 1);
    } else {
      selectedChapters.push(ch);
    }
    currentSubCat = selectedChapters.length > 0 ? selectedChapters[0] : "ทุกบท";
  }
  renderTestHome(document.getElementById("main-content"));
}

function toggleStatusFilter(st) {
  if (statusFilter === st) {
    statusFilter = "all";
  } else {
    statusFilter = st;
  }
  renderTestHome(document.getElementById("main-content"));
}

function selectSubCat(cat) {
  if (cat === "repair" || cat === "untested") {
    toggleStatusFilter(cat);
  } else {
    toggleChapter(cat);
  }
}
function selectDirection(dir) {
  questionDirection = dir;
  renderTestHome(document.getElementById("main-content"));
}
function selectCountMode(c) {
  questionCountMode = c;
  renderTestHome(document.getElementById("main-content"));
}
function selectInteraction(m) {
  quizInteraction = m;
  renderTestHome(document.getElementById("main-content"));
}

// ══════════════════════════════════════════════════════════

//  VOCABULARY MANAGER (คำศัพท์ของฉัน / คลังคำศัพท์)
// ══════════════════════════════════════════════════════════
function renderWordsManager(container) {
  const isCustom = currentLevel === "custom";
  const pool = getPoolForLevel(currentLevel);
  const reviewCount = getReviewList().length;

  container.innerHTML = `
    <div class="quiz-card">

      <!-- TOOLBAR -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
        ${
          isCustom
            ? `
          <button class="tool-btn primary" onclick="openAddWordModal()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มคำศัพท์
          </button>
          <button class="tool-btn" onclick="openBulkModal()">📋 วางหลายคำ</button>
          <button class="tool-btn" style="color:#f87171;" onclick="clearSampleWords()">🗑 ลบตัวอย่าง</button>
        `
            : `
          <button class="tool-btn primary" onclick="setAppTab('test')">🎯 เริ่มทดสอบ</button>
        `
        }
        <button id="btn-open-review" onclick="openReviewModal()" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;background:${reviewCount > 0 ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)"};border:1px solid ${reviewCount > 0 ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.08)"};color:${reviewCount > 0 ? "#fbbf24" : "#475569"};border-radius:8px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="${reviewCount > 0 ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <span id="btn-open-review-text">รายการทบทวน</span>
          <span id="btn-open-review-badge" style="background:#fbbf24;color:#0b0f19;border-radius:9999px;padding:0 7px;font-size:11px;font-weight:700;line-height:18px;display:${reviewCount > 0 ? "inline-block" : "none"};">${reviewCount}</span>
        </button>
      </div>

      <!-- SEARCH -->
      <input class="search-input" id="word-search"
        placeholder="🔍 ค้นหาอักษร, คำอ่าน, หมวด..."
        oninput="filterWordList(this.value)">

      <div id="word-list-container" style="margin-top:8px;"></div>
    </div>
  `;

  renderWordItems(pool);
}

function renderWordItems(words) {
  const container = document.getElementById("word-list-container");
  if (!container) return;

  if (words.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:30px;color:#64748b;font-size:13.5px;">
        ยังไม่มีคำศัพท์ในรายการ กดปุ่ม "เพิ่มคำศัพท์" หรือ "วางหลายคำ" เพื่อเริ่มต้น
      </div>
    `;
    return;
  }

  const isCustom = currentLevel === "custom";

  container.innerHTML = words
    .map((item) => {
      const isKana = !item.jp && item.c;
      const displayJp = isKana ? item.c : item.jp;
      const displayRd = isKana ? item.r : item.rd;
      const displayTh = isKana ? item.r : item.th;
      const wordId = item.id || item.jp || item.c;
      const inReview = getReviewList().includes(wordId);

      const st = getMasteryStatus(item);
      let badgeClass = "badge-untested",
        badgeTxt = "ยังไม่ทดสอบ";
      if (st === "mastered") {
        badgeClass = "badge-mastered";
        badgeTxt = "แม่นแล้ว";
      } else if (st === "learning") {
        badgeClass = "badge-learning";
        badgeTxt = "กำลังนิ่ง";
      } else if (st === "repair") {
        badgeClass = "badge-repair";
        badgeTxt = "ต้องซ่อม";
      }

      // label ใต้อักษร: kana แสดง row, vocab แสดง ch
      const subLabel = isKana ? item.row || "" : item.ch ? `[${item.ch}]` : "";


      return `<div class="word-row" id="wr-${CSS.escape(wordId)}">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span class="word-status-badge ${badgeClass}">${badgeTxt}</span>
            <span class="word-jp" style="${isKana ? 'font-size:20px;' : ''}">${displayJp}</span>
            ${!isKana && displayRd ? `<span class="word-rd">(${displayRd})</span>` : ''}
            ${subLabel ? `<span style="font-size:11px;color:#475569;">${subLabel}</span>` : ''}
          </div>
          <div class="word-th">${displayTh}</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          <button class="iBtn" onclick="speakJp('${displayJp.replace(/'/g,"\\'")}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
          <button class="iBtn ${inReview ? 'iBtn--active' : ''}"
            onclick="toggleReview('${wordId.replace(/'/g,"\\'")}',this)"
            title="${inReview ? 'อย่ในรายการ — คลิกลบออก' : 'เพิ่มเข้ารายการทบทวน'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${inReview ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
          ${isCustom ? `<button class="iBtn iBtn--danger" onclick="deleteCustomWord('${wordId.replace(/'/g,"\\'")}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>` : ''}
        </div>
      </div>`;
    })
    .join("");
}

function filterWordList(q) {
  const pool = getPoolForLevel(currentLevel);
  const query = q.trim().toLowerCase();
  if (!query) {
    renderWordItems(pool);
    return;
  }
  const filtered = pool.filter(
    (w) =>
      w.jp.toLowerCase().includes(query) ||
      (w.rd && w.rd.toLowerCase().includes(query)) ||
      w.th.toLowerCase().includes(query) ||
      (w.ch && w.ch.toLowerCase().includes(query)),
  );
  renderWordItems(filtered);
}

// ── CUSTOM WORD ACTIONS ──
function openAddWordModal() {
  document.getElementById("inp-word-jp").value = "";
  document.getElementById("inp-word-rd").value = "";
  document.getElementById("inp-word-th").value = "";
  document.getElementById("inp-word-ch").value = "";
  document.getElementById("edit-word-id").value = "";
  document.getElementById("modal-word-title").textContent = "เพิ่มคำศัพท์ใหม่";
  document.getElementById("add-word-modal").classList.add("open");
}
function closeAddWordModal() {
  document.getElementById("add-word-modal").classList.remove("open");
}

function saveCustomWord(event) {
  if (event) event.preventDefault();
  const jp = document.getElementById("inp-word-jp").value.trim();
  const rd = document.getElementById("inp-word-rd").value.trim();
  const th = document.getElementById("inp-word-th").value.trim();
  const ch = document.getElementById("inp-word-ch").value.trim() || "ทั่วไป";

  if (!jp || !th) {
    showToast("กรุณากรอกคำศัพท์ภาษาญี่ปุ่นและความหมาย", true);
    return;
  }

  const words = getCustomWords();
  words.unshift({
    id: "user_" + Date.now(),
    jp,
    rd,
    th,
    ch,
    ex: false,
  });
  saveCustomWords(words);
  closeAddWordModal();
  renderMain();
}

function deleteCustomWord(idOrJp) {
  showConfirm("ลบคำศัพท์นี้?", "คำนี้จะถูกลบออกจากรายการของคุณ", function () {
    let words = getCustomWords();
    words = words.filter((w) => w.id !== idOrJp && w.jp !== idOrJp);
    saveCustomWords(words);
    renderMain();
    showToast("ลบคำศัพท์แล้ว");
  });
}

function clearSampleWords() {
  showConfirm(
    "ลบคำตัวอย่างทั้งหมด?",
    "คำในหมวด 'ตัวอย่าง' จะถูกลบออกทั้งหมด",
    function () {
      let words = getCustomWords();
      words = words.filter((w) => !w.ex && w.ch !== "ตัวอย่าง");
      saveCustomWords(words);
      renderMain();
      showToast("ลบคำตัวอย่างแล้ว");
    },
  );
}

// ── BULK IMPORT ──
function openBulkModal() {
  document.getElementById("bulk-input").value = "";
  document.getElementById("bulk-default-ch").value = "";
  document.getElementById("bulk-result").textContent = "";
  document.getElementById("bulk-modal").classList.add("open");
}
function closeBulkModal() {
  document.getElementById("bulk-modal").classList.remove("open");
}

function processBulkImport() {
  const text = document.getElementById("bulk-input").value.trim();
  const defCh =
    document.getElementById("bulk-default-ch").value.trim() || "ทั่วไป";
  if (!text) {
    showToast("กรุณาวางข้อความคำศัพท์", true);
    return;
  }

  const lines = text.split("\n");
  const words = getCustomWords();
  let added = 0;
  let skipped = 0;

  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;
    const parts = line.includes("\t") ? line.split("\t") : line.split("|");
    const cleanParts = parts.map((p) => p.trim());

    let jp = "",
      rd = "",
      th = "",
      ch = defCh;

    if (cleanParts.length >= 4) {
      jp = cleanParts[0];
      rd = cleanParts[1];
      th = cleanParts[2];
      ch = cleanParts[3] || defCh;
    } else if (cleanParts.length === 3) {
      jp = cleanParts[0];
      rd = cleanParts[1];
      th = cleanParts[2];
    } else if (cleanParts.length === 2) {
      jp = cleanParts[0];
      th = cleanParts[1];
    }

    if (jp && th) {
      const exists = words.some((w) => w.jp === jp && w.rd === rd);
      if (!exists) {
        words.push({
          id:
            "user_" +
            Date.now() +
            "_" +
            Math.random().toString(36).substr(2, 4),
          jp,
          rd,
          th,
          ch,
          ex: false,
        });
        added++;
      } else {
        skipped++;
      }
    }
  });

  saveCustomWords(words);
  document.getElementById("bulk-result").textContent =
    `เพิ่มสำเร็จ ${added} คำ (ข้ามคำซ้ำ ${skipped} คำ)`;
  setTimeout(() => {
    closeBulkModal();
    renderMain();
  }, 1000);
}

// ══════════════════════════════════════════════════════════
//  REVIEW LIST MANAGEMENT (รายการทบทวนซ้ำ)
// ══════════════════════════════════════════════════════════
function getReviewList() {
  const data = localStorage.getItem("jlpt_review_list");
  return data ? JSON.parse(data) : [];
}

function saveReviewList(list) {
  localStorage.setItem("jlpt_review_list", JSON.stringify(list));
}

function addToReviewList(wordId) {
  const list = getReviewList();
  if (!list.includes(wordId)) {
    list.push(wordId);
    saveReviewList(list);
    showToast("✅ เพิ่มเข้ารายการทบทวนแล้ว");
  } else {
    showToast("ℹ️ อยู่ในรายการทบทวนอยู่แล้ว");
  }
}

function removeFromReviewList(wordId) {
  const list = getReviewList();
  const idx = list.indexOf(wordId);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveReviewList(list);
  }
}

function toggleReview(wordId, btn) {
  const list = getReviewList();
  const idx = list.indexOf(wordId);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveReviewList(list);
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    btn.classList.remove("iBtn--active");
    btn.title = "เพิ่มเข้ารายการทบทวน";
    showToast("ลบออกจากรายการทบทวนแล้ว");
  } else {
    list.push(wordId);
    saveReviewList(list);
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    btn.classList.add("iBtn--active");
    btn.title = "อยู่ในรายการทบทวนแล้ว — คลิกเพื่อลบออก";
    showToast("✅ เพิ่มเข้ารายการทบทวนแล้ว");
  }
  updateReviewChip();
}

function updateReviewChip() {
  const count = getReviewList().length;

  // 1. อัปเดตปุ่ม "รายการทบทวน" ในแท็บคำศัพท์ (Toolbar)
  const toolbarBtn = document.getElementById("btn-open-review");
  const toolbarBadge = document.getElementById("btn-open-review-badge");
  const toolbarSvg = toolbarBtn ? toolbarBtn.querySelector("svg") : null;
  if (toolbarBtn) {
    toolbarBtn.style.background = count > 0 ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)";
    toolbarBtn.style.borderColor = count > 0 ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.08)";
    toolbarBtn.style.color = count > 0 ? "#fbbf24" : "#475569";
    if (toolbarSvg) {
      toolbarSvg.setAttribute("fill", count > 0 ? "currentColor" : "none");
    }
  }
  if (toolbarBadge) {
    toolbarBadge.textContent = count;
    toolbarBadge.style.display = count > 0 ? "inline-block" : "none";
  }

  // 2. อัปเดตชิปในหน้าทดสอบ (Test Home Chip)
  const chipContainer = document.getElementById("review-chip-container");
  if (chipContainer) {
    chipContainer.innerHTML = count > 0
      ? `<button class="chip review-chip-btn" style="background:rgba(251,191,36,0.15);border-color:rgba(251,191,36,0.4);color:#fbbf24;" onclick="startReviewQuiz()">🔁 ทบทวนซ้ำ (${count})</button>`
      : "";
  }

  // 3. อัปเดตการ์ดในหน้า Overview Dashboard (ถ้ากำลังเปิดอยู่)
  const overviewActionCard = document.querySelector(".overview-action-card.gold");
  if (overviewActionCard) {
    const titleEl = overviewActionCard.querySelector(".overview-act-title");
    if (titleEl) titleEl.textContent = `รายการทบทวน (${count} คำ)`;
    if (count === 0) overviewActionCard.style.display = "none";
  }
}

function clearReviewList() {
  showConfirm(
    "ลบรายการทบทวนทั้งหมด?",
    "ยืนยันจะลบคำทั้งหมดออกจากรายการ",
    function () {
      saveReviewList([]);
      showToast("✅ ลบรายการทบทวนทั้งหมดแล้ว");
      renderMain();
    },
  );
}

function getReviewPool() {
  const reviewIds = getReviewList();
  if (reviewIds.length === 0) return [];
  const allWords = getPoolForLevel(currentLevel);
  return allWords.filter(function (w) {
    return reviewIds.includes(w.id || w.jp || w.c);
  });
}

function openReviewModal() {
  const list = getReviewList();
  const pool = getPoolForLevel(currentLevel);
  const items = list
    .map((id) => pool.find((w) => (w.id || w.jp || w.c) === id))
    .filter(Boolean);

  const body = document.getElementById("review-modal-body");
  if (!body) return;

  if (items.length === 0) {
    body.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:36px;margin-bottom:12px;">📭</div>
        <div style="color:#94a3b8;font-size:14px;line-height:1.6;">
          ยังไม่มีคำในรายการทบทวน<br>
          กดปุ่ม <span style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);color:#fbbf24;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:700;">＋</span>
          ที่คำศัพท์ใดก็ได้เพื่อเพิ่มเข้ามา
        </div>
      </div>`;
  } else {
    const rows = items
      .map((item) => {
        const isKana = !item.jp && item.c;
        const displayJp = isKana ? item.c : item.jp;
        const displayRd = isKana ? item.r : item.rd;
        const displayTh = isKana ? item.r : item.th;
        const wordId = item.id || item.jp || item.c;
        const subLabel = isKana ? item.row : item.ch;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:${isKana ? "24px" : "17px"};font-weight:600;color:#f1f5f9;">${displayJp}</span>
            ${displayRd && !isKana ? `<span style="color:#94a3b8;font-size:13px;">（${displayRd}）</span>` : ""}
            ${subLabel ? `<span style="font-size:11px;color:#475569;background:rgba(255,255,255,0.06);border-radius:4px;padding:1px 6px;">${subLabel}</span>` : ""}
          </div>
          <div style="color:#64748b;font-size:12.5px;margin-top:2px;">${displayTh}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="iBtn" onclick="speakJp('${displayJp.replace(/'/g, "\\'")}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </button>
          <button class="iBtn iBtn--danger" data-wid="${wordId.replace(/"/g, "&quot;")}"
            onclick="removeFromReviewModal(this.dataset.wid, this.closest('div[style]'))"
            title="ลบออกจากรายการ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>`;
      })
      .join("");

    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span id="review-count-label" style="font-size:13px;color:#94a3b8;">${items.length} คำในรายการ</span>
        <button onclick="clearReviewListFromModal()"
          style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);color:#f87171;border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;">
          🗑 ลบทั้งหมด
        </button>
      </div>
      ${rows}`;
  }

  document.getElementById("review-modal").style.display = "flex";
}

function closeReviewModal() {
  document.getElementById("review-modal").style.display = "none";
  renderMain();
}

function removeFromReviewModal(wordId, rowEl) {
  removeFromReviewList(wordId);
  if (rowEl) rowEl.remove();
  const list = getReviewList();
  const countEl = document.getElementById("review-count-label");
  if (countEl) countEl.textContent = list.length + " คำในรายการ";
  if (list.length === 0) openReviewModal();
  showToast("ลบออกจากรายการทบทวนแล้ว");
}

function clearReviewListFromModal() {
  showConfirm(
    "ลบรายการทบทวนทั้งหมด?",
    "ยืนยันจะลบคำทั้งหมดออกจากรายการ",
    function () {
      saveReviewList([]);
      openReviewModal();
      showToast("✅ ลบรายการทบทวนทั้งหมดแล้ว");
    },
  );
}

function showToast(msg, isError) {
  const existing = document.getElementById("toast-msg");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "toast-msg";
  toast.textContent = msg;
  toast.style.cssText =
    "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:" +
    (isError ? "rgba(220,38,38,0.95)" : "rgba(15,23,42,0.95)") +
    ";border:1px solid rgba(255,255,255,0.15);color:white;padding:10px 22px;border-radius:9999px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:10000;white-space:nowrap;";
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 2200);
}

function showConfirm(title, subtitle, onConfirm) {
  const existing = document.getElementById("confirm-dialog");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "confirm-dialog";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:20000;padding:20px;";
  overlay.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;max-width:320px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
      <div style="font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:6px;">${title}</div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:20px;">${subtitle}</div>
      <div style="display:flex;gap:8px;">
        <button id="confirm-cancel" style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:13px;cursor:pointer;">ยกเลิก</button>
        <button id="confirm-ok" style="flex:1;padding:10px;border-radius:8px;background:#dc2626;border:none;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">ยืนยัน</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("confirm-cancel").onclick = function () {
    overlay.remove();
  };
  document.getElementById("confirm-ok").onclick = function () {
    overlay.remove();
    onConfirm();
  };
  overlay.onclick = function (e) {
    if (e.target === overlay) overlay.remove();
  };
}

function startReviewQuiz() {
  const reviewPool = getReviewPool();
  if (reviewPool.length === 0) {
    showToast("ยังไม่มีคำในรายการทบทวน", true);
    return;
  }
  window.customQuizPool = reviewPool;
  questionCountMode = reviewPool.length;
  startQuiz();
}