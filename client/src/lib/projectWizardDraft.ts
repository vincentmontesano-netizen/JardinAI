import type { BriefAnswers, ProjectSpaceType } from "@shared/projectQuestionnaire";
import type { WizardMacroStepId } from "@shared/projectWizard";

const DRAFT_KEY = "jardinia-project-wizard-draft";

export type ProjectWizardDraft = {
  form: {
    title: string;
    spaceType: ProjectSpaceType | "";
    style: string;
    budget: string;
  };
  briefAnswers: BriefAnswers;
  macroStep: WizardMacroStepId;
  briefSectionIndex: number;
  photos: Array<{ name: string; type: string; dataUrl: string; title?: string }>;
  savedAt: number;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(entry: { name: string; type: string; dataUrl: string }): Promise<File> {
  const response = await fetch(entry.dataUrl);
  const blob = await response.blob();
  return new File([blob], entry.name, { type: entry.type || blob.type });
}

export async function saveProjectWizardDraft(input: {
  form: ProjectWizardDraft["form"];
  briefAnswers: BriefAnswers;
  macroStep: WizardMacroStepId;
  briefSectionIndex: number;
  photos: Array<{ file: File; preview: string; title: string }>;
}): Promise<void> {
  const photos = await Promise.all(
    input.photos.map(async (photo) => ({
      name: photo.file.name,
      type: photo.file.type,
      dataUrl: await fileToDataUrl(photo.file),
      title: photo.title,
    }))
  );

  const draft: ProjectWizardDraft = {
    form: input.form,
    briefAnswers: input.briefAnswers,
    macroStep: input.macroStep,
    briefSectionIndex: input.briefSectionIndex,
    photos,
    savedAt: Date.now(),
  };

  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadProjectWizardDraft(): ProjectWizardDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as ProjectWizardDraft;
    if (Date.now() - draft.savedAt > 1000 * 60 * 60 * 24) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export async function restorePhotosFromDraft(
  draft: ProjectWizardDraft
): Promise<Array<{ file: File; preview: string; title: string }>> {
  const photos = await Promise.all(draft.photos.map((entry) => dataUrlToFile(entry)));
  return photos.map((file, i) => ({
    file,
    preview: URL.createObjectURL(file),
    title: draft.photos[i]?.title ?? "",
  }));
}

export function clearProjectWizardDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function hasResumeIntent(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("resume") === "1";
}

export const POST_PAYMENT_REDIRECT_KEY = "jardinia-post-payment-redirect";

export function setPostPaymentRedirect(path: string): void {
  sessionStorage.setItem(POST_PAYMENT_REDIRECT_KEY, path);
}

export function consumePostPaymentRedirect(): string | null {
  const path = sessionStorage.getItem(POST_PAYMENT_REDIRECT_KEY);
  if (path) sessionStorage.removeItem(POST_PAYMENT_REDIRECT_KEY);
  return path;
}
