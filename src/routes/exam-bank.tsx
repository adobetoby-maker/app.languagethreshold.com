// Built by TAC — 2026-10-23
// Owner-only exams v2 bank page: list imported banks, preview every item with its answers, and
// approve one exact version (sha256) after two blind reviews. The server re-checks everything.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";

export const Route = createFileRoute("/exam-bank")({
  head: () => ({
    meta: [
      { title: "Exam banks | Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AuthProvider>
      <ExamBankPage />
    </AuthProvider>
  ),
});

type Review = {
  reviewer: string;
  at: string | null;
  current: boolean;
  independent: boolean;
  accept: number;
  revise: number;
  reject: number;
  missing: number;
};
type Bank = {
  moduleId: string;
  target: string;
  native: string;
  version: string;
  status: "draft" | "approved" | "retired";
  sha256: string;
  shaVerified: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  approvedSha256: string | null;
  createdAt: string;
  counts: {
    items: number;
    lessons: number;
    phases: number;
    forms: { A: number; B: number; C: number };
    diagnosticPool: number;
    byType: Record<string, number>;
  };
  reviews: Review[];
  blockers: string[];
  warnings: number;
  approvable: boolean;
};
type Placement = "A" | "B" | "C" | "diagnostic" | "spare";
type Item = {
  id: string;
  rev: number;
  lesson: number;
  skill: string;
  difficulty: number;
  type: string;
  placement: Placement;
  prompt: string;
  context?: string;
  choices?: { id: string; text: string; right: boolean; why?: string }[];
  answers?: string[];
  accentsRequired?: boolean;
  pairs?: { left: string; right: string }[];
  explanation: string;
  sourceRefs: string[];
  author: string;
};
type Preview = {
  phases: { id: string; title: string; lessons: number[] }[];
  lessons: { lesson: number; title: string }[];
  forms: { A: string[]; B: string[]; C: string[]; diagnostic: string[] };
  items: Item[];
};

const panel = "rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5";
const button =
  "min-h-11 rounded-lg bg-gold px-4 py-2.5 font-semibold text-midnight disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 hover:border-gold/50";
const PLACEMENT_LABEL: Record<Placement, string> = {
  A: "Form A",
  B: "Form B",
  C: "Form C",
  diagnostic: "Check pool",
  spare: "Spare",
};
const PLACEMENT_ORDER: Placement[] = ["A", "B", "C", "diagnostic", "spare"];
const FILTERS: ("all" | Placement)[] = ["all", ...PLACEMENT_ORDER];
const BLOCKER_TEXT: Record<string, string> = {
  "reviews.too_few": "Needs two independent blind reviews signed against this sha.",
  "review.revise_pending": "A reviewer asked for a revision on the current version.",
  "review.rejected": "A reviewer rejected at least one item.",
  "review.stale_sha": "A review was signed against an older version of the bank.",
  "review.coverage": "A review does not cover every item.",
  "review.reviewer_is_author": "A reviewer also wrote an item they reviewed.",
  "bank.sha_mismatch": "The stored sha256 does not match the bank content.",
  "bank.key_mismatch": "The bank's module, languages or version do not match its row.",
};
const bankKey = (bank: Pick<Bank, "moduleId" | "target" | "native" | "version">) =>
  `${bank.moduleId}|${bank.target}|${bank.native}|${bank.version}`;
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";

function ExamBankPage() {
  const { user } = useAuth();
  return <OwnedExamBankPage key={user?.id ?? "guest"} />;
}

function OwnedExamBankPage() {
  const { user, loading: authLoading, canUseReader } = useAuth();
  const userId = user?.id;
  const [authOpen, setAuthOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [epoch, setEpoch] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; bank: Bank; data: Preview } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const flight = useRef<AbortController | null>(null);

  const owner = useCallback(
    (controller: AbortController) => ({
      userId: userId ?? "",
      isCurrent: () => !controller.signal.aborted && !!userId && canUseReader(userId),
      signal: controller.signal,
    }),
    [userId, canUseReader],
  );

  useEffect(() => {
    if (authLoading || !userId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    ownedTeamRequest<{ banks: Bank[] }>(owner(controller), "/api/exam-bank")
      .then((result) => {
        if (!controller.signal.aborted) setBanks(result.banks);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Could not load exam banks.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authLoading, userId, owner, epoch]);

  useEffect(() => {
    if (authLoading || !userId || !openKey || !banks) return;
    const bank = banks.find((entry) => bankKey(entry) === openKey);
    if (!bank) return;
    const controller = new AbortController();
    flight.current = controller;
    setPreviewLoading(true);
    const query = new URLSearchParams({
      moduleId: bank.moduleId,
      target: bank.target,
      native: bank.native,
      version: bank.version,
    });
    ownedTeamRequest<{ bank: Bank; preview: Preview }>(
      owner(controller),
      `/api/exam-bank?${query.toString()}`,
    )
      .then((result) => {
        if (!controller.signal.aborted)
          setPreview({ key: openKey, bank: result.bank, data: result.preview });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Could not load this bank.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [authLoading, userId, openKey, banks, owner]);

  async function approve(bank: Bank, confirmModuleId: string) {
    if (!userId) return;
    const controller = new AbortController();
    setError("");
    setNotice("");
    try {
      const result = await ownedTeamRequest<{ notice?: string }>(
        owner(controller),
        "/api/exam-bank",
        {
          action: "approve",
          moduleId: bank.moduleId,
          target: bank.target,
          native: bank.native,
          version: bank.version,
          sha256: bank.sha256,
          confirmModuleId,
        },
      );
      setNotice(result.notice ?? "Approved.");
      setPreview(null);
      setEpoch((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Approval failed.");
    }
  }

  const shown = preview && preview.key === openKey ? preview : null;

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-gold-ink dark:text-gold">
              Language Threshold · Owner only
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Exam banks</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Hand-made checkpoint tests (A, B, C) and the Spanish Check pool. Review every item and
              its answer, then approve one exact version. Learners only ever get approved content.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle className={secondary + " flex items-center gap-2"} />
            <Link to="/owner" className={secondary}>
              Owner dashboard
            </Link>
            <button className={secondary} onClick={() => setEpoch((value) => value + 1)}>
              Refresh
            </button>
          </div>
        </div>

        {authLoading ? (
          <p role="status">Loading…</p>
        ) : !user ? (
          <div className={panel}>
            <p>Sign in with the platform owner account.</p>
            <button className={button + " mt-4"} onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
            <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
          </div>
        ) : (
          <div className="space-y-6">
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-500/50 p-4 text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            ) : null}
            {notice ? (
              <p
                role="status"
                className="rounded-xl border border-emerald-600/40 p-4 text-emerald-800 dark:text-emerald-200"
              >
                {notice}
              </p>
            ) : null}
            {loading && !banks ? <p role="status">Loading exam banks…</p> : null}
            {banks && banks.length === 0 ? (
              <div className={panel}>
                <p className="font-semibold">No banks imported yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Import a reviewed bank with scripts/exams2-import.mjs; it arrives here as a draft.
                </p>
              </div>
            ) : null}
            {banks?.map((bank) => (
              <BankCard
                key={bankKey(bank)}
                bank={bank}
                open={openKey === bankKey(bank)}
                onToggle={() => setOpenKey(openKey === bankKey(bank) ? null : bankKey(bank))}
              >
                {openKey === bankKey(bank) ? (
                  previewLoading && !shown ? (
                    <p role="status" className="mt-4">
                      Loading items…
                    </p>
                  ) : shown ? (
                    <>
                      {shown.bank.status === "draft" ? (
                        <ApprovePanel bank={shown.bank} onApprove={approve} />
                      ) : null}
                      <ItemPreview data={shown.data} />
                    </>
                  ) : null
                ) : null}
              </BankCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: Bank["status"] }) {
  const tone =
    status === "approved"
      ? "border-emerald-600/50 text-emerald-800 dark:text-emerald-200"
      : status === "retired"
        ? "border-border text-muted-foreground"
        : "border-gold/60 text-gold-ink dark:text-gold";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${tone}`}>
      {status}
    </span>
  );
}

function BankCard({
  bank,
  open,
  onToggle,
  children,
}: {
  bank: Bank;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={panel} aria-label={`${bank.moduleId} ${bank.version}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">
              {bank.moduleId} {bank.version}
            </h2>
            <StatusBadge status={bank.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {bank.target} for {bank.native} speakers · imported {date(bank.createdAt)}
          </p>
        </div>
        <button className={secondary} aria-expanded={open} onClick={onToggle}>
          {open ? "Hide items" : "Review items"}
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Items" value={bank.counts.items} />
        <Stat
          label="Forms A / B / C"
          value={`${bank.counts.forms.A} / ${bank.counts.forms.B} / ${bank.counts.forms.C}`}
        />
        <Stat label="Check pool" value={bank.counts.diagnosticPool} />
        <Stat label="Phases" value={bank.counts.phases} />
      </dl>
      <div className="mt-4 text-sm">
        <p className="font-semibold">Content sha256</p>
        <p className="mt-1 break-all font-mono text-xs" data-testid="bank-sha">
          {bank.sha256}
        </p>
        {!bank.shaVerified ? (
          <p className="mt-1 text-red-700 dark:text-red-300">
            The stored hash does not match the content.
          </p>
        ) : null}
        {bank.status === "approved" ? (
          <p className="mt-1 text-muted-foreground">
            Approved {date(bank.approvedAt)} by {bank.approvedBy}
          </p>
        ) : null}
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold">Blind reviews</p>
        {bank.reviews.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No reviews recorded.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {bank.reviews.map((review, index) => (
              <li
                key={`${review.reviewer}-${index}`}
                className="rounded-xl border border-border/60 p-3 text-sm"
              >
                <p className="font-semibold">{review.reviewer || "Unnamed reviewer"}</p>
                <p className="text-muted-foreground">{date(review.at)}</p>
                <p className="mt-1">
                  {review.accept} accept · {review.revise} revise · {review.reject} reject
                  {review.missing ? ` · ${review.missing} not reviewed` : ""}
                </p>
                <p
                  className={
                    review.current && review.independent
                      ? "mt-1 text-emerald-800 dark:text-emerald-200"
                      : "mt-1 text-red-700 dark:text-red-300"
                  }
                >
                  {!review.independent
                    ? "Not marked independent of the authors"
                    : review.current
                      ? "Signed against this sha"
                      : "Signed against an older sha"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {bank.status === "draft" && bank.blockers.length ? (
        <div className="mt-4 rounded-xl border border-red-500/40 p-3 text-sm">
          <p className="font-semibold">Not ready to approve</p>
          <ul className="mt-1 list-disc pl-5">
            {bank.blockers.map((code) => (
              <li key={code}>{BLOCKER_TEXT[code] ?? `Validator: ${code}`}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function ApprovePanel({
  bank,
  onApprove,
}: {
  bank: Bank;
  onApprove: (bank: Bank, confirmModuleId: string) => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = bank.approvable && typed.trim() === bank.moduleId && !busy;
  return (
    <div
      className="mt-5 rounded-2xl border border-gold/50 p-4"
      role="group"
      aria-label="Approve this version"
    >
      <p className="font-semibold">
        Approve {bank.moduleId} {bank.version}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        This approves exactly the content with sha{" "}
        <span className="break-all font-mono text-xs">{bank.sha256}</span>. Any version of{" "}
        {bank.moduleId} ({bank.target} / {bank.native}) approved before is retired. Learners see it
        once the exams switch is on.
      </p>
      <label className="mt-3 block text-sm font-medium" htmlFor="confirm-module">
        Type the module id ({bank.moduleId}) to confirm
      </label>
      <input
        id="confirm-module"
        className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 sm:max-w-xs"
        value={typed}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setTyped(event.target.value)}
        disabled={!bank.approvable}
      />
      <div className="mt-3">
        <button
          className={button}
          disabled={!ready}
          onClick={async () => {
            setBusy(true);
            try {
              await onApprove(bank, typed.trim());
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Approving…" : "Approve this version"}
        </button>
      </div>
    </div>
  );
}

function ItemPreview({ data }: { data: Preview }) {
  const [filter, setFilter] = useState<"all" | Placement>("all");
  const titles = new Map(data.lessons.map((lesson) => [lesson.lesson, lesson.title]));
  const position = new Map<string, number>();
  for (const ids of [data.forms.A, data.forms.B, data.forms.C, data.forms.diagnostic])
    ids.forEach((id, index) => position.set(id, index));
  const visible = data.items.filter((item) => filter === "all" || item.placement === filter);
  const count = (placement: "all" | Placement) =>
    placement === "all"
      ? data.items.length
      : data.items.filter((item) => item.placement === placement).length;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Item filter">
        {FILTERS.map((entry) => (
          <button
            key={entry}
            role="tab"
            aria-selected={filter === entry}
            className={
              secondary + (filter === entry ? " border-gold bg-gold/10 font-semibold" : "")
            }
            onClick={() => setFilter(entry)}
          >
            {entry === "all" ? "All" : PLACEMENT_LABEL[entry]} ({count(entry)})
          </button>
        ))}
      </div>
      {data.phases.map((phase) => {
        const lessons = phase.lessons
          .map((lesson) => ({
            lesson,
            items: visible
              .filter((item) => item.lesson === lesson)
              .sort(
                (a, b) =>
                  PLACEMENT_ORDER.indexOf(a.placement) - PLACEMENT_ORDER.indexOf(b.placement) ||
                  (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0) ||
                  a.id.localeCompare(b.id),
              ),
          }))
          .filter((entry) => entry.items.length);
        if (!lessons.length) return null;
        return (
          <section key={phase.id} className="mt-6" aria-label={phase.title}>
            <h3 className="text-lg font-semibold">
              {phase.title}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                lessons {phase.lessons[0]}–{phase.lessons[phase.lessons.length - 1]}
              </span>
            </h3>
            {lessons.map(({ lesson, items }) => (
              <div key={lesson} className="mt-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Lesson {lesson} · {titles.get(lesson) ?? ""}
                </h4>
                <div className="mt-2 grid gap-3 lg:grid-cols-2">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  return (
    <article className="min-w-0 rounded-xl border border-border/60 bg-background/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-gold/50 px-2 py-0.5 font-semibold text-gold-ink dark:text-gold">
          {PLACEMENT_LABEL[item.placement]}
        </span>
        <span className="font-mono">{item.id}</span>
        <span>
          {item.type} · difficulty {item.difficulty} · {item.skill} · rev {item.rev}
        </span>
      </div>
      <p className="mt-2 font-semibold">{item.prompt}</p>
      {item.context ? <p className="mt-1 italic text-muted-foreground">{item.context}</p> : null}
      {item.choices ? (
        <ul className="mt-2 space-y-1">
          {item.choices.map((choice) => (
            <li
              key={choice.id}
              className={
                choice.right
                  ? "rounded-lg border border-emerald-600/50 px-2 py-1"
                  : "rounded-lg border border-border/50 px-2 py-1"
              }
            >
              <span>{choice.text}</span>
              {choice.right ? (
                <span className="ml-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  Correct
                </span>
              ) : null}
              {choice.why ? (
                <span className="block text-xs text-muted-foreground">Why wrong: {choice.why}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {item.answers ? (
        <p className="mt-2">
          <span className="font-semibold">Accepted answers:</span> {item.answers.join(" · ")}
          {item.accentsRequired ? " (accents required)" : ""}
        </p>
      ) : null}
      {item.pairs ? (
        <ul className="mt-2 space-y-1">
          {item.pairs.map((pair) => (
            <li key={pair.left} className="rounded-lg border border-border/50 px-2 py-1">
              {pair.left} <span className="text-muted-foreground">→</span> {pair.right}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-muted-foreground">
        <span className="font-semibold text-foreground">Explanation:</span> {item.explanation}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tests: {item.sourceRefs.join(", ")} · by {item.author}
      </p>
    </article>
  );
}
