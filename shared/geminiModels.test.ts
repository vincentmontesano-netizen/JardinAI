import { describe, expect, it } from "vitest";
import {
  normalizeGeminiImageModel,
  resolveGeminiImageModels,
  isGeminiTransientError,
  geminiRetryDelayMs,
} from "../shared/geminiModels";

describe("normalizeGeminiImageModel", () => {
  it("maps preview aliases to stable Nano Banana model", () => {
    expect(normalizeGeminiImageModel("gemini-2.5-flash-preview-image")).toBe(
      "gemini-2.5-flash-image"
    );
    expect(normalizeGeminiImageModel("nano banana 2")).toBe("gemini-2.5-flash-image");
  });

  it("keeps stable model unchanged", () => {
    expect(normalizeGeminiImageModel("gemini-2.5-flash-image")).toBe("gemini-2.5-flash-image");
  });

  it("builds fallback chain without duplicates", () => {
    expect(resolveGeminiImageModels("gemini-2.5-flash-preview-image")).toEqual([
      "gemini-2.5-flash-image",
      "gemini-2.0-flash-preview-image-generation",
    ]);
  });

  it("detects transient 503 errors", () => {
    const msg =
      "Gemini API (503): This model is currently experiencing high demand. Please try again later.";
    expect(isGeminiTransientError(msg)).toBe(true);
    expect(geminiRetryDelayMs(msg, 1)).toBeGreaterThanOrEqual(3000);
  });
});
