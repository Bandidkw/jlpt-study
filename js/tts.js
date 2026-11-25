/* ══════════════════════════════════════════════════════════
   TEXT-TO-SPEECH (TTS)
   ══════════════════════════════════════════════════════════ */

let _jaVoice = null;

function _getJaVoice() {
  if (_jaVoice) return _jaVoice;
  const vs = window.speechSynthesis.getVoices();
  _jaVoice =
    vs.find((v) => v.lang === "ja-JP" && v.localService) ||
    vs.find((v) => v.lang === "ja-JP") ||
    vs.find((v) => v.lang.startsWith("ja")) ||
    null;
  return _jaVoice;
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener("voiceschanged", () => {
    _jaVoice = null;
  });
}

function speakJp(text, rate) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = "ja-JP";
  ut.rate = rate || 0.9;
  const v = _getJaVoice();
  if (v) ut.voice = v;
  window.speechSynthesis.speak(ut);
}

function speakSlow(text) {
  speakJp(text, 0.65);
}
