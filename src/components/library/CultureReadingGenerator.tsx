import { useState } from "react";
import { useApp } from "@/state/app-state";
import { useCultureGenerator, COUNTRIES_BY_LANGUAGE } from "./useCultureGenerator";

export function CultureReadingGenerator({ onOpen }: { onOpen: () => void }) {
  const { state } = useApp();
  const [country, setCountry] = useState(COUNTRIES_BY_LANGUAGE[state.selectedLanguage][0]);
  const { countries, generateCountry, pending, error, needsSave, ready } = useCultureGenerator();

  return (
    <details className="mb-5 rounded-xl border border-border/60 p-4">
      <summary className="cursor-pointer font-display text-base">Create a culture reading</summary>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Optional AI reading in {state.selectedLanguage} with {state.nativeLanguage} translation.
        Creating requires a connection. The saved text stays in My Texts for reuse on this device.
      </p>
      <label className="mt-3 block text-xs">
        Country
        <select
          value={country}
          disabled={pending || needsSave}
          onChange={(event) => setCountry(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3"
        >
          {countries.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!ready || pending}
        onClick={async () => {
          if (await generateCountry(country)) onOpen();
        }}
        className="mt-3 min-h-11 rounded-lg border border-gold/40 px-3 text-sm text-gold disabled:opacity-50"
      >
        {pending
          ? "Preparing reading…"
          : needsSave
            ? "Save reading again"
            : "Create or open saved reading"}
      </button>
      {pending && (
        <p role="status" className="mt-2 text-xs">
          Preparing {country}. Your current reading stays available.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-amber-300">
          {error}
        </p>
      )}
    </details>
  );
}
