export const AUTH_COOKIE = "ff_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getAdminPassphrase(): string | undefined {
  const value = process.env.ADMIN_PASSPHRASE?.trim();
  return value || undefined;
}

/** Deterministic session token derived from the admin passphrase (Edge-safe). */
export async function createSessionToken(passphrase: string): Promise<string> {
  const data = new TextEncoder().encode(`focusflow-v1:${passphrase}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function isValidSessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const passphrase = getAdminPassphrase();
  if (!passphrase) return false;
  const expected = await createSessionToken(passphrase);
  if (token.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < token.length; i += 1) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
