export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

/** Modèles image de secours si le principal est indisponible ou sans quota. */
export const GEMINI_IMAGE_MODEL_FALLBACKS = [
  DEFAULT_GEMINI_IMAGE_MODEL,
  "gemini-2.0-flash-preview-image-generation",
] as const;

const IMAGE_MODEL_ALIASES: Record<string, string> = {
  "nano-banana": DEFAULT_GEMINI_IMAGE_MODEL,
  "nano banana": DEFAULT_GEMINI_IMAGE_MODEL,
  "nano banana 2": DEFAULT_GEMINI_IMAGE_MODEL,
  "nano-banana-2": DEFAULT_GEMINI_IMAGE_MODEL,
  "nanobanana": DEFAULT_GEMINI_IMAGE_MODEL,
  "nanobanana2": DEFAULT_GEMINI_IMAGE_MODEL,
  "gemini-2.5-flash-preview-image": DEFAULT_GEMINI_IMAGE_MODEL,
  "gemini-2.5-flash-image-preview": DEFAULT_GEMINI_IMAGE_MODEL,
};

export function normalizeGeminiTextModel(model: string | undefined | null): string {
  const trimmed = model?.trim();
  return trimmed || DEFAULT_GEMINI_TEXT_MODEL;
}

/**
 * Nano Banana = gemini-2.5-flash-image (stable).
 * Les variantes *-preview-image n'ont souvent pas de quota free tier.
 */
export function normalizeGeminiImageModel(model: string | undefined | null): string {
  const trimmed = model?.trim();
  if (!trimmed) return DEFAULT_GEMINI_IMAGE_MODEL;

  const alias = IMAGE_MODEL_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  if (/preview-image/i.test(trimmed) || /image-preview/i.test(trimmed)) {
    return DEFAULT_GEMINI_IMAGE_MODEL;
  }

  return trimmed;
}

export function resolveGeminiImageModels(primary: string | undefined | null): string[] {
  const normalized = normalizeGeminiImageModel(primary);
  const chain = [normalized, ...GEMINI_IMAGE_MODEL_FALLBACKS.filter((m) => m !== normalized)];
  return Array.from(new Set(chain));
}

export function parseGeminiHttpStatus(message: string): number | null {
  const match = message.match(/Gemini API \((\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseGeminiRetryAfterMs(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match) return null;
  return Math.ceil(parseFloat(match[1]) * 1000);
}

export function isGeminiQuotaError(message: string): boolean {
  if (/429|quota exceeded|rate limit/i.test(message)) return true;
  const status = parseGeminiHttpStatus(message);
  return status === 429;
}

/** Surcharge temporaire — retenter plutôt que d'échouer immédiatement. */
export function isGeminiTransientError(message: string): boolean {
  const status = parseGeminiHttpStatus(message);
  if (status === 503 || status === 502 || status === 500) return true;
  if (status === 429 && /retry in/i.test(message)) return true;

  return /high demand|overloaded|temporarily unavailable|try again later|service unavailable|deadline exceeded|unavailable/i.test(
    message
  );
}

export function geminiRetryDelayMs(message: string, attempt: number): number {
  const fromApi = parseGeminiRetryAfterMs(message);
  if (fromApi) return Math.min(fromApi, 60_000);
  return Math.min(3000 * 2 ** (attempt - 1), 45_000);
}

export function formatGeminiErrorForUser(message: string): string {
  if (isGeminiTransientError(message)) {
    if (/503|high demand/i.test(message)) {
      return "Le modèle Gemini est très sollicité (503). Patientez quelques instants puis relancez — des tentatives automatiques sont effectuées en arrière-plan.";
    }
    const retryMs = parseGeminiRetryAfterMs(message);
    if (retryMs) {
      const seconds = Math.ceil(retryMs / 1000);
      return `Service Gemini temporairement indisponible. Réessayez dans environ ${seconds} secondes.`;
    }
    return "Service Gemini temporairement indisponible. Réessayez dans quelques minutes.";
  }

  if (!isGeminiQuotaError(message)) return message;

  if (/preview-image|preview_image/i.test(message)) {
    return (
      "Quota épuisé sur le modèle image « preview ». " +
      "Dans Admin → Paramètres, utilisez le modèle stable « gemini-2.5-flash-image » (Nano Banana). " +
      "Si le problème persiste, activez la facturation sur https://ai.google.dev/pricing"
    );
  }

  const retryMs = parseGeminiRetryAfterMs(message);
  if (retryMs) {
    const seconds = Math.ceil(retryMs / 1000);
    return `Quota API Gemini dépassé. Réessayez dans environ ${seconds} secondes, ou vérifiez votre plan sur https://ai.dev/rate-limit`;
  }

  return "Quota API Gemini dépassé. Vérifiez votre plan et la facturation sur https://ai.google.dev/pricing";
}
