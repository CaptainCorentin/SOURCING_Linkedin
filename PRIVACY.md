# Politique de confidentialité — Sourcing LinkedIn (WeFiiT)

Dernière mise à jour : 24 juillet 2026

## Objectif de l'extension

Cette extension est un outil interne à l'usage des recruteurs WeFiiT. Elle permet, depuis un profil LinkedIn, de vérifier si le profil correspond à un candidat déjà présent dans le CRM Boond Manager de WeFiiT, et de créer une fiche candidat et/ou une action de premier contact.

## Données consultées sur la page

Lorsqu'un recruteur ouvre un profil LinkedIn (URL du type `linkedin.com/in/...`), l'extension lit uniquement :
- le nom affiché sur la page (balise `h1`)
- l'URL de la page

Aucune autre donnée de navigation, aucun contenu d'autres pages, et aucune donnée de profils tiers (contacts, messages, historique) n'est collectée.

## Données envoyées

Les seules données transmises sont envoyées, à l'initiative explicite du recruteur (clic sur un bouton), vers l'infrastructure N8N de WeFiiT (hébergée chez wefiit.app.n8n.cloud), qui relaie ensuite les requêtes vers l'API Boond Manager de WeFiiT :
- le nom et l'URL du profil LinkedIn consulté
- le cas échéant, le texte d'un message de prise de contact rédigé ou validé par le recruteur

Ces données ne sont transmises à aucun autre tiers que Boond Manager (CRM de WeFiiT).

## Identifiants de connexion

Les identifiants (nom d'utilisateur et mot de passe) utilisés pour authentifier les appels vers l'infrastructure N8N sont stockés uniquement en local, dans le stockage propre à l'extension (`chrome.storage.local`), sur l'ordinateur du recruteur. Ils ne sont jamais transmis ailleurs qu'au serveur N8N de WeFiiT, ni partagés entre utilisateurs.

## Conservation des données

L'extension elle-même ne conserve aucune donnée après fermeture du navigateur (hormis les identifiants et réglages ci-dessus). Les données transmises à Boond Manager suivent les règles de conservation propres au CRM de WeFiiT.

## Contact

Pour toute question relative à cette politique de confidentialité : corentin.barczyk@wefiit.com
