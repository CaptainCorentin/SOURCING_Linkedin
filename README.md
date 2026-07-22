# Sourcing LinkedIn — Prototype (Étape 1, sans API)

Extension Chrome (Manifest V3) qui prototype le flux de sourcing LinkedIn décrit dans le schéma :
détection du profil LinkedIn ouvert → vérification (fictive) de présence dans Boond → check de
contactabilité → proposition d'une action « 1er contact » (message manuel ou généré).

Aucune connexion réelle à Boond, N8N ou une IA à ce stade : tout est simulé avec un jeu de
données fictif, éditable en live dans l'extension.

## Charger l'extension dans Chrome

1. Ouvrir `chrome://extensions`
2. Activer le « Mode développeur » (en haut à droite)
3. Cliquer sur « Charger l'extension non empaquetée »
4. Sélectionner le dossier de ce repo

## Tester

- **Sur un vrai profil LinkedIn** (`linkedin.com/in/...`) : ouvrir l'extension depuis l'icône —
  elle récupère le nom du profil et l'URL, puis regarde si ce nom correspond à un profil du
  dataset fictif (`mockData.js`).
- **Sans être sur LinkedIn** : l'extension propose un mode démo pour charger un profil fictif
  (ceux du dataset, ou un profil « inconnu » pour tester le cas « absent de Boond »).
- Le panneau « ⚙️ Simuler / modifier les données Boond » permet de changer le statut et les
  critères de blocage en direct pour tester tous les cas (contactable / pas d'action).

## Ce qui est mocké (à connecter plus tard)

- **Recherche Boond** (`lookupBoond`) : lookup dans un tableau JS local (`mockData.js`) au lieu
  d'un appel API Boond.
- **Ajout sur Boond** : ne fait qu'ajouter la fiche en mémoire (rien n'est persisté ni envoyé).
- **Génération de message** (`generateMessage`) : remplissage de template simple, à remplacer
  par un vrai appel IA plus tard.
- **Validation de l'action « 1er contact »** : affiche juste une confirmation, sans écrire dans
  Boond ni déclencher N8N.

## Prochaines étapes (hors scope de ce prototype)

- Brancher `lookupBoond` / l'ajout de fiche sur l'API Boond réelle.
- Brancher la génération de message sur un vrai modèle IA.
- Déclencher les actions via N8N plutôt qu'en local dans l'extension.
