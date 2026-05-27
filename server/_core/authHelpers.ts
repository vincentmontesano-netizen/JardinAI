import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Response } from "express";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export type PublicUser = Omit<User, "passwordHash">;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailToOpenId(email: string): string {
  return `email:${normalizeEmail(email)}`;
}

export function userDisplayName(user: {
  name?: string | null;
  email?: string | null;
}): string {
  if (user.name?.trim()) return user.name.trim();
  if (user.email) return user.email.split("@")[0] ?? "Utilisateur";
  return "Utilisateur";
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function setSessionCookie(
  req: Parameters<typeof getSessionCookieOptions>[0],
  res: Response,
  user: Pick<User, "openId" | "name" | "email">
): Promise<void> {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: userDisplayName(user),
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}
