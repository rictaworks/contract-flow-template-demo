const SESSION_COOKIE_NAME = "session_id";

export function parseSessionId(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === SESSION_COOKIE_NAME) return rest.join("=");
  }
  return undefined;
}

export function buildSessionCookie(sessionId: string, isProduction: boolean): string {
  const attrs = ["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=86400"];
  if (isProduction) attrs.push("Secure");
  return `${SESSION_COOKIE_NAME}=${sessionId}; ${attrs.join("; ")}`;
}

export function newSessionId(): string {
  return crypto.randomUUID();
}
