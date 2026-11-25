const fs = require('fs');
const vm = require('vm');

const elements = {};
function getEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      querySelectorAll: () => [],
      innerHTML: '',
      textContent: '',
      dataset: {}
    };
  }
  return elements[id];
}

const context = {
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: (id) => getEl(id),
    querySelector: (sel) => getEl(sel),
    querySelectorAll: () => [],
    body: { classList: { add: () => {}, remove: () => {} } },
    documentElement: { style: {}, scrollTop: 0 }
  },
  localStorage: {
    store: {},
    getItem: (k) => null,
    setItem: (k, v) => {}
  },
  speechSynthesis: { speak: () => {}, cancel: () => {}, getVoices: () => [], addEventListener: () => {} },
  navigator: {},
  location: { search: '', protocol: 'http:' },
  requestAnimationFrame: (cb) => cb(),
  setTimeout: (cb) => cb(),
  console: console
};
context.window = context;

vm.createContext(context);

const scripts = [
  'data/kanji.js',
  'data/vocab5.js',
  'data/kana.js',
  'data/grammar5.js',
  'data/scenes.js',
  'js/utils.js',
  'js/nav.js',
  'js/backup.js',
  'js/changelog.js',
  'js/tts.js',
  'js/flashcard.js'
];

for (const s of scripts) {
  try {
    const code = fs.readFileSync(s, 'utf8');
    vm.runInContext(code, context);
    console.log(s + ': LOADED');
  } catch(e) {
    console.error('FAILED TO LOAD ' + s + ':', e.message);
    process.exit(1);
  }
}

try {
  console.log('\n--- Initializing Flashcard ---');
  vm.runInContext("initPersist()", context);
  vm.runInContext("renderFilters()", context);
  vm.runInContext("startAll()", context);
  const main = elements['main'];
  console.log('main innerHTML length (flashcard):', (main && main.innerHTML) ? main.innerHTML.length : 0);
  if (main && main.innerHTML) {
    console.log('First 150 chars:', main.innerHTML.substring(0, 150));
  }
} catch(e) {
  console.error('ERROR during flashcard init:', e);
}
