import type { pages as enPages, validation as enValidation } from "../en/modules"

export const pages: typeof enPages = {
  research: {
    title: "Étude de marché",
    description:
      "Explorez votre secteur, vos clients, vos concurrents et les prix — avec des sources lorsqu'elles existent, et des limites claires lorsqu'elles manquent.",
  },
  validation: {
    title: "Validation",
    description:
      "Transformez vos convictions en preuves. Analysez votre idée, listez ce qui doit être vrai et notez ce que disent de vrais clients.",
  },
  marketing: {
    title: "Studio marketing",
    description: "Stratégie, campagnes et contenus prêts à publier, à la mesure de votre budget et de votre marché.",
  },
  ideas: {
    title: "Labo d'idées",
    description:
      "Générez des idées à partir de vos compétences et des problèmes qui vous entourent, notez-les selon des critères clairs et transformez la meilleure en entreprise.",
  },
  model: {
    title: "Modèle d'affaires",
    description: "Concevez sur une page comment votre entreprise crée, délivre et capte de la valeur.",
  },
  plan: {
    title: "Plan d'affaires",
    description: "Un plan complet et modifiable en 17 sections, cohérent avec le reste de votre espace de travail.",
  },
  finance: {
    title: "Planification financière",
    description:
      "Coûts de démarrage, projections et seuil de rentabilité dans votre monnaie. Ce sont vos projections, pas des résultats réels.",
  },
  projects: {
    title: "Projets et tâches",
    description: "Transformez vos objectifs en jalons et en tâches, et faites avancer l'équipe.",
  },
  opportunities: {
    title: "Opportunités",
    description:
      "Programmes, subventions, concours et événements vérifiés pour les fondateurs africains — chacun avec sa source et sa date de dernière vérification.",
  },
  copilot: {
    title: "Copilote IA",
    description: "Votre cofondateur qui connaît cette entreprise : son plan, ses chiffres, ses tâches et ses décisions.",
  },
  businesses: {
    title: "Mes entreprises",
    description: "Chaque entreprise a son propre espace de travail, ses données, ses documents et son contexte IA.",
  },
}

export const validation: typeof enValidation = {
  tabAnalyses: "Analyses",
  tabAssumptions: "Hypothèses",
  tabEvidence: "Preuves",
  progressTitle: "Avancement de la validation",
  progressBody: "{validated} hypothèses validées sur {total} · {evidence} preuves enregistrées",
  progressEmpty:
    "Listez les hypothèses dont dépend votre entreprise, puis enregistrez les preuves qui les confirment ou les contredisent.",
  addAssumption: "Ajouter une hypothèse",
  editAssumption: "Modifier l'hypothèse",
  assumptionLabel: "Qu'est-ce qui doit être vrai pour que cette entreprise fonctionne ?",
  assumptionPlaceholder: "ex. Les commerçants des marchés de Douala paieront 500 XAF par jour pour la livraison",
  category: "Catégorie",
  importance: "Importance",
  status: "Statut",
  importanceLevels: { 1: "Utile à savoir", 2: "Importante", 3: "Critique" },
  categories: {
    problem: "Problème",
    customer: "Client",
    solution: "Solution",
    price: "Prix",
    channel: "Canal",
    market: "Marché",
    other: "Autre",
  },
  statuses: {
    untested: "Non testée",
    testing: "En cours de test",
    validated: "Validée",
    invalidated: "Invalidée",
  },
  assumptionsEmptyTitle: "Aucune hypothèse pour l'instant",
  assumptionsEmptyBody:
    "Toute entreprise repose sur quelques convictions à propos des clients, du prix et de la demande. Écrivez-les pour pouvoir les tester.",
  evidenceFor: "{supports} pour · {contradicts} contre",
  noEvidenceYet: "Aucune preuve pour l'instant",
  addEvidence: "Enregistrer une preuve",
  editEvidence: "Modifier l'entrée",
  evidenceEmptyTitle: "Aucune preuve enregistrée",
  evidenceEmptyBody:
    "Consignez vos entretiens clients, résultats d'enquêtes, retours, observations de concurrents et expériences. Anza traite ce que vous notez ici comme une information vérifiée.",
  kind: "Type",
  kinds: {
    interview: "Entretien client",
    survey: "Résultat d'enquête",
    feedback: "Retour client",
    competitor: "Observation d'un concurrent",
    experiment: "Expérience",
  },
  titleLabel: "Titre",
  titlePlaceholder: "ex. Entretien avec une commerçante, marché Mokolo",
  notesLabel: "Qu'avez-vous appris ?",
  notesPlaceholder:
    "Ce qu'ils ont dit ou fait, avec leurs mots si possible. Notez les chiffres entendus : prix, quantités, fréquence.",
  dateLabel: "Date",
  stanceLabel: "Qu'est-ce que cela vous apprend ?",
  stances: {
    supports: "Confirme l'hypothèse",
    contradicts: "Contredit l'hypothèse",
    neutral: "Neutre / pas clair",
  },
  stanceShort: { supports: "Confirme", contradicts: "Contredit", neutral: "Neutre" },
  linkedAssumption: "Hypothèse concernée",
  noLinkedAssumption: "Non liée à une hypothèse",
  detailRespondents: "Nombre de répondants",
  detailSource: "Qui ou où (facultatif)",
  filterAll: "Tous les types",
  saved: "Enregistré",
  deleted: "Supprimé",
  truthNote: "Notez uniquement ce qui s'est réellement passé. Anza n'invente jamais d'entretiens ni de résultats d'enquête.",
}
