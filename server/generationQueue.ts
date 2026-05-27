import {
  getProjectById,
  getProjectPhotos,
  updateProjectStatus,
  upsertProjectReport,
  addRendering,
  refundCredit,
  clearProjectGenerationError,
  recordProjectGenerationFailure,
  clearProjectOutputs,
} from "./db";
import { storagePut } from "./storage";
import { generateProjectReport } from "./_core/gemini";
import { generateImage } from "./_core/imageGeneration";
import { formatBriefForPrompt, type BriefAnswers } from "../shared/projectQuestionnaire";
import { formatGeminiErrorForUser, geminiRetryDelayMs, isGeminiTransientError } from "../shared/geminiModels";

const MAX_RETRIES = 5;
const MAX_CONCURRENT = 2;
const RETRY_DELAY_MS = 5000;

type GenerationJob = {
  projectId: number;
  userId: number;
  attempt: number;
};

const queue: GenerationJob[] = [];
let activeJobs = 0;

export function enqueueGeneration(projectId: number, userId: number, attempt = 1) {
  queue.push({ projectId, userId, attempt });
  void processQueue();
}

async function processQueue() {
  while (activeJobs < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    activeJobs++;
    runJob(job)
      .catch((err) => console.error("[GenerationQueue] Unexpected error:", err))
      .finally(() => {
        activeJobs--;
        void processQueue();
      });
  }
}

async function runJob(job: GenerationJob) {
  try {
    await generateProjectCore(job.projectId, job.userId);
  } catch (err) {
    const message = formatGeminiErrorForUser(
      err instanceof Error ? err.message : "Erreur de génération inconnue"
    );
    console.error(`[Generation] Attempt ${job.attempt}/${MAX_RETRIES} failed for project ${job.projectId}:`, err);

    if (job.attempt < MAX_RETRIES) {
      const raw = err instanceof Error ? err.message : "";
      const delay = isGeminiTransientError(raw)
        ? geminiRetryDelayMs(raw, job.attempt)
        : RETRY_DELAY_MS * job.attempt;
      console.warn(
        `[Generation] Retry ${job.attempt + 1}/${MAX_RETRIES} for project ${job.projectId} in ${delay}ms`
      );
      setTimeout(() => {
        enqueueGeneration(job.projectId, job.userId, job.attempt + 1);
      }, delay);
      return;
    }

    await recordProjectGenerationFailure(job.projectId, message);
    await updateProjectStatus(job.projectId, "failed");
    await refundCredit(job.userId);
  }
}

async function generateProjectCore(projectId: number, userId: number) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Projet introuvable");

  const photos = await getProjectPhotos(projectId);
  if (photos.length === 0) {
    throw new Error("Aucune photo disponible pour la génération");
  }

  const spaceTypeLabel =
    project.spaceType === "interior"
      ? "intérieur"
      : project.spaceType === "exterior"
        ? "extérieur"
        : "intérieur et extérieur";
  const styleLabel = project.style;
  const budgetLabel = project.budget ? `Budget indicatif : ${project.budget} EUR.` : "";
  const briefData: BriefAnswers | null = project.briefData
    ? (() => {
        try {
          return JSON.parse(project.briefData) as BriefAnswers;
        } catch {
          return null;
        }
      })()
    : null;
  const clientBrief = formatBriefForPrompt({
    title: project.title,
    spaceType: project.spaceType,
    style: styleLabel,
    budget: project.budget,
    constraints: project.constraints,
    additionalNotes: project.additionalNotes,
    briefData,
  });

  const imagePrompt = `Transforme cet espace ${spaceTypeLabel} en un aménagement de style ${styleLabel}.
Crée un rendu photoréaliste professionnel montrant l'espace réaménagé avec des matériaux premium, végétation soignée, mobilier contemporain et éclairage architectural.
${budgetLabel}
Brief client (extraits) :
${clientBrief.slice(0, 2000)}
Le rendu doit ressembler à une visualisation 3D haut de gamme pour un dossier client paysagiste / architecte d'intérieur.`;

  const photosToProcess = photos.slice(0, 3);
  let renderedCount = 0;

  for (const photo of photosToProcess) {
    const viewLabel = photo.title?.trim() ? `\nVue : ${photo.title.trim()}.` : "";
    const { buffer, mimeType } = await generateImage({
      prompt: imagePrompt + viewLabel,
      storageKey: photo.storageKey,
      mimeType: "image/jpeg",
    });

    const ext = mimeType.includes("png") ? "png" : "jpg";
    const key = `projects/${projectId}/renderings/${Date.now()}.${ext}`;
    const { url: storedUrl } = await storagePut(key, buffer, mimeType);

    await addRendering({
      projectId,
      originalPhotoId: photo.id,
      renderedUrl: storedUrl,
      storageKey: key,
      prompt: imagePrompt,
    });
    renderedCount++;
  }

  const report = await generateProjectReport({
    title: project.title,
    spaceTypeLabel,
    style: styleLabel,
    budgetLabel,
    clientBrief,
    photoCount: photos.length,
  });

  await upsertProjectReport({
    projectId,
    planContent: report.planContent,
    roadmapContent: report.roadmapContent,
    estimatedCostMin: report.estimatedCostMin,
    estimatedCostMax: report.estimatedCostMax,
    artisansList: report.artisansList,
    purchasesList: report.purchasesList,
  });

  if (renderedCount === 0) {
    throw new Error("Aucun rendu visuel n'a pu être généré");
  }

  await clearProjectGenerationError(projectId);
  await updateProjectStatus(projectId, "completed");
}

export async function prepareProjectForGeneration(projectId: number) {
  await clearProjectOutputs(projectId);
  await updateProjectStatus(projectId, "processing");
}
