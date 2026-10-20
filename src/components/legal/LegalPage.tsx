import type { ReactNode } from "react";

// Shared layout for the Terms of Service and Privacy Policy pages. The text is a working
// draft written from what the app actually does (October 2026); the owner reviews it,
// ideally with a lawyer, before a public launch.

export const LEGAL_UPDATED = "October 19, 2026";
export const LEGAL_CONTACT = "adobetoby@gmail.com";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-sm leading-relaxed text-muted-foreground">
      <a href="/" className="text-xs text-gold underline underline-offset-4">
        ← Back to Language Threshold
      </a>
      <h1 className="mt-6 font-display text-3xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-xs">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-8 space-y-8">{children}</div>
      <p className="mt-12 border-t border-border/50 pt-6 text-xs">
        Questions? Email{" "}
        <a className="text-gold underline" href={`mailto:${LEGAL_CONTACT}`}>
          {LEGAL_CONTACT}
        </a>
        . See also the <a className="text-gold underline" href="/terms">Terms of Service</a> and the{" "}
        <a className="text-gold underline" href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
