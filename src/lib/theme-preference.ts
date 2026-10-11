export const THEME_PREFERENCE_KEY = "lt.theme.v1";
export const APP_STATE_KEY = "lt.app.v2";

type ReadableStorage = Pick<Storage, "getItem">;

export function readDarkModePreference(storage?: ReadableStorage): boolean {
  try {
    const source = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
    if (!source) return true;
    const preference = source.getItem(THEME_PREFERENCE_KEY);
    if (preference === "dark") return true;
    if (preference === "light") return false;
    const appState = JSON.parse(source.getItem(APP_STATE_KEY) ?? "null") as {
      darkMode?: unknown;
    } | null;
    return appState?.darkMode !== false;
  } catch {
    return true;
  }
}

export function applyDarkMode(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#192232" : "#f5f1e7");
}

export function saveDarkModePreference(dark: boolean) {
  applyDarkMode(dark);
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, dark ? "dark" : "light");
    window.dispatchEvent(new Event("lt:theme-change"));
  } catch {
    // The current page can still switch themes if browser storage is blocked.
  }
}
