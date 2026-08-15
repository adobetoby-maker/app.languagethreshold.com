import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, BookOpen, Loader2 } from 'lucide-react'
import { dictWords } from './wordData'
import { verbProfiles } from './verbProfiles'
import { italianDictWords } from './italianWordData'
import { italianVerbProfiles } from './italianVerbProfiles'
import { coreItalianWords } from './coreItalian'
import type { WordCategory, DictWord, VerbProfile } from './types'
import { MorphDisplay } from './MorphDisplay'
import { useApp, type Language } from '@/state/app-state'

// ─── Per-language dataset + label config ───────────────────────────────────────

interface DictionaryLanguageConfig {
  words: DictWord[]
  profiles: Record<string, VerbProfile>
  searchPlaceholder: string
  phraseNoun: string
  phraseExample: string
  /** Overrides the key-derived field label ("presentYo" -> "Present Yo") with a
   * label that matches this language's actual grammatical terms. */
  fieldLabels?: Record<string, string>
}

const ITALIAN_FIELD_LABELS: Record<string, string> = {
  imperativeFormal: 'Imperativo formale (Lei)',
  imperativeInformal: 'Imperativo informale (tu)',
  presentYo: 'Presente (io)',
  presentTu: 'Presente (tu)',
  presentEl: 'Presente (lui/lei)',
  gerund: 'Gerundio',
  pastParticiple: 'Participio passato',
  presentNosotros: 'Presente (noi)',
  presentEllos: 'Presente (loro)',
  subjunctiveEl: 'Congiuntivo (lui/lei)',
  subjunctiveTu: 'Congiuntivo (tu)',
  preteriteYo: 'Passato remoto (io)',
  preteriteEl: 'Passato remoto (lui/lei)',
}

/** Merge module dictionary with Core frequency set. Core entries win on
 *  headword collision so the statistical foundation always surfaces under
 *  the Core filter. */
function mergeWithCore(moduleWords: DictWord[], coreWords: DictWord[]): DictWord[] {
  const byLemma = new Map<string, DictWord>()
  for (const w of moduleWords) {
    byLemma.set(w.word.toLowerCase(), w)
  }
  for (const w of coreWords) {
    byLemma.set(w.word.toLowerCase(), w)
  }
  return Array.from(byLemma.values())
}

const DICTIONARY_LANGUAGES: Partial<Record<Language, DictionaryLanguageConfig>> = {
  Spanish: {
    words: dictWords,
    profiles: verbProfiles,
    searchPlaceholder: 'Search Spanish or English…',
    phraseNoun: 'Spanish',
    phraseExample: 'El médico examina al paciente...',
  },
  Italian: {
    words: mergeWithCore(italianDictWords, coreItalianWords),
    profiles: italianVerbProfiles,
    searchPlaceholder: 'Search Italian or English…',
    phraseNoun: 'Italian',
    phraseExample: 'Il medico esamina il paziente...',
    fieldLabels: ITALIAN_FIELD_LABELS,
  },
}

// ─── Category chip data ───────────────────────────────────────────────────────

type CategoryFilter = 'all' | WordCategory

/** All → Core (frequency foundation) → specialty modules A–Z. */
const CATEGORY_CHIPS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'core', label: 'Core' },
  { key: 'academic', label: 'Academic' },
  { key: 'business', label: 'Business' },
  { key: 'mission', label: 'Church / Mission' },
  { key: 'construction', label: 'Construction' },
  { key: 'daily', label: 'Daily Life' },
  { key: 'hospitality', label: 'Hospitality' },
  { key: 'medical', label: 'Medical' },
  { key: 'sports', label: 'Sports' },
]

// ─── Verb phase section ───────────────────────────────────────────────────────

function VerbPhaseSection({
  phase,
  forms,
  open,
  onToggle,
  fieldLabels,
}: {
  phase: 'phase1' | 'phase2' | 'phase3'
  forms: VerbProfile[typeof phase]
  open: boolean
  onToggle: () => void
  fieldLabels?: Record<string, string>
}) {
  const entries = useMemo(() => {
    const f = forms as Record<string, unknown>
    return Object.entries(f).filter(([k]) => k !== 'label' && k !== 'hint')
  }, [forms])

  return (
    <div className="border-t border-border/30 last:rounded-b-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-card/60"
      >
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold">
            {forms.label}
          </span>
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            {forms.hint}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-1.5 px-3 pb-3 pt-1 sm:grid-cols-3">
          {entries.map(([key, val]) => {
            const form = val as { full: string; stem: string; ending: string; irregular?: boolean; irregularNote?: string }
            const label =
              fieldLabels?.[key] ??
              key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
            return (
              <div
                key={key}
                className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5"
              >
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                  {label}
                </p>
                <MorphDisplay form={form} size="sm" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Word card ────────────────────────────────────────────────────────────────

function WordCard({
  word,
  profiles,
  fieldLabels,
}: {
  word: DictWord
  profiles: Record<string, VerbProfile>
  fieldLabels?: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(false)
  const [openPhase, setOpenPhase] = useState<'phase1' | 'phase2' | 'phase3' | null>(null)

  const profile: VerbProfile | undefined =
    word.verbProfile ?? (word.verbProfileId ? profiles[word.verbProfileId] : undefined)

  function togglePhase(p: 'phase1' | 'phase2' | 'phase3') {
    setOpenPhase((prev) => (prev === p ? null : p))
  }

  return (
    <article
      className="flex flex-col rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-lg hover:border-gold/20"
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className="font-display text-xl leading-tight"
            style={{ color: 'var(--foreground)' }}
          >
            {word.word}
          </h3>
          <span
            className="shrink-0 rounded-full border border-border/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {word.partOfSpeech}
            {word.gender ? ` · ${word.gender === 'masculine' ? 'm.' : 'f.'}` : ''}
          </span>
        </div>

        <p className="font-mono text-[10px] tracking-wide mb-1" style={{ color: 'var(--gold)', opacity: 0.8 }}>
          /{word.pronunciation}/
        </p>

        <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
          {word.english}
        </p>

        {word.context && (
          <p className="mt-1 text-xs italic" style={{ color: 'var(--muted-foreground)', opacity: 0.75 }}>
            {word.context}
          </p>
        )}
      </div>

      {/* Expand toggle */}
      {(word.examples.length > 0 || profile) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 border-t border-border/30 px-4 py-2 text-left transition-colors hover:bg-card/80"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
            {expanded ? 'Less' : 'More'}
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3" style={{ color: 'var(--gold)' }} />
          ) : (
            <ChevronDown className="h-3 w-3" style={{ color: 'var(--gold)' }} />
          )}
        </button>
      )}

      {expanded && (
        <div>
          {/* Examples */}
          {word.examples.length > 0 && (
            <div className="px-4 py-3 space-y-2 border-t border-border/20">
              {word.examples.map((ex, i) => (
                <div key={i}>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {ex.target}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {ex.english}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Verb profile phases */}
          {profile && (
            <div className="border-t border-border/30">
              <div className="px-4 py-2 flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                  Verb profile
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                  -{profile.infinitiveEnding}
                  {profile.irregularType ? ` · ${profile.irregularType}` : ''}
                </span>
              </div>
              {(['phase1', 'phase2', 'phase3'] as const).map((p) => (
                <VerbPhaseSection
                  key={p}
                  phase={p}
                  forms={profile[p]}
                  open={openPhase === p}
                  onToggle={() => togglePhase(p)}
                  fieldLabels={fieldLabels}
                />
              ))}
              {profile.clinicalNote && (
                <div className="px-4 py-2 border-t border-border/20">
                  <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
                    Note: {profile.clinicalNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// ─── Phrase engine ────────────────────────────────────────────────────────────

function PhraseEngine({ noun, example }: { noun: string; example: string }) {
  const [phrase, setPhrase] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function analyze() {
    if (!phrase.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('https://lt-dictionary.vercel.app/api/phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: phrase.trim(), targetLanguage: noun }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = (await res.json()) as { result?: string; analysis?: string }
      setResult(data.result ?? data.analysis ?? JSON.stringify(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-border/40 bg-card/40 p-5">
      <h2 className="font-display text-lg mb-1" style={{ color: 'var(--foreground)' }}>
        Phrase Engine
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
        Paste a phrase in {noun} to get morphological analysis and translation.
      </p>

      <textarea
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void analyze()
        }}
        placeholder={`e.g. ${example}`}
        rows={3}
        className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gold/50 placeholder:text-muted-foreground/50"
        style={{ color: 'var(--foreground)' }}
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => void analyze()}
          disabled={loading || !phrase.trim()}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40"
          style={{
            background: 'var(--gold)',
            color: 'var(--background)',
          }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Analyze
        </button>
        <span className="font-mono text-[10px] text-muted-foreground">⌘ + Enter to run</span>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div
          className="mt-3 rounded-lg border border-border/40 bg-background/40 px-4 py-3 text-sm whitespace-pre-wrap"
          style={{ color: 'var(--foreground)' }}
        >
          {result}
        </div>
      )}
    </section>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function DictionaryTab() {
  const { state } = useApp()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [query, setQuery] = useState('')

  const config = DICTIONARY_LANGUAGES[state.selectedLanguage]
  const words = config?.words ?? []
  const profiles = config?.profiles ?? {}

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return words
      .filter((w) => {
        const catMatch = category === 'all' || w.category === category
        const searchMatch =
          !q ||
          w.word.toLowerCase().includes(q) ||
          w.english.toLowerCase().includes(q) ||
          w.pronunciation.toLowerCase().includes(q)
        return catMatch && searchMatch
      })
      .sort((a, b) => a.word.localeCompare(b.word, undefined, { sensitivity: 'base' }))
  }, [words, category, query])

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen
          className="h-6 w-6 shrink-0"
          style={{ color: 'var(--gold)' }}
          strokeWidth={1.6}
        />
        <div>
          <h1 className="font-display text-2xl leading-tight" style={{ color: 'var(--foreground)' }}>
            Dictionary
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {words.length > 0
              ? `${words.length} entries · ${state.selectedLanguage}`
              : `Not yet available for ${state.selectedLanguage}`}
          </p>
        </div>
      </div>

      {config && (
        <>
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--muted-foreground)' }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={config.searchPlaceholder}
              className="w-full rounded-xl border border-border/50 bg-card/50 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 placeholder:text-muted-foreground/50"
              style={{ color: 'var(--foreground)' }}
            />
          </div>

          {/* Category chips — All → Core → modules A–Z */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_CHIPS.map((chip) => {
              const active = category === chip.key
              return (
                <button
                  key={chip.key}
                  onClick={() => setCategory(chip.key)}
                  className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-all"
                  style={{
                    borderColor: active ? 'var(--gold)' : 'var(--border)',
                    background: active ? 'color-mix(in oklab, var(--gold) 15%, transparent)' : 'transparent',
                    color: active ? 'var(--gold)' : 'var(--muted-foreground)',
                  }}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Results count */}
          {query || category !== 'all' ? (
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
          ) : null}

          {/* Word grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((word) => (
                <WordCard key={word.id} word={word} profiles={profiles} fieldLabels={config.fieldLabels} />
              ))}
            </div>
          )}

          {/* No search results */}
          {words.length > 0 && filtered.length === 0 && (
            <div className="rounded-xl border border-border/30 bg-card/20 px-6 py-8 text-center">
              <p className="font-display text-base" style={{ color: 'var(--muted-foreground)' }}>
                No words match "{query}"
              </p>
            </div>
          )}

          {/* Phrase Engine */}
          <PhraseEngine noun={config.phraseNoun} example={config.phraseExample} />
        </>
      )}

      {/* Language not yet supported */}
      {!config && (
        <div className="rounded-xl border border-border/40 bg-card/30 px-6 py-10 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" style={{ color: 'var(--gold)' }} strokeWidth={1.2} />
          <p className="font-display text-lg mb-1" style={{ color: 'var(--foreground)' }}>
            Dictionary not yet available for {state.selectedLanguage}
          </p>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Verb-conjugation lookup is live for Spanish and Italian so far — more languages are on the way.
          </p>
        </div>
      )}
    </div>
  )
}
