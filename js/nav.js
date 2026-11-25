/* ══════════════════════════════════════════════════════════
   FLOATING CAPSULE NAVBAR & DROPDOWNS (HOVER / HOLD & TOUCH)
   ══════════════════════════════════════════════════════════ */

let navDropdownTimer = null;
let navJustSelected = false; // flag: ป้องกัน mouseenter เปิดกลับทันทีหลัง click item

function toggleNavDropdown(wrapId, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const isOpen = wrap.classList.contains("open");
  closeAllNavDropdowns();
  if (!isOpen) {
    wrap.classList.add("open");
  }
}

function closeAllNavDropdowns() {
  clearTimeout(navDropdownTimer);
  document.querySelectorAll(".nav-dropdown-wrap.open").forEach((w) => {
    w.classList.remove("open");
  });
}

function selectNavLevel(lv, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  // ตั้ง flag ป้องกัน mouseenter เปิดกลับทันที และ cancel timer ที่ค้างอยู่
  navJustSelected = true;
  clearTimeout(navDropdownTimer);
  document
    .querySelectorAll(".nav-dropdown-wrap")
    .forEach((w) => w.classList.remove("open"));
  setTimeout(() => {
    navJustSelected = false;
  }, 300);
  if (typeof switchLevel === "function") {
    switchLevel(lv);
  }
}

function updateNavCapsuleState(lv) {
  const homeBadge = document.getElementById("nav-brand-home") || document.querySelector(".nav-brand-badge");
  if (homeBadge) {
    if (lv === "overview") {
      homeBadge.classList.add("active");
    } else {
      homeBadge.classList.remove("active");
    }
  }

  [
    "group-kana",
    "group-n5",
    "group-n4",
    "group-n3",
    "group-n4n3",
    "tab-scene",
    "tab-custom",
    "tab-flashcard",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("group-active", "active");
  });
  [
    "tab-hiragana",
    "tab-katakana",
    "tab-n5",
    "tab-vocab5",
    "tab-grammar5",
    "tab-n4",
    "tab-n3",
    "tab-scene",
    "tab-custom",
    "tab-flashcard",
    "tab-all",
    "tab-quiz",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  });

  const actEl = document.getElementById("tab-" + lv);
  if (actEl) actEl.classList.add("active");

  if (lv === "hiragana" || lv === "katakana") {
    const g = document.getElementById("group-kana");
    if (g) g.classList.add("group-active");
  } else if (lv === "n5" || lv === "vocab5" || lv === "grammar5") {
    const g = document.getElementById("group-n5");
    if (g) g.classList.add("group-active");
  } else if (lv === "n4") {
    const g = document.getElementById("group-n4") || document.getElementById("group-n4n3");
    if (g) g.classList.add("group-active");
  } else if (lv === "n3" || lv === "all") {
    const g = document.getElementById("group-n3") || document.getElementById("group-n4n3");
    if (g) g.classList.add("group-active");
  } else if (lv === "scene") {
    const g = document.getElementById("tab-scene");
    if (g) g.classList.add("active");
  } else if (lv === "flashcard") {
    const g = document.getElementById("tab-flashcard");
    if (g) g.classList.add("active");
  } else if (lv === "custom") {
    const g = document.getElementById("tab-custom");
    if (g) g.classList.add("active");
  }
}

function initNavDropdowns() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".nav-dropdown-wrap").forEach((wrap) => {
    // Hover เปิด dropdown — ข้ามถ้าเพิ่ง click item ไป
    wrap.addEventListener("mouseenter", () => {
      if (navJustSelected) return;
      clearTimeout(navDropdownTimer);
      document.querySelectorAll(".nav-dropdown-wrap.open").forEach((w) => {
        if (w !== wrap) w.classList.remove("open");
      });
      wrap.classList.add("open");
    });

    // เมาส์ออก: ปิดหลัง 180ms
    wrap.addEventListener("mouseleave", () => {
      clearTimeout(navDropdownTimer);
      navDropdownTimer = setTimeout(() => {
        wrap.classList.remove("open");
      }, 180);
    });
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavDropdowns);
  } else {
    initNavDropdowns();
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-dropdown-wrap")) {
      closeAllNavDropdowns();
    }
  });

  // Back to Top button scroll observer
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("scroll", () => {
      const topBtn = document.getElementById("btn-back-to-top");
      if (!topBtn) return;
      if (window.scrollY > 280) {
        topBtn.classList.add("show");
      } else {
        topBtn.classList.remove("show");
      }
    }, { passive: true });
  }
}

function selectDropdownItem(val) {
  selectNavLevel(val);
}
