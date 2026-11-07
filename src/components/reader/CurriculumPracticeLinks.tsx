import type { CurriculumWordMatch } from "@/lib/curriculum-vocabulary";
export function CurriculumPracticeLinks({ matches }: { matches: CurriculumWordMatch[] }) {
  if (!matches.length) return null;
  return (
    <section className="mt-4 border-t border-border/60 pt-3" aria-label="Practice it here">
      <h4 className="text-sm font-semibold">Practice it here</h4>
      <ul className="mt-2 space-y-1">
        {matches.map((match, i) => (
          <li key={`${match.moduleId}:${match.lesson}:${i}`}>
            <a
              className="flex min-h-11 min-w-0 items-center rounded-lg border border-border/60 px-3 text-sm text-foreground hover:border-gold/60 hover:text-gold"
              href={match.href}
              title={match.lesson > 0 ? `${match.moduleName} · Lesson ${match.lesson}: ${match.title}` : "Open the app dictionary"}
            >
              <span className="min-w-0 truncate">
                {match.lesson > 0
                  ? `${match.moduleName} · Lesson ${match.lesson}: ${match.title}`
                  : "Open the app dictionary"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
