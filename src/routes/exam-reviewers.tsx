import { AssessmentCleanupStatus } from "@/components/exams/AssessmentCleanupStatus";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { examRequest, examReviewerRequest, ExamRequestError } from "@/lib/assessments/client";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { MODULES } from "@/data/modules";
import { LANGUAGES, NATIVE_LANGUAGES } from "@/data/languages";
const labels = {
  response: "Learner response reviewer",
  curriculum: "Curriculum reviewer",
  fluent_language: "Fluent-language reviewer",
  domain: "Domain reviewer",
};
type Kind = keyof typeof labels;
type Grant = {
  user_id: string;
  module_id: string;
  target_language: string;
  instruction_language: string;
  kind: Kind;
  active: boolean;
  revision: number;
  updated_at: string;
};
type Audit = {
  id: string;
  actor_id: string;
  target_id: string;
  kind: Kind;
  target_language: string;
  instruction_language: string;
  active: boolean;
  revision: number;
  reason: string;
  created_at: string;
};
type Registry = { grants: Grant[]; events: Audit[]; limited: boolean; eventLimit: number };
const field = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3";
const button =
  "min-h-11 rounded-xl border border-gold/40 px-4 py-2 font-semibold disabled:opacity-50";
export const Route = createFileRoute("/exam-reviewers")({
  head: () => ({
    meta: [
      { title: "Assessment reviewer administration | Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AuthProvider>
      <ReviewerPage />
    </AuthProvider>
  ),
});
function ReviewerPage() {
  const { user } = useAuth();
  return <ReviewerAdmin key={user?.id ?? "guest"} />;
}
function ReviewerAdmin() {
  const { user } = useAuth();
  const [moduleId, setModule] = useState("roofing"),
    [filterUser, setFilterUser] = useState("");
  const [registryState, setRegistryState] = useState<{ key: string; data: Registry } | null>(null),
    [epoch, setEpoch] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [targetId, setTargetId] = useState(""),
    [target, setTarget] = useState("Spanish"),
    [native, setNative] = useState("English"),
    [kind, setKind] = useState<Kind>("curriculum"),
    [reason, setReason] = useState(""),
    [confirmation, setConfirmation] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<{ key: string; busy: boolean } | null>(null);
  const { key: viewKey, capture: captureView } = usePracticeLifecycle(
    JSON.stringify([moduleId, filterUser]),
  );
  const registry = registryState?.key === viewKey ? registryState.data : null;
  const setRegistry = useCallback(
    (data: Registry | null) => setRegistryState(data ? { key: viewKey, data } : null),
    [viewKey],
  );
  const flight = useRef(false),
    request = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    const lease = captureView();
    if (!user || !lease.isCurrent()) return;
    const controller = new AbortController();
    const release = lease.own(() => controller.abort());
    const current = () => lease.isCurrent() && !controller.signal.aborted;
    setRegistry(null);
    setLoading(true);
    setError("");
    void examRequest<Registry>(
      `/api/exam-reviewers?module=${encodeURIComponent(moduleId)}${filterUser ? `&user=${encodeURIComponent(filterUser)}` : ""}`,
      controller.signal,
      { userId: user.id, isCurrent: current },
    )
      .then((result) => {
        if (current()) setRegistry(result);
      })
      .catch((err) => {
        if (current()) setError(err.message);
      })
      .finally(() => {
        if (current()) setLoading(false);
      });
    return () => {
      release();
      controller.abort();
    };
  }, [user, captureView, moduleId, filterUser, epoch, setRegistry]);
  const existing = registry?.grants.find(
    (g) =>
      g.user_id === targetId.trim().toLowerCase() &&
      g.target_language === target &&
      g.instruction_language === native &&
      g.kind === kind,
  );
  const confirmationKey = JSON.stringify([
    viewKey,
    targetId.trim().toLowerCase(),
    target,
    native,
    kind,
    reason.trim(),
    existing?.revision ?? 0,
    existing?.active ?? null,
  ]);
  const confirmed = confirmation === confirmationKey;
  const { key: mutationKey, capture: captureMutation } = usePracticeLifecycle(confirmationKey);
  const pending = useRef<AbortController | null>(null);
  const busy = busyState?.key === mutationKey && busyState.busy;
  const editable = () => captureMutation().isCurrent() && !flight.current;
  async function submit(active: boolean) {
    const lease = captureMutation();
    const normalized = targetId.trim().toLowerCase();
    if (
      !user ||
      !lease.isCurrent() ||
      !registry ||
      flight.current ||
      !confirmed ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized) ||
      reason.trim().length < 3 ||
      reason.trim().length > 2000 ||
      !Object.hasOwn(labels, kind) ||
      !MODULES.some((m) => m.id === moduleId) ||
      !LANGUAGES.includes(target as (typeof LANGUAGES)[number]) ||
      !NATIVE_LANGUAGES.includes(native as (typeof NATIVE_LANGUAGES)[number]) ||
      (active && normalized === user.id) ||
      (!active && !existing?.active)
    )
      return;
    const body = {
      userId: targetId.trim().toLowerCase(),
      moduleId,
      target,
      native,
      kind,
      active,
      expectedRevision: existing?.revision ?? 0,
      reason: reason.trim(),
      confirmScope: confirmed,
    };
    const key = JSON.stringify(body);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    flight.current = true;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) {
        pending.current = null;
        flight.current = false;
      }
    });
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && pending.current === controller;
    setBusyState({ key: mutationKey, busy: true });
    setError("");
    setNotice("");
    try {
      await examReviewerRequest({ ...body, requestId: request.current.id }, controller.signal, {
        userId: user.id,
        isCurrent: current,
      });
      if (current()) {
        setConfirmation(null);
        setReason("");
        request.current = null;
        setNotice("Access change recorded. Refreshing the current scopes…");
        setEpoch((n) => n + 1);
      }
    } catch (err) {
      if (current()) {
        if (err instanceof ExamRequestError && (err.status === 401 || err.status === 403))
          setRegistry(null);
        setError(err instanceof Error ? err.message : "Reviewer access could not be updated.");
      }
    } finally {
      if (current()) setBusyState({ key: mutationKey, busy: false });
      if (pending.current === controller) {
        pending.current = null;
        flight.current = false;
      }
      release();
      controller.abort();
    }
  }
  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-8" data-private-assessment>
      <header className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <a href="/owner" className="min-h-11 py-2 text-gold underline">
          Owner dashboard
        </a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5">
        <h1 className="font-serif text-3xl">Assessment reviewer access</h1>
        <p>
          Assign existing accounts to an exact module and language pair. Content reviewers see
          private questions and keys; they gain no learner-response access. Response reviewers can
          claim only assessments explicitly shared for review. Team admins retain their existing
          team permissions.
        </p>
        <p className="text-sm text-muted-foreground">
          An owner confirms the reviewer’s qualifications before granting access. A reviewer cannot
          assess their own answers. Opening private keys makes that bank unavailable for their own
          subsequent official assessment. These permissions do not approve or publish content.
        </p>
        {!user && <p>Sign in with a registered platform owner account.</p>}
        {user && (
          <label className="block">
            Module
            <select
              className={field}
              value={moduleId}
              disabled={busy}
              onChange={(event) => {
                if (!editable()) return;
                setModule(event.target.value);
                setConfirmation(null);
                setNotice("");
              }}
            >
              {MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {loading && <p role="status">Loading reviewer scopes…</p>}
        {error && (
          <div role="alert" className="rounded-xl border border-amber-500/40 p-4">
            <p>{error}</p>
            <button
              className={button + " mt-3"}
              disabled={busy}
              onClick={() => {
                if (editable()) {
                  setConfirmation(null);
                  setEpoch((n) => n + 1);
                }
              }}
            >
              Refresh reviewer access
            </button>
          </div>
        )}
        {notice && <p role="status">{notice}</p>}
        {registry && (
          <>
            <AssessmentCleanupStatus />
            <section className="rounded-2xl border border-border p-4">
              <h2 className="text-xl font-semibold">Grant or revoke one scope</h2>
              <form
                className="mt-4 grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(true);
                }}
              >
                <label>
                  Existing account ID
                  <input
                    className={field}
                    required
                    value={targetId}
                    disabled={busy}
                    pattern="[0-9a-fA-F-]{36}"
                    onChange={(e) => {
                      if (!editable()) return;
                      setTargetId(e.target.value);
                      setConfirmation(null);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label>
                  Responsibility
                  <select
                    className={field}
                    value={kind}
                    disabled={busy}
                    onChange={(e) => {
                      if (!editable()) return;
                      setKind(e.target.value as Kind);
                      setConfirmation(null);
                    }}
                  >
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Target language
                  <select
                    className={field}
                    value={target}
                    disabled={busy}
                    onChange={(e) => {
                      if (!editable()) return;
                      setTarget(e.target.value);
                      setConfirmation(null);
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Instruction language
                  <select
                    className={field}
                    value={native}
                    disabled={busy}
                    onChange={(e) => {
                      if (!editable()) return;
                      setNative(e.target.value);
                      setConfirmation(null);
                    }}
                  >
                    {NATIVE_LANGUAGES.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  Reason and qualification check
                  <textarea
                    className={field}
                    required
                    minLength={3}
                    maxLength={2000}
                    value={reason}
                    disabled={busy}
                    onChange={(e) => {
                      if (editable()) {
                        setReason(e.target.value);
                        setConfirmation(null);
                      }
                    }}
                  />
                </label>
                <label className="flex min-h-11 items-start gap-3 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={confirmed}
                    disabled={busy}
                    onChange={(e) => {
                      if (editable()) setConfirmation(e.target.checked ? confirmationKey : null);
                    }}
                  />
                  <span>
                    I checked this account and the reviewer’s qualifications, and intend to change
                    access for this exact responsibility, module and language pair.
                  </span>
                </label>
                <p className="text-sm sm:col-span-2">
                  Current scope: {existing ? (existing.active ? "Active" : "Revoked") : "No grant"}
                  {existing ? ` · revision ${existing.revision}` : ""}. No invitation or email is
                  sent.
                </p>
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button
                    className={button}
                    disabled={busy || !confirmed || targetId.trim().toLowerCase() === user?.id}
                  >
                    {busy ? "Recording…" : "Grant reviewer access"}
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busy || !confirmed || !existing?.active || reason.trim().length < 3}
                    onClick={() => void submit(false)}
                  >
                    Revoke reviewer access
                  </button>
                </div>
              </form>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Current and revoked scopes</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={busy || !/^[0-9a-fA-F-]{36}$/.test(targetId.trim())}
                  onClick={() => {
                    if (editable()) {
                      setFilterUser(targetId.trim().toLowerCase());
                      setConfirmation(null);
                    }
                  }}
                >
                  Load this account’s scopes
                </button>
                {filterUser && (
                  <>
                    <span className="break-all text-sm">Filtered account: {filterUser}</span>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() => {
                        if (editable()) {
                          setFilterUser("");
                          setConfirmation(null);
                        }
                      }}
                    >
                      Show all module reviewers
                    </button>
                  </>
                )}
              </div>
              {registry.limited && (
                <p role="status">
                  This module exceeds the displayed scope limit. Narrow administration by the exact
                  account and language scope before changing it.
                </p>
              )}
              {!registry.grants.length && <p>No reviewer scopes recorded for this module.</p>}
              {registry.grants.map((g) => (
                <article
                  key={`${g.user_id}:${g.target_language}:${g.instruction_language}:${g.kind}`}
                  className="rounded-xl border border-border p-4"
                >
                  <p className="font-semibold">
                    {labels[g.kind]} · {g.active ? "Active" : "Revoked"}
                  </p>
                  <p className="break-all text-sm">Account {g.user_id}</p>
                  <p className="text-sm">
                    {g.instruction_language} → {g.target_language} · revision {g.revision}
                  </p>
                  <button
                    className="min-h-11 text-gold underline"
                    disabled={busy}
                    onClick={() => {
                      if (!editable()) return;
                      setTargetId(g.user_id);
                      setTarget(g.target_language);
                      setNative(g.instruction_language);
                      setKind(g.kind);
                      setConfirmation(null);
                      setReason("");
                      setNotice("");
                    }}
                  >
                    Select this scope
                  </button>
                </article>
              ))}
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Recent access changes</h2>
              <p className="text-sm">
                Latest {registry.eventLimit} events for this module; full records are retained in
                the access audit.
              </p>
              {registry.events.map((e) => (
                <article key={e.id} className="rounded-xl border border-border p-4 text-sm">
                  <p>
                    {new Date(e.created_at).toLocaleString()} · {labels[e.kind]} ·{" "}
                    {e.active ? "Granted" : "Revoked"} · revision {e.revision}
                  </p>
                  <p className="break-all">
                    Account {e.target_id} · {e.instruction_language} → {e.target_language}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{e.reason}</p>
                </article>
              ))}
            </section>
            <a
              href="/exam-content"
              className="inline-flex min-h-11 items-center text-gold underline"
            >
              Private content review
            </a>
          </>
        )}
      </main>
    </div>
  );
}
