import type { BriefAnswers, ProjectSpaceType } from "@shared/projectQuestionnaire";
import type { WizardMacroStepId } from "@shared/projectWizard";

const DRAFT_KEY = "jardinia-project-wizard-draft";
const PHOTOS_DB_NAME = "jardinia-wizard-photos";
const PHOTOS_STORE = "photos";

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
  photos: Array<{ id: string; name: string; type: string; title?: string }>;
  serverProjectId?: number;
  savedAt: number;
};

type StoredPhoto = {
  id: string;
  name: string;
  type: string;
  title?: string;
  blob: Blob;
};

function openPhotosDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTOS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(PHOTOS_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function clearStoredPhotos(): Promise<void> {
  const db = await openPhotosDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTOS_STORE, "readwrite");
    tx.objectStore(PHOTOS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
  });
  db.close();
}

async function savePhotosToIndexedDb(
  photos: Array<{ file: File; title: string }>
): Promise<ProjectWizardDraft["photos"]> {
  const db = await openPhotosDb();
  const refs: ProjectWizardDraft["photos"] = [];

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTOS_STORE, "readwrite");
    const store = tx.objectStore(PHOTOS_STORE);
    store.clear();

    for (const photo of photos) {
      const id = crypto.randomUUID();
      refs.push({
        id,
        name: photo.file.name,
        type: photo.file.type,
        title: photo.title,
      });
      store.put({
        id,
        name: photo.file.name,
        type: photo.file.type,
        title: photo.title,
        blob: photo.file,
      } satisfies StoredPhoto);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB save failed"));
  });

  db.close();
  return refs;
}

async function loadPhotosFromIndexedDb(
  refs: ProjectWizardDraft["photos"]
): Promise<Array<{ file: File; preview: string; title: string }>> {
  if (refs.length === 0) return [];

  const db = await openPhotosDb();
  const stored = await Promise.all(
    refs.map(
      (ref) =>
        new Promise<StoredPhoto | null>((resolve, reject) => {
          const tx = db.transaction(PHOTOS_STORE, "readonly");
          const request = tx.objectStore(PHOTOS_STORE).get(ref.id);
          request.onsuccess = () => resolve((request.result as StoredPhoto | undefined) ?? null);
          request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
        })
    )
  );
  db.close();

  return stored
    .filter((entry): entry is StoredPhoto => entry !== null)
    .map((entry) => {
      const file = new File([entry.blob], entry.name, {
        type: entry.type || entry.blob.type,
      });
      return {
        file,
        preview: URL.createObjectURL(file),
        title: entry.title ?? "",
      };
    });
}

export async function saveProjectWizardDraft(input: {
  form: ProjectWizardDraft["form"];
  briefAnswers: BriefAnswers;
  macroStep: WizardMacroStepId;
  briefSectionIndex: number;
  photos: Array<{ file: File; preview: string; title: string }>;
  serverProjectId?: number;
}): Promise<void> {
  const photoRefs = await savePhotosToIndexedDb(input.photos);

  const draft: ProjectWizardDraft = {
    form: input.form,
    briefAnswers: input.briefAnswers,
    macroStep: input.macroStep,
    briefSectionIndex: input.briefSectionIndex,
    photos: photoRefs,
    serverProjectId: input.serverProjectId,
    savedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    await clearStoredPhotos();
    throw error;
  }
}

export function loadProjectWizardDraft(): ProjectWizardDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as ProjectWizardDraft;
    if (Date.now() - draft.savedAt > 1000 * 60 * 60 * 24) {
      void clearProjectWizardDraft();
      return null;
    }
    return draft;
  } catch {
    void clearProjectWizardDraft();
    return null;
  }
}

export async function restorePhotosFromDraft(
  draft: ProjectWizardDraft
): Promise<Array<{ file: File; preview: string; title: string }>> {
  if (!draft.photos?.length) return [];
  return loadPhotosFromIndexedDb(draft.photos);
}

export function clearProjectWizardDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
  void clearStoredPhotos().catch(() => {
    /* ignore */
  });
}

export function hasResumeIntent(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("resume") === "1";
}

export function shouldStartFreshWizard(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("new") === "1";
}

export function hasStoredWizardDraft(): boolean {
  return loadProjectWizardDraft() !== null;
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
