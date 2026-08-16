import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/state/app-state";

/**
 * A note field that actually works in Japanese, Chinese and Pashto.
 *
 * Three things break a naive <textarea> for these languages:
 *
 * 1. IME COMPOSITION (Japanese, Chinese, Korean).
 *    Typing "nihon" then Space to pick 日本 fires a stream of `input` events
 *    carrying half-finished romaji. A parent that treats every `input` as a
 *    committed edit fights the IME — re-rendering mid-conversion, dropping the
 *    candidate window, or committing "nihon" as literal text. Composition state
 *    is tracked and text is only published upward once the IME commits.
 *
 * 2. DIRECTION (Pashto).
 *    Pashto is right-to-left. A LTR field puts the caret on the wrong side and
 *    mis-orders punctuation and any Latin/numeric runs mixed in. `dir` comes
 *    from the language, and saved notes render with their own direction so a
 *    Pashto note is not displayed reversed inside an otherwise LTR list.
 *
 * 3. FONT + KEYBOARD.
 *    The app's font stack has no CJK or Arabic coverage, so those scripts fall
 *    back per-glyph to whatever the OS picks — which is how you get a note
 *    where half the characters are a different weight. Each script gets an
 *    explicit stack, and `lang` is set so iOS/macOS pick the right keyboard and
 *    turn off autocorrect where it does not belong.
 */

type ScriptKind = "latin" | "cjk" | "arabic";

function scriptOf(language: Language): ScriptKind {
  if (language === "Japanese" || language === "Chinese" || language === "Korean") return "cjk";
  if (language === "Pashto") return "arabic";
  return "latin";
}

/** BCP-47 tag — drives OS keyboard choice, font selection and spellcheck. */
const LANG_TAG: Record<Language, string> = {
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Japanese: "ja",
  Chinese: "zh-Hans",
  Korean: "ko",
  Portuguese: "pt",
  Pashto: "ps",
  English: "en",
};

const FONT_STACK: Record<ScriptKind, string> = {
  latin: "var(--font-sans)",
  // Hiragino/Yu = macOS+iOS Japanese, PingFang = macOS+iOS Simplified,
  // Noto = Android/Linux.
  cjk: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans JP", sans-serif',
  // Geeza Pro ships on iOS/macOS; Noto Naskh is the cross-platform standard.
  arabic: '"Noto Naskh Arabic", "Geeza Pro", "Scheherazade New", "Times New Roman", serif',
};

export function directionFor(language: Language): "rtl" | "ltr" {
  return scriptOf(language) === "arabic" ? "rtl" : "ltr";
}

export function fontStackFor(language: Language): string {
  return FONT_STACK[scriptOf(language)];
}

const PLACEHOLDER: Record<Language, string> = {
  Japanese: "メモを書く…",
  Chinese: "写笔记…",
  Pashto: "یادښت ولیکئ…",
  Korean: "메모 쓰기…",
  Spanish: "Escribe una nota…",
  French: "Écrire une note…",
  German: "Notiz schreiben…",
  Italian: "Scrivi una nota…",
  Portuguese: "Escreva uma nota…",
  English: "Write a note…",
};

export function MultilingualNoteInput({
  language,
  value,
  onChange,
  onSave,
  onKeyDown,
  rows = 3,
  autoFocus = false,
  className = "",
}: {
  language: Language;
  value: string;
  /** Called only with IME-committed text — never mid-composition. */
  onChange: (next: string) => void;
  /** Optional: Cmd/Ctrl+Enter saves. */
  onSave?: () => void;
  /** Called for any key that is not mid-composition — lets callers handle Escape etc. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  autoFocus?: boolean;
  className?: string;
}) {
  const script = scriptOf(language);
  const composing = useRef(false);
  // Mirrors the DOM value so IME candidate text stays visible while composing,
  // without publishing unfinished romaji/pinyin to the parent.
  const [draft, setDraft] = useState(value);

  // Accept external resets (e.g. cleared after save) — but never yank the field
  // out from under an in-flight composition.
  useEffect(() => {
    if (!composing.current) setDraft(value);
  }, [value]);

  const publish = useCallback(
    (next: string) => {
      setDraft(next);
      if (!composing.current) onChange(next);
    },
    [onChange],
  );

  return (
    <textarea
      // `lang` is not decoration: iOS uses it to pick the keyboard and to decide
      // whether autocorrect/capitalisation apply — both wrong for CJK/Arabic.
      lang={LANG_TAG[language]}
      dir={directionFor(language)}
      rows={rows}
      autoFocus={autoFocus}
      value={draft}
      placeholder={PLACEHOLDER[language]}
      // Spellcheck helps Latin; on CJK/Arabic it is a wall of false positives.
      spellCheck={script === "latin"}
      autoCapitalize={script === "latin" ? "sentences" : "none"}
      autoCorrect={script === "latin" ? "on" : "off"}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(e) => {
        composing.current = false;
        // First point the text is real (日本 rather than "nihon").
        publish(e.currentTarget.value);
      }}
      onChange={(e) => publish(e.target.value)}
      onKeyDown={(e) => {
        // Enter during composition confirms an IME candidate — never a submit.
        if (composing.current || e.nativeEvent.isComposing) return;
        if (onSave && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          onSave();
        }
        onKeyDown?.(e);
      }}
      style={{
        fontFamily: fontStackFor(language),
        // CJK and Arabic need more leading than Latin at the same size — taller
        // glyphs, and Arabic diacritics sit above the baseline.
        lineHeight: script === "latin" ? 1.6 : 1.9,
      }}
      className={`w-full resize-y rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground/70 focus:border-gold/60 ${className}`}
    />
  );
}

/**
 * Render a saved note using the direction and font of the script it is written
 * in — detected from the text, because a learner may write a Pashto note while
 * the app language is English, or mix scripts inside one note.
 */
export function NoteText({ text, className = "" }: { text: string; className?: string }) {
  const hasArabic = /[؀-ۿݐ-ݿ]/.test(text);
  const hasCjk = /[぀-ヿ一-鿿가-힯]/.test(text);
  const script: ScriptKind = hasArabic ? "arabic" : hasCjk ? "cjk" : "latin";

  return (
    <p
      // `auto` lets the browser order mixed runs (Latin names, numbers) inside
      // an RTL paragraph correctly, rather than hard-coding a direction.
      dir={script === "arabic" ? "auto" : "ltr"}
      style={{ fontFamily: FONT_STACK[script], lineHeight: script === "latin" ? 1.6 : 1.9 }}
      className={`whitespace-pre-wrap break-words ${className}`}
    >
      {text}
    </p>
  );
}
