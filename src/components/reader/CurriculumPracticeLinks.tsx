import type { CurriculumWordMatch } from "@/lib/curriculum-vocabulary";
export function CurriculumPracticeLinks({ matches }: { matches: CurriculumWordMatch[] }) {
  if (!matches.length) return null;
  return (
    <section className="mt-3 rounded-lg border border-border p-3" aria-label="Practice this word">
      <strong className="text-sm">Practice this word in a lesson</strong>
      <p className="mt-1 text-xs">From app vocabulary · meanings can vary with the sentence.</p>
      <ul className="mt-2 space-y-2">
        {matches.map((match, i) => (
          <li key={`${match.moduleId}:${match.lesson}:${i}`}>
            <a className="block text-sm underline underline-offset-2" href={match.href}>
              {match.lesson > 0
                ? `${match.moduleName} · Lesson ${match.lesson}: ${match.title}`
                : "Open the app dictionary"}
            </a>
            <span className="text-xs">
              {match.word} — {match.meaning}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
