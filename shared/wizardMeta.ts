import type { BriefAnswers } from "./projectQuestionnaire";
import type { WizardMacroStepId } from "./projectWizard";

export type BriefInputMode = "manual" | "ai";

export type AiBriefCriteria = {
  clientGoals: string;
  mainConstraints: string;
  desiredAmbiance: string;
};

export type WizardPersistMeta = {
  macroStep?: WizardMacroStepId;
  briefSectionIndex?: number;
  briefMode?: BriefInputMode;
  aiCriteria?: AiBriefCriteria;
};

const META_PREFIX = "_meta:";

export function embedWizardMeta(
  briefAnswers: BriefAnswers,
  meta: WizardPersistMeta
): BriefAnswers {
  const out: BriefAnswers = { ...briefAnswers };
  if (meta.macroStep) out[`${META_PREFIX}macroStep`] = meta.macroStep;
  if (meta.briefSectionIndex !== undefined) {
    out[`${META_PREFIX}briefSectionIndex`] = String(meta.briefSectionIndex);
  }
  if (meta.briefMode) out[`${META_PREFIX}briefMode`] = meta.briefMode;
  if (meta.aiCriteria) {
    out[`${META_PREFIX}aiGoals`] = meta.aiCriteria.clientGoals;
    out[`${META_PREFIX}aiConstraints`] = meta.aiCriteria.mainConstraints;
    out[`${META_PREFIX}aiAmbiance`] = meta.aiCriteria.desiredAmbiance;
  }
  return out;
}

export function splitWizardMeta(briefData: BriefAnswers | null | undefined): {
  answers: BriefAnswers;
  meta: WizardPersistMeta;
} {
  const answers: BriefAnswers = {};
  const meta: WizardPersistMeta = {};

  if (!briefData) return { answers, meta };

  for (const [key, value] of Object.entries(briefData)) {
    if (key.startsWith(META_PREFIX)) {
      const metaKey = key.slice(META_PREFIX.length);
      if (metaKey === "macroStep") meta.macroStep = value as WizardMacroStepId;
      if (metaKey === "briefSectionIndex") meta.briefSectionIndex = Number.parseInt(value, 10);
      if (metaKey === "briefMode") meta.briefMode = value as BriefInputMode;
      if (metaKey === "aiGoals") {
        meta.aiCriteria = meta.aiCriteria ?? { clientGoals: "", mainConstraints: "", desiredAmbiance: "" };
        meta.aiCriteria.clientGoals = value;
      }
      if (metaKey === "aiConstraints") {
        meta.aiCriteria = meta.aiCriteria ?? { clientGoals: "", mainConstraints: "", desiredAmbiance: "" };
        meta.aiCriteria.mainConstraints = value;
      }
      if (metaKey === "aiAmbiance") {
        meta.aiCriteria = meta.aiCriteria ?? { clientGoals: "", mainConstraints: "", desiredAmbiance: "" };
        meta.aiCriteria.desiredAmbiance = value;
      }
    } else {
      answers[key] = value;
    }
  }

  return { answers, meta };
}

export function inferWizardStep(input: {
  meta: WizardPersistMeta;
  hasPhotos: boolean;
  style: string;
  title: string;
  spaceType: string;
}): WizardMacroStepId {
  if (input.meta.macroStep) return input.meta.macroStep;
  if (!input.title.trim() || !input.spaceType) return "project";
  if (!input.style) return "style";
  if (!input.meta.briefMode) return "briefMode";
  if (input.meta.briefMode === "manual" && !input.hasPhotos) return "brief";
  if (input.meta.briefMode === "ai" && !input.hasPhotos) return "brief";
  if (!input.hasPhotos) return "photos";
  return "confirm";
}
