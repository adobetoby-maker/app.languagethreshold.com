import type { AppModule } from "@/data/modules";
import type { ModuleLearningPath } from "@/lib/module-order";
import { cn } from "@/lib/utils";

export function ModuleLearningStages({
  path,
  activeId,
  onSelect,
}: {
  path: ModuleLearningPath<AppModule>;
  activeId: string | null;
  onSelect: (module: AppModule) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`${path.module.name} learning path`}
      className="grid grid-cols-3 gap-2"
    >
      {path.stages.map((stage) => (
        <button
          key={stage.key}
          type="button"
          data-stage={stage.key}
          data-stage-module-id={stage.module?.id}
          disabled={!stage.module}
          aria-pressed={!!stage.module && stage.module.id === activeId}
          onClick={() => stage.module && onSelect(stage.module)}
          className={cn(
            "flex min-h-12 flex-col items-center justify-center rounded-lg border px-1 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
            stage.module?.id === activeId
              ? "border-gold/60 bg-gold/10 text-gold"
              : "border-border/60 hover:border-gold/50 hover:bg-gold/5",
          )}
        >
          <span>{stage.label}</span>
          {!stage.module && <span className="mt-1 text-[10px] font-normal">Not available</span>}
        </button>
      ))}
    </div>
  );
}
