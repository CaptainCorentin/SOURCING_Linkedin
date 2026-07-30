// Service worker MV3 : exécute les appels réseau vers N8N pour le compte du content
// script (bulle LinkedIn) et du popup, pour éviter tout souci de CSP/CORS sur la page LinkedIn.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "N8N_CALL") return false;

  (async () => {
    try {
      const response = await fetch(message.url, {
        method: "POST",
        headers: message.headers,
        body: JSON.stringify(message.body)
      });
      const text = await response.text();
      sendResponse({ ok: response.ok, status: response.status, text });
    } catch (err) {
      sendResponse({ ok: false, status: 0, text: `Erreur réseau : ${err.message}` });
    }
  })();

  return true; // réponse asynchrone
});
