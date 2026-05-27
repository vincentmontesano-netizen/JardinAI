import { getGeminiRuntimeConfig } from "../db";
import { storageGetSignedUrl } from "../storage";
import {
  formatGeminiErrorForUser,
  geminiRetryDelayMs,
  isGeminiQuotaError,
  isGeminiTransientError,
  parseGeminiRetryAfterMs,
  resolveGeminiImageModels,
} from "../../shared/geminiModels";
import type { BriefAnswers, ProjectSpaceType } from "../../shared/projectQuestionnaire";
import {
  getApplicableSections,
  isQuestionApplicable,
} from "../../shared/projectQuestionnaire";
import type { AiBriefCriteria } from "../../shared/wizardMeta";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MAX_ATTEMPTS = 5;

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string };
};

export type GeneratedImageResult = {
  buffer: Buffer;
  mimeType: string;
};

export type ProjectReportPayload = {
  planContent: string;
  roadmapContent: string;
  estimatedCostMin: string;
  estimatedCostMax: string;
  artisansList: string;
  purchasesList: string;
};

async function assertGeminiApiKey() {
  const config = await getGeminiRuntimeConfig();
  if (!config.apiKey) {
    throw new Error("GEMINI_API_KEY n'est pas configurée");
  }
  return config;
}

function getInlineData(part: GeminiPart): { mimeType: string; data: string } | null {
  if (part.inlineData?.data) {
    return { mimeType: part.inlineData.mimeType, data: part.inlineData.data };
  }
  if (part.inline_data?.data) {
    return { mimeType: part.inline_data.mime_type, data: part.inline_data.data };
  }
  return null;
}

async function geminiGenerateContent(
  model: string,
  parts: GeminiPart[],
  generationConfig?: Record<string, unknown>
): Promise<GeminiGenerateContentResponse> {
  const config = await assertGeminiApiKey();
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const body = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig,
  });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const payload = (await response.json()) as GeminiGenerateContentResponse;

      if (!response.ok) {
        const detail = payload.error?.message ?? response.statusText;
        throw new Error(`Gemini API (${response.status}): ${detail}`);
      }

      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(message);

      if (attempt < GEMINI_MAX_ATTEMPTS && isGeminiTransientError(message)) {
        const delay = geminiRetryDelayMs(message, attempt);
        console.warn(
          `[Gemini] ${model} attempt ${attempt}/${GEMINI_MAX_ATTEMPTS} — retry in ${delay}ms:`,
          message
        );
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("Gemini API: échec après plusieurs tentatives");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function extractGeneratedImage(response: GeminiGenerateContentResponse): GeneratedImageResult {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = getInlineData(part);
    if (inline?.data) {
      return {
        buffer: Buffer.from(inline.data, "base64"),
        mimeType: inline.mimeType || "image/png",
      };
    }
  }
  throw new Error("Gemini n'a retourné aucune image");
}

function shouldTryNextImageModel(message: string): boolean {
  if (isGeminiTransientError(message)) return false;
  return (
    isGeminiQuotaError(message) ||
    /404|not found|invalid model|model.*not.*support/i.test(message)
  );
}

async function loadImageInlineData(
  storageKey: string,
  mimeType = "image/jpeg"
): Promise<{ mimeType: string; data: string }> {
  const signedUrl = await storageGetSignedUrl(storageKey);
  const imageResponse = await fetch(signedUrl);
  if (!imageResponse.ok) {
    throw new Error(`Impossible de charger la photo (${imageResponse.status})`);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const resolvedMime =
    imageResponse.headers.get("content-type")?.split(";")[0]?.trim() || mimeType;

  return {
    mimeType: resolvedMime,
    data: buffer.toString("base64"),
  };
}

export async function generateImageFromPhoto(options: {
  prompt: string;
  storageKey: string;
  mimeType?: string;
}): Promise<GeneratedImageResult> {
  const inlineImage = await loadImageInlineData(options.storageKey, options.mimeType);
  const config = await getGeminiRuntimeConfig();
  const models = resolveGeminiImageModels(config.imageModel);
  const parts: GeminiPart[] = [
    { text: options.prompt },
    {
      inlineData: {
        mimeType: inlineImage.mimeType,
        data: inlineImage.data,
      },
    },
  ];
  const generationConfig = { responseModalities: ["TEXT", "IMAGE"] };

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await geminiGenerateContent(model, parts, generationConfig);
      return extractGeneratedImage(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(message);
      console.warn(`[Gemini] Image model ${model} failed:`, message);

      if (!shouldTryNextImageModel(message)) {
        throw new Error(formatGeminiErrorForUser(message));
      }

      const retryMs = parseGeminiRetryAfterMs(message);
      if (retryMs) {
        await sleep(Math.min(retryMs, 45_000));
      }
    }
  }

  throw new Error(formatGeminiErrorForUser(lastError?.message ?? "Aucun modèle image Gemini disponible"));
}

const REPORT_JSON_SCHEMA = {
  type: "object",
  properties: {
    planContent: {
      type: "string",
      description: "Plan d'aménagement détaillé en markdown",
    },
    roadmapContent: {
      type: "string",
      description:
        "Travaux à réaliser en markdown avec étapes numérotées, durées, priorités et section ## Outillage nécessaire",
    },
    estimatedCostMin: {
      type: "string",
      description: "Coût total minimum en EUR (nombre uniquement)",
    },
    estimatedCostMax: {
      type: "string",
      description: "Coût total maximum en EUR (nombre uniquement)",
    },
    artisansList: {
      type: "string",
      description:
        "Main d'œuvre et artisans en markdown : corps de métier, tâches, durée, coût indicatif EUR",
    },
    purchasesList: {
      type: "string",
      description:
        "Matériaux et fournitures en markdown : article, quantité, prix unitaire, total ligne EUR",
    },
  },
  required: [
    "planContent",
    "roadmapContent",
    "estimatedCostMin",
    "estimatedCostMax",
    "artisansList",
    "purchasesList",
  ],
};

export async function generateProjectReport(input: {
  title: string;
  spaceTypeLabel: string;
  style: string;
  budgetLabel: string;
  clientBrief: string;
  photoCount: number;
}): Promise<ProjectReportPayload> {
  const prompt = `Tu es un architecte paysagiste et designer d'intérieur expert en France.

Génère un compte rendu professionnel complet à partir du brief client ci-dessous.

**Projet** : ${input.title}
**Type d'espace** : ${input.spaceTypeLabel}
**Style souhaité** : ${input.style}
${input.budgetLabel}
**Photos analysées** : ${input.photoCount}

--- BRIEF CLIENT ---
${input.clientBrief}
--- FIN DU BRIEF ---

Le compte rendu doit couvrir :
1. **Plan d'aménagement** — zones, disposition, matériaux, végétation, mobilier, éclairage
2. **Travaux à réaliser** — étapes numérotées avec durées, ordre logique, précautions, plus une section "## Outillage nécessaire" (liste des outils)
3. **Main d'œuvre** — artisans/corps de métier, tâches, durée estimée, coût main d'œuvre indicatif en EUR
4. **Matériaux & fournitures** — liste détaillée avec quantités et prix indicatifs en EUR
5. **Coûts totaux** — fourchette réaliste (matériaux + main d'œuvre + marge) pour la France

Utilise du markdown structuré (titres, listes, tableaux). Tous les montants en EUR.`;

  const config = await getGeminiRuntimeConfig();
  let response: GeminiGenerateContentResponse;
  try {
    response = await geminiGenerateContent(
      config.textModel,
      [{ text: prompt }],
      {
        responseMimeType: "application/json",
        responseSchema: REPORT_JSON_SCHEMA,
        temperature: 0.4,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(formatGeminiErrorForUser(message));
  }

  const textPart = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!textPart) {
    throw new Error("Gemini n'a retourné aucun compte rendu");
  }

  const report = JSON.parse(textPart) as ProjectReportPayload;

  for (const field of [
    "planContent",
    "roadmapContent",
    "estimatedCostMin",
    "estimatedCostMax",
    "artisansList",
    "purchasesList",
  ] as const) {
    if (!report[field]) {
      throw new Error(`Champ manquant dans le compte rendu : ${field}`);
    }
  }

  return report;
}

export async function generateBriefFromCriteria(input: {
  title: string;
  spaceType: ProjectSpaceType;
  style: string;
  budget?: string;
  criteria: AiBriefCriteria;
}): Promise<BriefAnswers> {
  const sections = getApplicableSections(input.spaceType);
  const questions: Array<{ id: string; label: string; section: string }> = [];

  for (const section of sections) {
    for (const q of section.questions) {
      if (!isQuestionApplicable(q, input.spaceType)) continue;
      questions.push({ id: q.id, label: q.label, section: section.title });
    }
  }

  const questionList = questions
    .map((q) => `- "${q.id}" (${q.section} — ${q.label})`)
    .join("\n");

  const prompt = `Tu es un paysagiste / architecte d'intérieur en France. Génère un brief client détaillé en JSON.

Projet : ${input.title}
Type d'espace : ${input.spaceType}
Style : ${input.style}
${input.budget ? `Budget : ${input.budget}` : ""}

Critères fournis par le client :
1. Objectifs : ${input.criteria.clientGoals}
2. Contraintes : ${input.criteria.mainConstraints}
3. Ambiance & usage : ${input.criteria.desiredAmbiance}

Pour chaque identifiant de question ci-dessous, rédige une réponse concise en français (1 à 3 phrases).
Réponds UNIQUEMENT avec un objet JSON : clés = identifiants, valeurs = texte de réponse.
Omet les questions sans réponse pertinente.

Questions :
${questionList}`;

  const config = await getGeminiRuntimeConfig();
  let response: GeminiGenerateContentResponse;
  try {
    response = await geminiGenerateContent(config.textModel, [{ text: prompt }], {
      responseMimeType: "application/json",
      temperature: 0.5,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(formatGeminiErrorForUser(message));
  }

  const textPart = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!textPart) throw new Error("Gemini n'a pas généré de brief");

  const parsed = JSON.parse(textPart) as Record<string, string>;
  const answers: BriefAnswers = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.trim()) answers[key] = value.trim();
  }
  return answers;
}
