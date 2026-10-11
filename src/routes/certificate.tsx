import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/certificate")({ component: CertificatePage });
type Certificate = {
  id: string;
  learner_name: string;
  module_id: string;
  version: number;
  score: number;
  lesson_count: number;
  status: string;
  issued_at: string;
  revoked_at: string | null;
};

function CertificatePage() {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      setError("Credential ID is missing.");
      return;
    }
    void fetch(`/api/certificate?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const result = (await response.json()) as { certificate?: Certificate; error?: string };
        if (!response.ok || !result.certificate)
          throw new Error(result.error ?? "Certificate not found.");
        setCertificate(result.certificate);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Could not verify certificate."),
      );
  }, []);
  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/team" className="text-sm text-gold-ink dark:text-gold underline">
            ← Team workspace
          </Link>
          <ThemeToggle className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm" />
          {certificate && (
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight"
            >
              Print or save PDF
            </button>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-400 p-4 text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {!error && !certificate && <p>Verifying credential…</p>}
        {certificate && (
          <section className="rounded-3xl border-4 border-gold/50 bg-card p-8 text-center shadow-2xl print:border-4 print:bg-white print:text-black sm:p-14">
            <p className="font-mono text-xs font-bold uppercase tracking-[.3em] text-gold-ink dark:text-gold">
              Language Threshold
            </p>
            <h1 className="mt-8 font-display text-4xl">Certificate of Module Completion</h1>
            <p className="mt-7 text-sm uppercase tracking-widest">Awarded to</p>
            <p className="mt-2 font-display text-3xl font-semibold">{certificate.learner_name}</p>
            <p className="mt-7 text-lg">
              for completing{" "}
              <strong>
                {certificate.module_id === "roofing" ? "Roofing Spanish" : certificate.module_id}
              </strong>
            </p>
            <p className="mt-3 text-sm">
              {certificate.lesson_count} required lessons · Final assessment {certificate.score}% ·
              Passing score 80%
            </p>
            <p className="mt-6 text-sm">
              Issued {new Date(certificate.issued_at).toLocaleDateString()} · Module version{" "}
              {certificate.version}
            </p>
            <p className="mt-2 break-all font-mono text-xs">Credential ID: {certificate.id}</p>
            <p
              className={`mt-4 font-semibold ${certificate.status === "issued" ? "text-emerald-500" : "text-red-500"}`}
            >
              Status: {certificate.status.toUpperCase()}
            </p>
            <p className="mt-9 text-xs text-muted-foreground print:text-gray-600">
              This verifies language module completion only. It is not a trade license, OSHA card,
              or safety training certificate.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
