/**
 * Génération d'images via l'API Gemini (Nano Banana).
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
import { generateImageFromPhoto } from "./gemini";

export type GenerateImageOptions = {
  prompt: string;
  storageKey: string;
  mimeType?: string;
};

export type GenerateImageResponse = {
  buffer: Buffer;
  mimeType: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  return generateImageFromPhoto(options);
}
