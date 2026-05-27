import {
  PROJECT_QUESTIONNAIRE_SECTIONS,
  isQuestionApplicable,
  type BriefAnswers,
  type ProjectSpaceType,
} from "./projectQuestionnaire";

export const TEST_PROJECT_SLOTS = ["1", "2", "3"] as const;
export type TestProjectSlot = (typeof TEST_PROJECT_SLOTS)[number];

export const TEST_SLOT_BRIEF_KEY = "_testSlot";

export type TestProjectTemplate = {
  slot: TestProjectSlot;
  title: string;
  spaceType: ProjectSpaceType;
  style: string;
  budget: string;
  description: string;
};

export const TEST_PROJECT_TEMPLATES: Record<TestProjectSlot, TestProjectTemplate> = {
  "1": {
    slot: "1",
    title: "Test 1 — Salon moderne",
    spaceType: "interior",
    style: "moderne",
    budget: "45 000 – 60 000 €",
    description: "Intérieur contemporain : salon ouvert, lignes épurées, matériaux nobles.",
  },
  "2": {
    slot: "2",
    title: "Test 2 — Terrasse méditerranéenne",
    spaceType: "exterior",
    style: "mediterraneen",
    budget: "25 000 – 35 000 €",
    description: "Extérieur ensoleillé : terrasse conviviale, végétation méditerranéenne, ombrage léger.",
  },
  "3": {
    slot: "3",
    title: "Test 3 — Maison zen intérieur & jardin",
    spaceType: "both",
    style: "japonais",
    budget: "80 000 – 120 000 €",
    description: "Projet mixte : intérieur apaisant et jardin structuré, esthétique japonaise / zen.",
  },
};

const SLOT_ANSWER_OVERRIDES: Record<TestProjectSlot, Partial<Record<string, string>>> = {
  "1": {
    global_objectif: "Moderniser le salon pour un espace lumineux et convivial, prêt pour la vente dans 18 mois.",
    global_priorites: "Lumière naturelle, rangements intégrés, circulation fluide",
    global_sensation: "Sérénité, clarté, élégance contemporaine",
    style_description: "Moderne minimaliste : lignes droites, palette neutre, touches de laiton",
    int_usage_pieces: "Salon-TV convivial, coin lecture, espace télétravail discret",
    budget_global: "45 000 – 60 000 € TTC (mobilier inclus)",
  },
  "2": {
    global_objectif: "Créer une terrasse méditerranéenne pour recevoir 8 personnes confortablement.",
    global_priorites: "Ombre légère, coin repas, végétation résistante à la sécheresse",
    ext_zones: "Terrasse principale, pergola, massifs aromatiques, chemin d'accès",
    ext_repas: "8 personnes assises + 2 en supplément",
    style_description: "Méditerranéen chaleureux : pierre naturelle, teck, lavande et olivier",
    budget_global: "25 000 – 35 000 € (terrasse + plantation)",
  },
  "3": {
    global_objectif: "Harmoniser intérieur et jardin autour d'une ambiance zen japonaise.",
    global_priorites: "Intimité, matériaux naturels, continuité intérieur/extérieur",
    style_description: "Japonais / wabi-sabi : bois clair, pierre, végétation structurée, eau",
    int_usage_pieces: "Salon méditation, cuisine ouverte sur jardin, chambre parentale calme",
    ext_zones: "Jardin sec (karesansui), deck bois, bambous pour brise-vue",
    budget_global: "80 000 – 120 000 € phasé sur 2 ans",
  },
};

function defaultAnswerForQuestion(
  questionId: string,
  slot: TestProjectSlot,
  spaceType: ProjectSpaceType
): string {
  const override = SLOT_ANSWER_OVERRIDES[slot][questionId];
  if (override) return override;

  const slotLabel = TEST_PROJECT_TEMPLATES[slot].title;
  if (questionId.startsWith("global_")) {
    return `[Test ${slot}] Réponse automatique — ${slotLabel}. À affiner si besoin.`;
  }
  if (questionId.startsWith("budget_")) {
    return TEST_PROJECT_TEMPLATES[slot].budget;
  }
  if (questionId.startsWith("style_")) {
    return `Ambiance ${TEST_PROJECT_TEMPLATES[slot].style} cohérente avec le scénario de test.`;
  }
  if (spaceType === "interior" && questionId.startsWith("ext_")) {
    return "N/A — projet intérieur uniquement.";
  }
  if (spaceType === "exterior" && questionId.startsWith("int_")) {
    return "N/A — projet extérieur uniquement.";
  }
  return `[Test ${slot}] Élément renseigné pour la démo (${questionId}).`;
}

/** Réponses brief préremplies pour toutes les questions applicables au type d'espace. */
export function buildBriefAnswers(
  spaceType: ProjectSpaceType,
  slot: TestProjectSlot
): BriefAnswers {
  const answers: BriefAnswers = {
    [TEST_SLOT_BRIEF_KEY]: slot,
  };

  for (const section of PROJECT_QUESTIONNAIRE_SECTIONS) {
    for (const question of section.questions) {
      if (!isQuestionApplicable(question, spaceType)) continue;
      answers[question.id] = defaultAnswerForQuestion(question.id, slot, spaceType);
    }
  }

  return answers;
}

export function parseTestSlotFromBriefData(
  briefData: BriefAnswers | null | undefined
): TestProjectSlot | null {
  const raw = briefData?.[TEST_SLOT_BRIEF_KEY];
  if (raw === "1" || raw === "2" || raw === "3") return raw;
  return null;
}

export function getTestProjectTemplate(slot: TestProjectSlot): TestProjectTemplate {
  return TEST_PROJECT_TEMPLATES[slot];
}

export function isTestProjectSlot(value: string): value is TestProjectSlot {
  return value === "1" || value === "2" || value === "3";
}
