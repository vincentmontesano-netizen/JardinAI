import { z } from "zod";
import {
  DEFAULT_GEMINI_IMAGE_MODEL,
  DEFAULT_GEMINI_TEXT_MODEL,
  normalizeGeminiImageModel,
  normalizeGeminiTextModel,
} from "./geminiModels";

export { DEFAULT_GEMINI_IMAGE_MODEL, DEFAULT_GEMINI_TEXT_MODEL } from "./geminiModels";

export const appSettingsSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiTextModel: z.string().min(1).max(120).optional(),
  geminiImageModel: z.string().min(1).max(120).optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export type AppSettingsPublic = {
  geminiApiKeyMasked: string | null;
  geminiApiKeyConfigured: boolean;
  geminiTextModel: string;
  geminiImageModel: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  geminiTextModel: DEFAULT_GEMINI_TEXT_MODEL,
  geminiImageModel: DEFAULT_GEMINI_IMAGE_MODEL,
};

export const appSettingsUpdateSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiTextModel: z.string().min(1).max(120).optional(),
  geminiImageModel: z.string().min(1).max(120).optional(),
});

export type AppSettingsUpdate = z.infer<typeof appSettingsUpdateSchema>;

export function maskApiKey(key: string | undefined | null): string | null {
  if (!key?.trim()) return null;
  const trimmed = key.trim();
  if (trimmed.length <= 4) return "••••••••" + trimmed;
  return "••••••••" + trimmed.slice(-4);
}

export function toPublicAppSettings(
  stored: AppSettings,
  envFallback: {
    geminiTextModel: string;
    geminiImageModel: string;
    geminiApiKey?: string;
  }
): AppSettingsPublic {
  const apiKey = stored.geminiApiKey?.trim() || envFallback.geminiApiKey?.trim() || "";
  return {
    geminiApiKeyMasked: maskApiKey(apiKey || null),
    geminiApiKeyConfigured: Boolean(apiKey),
    geminiTextModel: normalizeGeminiTextModel(
      stored.geminiTextModel?.trim() || envFallback.geminiTextModel
    ),
    geminiImageModel: normalizeGeminiImageModel(
      stored.geminiImageModel?.trim() || envFallback.geminiImageModel
    ),
  };
}
