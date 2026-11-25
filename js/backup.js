/* ══════════════════════════════════════════════════════════
   BACKUP & RESTORE (UNIFIED JSON SCHEMA)
   ══════════════════════════════════════════════════════════ */

//  BACKUP / RESTORE / PERSIST / PWA
// ══════════════════════════════════════════════════════════
// รวมทุก key ที่ต้องสำรอง (SRS, Flashcard, Quiz mastery, คำศัพท์ของฉัน)
const BACKUP_KEYS = [
  "jlpt_srs",
  "jlpt_streak",
  "jlpt_life",
  "jlpt_autospeak",
  "jlpt_custom_words",
  "jlpt_mastery_v2",
];
const BACKUP_META = "jlpt_lastbackup"; // ไม่รวมในไฟล์สำรอง
const BACKUP_SNOOZE = "jlpt_backup_snooze"; // ไม่รวมในไฟล์สำรอง
const BACKUP_REMIND_DAYS = 14;
let persistState = null; // true | false | null

function buildBackup() {
  const data = {};
  BACKUP_KEYS.forEach((k) => {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = JSON.parse(v);
    } catch {}
  });
  return {
    app: "jlpt-study",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

function setBackupMsg(text, type) {
  const el = document.getElementById("backup-msg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "backup-msg" + (type ? " " + type : "");
}

function markBackedUp() {
  saveLS(BACKUP_META, Date.now());
  renderBackupBanner();
  renderBackupInfo();
}

function renderBackupInfo() {
  const el = document.getElementById("backup-info");
  if (!el) return;
  const cards = Object.keys(getSRS()).length;
  const last = loadLS(BACKUP_META, 0);
  let lastTxt = '<span class="warn">ยังไม่เคยสำรอง</span>';
  if (last) {
    const days = Math.floor((Date.now() - last) / 86400000);
    const d = new Date(last);
    const ds = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
    lastTxt =
      ds +
      (days >= BACKUP_REMIND_DAYS
        ? ` <span class="warn">(${days} วันที่แล้ว)</span>`
        : days > 0
          ? ` (${days} วันที่แล้ว)`
          : " (วันนี้)");
  }
  let pTxt = '<span class="warn">ไม่ทราบสถานะ / ไม่รองรับ</span>';
  if (persistState === true)
    pTxt = '<span class="ok">เบราว์เซอร์รับปากเก็บถาวรแล้ว</span>';
  else if (persistState === false)
    pTxt = '<span class="warn">ยังไม่ได้รับการรับรอง ควรสำรองสม่ำเสมอ</span>';
  el.innerHTML = `การ์ด SRS ที่บันทึกไว้: <b>${cards}</b><br>สำรองล่าสุด: <b>${lastTxt}</b><br>การเก็บข้อมูลถาวร: ${pTxt}`;
}

function renderBackupBanner() {
  const el = document.getElementById("backup-banner");
  if (!el) return;
  const hasData =
    Object.keys(getSRS()).length > 0 || getStreak().dates.length > 0;
  const last = loadLS(BACKUP_META, 0);
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const snooze = loadLS(BACKUP_SNOOZE, 0);
  if (!hasData || Date.now() < snooze || (last && days < BACKUP_REMIND_DAYS)) {
    el.innerHTML = "";
    return;
  }
  const msg = last
    ? `ยังไม่ได้สำรองข้อมูลมา ${days} วันแล้ว`
    : "ยังไม่เคยสำรองข้อมูลเลย";
  el.innerHTML = `<div class="backup-banner"><span>💾 ${msg}</span><button onclick="openBackup()">สำรองเลย</button><button class="ghost" onclick="snoozeBackup()">ไว้ก่อน</button></div>`;
}

function snoozeBackup() {
  saveLS(BACKUP_SNOOZE, Date.now() + 3 * 86400000);
  renderBackupBanner();
}

function openBackup() {
  const m = document.getElementById("backup-modal");
  if (!m) return;
  setBackupMsg("");
  renderBackupInfo();
  m.classList.add("open");
  m.classList.add("active");
}

function closeBackup() {
  const m = document.getElementById("backup-modal");
  if (m) {
    m.classList.remove("open");
    m.classList.remove("active");
  }
}

async function exportBackup() {
  const text = JSON.stringify(buildBackup(), null, 2);
  const name = "jlpt-backup-" + todayStr() + ".json";
  try {
    const file = new File([text], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "สำรองข้อมูล JLPT" });
      markBackedUp();
      setBackupMsg("ส่งออกไฟล์สำรองแล้ว", "ok");
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  try {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    markBackedUp();
    setBackupMsg("ดาวน์โหลดไฟล์สำรองแล้ว", "ok");
  } catch {
    setBackupMsg('ส่งออกไฟล์ไม่สำเร็จ ลองใช้ "คัดลอกข้อมูล" แทน', "err");
  }
}

async function copyBackup() {
  const text = JSON.stringify(buildBackup());
  const ta = document.getElementById("backup-text");
  if (ta) {
    ta.value = text;
  }
  try {
    await navigator.clipboard.writeText(text);
    markBackedUp();
    setBackupMsg(
      "คัดลอกข้อมูลแล้ว นำไปวางเก็บไว้ในที่ปลอดภัย (เช่น Notes)",
      "ok",
    );
  } catch {
    if (ta) {
      ta.focus();
      ta.select();
    }
    setBackupMsg(
      "คัดลอกอัตโนมัติไม่ได้ ให้กดค้างที่ช่องข้อความแล้วเลือกคัดลอกเอง",
      "err",
    );
  }
}

function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("ข้อมูลที่ให้มาอ่านเป็น JSON ไม่ได้");
  }
  if (
    !obj ||
    obj.app !== "jlpt-study" ||
    typeof obj.data !== "object" ||
    obj.data === null
  )
    throw new Error("ไม่ใช่ไฟล์สำรองของแอปนี้");

  const d = obj.data,
    out = {};
  const isNum = (v) => typeof v === "number" && isFinite(v);

  if ("jlpt_srs" in d) {
    const s = d.jlpt_srs;
    if (!s || typeof s !== "object" || Array.isArray(s))
      throw new Error("ข้อมูล SRS ในไฟล์ไม่ถูกต้อง");
    for (const k of Object.keys(s)) {
      const r = s[k];
      if (
        !r ||
        !isNum(r.ease) ||
        !isNum(r.interval) ||
        !isNum(r.due) ||
        !isNum(r.reps)
      )
        throw new Error("ข้อมูล SRS ในไฟล์เสียหาย (การ์ด " + k + ")");
    }
    out.jlpt_srs = s;
  }
  if ("jlpt_streak" in d) {
    const s = d.jlpt_streak;
    if (
      !s ||
      !Array.isArray(s.dates) ||
      !s.dates.every((x) => typeof x === "string")
    )
      throw new Error("ข้อมูล streak ในไฟล์ไม่ถูกต้อง");
    out.jlpt_streak = {
      dates: s.dates,
      lastDate: typeof s.lastDate === "string" ? s.lastDate : "",
    };
  }
  if ("jlpt_life" in d) {
    const l = d.jlpt_life;
    if (
      !l ||
      !isNum(l.sessions) ||
      !isNum(l.totalRight) ||
      !isNum(l.totalWrong)
    )
      throw new Error("ข้อมูลสถิติรวมในไฟล์ไม่ถูกต้อง");
    out.jlpt_life = {
      sessions: l.sessions,
      totalRight: l.totalRight,
      totalWrong: l.totalWrong,
    };
  }
  if ("jlpt_autospeak" in d) out.jlpt_autospeak = !!d.jlpt_autospeak;
  // restore custom words & mastery (ถ้ามีในไฟล์)
  if ("jlpt_custom_words" in d && Array.isArray(d.jlpt_custom_words))
    out.jlpt_custom_words = d.jlpt_custom_words;
  if (
    "jlpt_mastery_v2" in d &&
    typeof d.jlpt_mastery_v2 === "object" &&
    !Array.isArray(d.jlpt_mastery_v2)
  )
    out.jlpt_mastery_v2 = d.jlpt_mastery_v2;

  if (Object.keys(out).length === 0)
    throw new Error("ไม่พบข้อมูลที่นำเข้าได้ในไฟล์");
  return out;
}

function applyImport(text) {
  try {
    const out = parseBackup(text);
    const n = Object.keys(out.jlpt_srs || {}).length;
    const nW = (out.jlpt_custom_words || []).length;
    let msg = "นำเข้าข้อมูลสำรอง";
    if (n) msg += ` (${n} การ์ด SRS)`;
    if (nW) msg += ` + คำศัพท์ ${nW} คำ`;
    msg += "?\nข้อมูลปัจจุบันในเครื่องนี้จะถูกแทนที่";
    if (!confirm(msg)) return;
    saveLS("jlpt_prev_before_import", buildBackup());
    Object.keys(out).forEach((k) => saveLS(k, out[k]));
    saveLS(BACKUP_META, Date.now());
    setBackupMsg("นำเข้าสำเร็จ กำลังโหลดใหม่...", "ok");
    setTimeout(() => location.reload(), 700);
  } catch (e) {
    setBackupMsg(e.message || "นำเข้าไม่สำเร็จ", "err");
  }
}

function importFile(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    applyImport(String(reader.result || ""));
    input.value = "";
  };
  reader.onerror = () => {
    setBackupMsg("อ่านไฟล์ไม่สำเร็จ", "err");
    input.value = "";
  };
  reader.readAsText(f);
}

function importFromTextarea() {
  const ta = document.getElementById("backup-text");
  const t = ta ? ta.value.trim() : "";
  if (!t) {
    setBackupMsg("ยังไม่ได้วางข้อมูลในช่องข้อความ", "err");
    return;
  }
  applyImport(t);
}

async function initPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      persistState =
        (await navigator.storage.persisted()) ||
        (await navigator.storage.persist());
    }
  } catch {
    persistState = null;
  }
  renderBackupInfo();
}

// Alias for quiz compatibility
function exportData() {
  exportBackup();
}
