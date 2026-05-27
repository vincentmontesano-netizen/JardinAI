import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

const LOCAL_ROOT = path.resolve(
  process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), ".data", "uploads")
);

export function isUsingLocalStorage(): boolean {
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return false;
  return true;
}

export function getLocalStorageRoot(): string {
  return LOCAL_ROOT;
}

export function resolveLocalStoragePath(relKey: string): string {
  const normalized = relKey.replace(/^\/+/, "");
  const fullPath = path.resolve(LOCAL_ROOT, normalized);
  const rootWithSep = LOCAL_ROOT.endsWith(path.sep) ? LOCAL_ROOT : `${LOCAL_ROOT}${path.sep}`;
  if (!fullPath.startsWith(rootWithSep) && fullPath !== LOCAL_ROOT) {
    throw new Error("Invalid storage key");
  }
  return fullPath;
}

export async function writeLocalStorage(relKey: string, data: Buffer): Promise<void> {
  const filePath = resolveLocalStoragePath(relKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function readLocalStorage(relKey: string): Promise<Buffer> {
  return fs.readFile(resolveLocalStoragePath(relKey));
}

export async function localStorageExists(relKey: string): Promise<boolean> {
  try {
    await fs.access(resolveLocalStoragePath(relKey));
    return true;
  } catch {
    return false;
  }
}

export function localStoragePublicUrl(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  const base =
    process.env.PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
  return `${base}/manus-storage/${key}`;
}

export function localStorageUploadUrl(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  return `/api/dev-storage/${key}`;
}
