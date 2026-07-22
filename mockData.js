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

function generateMessage({ fullName, poste, entreprise }) {
  const firstName = (fullName || "").trim().split(/\s+/)[0] || "";
  const posteText = poste ? ` de ${poste}` : "";
  const entrepriseText = entreprise ? ` chez ${entreprise}` : "";
  return `Bonjour ${firstName},

J'ai découvert votre profil${posteText}${entrepriseText} et j'aimerais échanger avec vous sur une opportunité qui pourrait vous intéresser.

Seriez-vous disponible pour un rapide échange cette semaine ?

Bien à vous,`;
}
