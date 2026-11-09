import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  isCorrectJapaneseScriptAnswer,
  isJapaneseEnglishPair,
  type JapaneseScriptCard,
  type JapaneseScriptPair,
  type ScriptPhase,
} from '@/lib/japanese-script-practice';

/** Private review component; no production route or lesson imports this yet. */
export function JapaneseScriptPractice({
  pair, cards, onComplete,
}: {
  pair: JapaneseScriptPair;
  cards: readonly JapaneseScriptCard[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ScriptPhase>('read');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'retry' | null>(null);
  const [finished, setFinished] = useState(false);
  if (!isJapaneseEnglishPair(pair) || !cards.length) return null;
  const card = cards[index];
  if (!card) return null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(isCorrectJapaneseScriptAnswer(answer, card, phase, pair) ? 'correct' : 'retry');
  };
  const next = () => {
    if (phase === 'read') {
      setPhase('write');
    } else if (index + 1 < cards.length) {
      setIndex(index + 1);
      setPhase('read');
    } else {
      setFinished(true);
      onComplete();
    }
    setAnswer('');
    setResult(null);
  };
  return (
    <section data-testid="japanese-script-practice" className="space-y-3 rounded-xl border border-border/50 bg-card/30 p-4">
      <p className="text-xs font-semibold text-muted-foreground">Script practice {index + 1} of {cards.length} · {phase === 'read' ? 'Read' : 'Write'}</p>
      {finished ? (
        <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-gold" />Script unit complete.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-base font-semibold" lang="ja">{phase === 'read' ? card.katakana : card.hiragana}</p>
          <label className="block text-sm" htmlFor={`japanese-script-${card.id}`}>
            {phase === 'read' ? card.readPrompt : card.writePrompt}
          </label>
          <input
            id={`japanese-script-${card.id}`}
            lang="ja"
            value={answer}
            onChange={event => { setAnswer(event.target.value); setResult(null); }}
            autoComplete="off"
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
          />
          {result === 'retry' && <p role="status" className="text-sm">Try again.</p>}
          {result === 'correct' && <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-gold" />Correct.</p>}
          <button type={result === 'correct' ? 'button' : 'submit'} onClick={result === 'correct' ? next : undefined} className="min-h-11 rounded-xl bg-gold px-4 font-bold text-background">
            {result === 'correct' ? phase === 'read' ? 'Write the sign' : index + 1 === cards.length ? 'Finish' : 'Next' : 'Check'}
          </button>
        </form>
      )}
    </section>
  );
}
