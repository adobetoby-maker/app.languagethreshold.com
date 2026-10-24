import { appBuildInfo } from "@/lib/app-build-info";

const environmentLabel = {
  production: "Live",
  preview: "Preview",
  development: "Development",
  build: "Build",
} as const;

export function AppVersion() {
  const { commit, builtAt, environment } = appBuildInfo;
  return (
    <section
      data-testid="app-version"
      aria-label="App version"
      className="my-3 rounded-lg border border-border/40 px-3 py-2 text-xs text-muted-foreground"
    >
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span>App version</span>
        <span>
          <code title={commit ?? undefined}>{commit?.slice(0, 7) ?? "Unversioned"}</code> ·{" "}
          {environmentLabel[environment]}
        </span>
      </p>
      {builtAt && (
        <p className="mt-1 text-[11px]">
          Built <time dateTime={builtAt}>{builtAt.slice(0, 10)}</time> (UTC)
        </p>
      )}
    </section>
  );
}
