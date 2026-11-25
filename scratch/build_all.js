const fs = require('fs');

// Read source files (normalize \r\n to \n)
const quizHtml = fs.readFileSync('quiz.html', 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync('index.html.bak', 'utf8').replace(/\r\n/g, '\n');

fs.mkdirSync('css', { recursive: true });
fs.mkdirSync('js', { recursive: true });

// ─────────────────────────────────────────────────────────────
// 1. EXTRACT CSS
// ─────────────────────────────────────────────────────────────

const qStyle = quizHtml.substring(quizHtml.indexOf('<style>') + 7, quizHtml.indexOf('</style>'));
const iStyle = indexHtml.substring(indexHtml.indexOf('<style>') + 7, indexHtml.indexOf('</style>'));

// 1.1 css/quiz.css
const appShellIdx = qStyle.indexOf('/* ── APP SHELL ── */');
const floatingNavIdx = qStyle.indexOf('/* ── MODERN FLOATING PILL NAVBAR ── */');
const titleSectionIdx = qStyle.indexOf('/* ── TITLE SECTION ── */');

const quizCssPart1 = qStyle.substring(appShellIdx, floatingNavIdx).trim();
const quizCssPart2 = qStyle.substring(titleSectionIdx).trim();

const flashcardIframeCss = `
/* ── EMBEDDED FLASHCARD VIEW ── */
#flashcard-view {
  display: none;
  width: 100%;
  height: calc(100dvh - 68px);
  min-height: 500px;
  background: #0b0f19;
}
#flashcard-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
`;

const quizCss = `/* ══════════════════════════════════════════════════════════
   JLPT QUIZ — PAGE STYLES
   ══════════════════════════════════════════════════════════ */

${quizCssPart1}

${quizCssPart2}

${flashcardIframeCss}
`;
fs.writeFileSync('css/quiz.css', quizCss, 'utf8');
console.log('css/quiz.css written, length:', quizCss.length);

// 1.2 css/flashcard.css
const iStatsReplacedIdx = iStyle.indexOf('.content{');
const flashcardCssCore = iStyle.substring(iStatsReplacedIdx).trim();

const flashcardCss = `/* ══════════════════════════════════════════════════════════
   JLPT FLASHCARD — PAGE STYLES
   ══════════════════════════════════════════════════════════ */

body.is-embedded .floating-nav-wrapper {
  display: none !important;
}

${flashcardCssCore}
`;
fs.writeFileSync('css/flashcard.css', flashcardCss, 'utf8');
console.log('css/flashcard.css written, length:', flashcardCss.length);


// ─────────────────────────────────────────────────────────────
// 2. EXTRACT JAVASCRIPT MODULES BY LINE
// ─────────────────────────────────────────────────────────────

const qScript = quizHtml.substring(quizHtml.indexOf('<script>') + 8, quizHtml.lastIndexOf('</script>'));
const iScript = indexHtml.substring(indexHtml.indexOf('<script>') + 8, indexHtml.lastIndexOf('</script>'));

const qLines = qScript.split('\n');
const iLines = iScript.split('\n');

// Line markers in quiz.html
const qL_dataStorage  = qLines.findIndex(l => l.includes('DATA & STORAGE'));            // ~7
const qL_romaji       = qLines.findIndex(l => l.includes('PHASE 1: ROMAJI CONVERTER'));  // ~121
const qL_resolver     = qLines.findIndex(l => l.includes('DATA RESOLVER'));              // ~305
const qL_nav          = qLines.findIndex(l => l.includes('FLOATING CAPSULE NAVBAR'));     // ~394
const qL_uiNav        = qLines.findIndex(l => l.includes('UI NAVIGATION'));              // ~461
const qL_quizRunner   = qLines.findIndex(l => l.includes('QUIZ RUNNER ENGINE'));         // ~767
const qL_vocabManager = qLines.findIndex(l => l.includes('VOCABULARY MANAGER'));         // ~1649
const qL_speech       = qLines.findIndex(l => l.includes('SPEECH (Web Speech API)'));    // ~1868
const qL_backup       = qLines.findIndex(l => l.includes('BACKUP & RESTORE'));           // ~1880
const qL_changelog    = qLines.findIndex(l => l.includes('CHANGELOG / VERSION NOTIFICATION')); // ~1969
const qL_init         = qLines.findIndex(l => l.includes('//  INIT'));                   // ~2012

// Line markers in index.html.bak
const iL_state  = iLines.findIndex(l => l.includes('//  STATE'));                 // ~7
const iL_backup = iLines.findIndex(l => l.includes('//  BACKUP / RESTORE'));      // ~654

// 2.1 js/utils.js: LocalStorage helpers, Romaji normalizer, Kana display, srsKey
const utilsCode = qLines.slice(qL_romaji, qL_resolver).join('\n').trim();
const utilsJs = `/* ══════════════════════════════════════════════════════════
   JLPT UTILITIES & NORMALIZERS
   ══════════════════════════════════════════════════════════ */

// Universal LocalStorage helpers
function loadLS(k, def) {
  try {
    const v = localStorage.getItem(k);
    return v != null ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}

function saveLS(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

${utilsCode}

// SRS Key generator for Flashcards (supports Kanji, Vocab, Kana, Grammar)
function srsKey(d) {
  return d.c || d.w || d.k || d.p || '';
}
`;
fs.writeFileSync('js/utils.js', utilsJs, 'utf8');
console.log('js/utils.js written, length:', utilsJs.length);

// 2.2 js/nav.js: Capsule navbar & dropdown logic
let navCode = qLines.slice(qL_nav, qL_uiNav).join('\n').trim();
navCode = navCode.replace(
  "['group-kana','group-n5','group-n4n3','tab-scene','tab-custom']",
  "['group-kana','group-n5','group-n4n3','tab-scene','tab-custom','tab-flashcard']"
);
navCode = navCode.replace(
  "['tab-hiragana','tab-katakana','tab-n5','tab-vocab5','tab-grammar5','tab-n4','tab-n3','tab-scene','tab-custom']",
  "['tab-hiragana','tab-katakana','tab-n5','tab-vocab5','tab-grammar5','tab-n4','tab-n3','tab-scene','tab-custom','tab-flashcard']"
);
if (!navCode.includes("lv==='flashcard'")) {
  navCode = navCode.replace(
    "} else if(lv==='custom'){",
    "} else if(lv==='flashcard'){\n    const g=document.getElementById('tab-flashcard');\n    if(g) g.classList.add('active');\n  } else if(lv==='custom'){"
  );
}

const navJs = `/* ══════════════════════════════════════════════════════════
   FLOATING CAPSULE NAVBAR & DROPDOWNS
   ══════════════════════════════════════════════════════════ */

${navCode}
`;
fs.writeFileSync('js/nav.js', navJs, 'utf8');
console.log('js/nav.js written, length:', navJs.length);

// 2.3 js/backup.js: Unified Backup & Restore
// Extract from index.html.bak (lines 654 to 848)
const backupCode = iLines.slice(iL_backup, 848).join('\n').trim();

const backupJs = `/* ══════════════════════════════════════════════════════════
   BACKUP & RESTORE (UNIFIED JSON SCHEMA)
   ══════════════════════════════════════════════════════════ */

${backupCode}

// Modal open/close for backup
function openBackup(){
  const m = document.getElementById('backup-modal');
  if(m) {
    m.classList.add('open');
    m.classList.add('active');
  }
}
function closeBackup(){
  const m = document.getElementById('backup-modal');
  if(m) {
    m.classList.remove('open');
    m.classList.remove('active');
  }
}

// Alias for quiz compatibility
function exportData() {
  exportBackup();
}
`;
fs.writeFileSync('js/backup.js', backupJs, 'utf8');
console.log('js/backup.js written, length:', backupJs.length);

// 2.4 js/changelog.js
const changelogCode = qLines.slice(qL_changelog, qL_init).join('\n').trim();
const changelogJs = `/* ══════════════════════════════════════════════════════════
   CHANGELOG & VERSION BADGE
   ══════════════════════════════════════════════════════════ */

${changelogCode}
`;
fs.writeFileSync('js/changelog.js', changelogJs, 'utf8');
console.log('js/changelog.js written, length:', changelogJs.length);

// 2.5 js/tts.js
const speechCode = qLines.slice(qL_speech, qL_backup).join('\n').trim();
const ttsJs = `/* ══════════════════════════════════════════════════════════
   TEXT-TO-SPEECH (TTS)
   ══════════════════════════════════════════════════════════ */

${speechCode}

function speakSlow(text) {
  speak(text, 0.65);
}
`;
fs.writeFileSync('js/tts.js', ttsJs, 'utf8');
console.log('js/tts.js written, length:', ttsJs.length);

// 2.6 js/quiz-engine.js: Data storage, App state, Mastery logic, Data resolver, Quiz runner, Summary
const quizPart1 = qLines.slice(qL_dataStorage, qL_romaji).join('\n').trim(); // Storage + State + Mastery
const quizPart2 = qLines.slice(qL_resolver, qL_nav).join('\n').trim();       // Data resolver (getPoolForLevel)
const quizPart3 = qLines.slice(qL_quizRunner, qL_vocabManager).join('\n').trim(); // Runner + Results

const quizEngineJs = `/* ══════════════════════════════════════════════════════════
   QUIZ TESTING ENGINE (4 MODES, TIMER, RESULTS, REPAIR)
   ══════════════════════════════════════════════════════════ */

${quizPart1}

${quizPart2}

${quizPart3}
`;
fs.writeFileSync('js/quiz-engine.js', quizEngineJs, 'utf8');
console.log('js/quiz-engine.js written, length:', quizEngineJs.length);

// 2.7 js/quiz-words.js: UI Navigation, Test Home & Vocabulary Manager
const wordsPart1 = qLines.slice(qL_uiNav, qL_quizRunner).join('\n').trim();     // UI Navigation & renderTestHome
const wordsPart2 = qLines.slice(qL_vocabManager, qL_speech).join('\n').trim(); // Vocabulary manager & custom words

const quizWordsJs = `/* ══════════════════════════════════════════════════════════
   QUIZ VOCABULARY MANAGER & ROUTING
   ══════════════════════════════════════════════════════════ */

${wordsPart1}

${wordsPart2}
`;
fs.writeFileSync('js/quiz-words.js', quizWordsJs, 'utf8');
console.log('js/quiz-words.js written, length:', quizWordsJs.length);

// 2.8 js/flashcard.js: Flashcard, SRS, stats, modes, scenes
const flashcardCode = iLines.slice(iL_state, iL_backup).join('\n').trim();
const flashcardJs = `/* ══════════════════════════════════════════════════════════
   JLPT FLASHCARD & SRS ENGINE
   ══════════════════════════════════════════════════════════ */

${flashcardCode}
`;
fs.writeFileSync('js/flashcard.js', flashcardJs, 'utf8');
console.log('js/flashcard.js written, length:', flashcardJs.length);

console.log('ALL MODULES EXTRACTED SUCCESSFULLY!');
