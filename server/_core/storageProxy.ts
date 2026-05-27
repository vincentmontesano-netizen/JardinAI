import type { Express, Request, Response } from "express";
import express from "express";
import { ENV } from "./env";
import {
  isUsingLocalStorage,
  localStorageExists,
  resolveLocalStoragePath,
  writeLocalStorage,
} from "../localStorage";

async function serveLocalFile(key: string, res: Response) {
  const exists = await localStorageExists(key);
  if (!exists) {
    res.status(404).send("File not found");
    return;
  }

  const filePath = resolveLocalStoragePath(key);
  res.set("Cache-Control", "public, max-age=3600");
  res.sendFile(filePath);
}

export function registerLocalStorageRoutes(app: Express) {
  if (!isUsingLocalStorage()) return;

  app.put(
    "/api/dev-storage/*",
    express.raw({ type: () => true, limit: "50mb" }),
    async (req: Request, res: Response) => {
      const key = (req.params as Record<string, string>)[0];
      if (!key) {
        res.status(400).send("Missing storage key");
        return;
      }

      try {
        const body = req.body;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          res.status(400).send("Empty upload body");
          return;
        }
        await writeLocalStorage(key, body);
        res.status(204).end();
      } catch (err) {
        console.error("[LocalStorage] PUT failed:", err);
        res.status(500).send("Local storage upload failed");
      }
    }
  );
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (isUsingLocalStorage()) {
      try {
        await serveLocalFile(key, res);
      } catch (err) {
        console.error("[LocalStorage] GET failed:", err);
        res.status(500).send("Local storage read failed");
      }
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
