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
    body: { classList: { add: () => {}, remove: () => {} } }
  },
  localStorage: {
    store: {},
    getItem: (k) => null,
    setItem: (k, v) => {}
  },
  speechSynthesis: { speak: () => {}, cancel: () => {} },
  navigator: {},
  location: { search: '', protocol: 'http:' },
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
  'js/quiz-engine.js',
  'js/quiz-words.js'
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

// Check switchLevel and renderMain
try {
  console.log('\n--- Calling switchLevel("scene") ---');
  vm.runInContext("switchLevel('scene')", context);
  const mainContent = elements['main-content'];
  console.log('main-content innerHTML length (scene):', (mainContent && mainContent.innerHTML) ? mainContent.innerHTML.length : 0);

  console.log('\n--- Calling switchLevel("custom") ---');
  vm.runInContext("switchLevel('custom')", context);
  console.log('main-content innerHTML length (custom):', (mainContent && mainContent.innerHTML) ? mainContent.innerHTML.length : 0);

  console.log('\n--- Calling setAppTab("words") ---');
  vm.runInContext("setAppTab('words')", context);
  console.log('main-content innerHTML length (words tab):', (mainContent && mainContent.innerHTML) ? mainContent.innerHTML.length : 0);
} catch(e) {
  console.error('ERROR during switchLevel:', e);
}
