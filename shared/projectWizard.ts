export const WIZARD_MACRO_STEPS = [
  { id: "project", label: "Projet", description: "Nom & type d'espace" },
  { id: "style", label: "Style", description: "Direction esthétique" },
  { id: "briefMode", label: "Brief", description: "Mode de saisie" },
  { id: "brief", label: "Brief client", description: "Interrogatoire guidé" },
  { id: "photos", label: "Photos", description: "Ancrage visuel" },
  { id: "confirm", label: "Validation", description: "Récapitulatif" },
  { id: "report", label: "Compte rendu", description: "Génération IA" },
] as const;

export type WizardMacroStepId = (typeof WIZARD_MACRO_STEPS)[number]["id"];

export const GENERATION_STAGES = [
  {
    id: "upload",
    label: "Envoi des photos",
    detail: "Vos visuels sont transmis en toute sécurité.",
  },
  {
    id: "analyze",
    label: "Analyse du brief",
    detail: "Usages, contraintes, budget et style sont croisés.",
  },
  {
    id: "render",
    label: "Rendus avant / après",
    detail: "L'IA produit des visuels photoréalistes du projet.",
  },
  {
    id: "report",
    label: "Compte rendu projet",
    detail: "Travaux, matériaux, outillage, main d'œuvre et coûts.",
  },
] as const;

export type GenerationStageId = (typeof GENERATION_STAGES)[number]["id"];

export function macroStepIndex(stepId: WizardMacroStepId): number {
  return WIZARD_MACRO_STEPS.findIndex((s) => s.id === stepId);
}
