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
  vm.runInContext(fs.readFileSync(s, 'utf8'), context);
}

const levels = ['custom', 'scene', 'hiragana', 'katakana', 'n5', 'vocab5', 'grammar5', 'n4', 'n3'];

levels.forEach(lv => {
  try {
    vm.runInContext(`switchLevel('${lv}')`, context);
    const lenTest = elements['main-content'].innerHTML.length;
    vm.runInContext(`setAppTab('words')`, context);
    const lenWords = elements['main-content'].innerHTML.length;
    vm.runInContext(`setAppTab('test')`, context);
    console.log(`Level ${lv}: test html len = ${lenTest}, words html len = ${lenWords} -> OK`);
  } catch(e) {
    console.error(`Level ${lv} FAILED:`, e);
  }
});
