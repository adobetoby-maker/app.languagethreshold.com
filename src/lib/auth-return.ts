const AUTH_RETURN_KEY = "lt_auth_return";
const AUTH_RETURN_MS = 15 * 60 * 1000;
const RETURN_PATHS = new Set(["/module-request", "/team"]);

export function rememberAuthReturn(pathname: string, storage: Storage, now = Date.now()) {
  if (!RETURN_PATHS.has(pathname)) return;
  try {
    storage.setItem(AUTH_RETURN_KEY, JSON.stringify({ pathname, expiresAt: now + AUTH_RETURN_MS }));
  } catch {
    // Storage restrictions must never prevent a learner from signing in.
  }
}

export function consumeAuthReturn(
  pathname: string,
  hasSession: boolean,
  storage: Storage,
  now = Date.now(),
) {
  if (!hasSession || pathname !== "/") return null;
  try {
    const saved = storage.getItem(AUTH_RETURN_KEY);
    if (!saved) return null;
    storage.removeItem(AUTH_RETURN_KEY);
    const { pathname: returnPath, expiresAt } = JSON.parse(saved);
    return RETURN_PATHS.has(returnPath) && expiresAt > now ? returnPath : null;
  } catch {
    return null;
  }
}

export function clearAuthReturn(storage: Storage) {
  try {
    storage.removeItem(AUTH_RETURN_KEY);
  } catch {
    // The sign-in result is more important than clearing this short-lived marker.
  }
}
