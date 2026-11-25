/* ══════════════════════════════════════════════════════════
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

//  PHASE 1: ROMAJI CONVERTER & ALTERNATE SPELLINGS
// ══════════════════════════════════════════════════════════
const KANA_MAP = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  ア: "a",
  イ: "i",
  ウ: "u",
  エ: "e",
  オ: "o",
  カ: "ka",
  キ: "ki",
  ク: "ku",
  ケ: "ke",
  コ: "ko",
  サ: "sa",
  シ: "shi",
  ス: "su",
  セ: "se",
  ソ: "so",
  タ: "ta",
  チ: "chi",
  ツ: "tsu",
  テ: "te",
  ト: "to",
  ナ: "na",
  ニ: "ni",
  ヌ: "nu",
  ネ: "ne",
  ノ: "no",
  ハ: "ha",
  ヒ: "hi",
  フ: "fu",
  ヘ: "he",
  ホ: "ho",
  マ: "ma",
  ミ: "mi",
  ム: "mu",
  メ: "me",
  モ: "mo",
  ヤ: "ya",
  ユ: "yu",
  ヨ: "yo",
  ラ: "ra",
  リ: "ri",
  ル: "ru",
  レ: "re",
  ロ: "ro",
  ワ: "wa",
  ヲ: "wo",
  ン: "n",
  ガ: "ga",
  ギ: "gi",
  グ: "gu",
  ゲ: "ge",
  ゴ: "go",
  ザ: "za",
  ジ: "ji",
  ズ: "zu",
  ゼ: "ze",
  ゾ: "zo",
  ダ: "da",
  ヂ: "ji",
  ヅ: "zu",
  デ: "de",
  ド: "do",
  バ: "ba",
  ビ: "bi",
  ブ: "bu",
  ベ: "be",
  ボ: "bo",
  パ: "pa",
  ピ: "pi",
  プ: "pu",
  ペ: "pe",
  ポ: "po",
  キャ: "kya",
  キュ: "kyu",
  キョ: "kyo",
  シャ: "sha",
  シュ: "shu",
  ショ: "sho",
  チャ: "cha",
  チュ: "chu",
  チョ: "cho",
  ニャ: "nya",
  ニュ: "nyu",
  ニョ: "nyo",
  ヒャ: "hya",
  ヒュ: "hyu",
  ヒョ: "hyo",
  ミャ: "mya",
  ミュ: "myu",
  ミョ: "myo",
  リャ: "rya",
  リュ: "ryu",
  リョ: "ryo",
  ギャ: "gya",
  ギュ: "gyu",
  ギョ: "gyo",
  ジャ: "ja",
  ジュ: "ju",
  ジョ: "jo",
  ビャ: "bya",
  ビュ: "byu",
  ビョ: "byo",
  ピャ: "pya",
  ピュ: "pyu",
  ピョ: "pyo",
  ファ: "fa",
  フィ: "fi",
  フェ: "fe",
  フォ: "fo",
  ティ: "ti",
  ディ: "di",
  ドゥ: "du",
  ウィ: "wi",
  ウェ: "we",
  ウォ: "wo",
  ヴ: "vu",
  ヴァ: "va",
  ヴィ: "vi",
  ヴェ: "ve",
  ヴォ: "vo",
  チェ: "che",
  シェ: "she",
  ジェ: "je",
};

function kanaToRomaji(k) {
  if (!k) return "";
  let res = "";
  let i = 0;
  while (i < k.length) {
    if (k[i] === "ー") {
      if (res.length > 0) {
        const last = res.slice(-1);
        if (["a", "i", "u", "e", "o"].includes(last)) {
          res += last;
        }
      }
      i++;
      continue;
    }
    if (i + 1 < k.length) {
      const pair = k.substr(i, 2);
      if (KANA_MAP[pair]) {
        res += KANA_MAP[pair];
        i += 2;
        continue;
      }
    }
    if (k[i] === "っ" || k[i] === "ッ") {
      if (i + 1 < k.length) {
        const nextPair = k.substr(i + 1, 2);
        const nextSingle = k[i + 1];
        const nextRom = KANA_MAP[nextPair] || KANA_MAP[nextSingle] || "";
        if (nextRom && nextRom.length > 0) {
          res += nextRom[0];
          i++;
          continue;
        }
      }
    }
    const ch = k[i];
    res += KANA_MAP[ch] !== undefined ? KANA_MAP[ch] : ch;
    i++;
  }
  return res;
}

function normalizeRomaji(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[ōóô]/g, "ou")
    .replace(/[ūúû]/g, "uu")
    .replace(/[ēéê]/g, "ee")
    .replace(/[āáâ]/g, "aa")
    .replace(/[\-_\s\.\,]/g, "");
}

function toCanonical(s) {
  if (!s) return "";
  return s
    .replace(/sya/g, "sha")
    .replace(/syu/g, "shu")
    .replace(/syo/g, "sho")
    .replace(/tya/g, "cha")
    .replace(/tyu/g, "chu")
    .replace(/tyo/g, "cho")
    .replace(/zya/g, "ja")
    .replace(/zyu/g, "ju")
    .replace(/zyo/g, "jo")
    .replace(/jya/g, "ja")
    .replace(/jyu/g, "ju")
    .replace(/jyo/g, "jo")
    .replace(/tsu/g, "tu")
    .replace(/shi/g, "si")
    .replace(/chi/g, "ti")
    .replace(/fu/g, "hu")
    .replace(/dzu/g, "zu")
    .replace(/du/g, "zu")
    .replace(/di/g, "ji")
    .replace(/zi/g, "ji")
    .replace(/wo/g, "o")
    .replace(/ou/g, "oo")
    .replace(/ei/g, "ee")
    .replace(/nn/g, "n");
}

function stripLongVowels(s) {
  if (!s) return "";
  return s
    .replace(/ou/g, "o")
    .replace(/oo/g, "o")
    .replace(/uu/g, "u")
    .replace(/ee/g, "e")
    .replace(/aa/g, "a")
    .replace(/ii/g, "i");
}

function checkRomajiMatch(userInput, targetRomaji, targetKana) {
  const u = normalizeRomaji(userInput);
  if (!u) return false;

  // Direct match with input if user typed Japanese kana
  if (targetKana && userInput.trim() === targetKana.trim()) return true;

  const t = normalizeRomaji(targetRomaji || kanaToRomaji(targetKana));
  if (u === t) return true;

  // Comprehensive Alternate spellings: Hepburn, Nihon-shiki, Kunrei-shiki, IME
  const cu = toCanonical(u);
  const ct = toCanonical(t);
  if (cu === ct) return true;
  if (toCanonical(stripLongVowels(u)) === toCanonical(stripLongVowels(t)))
    return true;

  // If target has kana, check converted canonical
  if (targetKana) {
    const conv = normalizeRomaji(kanaToRomaji(targetKana));
    const cConv = toCanonical(conv);
    if (cu === cConv) return true;
    if (toCanonical(stripLongVowels(u)) === toCanonical(stripLongVowels(cConv)))
      return true;
  }

  return false;
}

// ══════════════════════════════════════════════════════════
//  KANA DISPLAY FORMATTER (SMALL KANA / 拗音 ENHANCEMENT)
// ══════════════════════════════════════════════════════════
const SMALL_KANA_REGEX = /([ゃゅょっゎぁぃぅぇぉャュョッヮァィゥェォ])/g;

function formatJpText(str) {
  if (!str) return "";
  return String(str).replace(
    SMALL_KANA_REGEX,
    '<span class="small-kana">$1</span>',
  );
}

// ══════════════════════════════════════════════════════════

// SRS Key generator for Flashcards (supports Kanji, Vocab, Kana, Grammar)
function srsKey(d) {
  return d.c || d.w || d.k || d.p || "";
}
