// Valeurs par défaut non sensibles (URLs de webhook + utilisateur) : pré-remplies pour
// éviter de les ressaisir à chaque install, mais SANS le mot de passe — celui-ci n'est
// jamais mis en dur et reste à saisir manuellement, stocké uniquement en local.
const DEFAULTS = {
  n8nUrlCheck: "https://wefiit.app.n8n.cloud/webhook/check-linkedin-profile",
  n8nUrlCreateOnly: "https://wefiit.app.n8n.cloud/webhook/create-candidate-only",
  n8nUrlCreateContact: "https://wefiit.app.n8n.cloud/webhook/create-candidate-and-contact",
  n8nUrlContactExisting: "https://wefiit.app.n8n.cloud/webhook/contact-existing-candidate",
  n8nUser: "WefiiT-extension-sourcing-linkedin"
};

// État en mémoire (rien n'est persisté, tout se réinitialise à la fermeture du popup).
const state = {
  profile: null, // { fullName, url, html }
  checkResult: null, // { status, candidateId, message, searchUrl } — réponse brute du webhook "check"
  pendingSend: null // { webhookKey, extraBody } — action en attente de confirmation dans le textarea
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  populateDemoSelect();
  bindEvents();
  loadN8nSettings();
  detectProfile();
});

function cacheElements() {
  [
    "not-linkedin", "demo-select", "demo-load-btn",
    "profile-view", "profile-name", "profile-url", "redetect-btn",
    "n8n-url-check", "n8n-url-create-only", "n8n-url-create-contact", "n8n-url-contact-existing",
    "n8n-user", "n8n-pass", "check-btn", "n8n-result",
    "result-panel", "status-banner",
    "contactable-actions", "contactable-link", "contactable-message-preview",
    "contact-standard-btn", "contact-custom-btn",
    "not-contactable-actions", "not-contactable-link",
    "multiple-actions", "multiple-link",
    "not-found-actions", "not-found-message-preview",
    "create-only-btn", "create-standard-btn", "create-custom-btn",
    "message-textarea", "send-message-btn", "toast"
  ].forEach(id => {
    els[id] = document.getElementById(id);
  });
}

// --- Connexion N8N (URLs + Basic Auth stockés localement, jamais dans le code) ---

function loadN8nSettings() {
  chrome.storage.local.get(
    ["n8nUrlCheck", "n8nUrlCreateOnly", "n8nUrlCreateContact", "n8nUrlContactExisting", "n8nUser", "n8nPass"],
    settings => {
      els["n8n-url-check"].value = settings.n8nUrlCheck || DEFAULTS.n8nUrlCheck;
      els["n8n-url-create-only"].value = settings.n8nUrlCreateOnly || DEFAULTS.n8nUrlCreateOnly;
      els["n8n-url-create-contact"].value = settings.n8nUrlCreateContact || DEFAULTS.n8nUrlCreateContact;
      els["n8n-url-contact-existing"].value = settings.n8nUrlContactExisting || DEFAULTS.n8nUrlContactExisting;
      els["n8n-user"].value = settings.n8nUser || DEFAULTS.n8nUser;
      els["n8n-pass"].value = settings.n8nPass || ""; // jamais de valeur par défaut ici
    }
  );
}

function saveN8nSettings() {
  const settingsToSave = {
    n8nUrlCheck: els["n8n-url-check"].value.trim(),
    n8nUrlCreateOnly: els["n8n-url-create-only"].value.trim(),
    n8nUrlCreateContact: els["n8n-url-create-contact"].value.trim(),
    n8nUrlContactExisting: els["n8n-url-contact-existing"].value.trim(),
    n8nUser: els["n8n-user"].value
  };
  // Ne jamais écraser un mot de passe déjà enregistré par une valeur vide
  // (ex: interférence d'un gestionnaire de mots de passe sur le champ).
  if (els["n8n-pass"].value) settingsToSave.n8nPass = els["n8n-pass"].value;
  chrome.storage.local.set(settingsToSave);
}

function getN8nUrl(webhookKey) {
  const fieldId = {
    check: "n8n-url-check",
    createOnly: "n8n-url-create-only",
    createContact: "n8n-url-create-contact",
    contactExisting: "n8n-url-contact-existing"
  }[webhookKey];
  return els[fieldId].value.trim();
}

function n8nHeaders() {
  const user = els["n8n-user"].value;
  const pass = els["n8n-pass"].value;
  const headers = { "Content-Type": "application/json" };
  if (user || pass) {
    headers["Authorization"] = "Basic " + btoa(`${user}:${pass}`);
  }
  return headers;
}

// Appelle un des 4 webhooks N8N et renvoie le JSON parsé (ou null si erreur réseau/HTTP).
async function callN8n(webhookKey, body) {
  const url = getN8nUrl(webhookKey);
  if (!url) {
    showN8nResult(`URL du webhook « ${webhookKey} » manquante dans « Connexion N8N ».`, true);
    return null;
  }
  showN8nResult("Envoi en cours...", false);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: n8nHeaders(),
      body: JSON.stringify(body)
    });
    const text = await response.text();
    showN8nResult(`HTTP ${response.status}\n${text}`, !response.ok);
    if (!response.ok) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      showN8nResult(`Réponse non-JSON reçue :\n${text}`, true);
      return null;
    }
  } catch (err) {
    showN8nResult(`Erreur réseau : ${err.message}`, true);
    return null;
  }
}

function showN8nResult(text, isError) {
  els["n8n-result"].textContent = text;
  els["n8n-result"].classList.remove("hidden");
  els["n8n-result"].classList.toggle("error", !!isError);
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
  els["check-btn"].addEventListener("click", checkContactable);

  els["contact-standard-btn"].addEventListener("click", () => {
    sendAction("contactExisting", { candidateId: state.checkResult.candidateId, message: state.checkResult.message });
  });
  els["contact-custom-btn"].addEventListener("click", () => {
    openCompose(state.checkResult.message, "contactExisting", { candidateId: state.checkResult.candidateId });
  });

  els["create-only-btn"].addEventListener("click", () => {
    sendAction("createOnly", { fullName: state.profile.fullName, url: state.profile.url });
  });
  els["create-standard-btn"].addEventListener("click", () => {
    sendAction("createContact", { fullName: state.profile.fullName, url: state.profile.url, message: state.checkResult.message });
  });
  els["create-custom-btn"].addEventListener("click", () => {
    openCompose(state.checkResult.message, "createContact", { fullName: state.profile.fullName, url: state.profile.url });
  });

  els["send-message-btn"].addEventListener("click", () => {
    if (!els["message-textarea"].value.trim()) {
      els["message-textarea"].focus();
      return;
    }
    const message = textToHtml(els["message-textarea"].value);
    sendAction(state.pendingSend.webhookKey, { ...state.pendingSend.extraBody, message });
  });

  [
    "n8n-url-check", "n8n-url-create-only", "n8n-url-create-contact", "n8n-url-contact-existing",
    "n8n-user", "n8n-pass"
  ].forEach(id => {
    els[id].addEventListener("input", saveN8nSettings);
  });
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

// Exécuté dans le contexte de la page LinkedIn : nom, URL, et le HTML complet
// (envoyé à N8N pour extraction des infos du profil par un LLM — fonctionnalité déléguée).
function extractProfileFromPage() {
  const h1 = document.querySelector("h1");
  const name = h1 ? h1.innerText.trim() : document.title.split("|")[0].split("-")[0].trim();
  return { fullName: name, url: window.location.href, html: document.documentElement.outerHTML };
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
  state.checkResult = null;
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
  els["n8n-result"].classList.add("hidden");
  els["result-panel"].classList.add("hidden");
}

// --- Étape 1 : vérifier si contactable (déclenche le 1er webhook) ---

async function checkContactable() {
  if (!state.profile) return;
  const result = await callN8n("check", { fullName: state.profile.fullName, url: state.profile.url });
  if (!result) return;
  state.checkResult = result;
  renderResultPanel();
}

function renderResultPanel() {
  const { status, candidateId, message, searchUrl } = state.checkResult;
  const banner = els["status-banner"];

  closeCompose();
  els["result-panel"].classList.remove("hidden");
  els["contactable-actions"].classList.add("hidden");
  els["not-contactable-actions"].classList.add("hidden");
  els["multiple-actions"].classList.add("hidden");
  els["not-found-actions"].classList.add("hidden");

  if (status === "contactable") {
    banner.className = "status-banner status-go";
    banner.textContent = "✅ Contactable";
    els["contactable-link"].href = candidateBoondUrl(candidateId);
    els["contactable-message-preview"].innerHTML = message || "";
    els["contactable-actions"].classList.remove("hidden");
  } else if (status === "not_contactable") {
    banner.className = "status-banner status-blocked";
    banner.textContent = "⛔ Non contactable";
    els["not-contactable-link"].href = candidateBoondUrl(candidateId);
    els["not-contactable-actions"].classList.remove("hidden");
  } else if (status === "multiple_matches") {
    banner.className = "status-banner status-neutral";
    banner.textContent = "🔍 Plusieurs correspondances dans Boond";
    els["multiple-link"].href = searchUrl;
    els["multiple-actions"].classList.remove("hidden");
  } else if (status === "not_found") {
    banner.className = "status-banner status-neutral";
    banner.textContent = "❌ Absent de Boond";
    els["not-found-message-preview"].innerHTML = message || "";
    els["not-found-actions"].classList.remove("hidden");
  } else {
    banner.className = "status-banner status-blocked";
    banner.textContent = `Statut inconnu reçu de N8N : ${status}`;
  }
}

function candidateBoondUrl(candidateId) {
  return `https://ui.boondmanager.com/candidates/${candidateId}/overview`;
}

// --- Étape 2 : envoyer une action (créer candidat / créer + contacter / contacter existant) ---

function openCompose(prefillHtml, webhookKey, extraBody) {
  state.pendingSend = { webhookKey, extraBody };
  els["message-textarea"].value = htmlToText(prefillHtml || "");
  els["message-textarea"].classList.remove("hidden");
  els["send-message-btn"].classList.remove("hidden");
  els["message-textarea"].focus();
  els["message-textarea"].setSelectionRange(0, 0);
  els["message-textarea"].scrollTop = 0;
}

function closeCompose() {
  state.pendingSend = null;
  els["message-textarea"].classList.add("hidden");
  els["send-message-btn"].classList.add("hidden");
  els["message-textarea"].value = "";
}

async function sendAction(webhookKey, body) {
  const result = await callN8n(webhookKey, body);
  if (!result) return;
  closeCompose();
  showToast("Action envoyée à Boond ✅");
}

function htmlToText(html) {
  return html.replace(/<br\s*\/?>/gi, "\n");
}

function textToHtml(text) {
  return text.replace(/\n/g, "<br/>");
}

// --- Toast ---

function showToast(message) {
  els["toast"].textContent = message;
  els["toast"].classList.remove("hidden");
}

function hideToast() {
  els["toast"].classList.add("hidden");
}
