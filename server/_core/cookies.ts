import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = !LOCAL_HOSTS.has(req.hostname) && isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // SameSite=Lax : compatible HTTP (IP Hostinger) et navigation same-origin.
    // None exige Secure et casse la session sur http://IP sans TLS.
    sameSite: "lax",
    secure,
  };
}
