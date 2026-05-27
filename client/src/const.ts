export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export function isOAuthConfigured(): boolean {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();
  return Boolean(oauthPortalUrl && appId);
}

/** Page de connexion locale (email / mot de passe). */
export function getLoginUrl(): string {
  return "/login";
}

/** URL du portail OAuth (bouton optionnel sur /login). */
export function getOAuthLoginUrl(): string | null {
  if (!isOAuthConfigured()) return null;

  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL!.trim().replace(/\/+$/, "");
  const appId = import.meta.env.VITE_APP_ID!.trim();
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
}
