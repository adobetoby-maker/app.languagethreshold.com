const MODULE_REQUEST_RETURN_KEY = "lt_module_request_auth_return";
const MODULE_REQUEST_RETURN_MS = 15 * 60 * 1000;

export function rememberModuleRequestReturn(pathname: string, storage: Storage, now = Date.now()) {
  if (pathname !== "/module-request") return;
  try {
    storage.setItem(MODULE_REQUEST_RETURN_KEY, String(now + MODULE_REQUEST_RETURN_MS));
  } catch {
    // Storage restrictions must never prevent a learner from signing in.
  }
}

export function consumeModuleRequestReturn(
  pathname: string,
  hasSession: boolean,
  storage: Storage,
  now = Date.now(),
) {
  if (!hasSession || pathname !== "/") return null;
  try {
    const expiresAt = Number(storage.getItem(MODULE_REQUEST_RETURN_KEY));
    if (!expiresAt) return null;
    storage.removeItem(MODULE_REQUEST_RETURN_KEY);
    return expiresAt > now ? "/module-request" : null;
  } catch {
    return null;
  }
}

export function clearModuleRequestReturn(storage: Storage) {
  try {
    storage.removeItem(MODULE_REQUEST_RETURN_KEY);
  } catch {
    // The sign-in result is more important than clearing this short-lived marker.
  }
}
