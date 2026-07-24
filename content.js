// Bulle flottante WeFiiT — injectée uniquement sur les pages de profil LinkedIn
// (linkedin.com/in/...), jamais dans le fil d'actualité ni la recherche (cf. manifest.json).
(function () {
  if (!/^\/in\//.test(window.location.pathname)) return;
  if (document.getElementById("wefiit-sourcing-bubble-host")) return; // évite les doublons (SPA navigation)

  // Avatar en marinière (bandes navy/blanc) + touche orange WeFiiT, en SVG inline
  // pour ne dépendre d'aucune image externe ni web_accessible_resources.
  const AVATAR_SVG = `
    <svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#002882"/>
      <clipPath id="wefiit-body-clip">
        <path d="M12 60 C12 42 19 35 32 35 C45 35 52 42 52 60 Z"/>
      </clipPath>
      <g clip-path="url(#wefiit-body-clip)">
        <rect x="8" y="33" width="48" height="30" fill="#ffffff"/>
        <rect x="8" y="33" width="48" height="4.5" fill="#002882"/>
        <rect x="8" y="42" width="48" height="4.5" fill="#002882"/>
        <rect x="8" y="51" width="48" height="4.5" fill="#002882"/>
        <rect x="8" y="60" width="48" height="4.5" fill="#002882"/>
      </g>
      <circle cx="32" cy="23" r="10.5" fill="#f0c8a0"/>
      <circle cx="32" cy="36.5" r="3" fill="#f98f03"/>
    </svg>
  `;

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: Calibri, Arial, sans-serif; }
    .bubble { position: relative; }
    .avatar-btn {
      width: 48px; height: 48px; border-radius: 50%; border: 2px solid white;
      background: #002882; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      cursor: grab; padding: 0; touch-action: none;
    }
    .bubble.is-expanded .avatar-btn { display: none; }
    .panel {
      position: absolute; bottom: 0; right: 0; width: 320px; max-height: 520px;
      overflow-y: auto; background: #f2f5ff; border-radius: 10px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.35); color: #14213d; font-size: 13px;
    }
    .panel.hidden, .hidden { display: none !important; }
    .panel-header {
      background: #002882; color: white; padding: 10px 12px; border-radius: 10px 10px 0 0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .panel-title { font-weight: 700; font-size: 14px; }
    .title-dot { color: #f98f03; }
    .panel-header-actions { display: flex; gap: 4px; }
    .icon-btn {
      background: none; border: none; color: white; cursor: pointer; font-size: 14px;
      padding: 2px 4px; border-radius: 4px;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.15); }
    .body, .settings { padding: 10px 12px; }
    .profile-card { margin-bottom: 8px; }
    .profile-name { font-weight: 700; font-size: 14px; color: #002882; }
    .profile-url { font-size: 10px; color: #5a6484; word-break: break-all; margin-top: 1px; }
    .field-label { display: block; font-size: 11px; font-weight: 700; color: #002882; margin: 8px 0 3px; }
    input, textarea {
      width: 100%; padding: 6px 8px; border: 1px solid #c9d2ec; border-radius: 6px;
      font-size: 12px; font-family: inherit; color: #14213d; background: white;
    }
    textarea { margin-top: 6px; resize: vertical; }
    .hint { font-size: 11px; color: #566; margin: 4px 0 0; }
    .btn {
      border: none; border-radius: 6px; padding: 8px 10px; font-size: 12px; font-weight: 700;
      font-family: inherit; cursor: pointer; width: 100%; margin-top: 6px;
    }
    .btn-primary { background: #f98f03; color: white; }
    .btn-primary:hover { background: #e8572a; }
    .btn-secondary { background: white; color: #002882; border: 1px solid #c9d2ec; }
    .btn-secondary:hover { background: #f2f5ff; }
    .btn:focus { outline: none; }
    .btn:focus-visible { box-shadow: 0 0 0 2px rgba(0,40,130,0.45); }
    .btn-link {
      display: inline-block; color: #002882; font-size: 12px; font-weight: 700;
      text-decoration: none; margin-bottom: 6px;
    }
    .actions-row { display: flex; gap: 6px; }
    .actions-row .btn { margin-top: 0; }
    .actions-row-col { display: flex; flex-direction: column; gap: 6px; }
    .status-banner {
      padding: 6px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 8px;
    }
    .status-go { background: #e7f8ee; color: #157a3d; }
    .status-blocked { background: #fdece9; color: #c62828; }
    .status-neutral { background: #e9eaf0; color: #47517a; }
    .message-preview {
      background: white; border: 1px solid #e2e6f2; border-radius: 6px; padding: 6px 8px;
      margin: 0 0 8px; font-size: 11px; line-height: 1.4;
    }
    .n8n-result {
      margin: 6px 0; padding: 6px 8px; border-radius: 6px; background: #14213d; color: #dfe6fb;
      font-size: 10px; font-family: "Courier New", monospace; white-space: pre-wrap;
      word-break: break-all; max-height: 100px; overflow-y: auto;
    }
    .n8n-result.error { background: #fdece9; color: #c62828; }
    .toast {
      margin-top: 6px; padding: 6px 8px; border-radius: 6px; background: #e7f8ee; color: #157a3d;
      font-size: 12px; font-weight: 700; text-align: center;
    }
  `;

  const state = {
    expanded: false,
    profile: null, // { fullName, url }
    checkResult: null, // { status, candidateId, message, searchUrl }
    pendingSend: null // { webhookKey, extraBody }
  };

  const host = document.createElement("div");
  host.id = "wefiit-sourcing-bubble-host";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${STYLE}</style>
    <div class="bubble" id="bubble">
      <button class="avatar-btn" id="avatar-btn" title="Sourcing LinkedIn WeFiiT" aria-label="Ouvrir">
        ${AVATAR_SVG}
      </button>
      <div class="panel hidden" id="panel">
        <div class="panel-header">
          <span class="panel-title">Sourcing LinkedIn<span class="title-dot">.</span></span>
          <div class="panel-header-actions">
            <button class="icon-btn" id="settings-btn" title="Réglages N8N">⚙️</button>
            <button class="icon-btn" id="close-btn" title="Fermer">✕</button>
          </div>
        </div>

        <div class="settings hidden" id="settings">
          <label class="field-label">URL webhook — Check profil</label>
          <input type="text" id="n8n-url-check" />
          <label class="field-label">URL webhook — Créer candidat seul</label>
          <input type="text" id="n8n-url-create-only" />
          <label class="field-label">URL webhook — Créer candidat + 1er contact</label>
          <input type="text" id="n8n-url-create-contact" />
          <label class="field-label">URL webhook — Contacter candidat existant</label>
          <input type="text" id="n8n-url-contact-existing" />
          <label class="field-label">Utilisateur (Basic Auth)</label>
          <input type="text" id="n8n-user" autocomplete="off" />
          <label class="field-label">Mot de passe (Basic Auth)</label>
          <input type="password" id="n8n-pass" autocomplete="off" />
          <p class="hint">Stocké localement (chrome.storage.local), partagé avec le popup de l'extension.</p>
        </div>

        <div class="body" id="body">
          <div class="profile-card">
            <div class="profile-name" id="profile-name">—</div>
            <div class="profile-url" id="profile-url">—</div>
          </div>

          <button class="btn btn-primary" id="check-btn">🔍 Vérifier si contactable</button>
          <pre class="n8n-result hidden" id="n8n-result"></pre>

          <div class="result-panel hidden" id="result-panel">
            <div class="status-banner" id="status-banner"></div>

            <div class="hidden" id="contactable-actions">
              <a class="btn-link" id="contactable-link" target="_blank" rel="noopener">🔗 Voir la fiche Boond</a>
              <p class="message-preview" id="contactable-message-preview"></p>
              <div class="actions-row">
                <button class="btn btn-secondary" id="contact-standard-btn">✉️ 1er Contact standard</button>
                <button class="btn btn-secondary" id="contact-custom-btn">✍️ Champs à compléter</button>
              </div>
            </div>

            <div class="hidden" id="not-contactable-actions">
              <p class="hint">Ce profil n'est pas contactable pour le moment. 😕</p>
              <a class="btn-link" id="not-contactable-link" target="_blank" rel="noopener">🔗 Voir la fiche Boond</a>
            </div>

            <div class="hidden" id="multiple-actions">
              <a class="btn-link" id="multiple-link" target="_blank" rel="noopener">🔗 Voir les résultats sur Boond</a>
            </div>

            <div class="hidden" id="not-found-actions">
              <p class="message-preview" id="not-found-message-preview"></p>
              <div class="actions-row-col">
                <button class="btn btn-secondary" id="create-only-btn">➕ Créer la fiche seulement</button>
                <button class="btn btn-secondary" id="create-standard-btn">➕✉️ Créer + 1er Contact standard</button>
                <button class="btn btn-secondary" id="create-custom-btn">➕✍️ Créer + 1er contact personnalisé</button>
              </div>
            </div>

            <textarea class="hidden" id="message-textarea" rows="6" placeholder="Écrivez votre message ici..."></textarea>
            <button class="btn btn-primary hidden" id="send-message-btn">Envoyer</button>
          </div>

          <div class="toast hidden" id="toast"></div>
        </div>
      </div>
    </div>
  `;

  const els = {};
  [
    "bubble", "avatar-btn", "panel", "settings-btn", "close-btn",
    "settings", "n8n-url-check", "n8n-url-create-only", "n8n-url-create-contact", "n8n-url-contact-existing",
    "n8n-user", "n8n-pass",
    "body", "profile-name", "profile-url", "check-btn", "n8n-result",
    "result-panel", "status-banner",
    "contactable-actions", "contactable-link", "contactable-message-preview",
    "contact-standard-btn", "contact-custom-btn",
    "not-contactable-actions", "not-contactable-link",
    "multiple-actions", "multiple-link",
    "not-found-actions", "not-found-message-preview",
    "create-only-btn", "create-standard-btn", "create-custom-btn",
    "message-textarea", "send-message-btn", "toast"
  ].forEach(id => {
    els[id] = shadow.getElementById(id);
  });

  init();

  function init() {
    loadPosition();
    loadSettings();
    detectProfile();
    bindEvents();
    bindDrag();
  }

  // --- Position (draggable, persistée) ---

  function loadPosition() {
    chrome.storage.local.get(["bubblePosition"], ({ bubblePosition }) => {
      const pos = bubblePosition || { top: "50%", left: null, right: "24px" };
      host.style.top = pos.top;
      if (pos.left) {
        host.style.left = pos.left;
        host.style.right = "";
      } else {
        host.style.right = pos.right || "24px";
      }
    });
  }

  function savePosition() {
    const rect = host.getBoundingClientRect();
    chrome.storage.local.set({
      bubblePosition: { top: `${rect.top}px`, left: `${rect.left}px`, right: null }
    });
  }

  function bindDrag() {
    let dragging = false;
    let moved = false;
    let startX, startY, startTop, startLeft;

    els["avatar-btn"].addEventListener("pointerdown", e => {
      if (state.expanded) return; // on ne drag que la bulle repliée
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = host.getBoundingClientRect();
      startTop = rect.top;
      startLeft = rect.left;
      e.preventDefault();
    });

    window.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      host.style.left = `${startLeft + dx}px`;
      host.style.right = "";
      host.style.top = `${startTop + dy}px`;
    });

    window.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        savePosition();
      } else {
        toggleExpanded();
      }
    });
  }

  // --- Réglages N8N (partagés avec le popup) ---

  function loadSettings() {
    chrome.storage.local.get(
      ["n8nUrlCheck", "n8nUrlCreateOnly", "n8nUrlCreateContact", "n8nUrlContactExisting", "n8nUser", "n8nPass"],
      settings => {
        els["n8n-url-check"].value = settings.n8nUrlCheck || "";
        els["n8n-url-create-only"].value = settings.n8nUrlCreateOnly || "";
        els["n8n-url-create-contact"].value = settings.n8nUrlCreateContact || "";
        els["n8n-url-contact-existing"].value = settings.n8nUrlContactExisting || "";
        els["n8n-user"].value = settings.n8nUser || "";
        els["n8n-pass"].value = settings.n8nPass || "";
      }
    );
  }

  function saveSettings() {
    chrome.storage.local.set({
      n8nUrlCheck: els["n8n-url-check"].value.trim(),
      n8nUrlCreateOnly: els["n8n-url-create-only"].value.trim(),
      n8nUrlCreateContact: els["n8n-url-create-contact"].value.trim(),
      n8nUrlContactExisting: els["n8n-url-contact-existing"].value.trim(),
      n8nUser: els["n8n-user"].value,
      n8nPass: els["n8n-pass"].value
    });
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

  // --- Appels N8N via le service worker (évite les soucis de CSP sur la page LinkedIn) ---

  function callN8n(webhookKey, body) {
    return new Promise(resolve => {
      const url = getN8nUrl(webhookKey);
      if (!url) {
        showN8nResult(`URL du webhook « ${webhookKey} » manquante dans les réglages ⚙️.`, true);
        resolve(null);
        return;
      }
      const user = els["n8n-user"].value;
      const pass = els["n8n-pass"].value;
      const headers = { "Content-Type": "application/json" };
      if (user || pass) headers["Authorization"] = "Basic " + btoa(`${user}:${pass}`);

      showN8nResult("Envoi en cours...", false);
      chrome.runtime.sendMessage({ type: "N8N_CALL", url, headers, body }, response => {
        if (!response) {
          showN8nResult("Erreur : pas de réponse de l'extension.", true);
          resolve(null);
          return;
        }
        showN8nResult(`HTTP ${response.status}\n${response.text}`, !response.ok);
        if (!response.ok) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(response.text));
        } catch (e) {
          showN8nResult(`Réponse non-JSON reçue :\n${response.text}`, true);
          resolve(null);
        }
      });
    });
  }

  function showN8nResult(text, isError) {
    els["n8n-result"].textContent = text;
    els["n8n-result"].classList.remove("hidden");
    els["n8n-result"].classList.toggle("error", !!isError);
  }

  // --- Détection du profil (on est déjà garantis sur linkedin.com/in/...) ---

  function detectProfile() {
    const h1 = document.querySelector("h1");
    const fullName = h1 ? h1.innerText.trim() : document.title.split("|")[0].split("-")[0].trim();
    state.profile = { fullName, url: window.location.href };
    els["profile-name"].textContent = fullName;
    els["profile-url"].textContent = state.profile.url;
  }

  // --- Ouverture / fermeture du panneau ---

  function toggleExpanded() {
    state.expanded ? collapse() : expand();
  }

  function expand() {
    state.expanded = true;
    els["panel"].classList.remove("hidden");
    els["bubble"].classList.add("is-expanded");
  }

  function collapse() {
    state.expanded = false;
    els["panel"].classList.add("hidden");
    els["bubble"].classList.remove("is-expanded");
    closeCompose();
  }

  // --- Étape 1 : vérifier si contactable ---

  async function checkContactable() {
    if (!state.profile) return;
    const result = await callN8n("check", { fullName: state.profile.fullName, url: state.profile.url });
    if (!result) return;
    els["n8n-result"].classList.add("hidden");
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
    banner.className = "status-banner";

    if (status === "contactable") {
      banner.classList.add("status-go");
      banner.textContent = "✅ Contactable";
      els["contactable-link"].href = candidateBoondUrl(candidateId);
      els["contactable-message-preview"].innerHTML = message || "";
      els["contactable-actions"].classList.remove("hidden");
    } else if (status === "not_contactable") {
      banner.classList.add("status-blocked");
      banner.textContent = "⛔ Non contactable";
      els["not-contactable-link"].href = candidateBoondUrl(candidateId);
      els["not-contactable-actions"].classList.remove("hidden");
    } else if (status === "multiple_matches") {
      banner.classList.add("status-neutral");
      banner.textContent = "🔍 Plusieurs correspondances dans Boond";
      els["multiple-link"].href = searchUrl;
      els["multiple-actions"].classList.remove("hidden");
    } else if (status === "not_found") {
      banner.classList.add("status-neutral");
      banner.textContent = "❌ Absent de Boond";
      els["not-found-message-preview"].innerHTML = message || "";
      els["not-found-actions"].classList.remove("hidden");
    } else {
      banner.classList.add("status-blocked");
      banner.textContent = `Statut inconnu reçu de N8N : ${status}`;
    }
  }

  function candidateBoondUrl(candidateId) {
    return `https://ui.boondmanager.com/candidates/${candidateId}/overview`;
  }

  // --- Étape 2 : envoyer une action ---

  function openCompose(prefillHtml, webhookKey, extraBody) {
    state.pendingSend = { webhookKey, extraBody };
    els["message-textarea"].value = htmlToText(prefillHtml || "");
    els["message-textarea"].classList.remove("hidden");
    els["send-message-btn"].classList.remove("hidden");
    els["message-textarea"].focus();
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
    els["n8n-result"].classList.add("hidden");
    closeCompose();
    showToast("Action envoyée à Boond ✅");
  }

  function htmlToText(html) {
    return html.replace(/<br\s*\/?>/gi, "\n");
  }

  function textToHtml(text) {
    return text.replace(/\n/g, "<br/>");
  }

  function showToast(message) {
    els["toast"].textContent = message;
    els["toast"].classList.remove("hidden");
    setTimeout(() => els["toast"].classList.add("hidden"), 4000);
  }

  // --- Bind ---

  function bindEvents() {
    els["close-btn"].addEventListener("click", collapse);
    els["settings-btn"].addEventListener("click", () => {
      els["settings"].classList.toggle("hidden");
      els["body"].classList.toggle("hidden");
    });
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
      els[id].addEventListener("input", saveSettings);
    });
  }
})();
