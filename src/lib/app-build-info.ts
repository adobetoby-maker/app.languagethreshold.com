export interface AppBuildInfo {
  commit: string | null;
  builtAt: string | null;
  environment: "production" | "preview" | "development" | "build";
}

// Replaced at build time, identical in the server and client bundles. Only
// these public fields are embedded; runtime server environment is never exposed.
declare const __LT_APP_BUILD__: AppBuildInfo;
export const appBuildInfo: Readonly<AppBuildInfo> =
  typeof __LT_APP_BUILD__ === "undefined"
    ? { commit: null, builtAt: null, environment: "development" }
    : __LT_APP_BUILD__;
