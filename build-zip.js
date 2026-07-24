// Script de build Vercel : zippe les fichiers de l'extension Chrome et génère
// une page de téléchargement statique, reconstruite à chaque déploiement.
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "public_dist");
const ZIP_NAME = "sourcing-linkedin-extension.zip";

const FILES_TO_INCLUDE = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "mockData.js"
];
const DIRS_TO_INCLUDE = ["icons"];

fs.mkdirSync(OUT_DIR, { recursive: true });

const output = fs.createWriteStream(path.join(OUT_DIR, ZIP_NAME));
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`ZIP créé : ${archive.pointer()} octets`);
  writeIndexHtml();
});

archive.on("error", err => {
  throw err;
});

archive.pipe(output);

FILES_TO_INCLUDE.forEach(file => {
  const filePath = path.join(ROOT, file);
  if (fs.existsSync(filePath)) archive.file(filePath, { name: file });
});

DIRS_TO_INCLUDE.forEach(dir => {
  const dirPath = path.join(ROOT, dir);
  if (fs.existsSync(dirPath)) archive.directory(dirPath, dir);
});

archive.finalize();

function writeIndexHtml() {
  const template = fs.readFileSync(path.join(ROOT, "index.template.html"), "utf8");
  const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);
  const commitMsg = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
  const buildDate = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

  const html = template
    .replace("{{COMMIT_SHA}}", commitSha)
    .replace("{{COMMIT_MSG}}", escapeHtml(commitMsg))
    .replace("{{BUILD_DATE}}", buildDate);

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), html);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
