document.addEventListener("DOMContentLoaded", () => {
  const languages = [
    { name: "English",  code: "ENG" },
    { name: "Chinese",  code: "ZH"  },
    { name: "Tamil",    code: "TA"  },
    { name: "Malay",    code: "MS"  },
    { name: "Japanese", code: "JA"  },
    { name: "Korean",   code: "KO"  },
    { name: "Arabic",   code: "AR"  },
    { name: "Bengali",  code: "BN"  },
    { name: "Burmese",  code: "MY"  }
  ];

  const container = document.querySelector(".atm-container");
  const toggleBtn = document.getElementById("language-toggle");

  if (!container || !toggleBtn) {
    console.error("Missing .atm-container or #language-toggle");
    return;
  }

  // Use SAME key as your working modal script
  let currentLanguageName = localStorage.getItem("selectedLanguage") || "English";

  // ---------- CREATE PANEL ----------
  const panel = document.createElement("div");
  panel.className = "language-panel";
  panel.style.display = "none";

  const header = document.createElement("div");
  header.className = "language-header";

  const title = document.createElement("span");
  title.className = "language-title";
  title.textContent = "Change Language";

  const closeBtn = document.createElement("span");
  closeBtn.className = "language-close";
  closeBtn.innerHTML = "&times;";

  header.appendChild(title);
  header.appendChild(closeBtn);

  const grid = document.createElement("div");
  grid.className = "language-grid";

  panel.appendChild(header);
  panel.appendChild(grid);
  container.appendChild(panel);

  // ---------- Helpers ----------
  function updateToggleText(languageName) {
    const found = languages.find(l => l.name === languageName);
    // If you want 3-letter like "ENG", use found.code (when available)
    // Otherwise fallback to first 3 letters
    toggleBtn.textContent = found?.code || languageName.substring(0, 3).toUpperCase();
  }

  function setActiveLanguage(languageName) {
    // Remove selected + checkmark from all options
    grid.querySelectorAll(".language-option").forEach(opt => {
      opt.classList.remove("selected");
      opt.textContent = opt.textContent.replace(" ✔", "").trim();
    });

    // Find the clicked option and set active
    const target = grid.querySelector(`[data-lang-name="${CSS.escape(languageName)}"]`);
    if (target) {
      target.classList.add("selected");
      target.textContent = languageName + " ✔";
    }

    currentLanguageName = languageName;

    // Update top button text
    updateToggleText(languageName);

    // Save + apply translations (this is what your first script does)
    localStorage.setItem("selectedLanguage", languageName);
    fetchAndApplyTranslations(languageName);

    // Close panel
    panel.style.display = "none";
  }

  // ---------- Build language buttons ----------
  languages.forEach(lang => {
    const a = document.createElement("a");
    a.href = "#";
    a.className = "language-option";
    a.dataset.langName = lang.name;

    grid.appendChild(a);

    a.addEventListener("click", e => {
      e.preventDefault();
      setActiveLanguage(lang.name);
    });
  });

  // ---------- Init UI ----------
  updateToggleText(currentLanguageName);

  // Fill initial option texts + selection
  grid.querySelectorAll(".language-option").forEach(opt => {
    const name = opt.dataset.langName;
    opt.textContent = name;
  });
  setActiveLanguage(currentLanguageName); // this will also call fetchAndApplyTranslations

  // ---------- Toggle / Close ----------
  toggleBtn.addEventListener("click", e => {
    e.preventDefault();
    panel.style.display = panel.style.display === "block" ? "none" : "block";
  });

  closeBtn.addEventListener("click", () => {
    panel.style.display = "none";
  });

  document.addEventListener("click", e => {
    if (panel.style.display === "block" && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      panel.style.display = "none";
    }
  });
});

// 1) DEFINE THIS FIRST
async function fetchAndApplyTranslations(languageName) {
  try {
    const apiUrl = `${window.location.origin}/api/translations`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLang: languageName })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    const translations = await response.json();

    for (const key in translations) {
       document.querySelectorAll(`[translateRef="${key}"]`).forEach(el => {
       el.textContent = translations[key];
      });
    }

  } catch (err) {
    console.error("Translation Load Error:", err);
    alert(`Sorry, we couldn't load the ${languageName} translation. Please try again.`);
  }
}
  
function showCancelModal({
  title = "Are you sure you want to EXIT?",
  onYes = () => (window.location.href = "index.html"),
  onNo = () => {}
} = {}) {
  if (document.getElementById("cancel-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "cancel-overlay";
  overlay.className = "cancel-overlay";

  overlay.innerHTML = `
    <div class="cancel-modal">
      <h1>${title}</h1>
      <div class="cancel-actions">
        <button class="cash-btn" id="cancelNoBtn">No</button>
        <button class="cash-btn" id="cancelYesBtn">Yes</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const noBtn = document.getElementById("cancelNoBtn");
  const yesBtn = document.getElementById("cancelYesBtn");

  noBtn.onclick = () => { onNo(); overlay.remove(); };
  yesBtn.onclick = () => { onYes(); overlay.remove(); };

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const esc = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", esc);
    }
  };
  document.addEventListener("keydown", esc);
}

// ------------------------------
// Exit link handler (works on ALL pages)
// ------------------------------
document.addEventListener("click", (e) => {
  const exitLink = e.target.closest(".top-link"); // works even if click on child elements
  if (!exitLink) return;

  e.preventDefault();

  showCancelModal({
    title: "Are you sure you want to EXIT?",
    onYes: () => (window.location.href = "index.html"),
    onNo: () => {} // just close modal
  });
});

