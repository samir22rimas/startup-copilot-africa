import type { documents as enDocuments } from "../en/documents"

export const documents: typeof enDocuments = {
  title: "Documents",
  description: "Les fichiers de votre entreprise au même endroit : importer, classer, rechercher, prévisualiser et résumer.",
  usedByAi:
    "Le Copilote et les outils IA lisent le texte de ces fichiers comme documentation de référence, pour cette entreprise uniquement.",
  searchPlaceholder: "Rechercher dans les noms et le contenu des fichiers",
  folder: "Dossier",
  allFolders: "Tous les dossiers",
  noFolder: "Hors dossier",
  upload: "Importer",
  uploading: "Import en cours…",
  uploaded: "{count} fichiers importés",
  typesAllowed: "Formats acceptés : {types}. Jusqu'à 25 Mo par fichier.",
  tooLarge: "Le fichier ne doit pas dépasser 25 Mo.",
  emptyTitle: "Aucun document pour l'instant",
  emptyBody:
    "Importez des notes, études, listes de prix ou retours clients pour qu'Anza appuie ses conseils sur vos vrais documents.",
  noResults: "Aucun document ne correspond à votre recherche.",
  noText: "Texte illisible",
  summarised: "Résumé disponible",
  project: "Projet",
  noProject: "Aucun projet",
  preview: "Aperçu du texte",
  previewTruncated: "Seul le début du document est affiché. Téléchargez le fichier pour le lire en entier.",
  summarise: "Résumer avec l'IA",
  move: "Déplacer vers un dossier",
  folderPrompt: "Nom du dossier (laisser vide pour le retirer de son dossier) :",
}
