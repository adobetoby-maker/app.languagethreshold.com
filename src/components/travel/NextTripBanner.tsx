import { useEffect, useState } from "react";
import { Check, ChevronDown, MapPin, Pencil, Plane, X } from "lucide-react";
import {
  getTravelDestination,
  getTravelDestinations,
  type TravelDestination,
} from "@/data/travel-destinations";
import { useApp } from "@/state/app-state";
import type { NativeLanguage } from "@/state/app-state";

interface NextTripBannerProps {
  compact?: boolean;
  onPracticeTravel?: () => void;
}

export function NextTripBanner({ compact = false, onPracticeTravel }: NextTripBannerProps) {
  const { state, dispatch } = useApp();
  const destinations = getTravelDestinations(state.selectedLanguage);
  const plan = state.nextTrips[state.selectedLanguage] ?? null;
  const selected = getMatchingDestination(plan?.destinationId, state.selectedLanguage);
  const [editing, setEditing] = useState(!selected);
  const [expanded, setExpanded] = useState(false);
  const [destinationInput, setDestinationInput] = useState(plan?.destinationId ?? "");

  useEffect(() => {
    setDestinationInput(plan?.destinationId ?? "");
    setEditing(!selected);
    setExpanded(false);
  }, [plan?.departureDate, plan?.destinationId, selected, state.selectedLanguage]);

  if (destinations.length === 0) return null;

  const save = () => {
    if (!destinationInput) return;
    dispatch({
      type: "SET_NEXT_TRIP",
      payload: {
        language: state.selectedLanguage,
        plan: { destinationId: destinationInput, departureDate: plan?.departureDate ?? null },
      },
    });
    setEditing(false);
    setExpanded(false);
  };

  const clear = () => {
    dispatch({
      type: "SET_NEXT_TRIP",
      payload: { language: state.selectedLanguage, plan: null },
    });
    setDestinationInput("");
    setEditing(true);
    setExpanded(false);
  };

  if (compact && selected && !editing && !expanded) {
    return (
      <section
        data-testid="next-trip-summary"
        aria-label="Selected country lens"
        className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {selected.flag}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              Country lens
            </p>
            <p className="mt-0.5 font-serif text-lg text-foreground">{selected.country}</p>
          </div>
          {onPracticeTravel && (
            <button
              type="button"
              onClick={onPracticeTravel}
              className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-300/15"
            >
              Practice
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Show country lens details"
            className="min-h-11 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit next trip"
            className="min-h-11 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-cyan-300/60 hover:text-cyan-200"
          >
            Edit
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="next-trip-heading"
      className="overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 via-card/70 to-card/40"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10">
            <Plane className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
              Your next threshold
            </p>
            <h2 id="next-trip-heading" className="mt-1 font-serif text-2xl text-foreground">
              {selected ? `${selected.flag} ${selected.country}` : "Where are you headed next?"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Learn the shared {state.selectedLanguage} foundation, then rehearse the words,
              etiquette, transport, food, and everyday repairs that fit your destination.
            </p>
          </div>
          {selected && !editing && (
            <>
              {compact && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Collapse country lens details"
                  className="min-h-11 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground"
                >
                  Collapse
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit next trip"
                className="shrink-0 rounded-full border border-border p-2 text-muted-foreground hover:border-cyan-300/60 hover:text-cyan-200"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {editing ? (
          <div className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Destination country
              </span>
              <span className="relative mt-1.5 block">
                <select
                  value={destinationInput}
                  onChange={(event) => setDestinationInput(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-9 text-sm text-foreground focus:border-cyan-300/60 focus:outline-none"
                >
                  <option value="">Choose a country…</option>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.flag} {destination.country}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={!destinationInput}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-950 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Save
              </button>
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationInput(plan?.destinationId ?? "");
                    setEditing(false);
                  }}
                  aria-label="Cancel editing next trip"
                  className="rounded-xl border border-border px-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : selected ? (
          <DestinationBrief
            destination={selected}
            onPracticeTravel={onPracticeTravel}
            onClear={clear}
            nativeLanguage={state.nativeLanguage}
          />
        ) : null}
      </div>
    </section>
  );
}

function DestinationBrief({
  destination,
  onPracticeTravel,
  onClear,
  nativeLanguage,
}: {
  destination: TravelDestination;
  onPracticeTravel?: () => void;
  onClear: () => void;
  nativeLanguage: NativeLanguage;
}) {
  return (
    <div className="mt-5 space-y-5">
      <div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
          <MapPin className="h-3 w-3" /> Country lens
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">{destination.localLens}</p>
        <p className="mt-2 text-xs text-muted-foreground">{destination.regions}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {destination.practicalNotes.map((note) => (
          <p
            key={note}
            className="rounded-xl border border-border/60 bg-background/35 p-3 text-xs leading-relaxed text-muted-foreground"
          >
            {note}
          </p>
        ))}
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
          Phrases you will actually use
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {destination.phrases.map((phrase) => (
            <article key={phrase.target} className="rounded-xl border border-gold/20 bg-gold/5 p-3">
              <p className="text-sm leading-relaxed text-foreground">{phrase.target}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {phrase.nativeGlosses?.[nativeLanguage] ?? phrase.english}
              </p>
              <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-gold/70">
                {phrase.note}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onPracticeTravel && (
          <button
            type="button"
            onClick={onPracticeTravel}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/15"
          >
            <Plane className="h-4 w-4" /> Practice {destination.country}
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear trip
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        Country notes teach language and etiquette, not current prices, schedules, entry rules,
        medical guidance, or law. Confirm changing details with official and local sources.
      </p>
    </div>
  );
}

function getMatchingDestination(id: string | undefined, language: string) {
  const destination = getTravelDestination(id);
  return destination?.language === language ? destination : null;
}
