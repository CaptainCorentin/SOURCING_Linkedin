// Jeu de données fictif simulant des fiches candidat dans Boond (CRM).
// Sert uniquement au prototype — à remplacer par de vrais appels API Boond plus tard.

const BLOQUANTS_STATUT = ["LN+", "P+", "A traiter", "Vivier+++"];

const STATUT_OPTIONS = ["LN+", "P+", "A traiter", "Vivier+++", "Qualifié", "Nouveau"];

const CRITERIA_LABELS = {
  contactMoins1Mois: "Action de contact il y a moins d'1 mois",
  pasInteresseMoins4Mois: "Marqué « pas intéressé » il y a moins de 4 mois",
  pasDeProcessDepuis1An: "Pas de process depuis 1 an",
  pasDeRappelFutur: "Pas de rappel to-do dans le futur",
  finProcessInitiativeCandidat: "Fin de process à l'initiative du candidat"
};

// Dataset fictif : quelques profils "connus" dans Boond, avec des cas de figure variés.
const MOCK_BOOND_DB = [
  {
    fullName: "Claire Dubois",
    poste: "Développeuse Full Stack",
    entreprise: "TechNova",
    statut: "Qualifié",
    criteria: {
      contactMoins1Mois: false,
      pasInteresseMoins4Mois: false,
      pasDeProcessDepuis1An: false,
      pasDeRappelFutur: false,
      finProcessInitiativeCandidat: false
    }
  },
  {
    fullName: "Karim Benyahia",
    poste: "Ingénieur DevOps",
    entreprise: "CloudWorks",
    statut: "LN+",
    criteria: {
      contactMoins1Mois: false,
      pasInteresseMoins4Mois: false,
      pasDeProcessDepuis1An: false,
      pasDeRappelFutur: false,
      finProcessInitiativeCandidat: false
    }
  },
  {
    fullName: "Julie Lambert",
    poste: "Chef de projet IT",
    entreprise: "Groupe Altis",
    statut: "Nouveau",
    criteria: {
      contactMoins1Mois: true,
      pasInteresseMoins4Mois: false,
      pasDeProcessDepuis1An: false,
      pasDeRappelFutur: false,
      finProcessInitiativeCandidat: false
    }
  },
  {
    fullName: "Thomas Meyer",
    poste: "Data Engineer",
    entreprise: "Datacore",
    statut: "Qualifié",
    criteria: {
      contactMoins1Mois: false,
      pasInteresseMoins4Mois: true,
      pasDeProcessDepuis1An: false,
      pasDeRappelFutur: false,
      finProcessInitiativeCandidat: false
    }
  }
];

function lookupBoond(fullName) {
  if (!fullName) return null;
  const normalized = fullName.trim().toLowerCase();
  const found = MOCK_BOOND_DB.find(p => p.fullName.trim().toLowerCase() === normalized);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

// Logique "Check si contactable" : un seul critère vrai suffit à bloquer (OU).
function computeContactable(record) {
  const reasons = [];
  if (BLOQUANTS_STATUT.includes(record.statut)) {
    reasons.push(`Statut bloquant : ${record.statut}`);
  }
  for (const key of Object.keys(CRITERIA_LABELS)) {
    if (record.criteria[key]) {
      reasons.push(CRITERIA_LABELS[key]);
    }
  }
  return { contactable: reasons.length === 0, reasons };
}

function generateMessage({ fullName }) {
  const firstName = (fullName || "").trim().split(/\s+/)[0] || "";
  return `Hello ${firstName},

Pour aller droit au but, j'adore ton parcours, et je cherche une pépite du Produit comme toi pour rejoindre WeFiiT pour un poste de Consultant en Product Management.

Le projet ? WeFiiT c'est un modèle hybride entre le cabinet de conseil & la startup : c'est un des leaders du Product Management en France. Un environnement ultra dynamique, tu auras de belles perspectives de croissance dans une entreprise qui est déjà dans le top 3 des cabinets spécialisés en Product Management et qui vise à en devenir LA référence.

Avec qui ? Une équipe de 100 WeFiiters (équipe désormais à 114 experts), ambitieux, inspirants et experts dans leur domaine.

Ton objectif ? Accompagner nos clients grands comptes (Chanel, Kering, Accor, Cartier, FDJ, SNCF, Louis Vuitton...) mais aussi nos scale-ups dans le développement de leurs projets digitaux.

Ce job est fait pour toi si :
📈 Tu cherches un projet ambitieux qui sera un réel tremplin chez des clients prestigieux
🏦 Tu veux participer à un projet ayant un potentiel de marché gigantesque
🚀 Tu veux être entourée de personnes expertes et inspirantes
💰 Tu veux un package super compétitif €

Es-tu disponible 15 minutes pour en discuter de vive voix ?`;
}
