import { normalizeGeminiImageModel, normalizeGeminiTextModel } from "../../shared/geminiModels";

export const ENV = {
  appId: (() => {
    const raw = process.env.APP_ID || process.env.VITE_APP_ID || "";
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : "jardinia";
  })(),
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiImageModel: normalizeGeminiImageModel(process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image"),
  geminiTextModel: normalizeGeminiTextModel(process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash"),
};
