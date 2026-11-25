const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'scratch') {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('.');
console.log('Scanned files:', files.length);

// Regex for emojis
const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1FA00}-\u{1FAFF}]/u;

let totalFound = 0;
files.forEach(f => {
  // Let's inspect UI files especially (skip data files if emojis are in data words or kana mnemonics)
  const isData = f.includes('data-') || f.includes('data\\');
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      totalFound++;
      console.log(`[EMOJI] ${f}:${idx+1} [data=${isData}] -> ${line.trim().slice(0, 100)}`);
    }
  });
});

console.log('Total emojis found:', totalFound);
