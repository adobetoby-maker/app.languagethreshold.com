import { useSyncExternalStore } from "react";
import {
  playFlashcardSuccess,
  setSoundEffectsEnabled,
  soundEffectsEnabled,
  subscribeSoundEffects,
} from "@/lib/sound-effects";

export function SoundEffectsSettings() {
  const enabled = useSyncExternalStore(subscribeSoundEffects, soundEffectsEnabled, () => true);
  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
        <span className="font-medium">Flashcard sound effects</span>
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(event) => setSoundEffectsEnabled(event.target.checked)}
          className="h-5 w-5 accent-amber-500"
        />
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        A light cha-ching for Got it and Easy; an encouraging chime for Good. Saved on this device.
        Voice playback stays separate.
      </p>
      <button
        type="button"
        disabled={!enabled}
        onClick={() => void playFlashcardSuccess()}
        className="mt-2 min-h-11 rounded-full border border-border px-4 py-2 text-xs disabled:opacity-40"
      >
        Preview reward sound
      </button>
      <button
        type="button"
        disabled={!enabled}
        onClick={() => void playFlashcardSuccess("good-job")}
        className="mt-2 ml-2 min-h-11 rounded-full border border-border px-4 py-2 text-xs disabled:opacity-40"
      >
        Preview good-job sound
      </button>
    </div>
  );
}
