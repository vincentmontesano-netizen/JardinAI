// Forge/S3 presigned uploads when configured; local filesystem fallback in development.

import { ENV } from "./_core/env";
import {
  isUsingLocalStorage,
  localStoragePublicUrl,
  localStorageUploadUrl,
  writeLocalStorage,
} from "./localStorage";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    if (isUsingLocalStorage()) return null;
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePresignPut(
  relKey: string,
  contentType = "application/octet-stream",
): Promise<{ key: string; uploadUrl: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (isUsingLocalStorage()) {
    void contentType;
    return {
      key,
      uploadUrl: localStorageUploadUrl(key),
      url: `/manus-storage/${key}`,
    };
  }

  const forge = getForgeConfig();
  if (!forge) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  const { forgeUrl, forgeKey } = forge;
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: uploadUrl } = (await presignResp.json()) as { url: string };
  if (!uploadUrl) throw new Error("Forge returned empty presign URL");

  return { key, uploadUrl, url: `/manus-storage/${key}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  if (isUsingLocalStorage()) {
    const key = appendHashSuffix(normalizeKey(relKey));
    const buffer =
      typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
    await writeLocalStorage(key, buffer);
    return { key, url: `/manus-storage/${key}` };
  }

  const { key, uploadUrl, url } = await storagePresignPut(relKey, contentType);

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as BlobPart], { type: contentType });

  const uploadResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (isUsingLocalStorage()) {
    return localStoragePublicUrl(key);
  }

  const forge = getForgeConfig();
  if (!forge) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  const { forgeUrl, forgeKey } = forge;
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
