import { FounderStoryLink } from "@/components/FounderStoryLink";
import { buyerFaq, publicProof } from "@/data/buyer-information";

export function BuyerFaq() {
  return (
    <section className="my-10 space-y-4" aria-labelledby="buyer-questions">
      <h2 id="buyer-questions" className="text-2xl font-semibold">
        Before you start
      </h2>
      {buyerFaq.map(({ question, answer }) => (
        <details key={question} className="rounded-xl border border-border bg-card p-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">{question}</summary>
          <p className="mt-3 leading-relaxed text-muted-foreground">{answer}</p>
        </details>
      ))}
      <a
        href="/pricing"
        className="inline-flex min-h-11 items-center font-semibold text-gold-ink underline"
      >
        Compare plans and start with 7 days free →
      </a>
    </section>
  );
}

/** Empty until the owner supplies verified evidence and permission to publish it. */
export function PublicProof() {
  const { stories, signals, usage } = publicProof;
  if (!stories.length && !signals.length && !usage) return null;
  return (
    <section className="my-8 space-y-5" aria-label="Learner experiences and independent reviews">
      {usage && (
        <p>
          {usage.count.toLocaleString()} {usage.label} <span>As of {usage.asOf}</span>
        </p>
      )}
      {stories.map((story) => (
        <figure key={story.name} className="rounded-xl border border-border p-5">
          <img src={story.photo} alt={story.name} width={64} height={64} loading="lazy" />
          <blockquote>{story.quote}</blockquote>
          <figcaption>
            {story.name}, {story.role} · Practiced: {story.situation}
          </figcaption>
        </figure>
      ))}
      {signals.map((signal) => (
        <a key={signal.url} href={signal.url} className="block underline">
          {signal.label} · {signal.date}
        </a>
      ))}
    </section>
  );
}

export function ProductFooter() {
  return (
    <footer className="my-10 space-y-6 border-t border-border pt-6">
      <FounderStoryLink />
      <nav aria-label="Compare language training" className="flex flex-wrap gap-5">
        <a className="inline-flex min-h-11 items-center underline" href="/vs/duolingo">
          Compare Duolingo
        </a>
        <a className="inline-flex min-h-11 items-center underline" href="/vs/clinicalingo">
          Compare ClinicaLingo
        </a>
        <a className="inline-flex min-h-11 items-center underline" href="/vs/canopylearn">
          Compare CanopyLearn
        </a>
      </nav>
    </footer>
  );
}
