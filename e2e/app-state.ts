import type { Page } from "@playwright/test";

// The app saves its state in a profile envelope: lt.profile-device.v1.guest when signed out,
// lt.profile-device.v1.user.<encoded id> when signed in, shaped
// { schema: 1, userId, data: { activeModuleId, currentTab, core30Log, ... } }.
// (The older lt.app.v2 key is not read for live state any more, and its presence only
// triggers the legacy-recovery path, so specs must not seed or poll it.)

export type AppState = {
  activeModuleId?: string | null;
  currentTab?: string;
  core30Log?: Record<string, unknown>;
  [key: string]: unknown;
};

export const profileKey = (userId: string | null = null) =>
  userId ? `lt.profile-device.v1.user.${encodeURIComponent(userId)}` : "lt.profile-device.v1.guest";

/** The saved app state (the envelope's data), or {} when nothing is saved yet. */
export const readAppState = (page: Page, userId: string | null = null): Promise<AppState> =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "null")?.data ?? {},
    profileKey(userId),
  );

/** Merges `patch` into the saved state and writes the full envelope back. */
export const seedAppState = (
  page: Page,
  patch: AppState,
  userId: string | null = null,
): Promise<void> =>
  page.evaluate(
    ({ key, patch, user }) => {
      const previous = JSON.parse(localStorage.getItem(key) || "null");
      const data = { ...(previous?.data ?? {}), ...patch };
      localStorage.setItem(key, JSON.stringify({ schema: 1, userId: user, data }));
    },
    { key: profileKey(userId), patch, user: userId },
  );

export const currentTab = async (page: Page, userId: string | null = null) =>
  (await readAppState(page, userId)).currentTab;

/**
 * The root-page link the app keeps in sync with its state (`?module=&target=&native=&tab=`).
 * The app applies these parameters after it loads the saved profile, so a seed only sticks
 * when the page is opened on a matching link: a bare reload keeps the old link and wins.
 */
export const appUrl = ({
  tab,
  module = null,
  target = "Spanish",
  native = "English",
}: {
  tab: string;
  module?: string | null;
  target?: string;
  native?: string;
}) => "/?" + new URLSearchParams({ module: module ?? "core", target, native, tab }).toString();

/**
 * The key the app files Core 30 progress under: module, language pair and enrollment
 * (null = independent practice). A bare module id is only an unclaimed legacy record, which
 * the plan card ignores.
 */
export const core30Key = (moduleId: string, target = "Spanish", native = "English") =>
  JSON.stringify(["core30", 1, moduleId, target, native, null]);
