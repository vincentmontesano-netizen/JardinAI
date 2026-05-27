import type { Express, Request, Response } from "express";
import * as db from "../db";
import { setSessionCookie } from "./authHelpers";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      await setSessionCookie(req, res, {
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email ?? null,
      });

      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.redirect(302, "/login?error=oauth");
    }
  });
}
