/* ══════════════════════════════════════════════════════════
   CHANGELOG & VERSION BADGE
   ══════════════════════════════════════════════════════════ */

//  CHANGELOG / VERSION NOTIFICATION
// ══════════════════════════════════════════════════════════
const CURRENT_APP_VERSION = "2.7.0";

function checkChangelogBadge() {
  const seen = localStorage.getItem("jlpt_seen_version");
  const dot = document.getElementById("changelog-badge-dot");
  if (dot) {
    if (seen !== CURRENT_APP_VERSION) {
      dot.classList.add("show");
    } else {
      dot.classList.remove("show");
    }
  }
}

function openChangelog() {
  const m = document.getElementById("changelog-modal");
  if (m) {
    m.classList.add("open");
    m.classList.add("active");
  }
  localStorage.setItem("jlpt_seen_version", CURRENT_APP_VERSION);
  checkChangelogBadge();
}

function closeChangelog() {
  const m = document.getElementById("changelog-modal");
  if (m) {
    m.classList.remove("open");
    m.classList.remove("active");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeChangelog();
    if (typeof closeBackup === "function") closeBackup();
    if (typeof closeAddWordModal === "function") closeAddWordModal();
    if (typeof closeScene === "function") closeScene();
  }
});

// ══════════════════════════════════════════════════════════
