// État en mémoire (rien n'est persisté, tout se réinitialise à la fermeture du popup).
const state = {
  profile: null, // { fullName, url }
  record: null, // fiche Boond en cours (copie modifiable) ou null
  skipContactCheck: false // true juste après un "Ajout sur Boond" mock
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  populateDemoSelect();
  bindEvents();
  detectProfile();
});

function cacheElements() {
  [
    "not-linkedin", "demo-select", "demo-load-btn",
    "profile-view", "profile-name", "profile-url", "redetect-btn",
    "boond-not-found", "add-boond-btn",
    "boond-found", "statut-select", "criteria-checkboxes",
    "poste-input", "entreprise-input",
    "contactable-banner", "block-reasons",
    "contact-actions", "write-btn", "generate-btn",
    "message-textarea", "validate-btn", "toast"
  ].forEach(id => {
    els[id] = document.getElementById(id);
  });
}

function populateDemoSelect() {
  MOCK_BOOND_DB.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.fullName;
    opt.textContent = p.fullName;
    els["demo-select"].appendChild(opt);
  });
  const opt = document.createElement("option");
  opt.value = "__nouveau__";
  opt.textContent = "Profil inconnu (test « absent de Boond »)";
  els["demo-select"].appendChild(opt);
}

function bindEvents() {
  els["redetect-btn"].addEventListener("click", detectProfile);
  els["demo-load-btn"].addEventListener("click", loadDemoProfile);
  els["add-boond-btn"].addEventListener("click", addToBoondMock);
  els["statut-select"].addEventListener("change", onSimulateChange);
  els["poste-input"].addEventListener("input", onSimulateChange);
  els["entreprise-input"].addEventListener("input", onSimulateChange);
  els["write-btn"].addEventListener("click", () => openCompose(""));
  els["generate-btn"].addEventListener("click", () => openCompose(generateMessage(state.record)));
  els["validate-btn"].addEventListener("click", validateAction);
}

// --- Détection du profil LinkedIn actif ---

function detectProfile() {
  hideToast();
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab || !tab.url || !/^https:\/\/(www\.)?linkedin\.com\/in\//.test(tab.url)) {
      showNotLinkedin();
      return;
    }
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, func: extractProfileFromPage },
      results => {
        if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
          showNotLinkedin();
          return;
        }
        setProfile(results[0].result);
      }
    );
  });
}

// Exécuté dans le contexte de la page LinkedIn : ne récupère QUE le nom et l'URL.
function extractProfileFromPage() {
  const h1 = document.querySelector("h1");
  const name = h1 ? h1.innerText.trim() : document.title.split("|")[0].split("-")[0].trim();
  return { fullName: name, url: window.location.href };
}

function loadDemoProfile() {
  const value = els["demo-select"].value;
  if (!value) return;
  if (value === "__nouveau__") {
    setProfile({ fullName: "Sophie Renard", url: "https://www.linkedin.com/in/sophie-renard-demo" });
  } else {
    setProfile({ fullName: value, url: "https://www.linkedin.com/in/demo-profile" });
  }
}

function setProfile(profile) {
  state.profile = profile;
  state.skipContactCheck = false;
  state.record = lookupBoond(profile.fullName);
  render();
}

// --- Rendu ---

function showNotLinkedin() {
  els["not-linkedin"].classList.remove("hidden");
  els["profile-view"].classList.add("hidden");
}

function render() {
  els["not-linkedin"].classList.add("hidden");
  els["profile-view"].classList.remove("hidden");

  els["profile-name"].textContent = state.profile.fullName;
  els["profile-url"].textContent = state.profile.url;

  closeCompose();
  hideToast();

  if (!state.record) {
    els["boond-not-found"].classList.remove("hidden");
    els["boond-found"].classList.add("hidden");
    els["contact-actions"].classList.add("hidden");
    return;
  }

  els["boond-not-found"].classList.add("hidden");

  if (state.skipContactCheck) {
    els["boond-found"].classList.add("hidden");
    els["contact-actions"].classList.remove("hidden");
    return;
  }

  els["boond-found"].classList.remove("hidden");
  renderSimulatePanel();
  renderContactableBanner();
}

function renderSimulatePanel() {
  const record = state.record;

  els["statut-select"].innerHTML = "";
  STATUT_OPTIONS.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s + (BLOQUANTS_STATUT.includes(s) ? " (bloquant)" : "");
    if (s === record.statut) opt.selected = true;
    els["statut-select"].appendChild(opt);
  });

  els["criteria-checkboxes"].innerHTML = "";
  Object.keys(CRITERIA_LABELS).forEach(key => {
    const row = document.createElement("label");
    row.className = "checkbox-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!record.criteria[key];
    checkbox.dataset.criterionKey = key;
    checkbox.addEventListener("change", onSimulateChange);
    const span = document.createElement("span");
    span.textContent = CRITERIA_LABELS[key];
    row.appendChild(checkbox);
    row.appendChild(span);
    els["criteria-checkboxes"].appendChild(row);
  });

  els["poste-input"].value = record.poste || "";
  els["entreprise-input"].value = record.entreprise || "";
}

function onSimulateChange() {
  const record = state.record;
  record.statut = els["statut-select"].value;
  record.poste = els["poste-input"].value;
  record.entreprise = els["entreprise-input"].value;
  els["criteria-checkboxes"].querySelectorAll("input[type=checkbox]").forEach(cb => {
    record.criteria[cb.dataset.criterionKey] = cb.checked;
  });
  renderContactableBanner();
}

function renderContactableBanner() {
  const { contactable, reasons } = computeContactable(state.record);
  const banner = els["contactable-banner"];
  const list = els["block-reasons"];

  if (contactable) {
    banner.className = "status-banner status-go";
    banner.textContent = "✅ Contactable";
    list.classList.add("hidden");
    els["contact-actions"].classList.remove("hidden");
  } else {
    banner.className = "status-banner status-blocked";
    banner.textContent = "⛔ Pas d'action — profil non contactable";
    list.innerHTML = "";
    reasons.forEach(r => {
      const li = document.createElement("li");
      li.textContent = r;
      list.appendChild(li);
    });
    list.classList.remove("hidden");
    els["contact-actions"].classList.add("hidden");
    closeCompose();
  }
}

// --- "Ajout sur Boond" (mock) ---

function addToBoondMock() {
  state.record = {
    fullName: state.profile.fullName,
    poste: "",
    entreprise: "",
    statut: "A traiter",
    criteria: {
      contactMoins1Mois: false,
      pasInteresseMoins4Mois: false,
      pasDeProcessDepuis1An: false,
      pasDeRappelFutur: false,
      finProcessInitiativeCandidat: false
    }
  };
  state.skipContactCheck = true;
  render();
  showToast("Profil ajouté sur Boond (mock) — passage direct au 1er contact.");
}

// --- Actions de contact ---

function openCompose(prefill) {
  els["message-textarea"].value = prefill;
  els["message-textarea"].classList.remove("hidden");
  els["validate-btn"].classList.remove("hidden");
  els["message-textarea"].focus();
}

function closeCompose() {
  els["message-textarea"].classList.add("hidden");
  els["validate-btn"].classList.add("hidden");
  els["message-textarea"].value = "";
}

function validateAction() {
  if (!els["message-textarea"].value.trim()) {
    els["message-textarea"].focus();
    return;
  }
  closeCompose();
  showToast("Action « 1er contact » ajoutée ✅ (mock, non persistée)");
}

// --- Toast ---

function showToast(message) {
  els["toast"].textContent = message;
  els["toast"].classList.remove("hidden");
}

function hideToast() {
  els["toast"].classList.add("hidden");
}
