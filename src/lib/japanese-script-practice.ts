/** Exact-script checking for private Japanese 101 reading and writing prompts. */
export type JapaneseScriptPair = { target: string; native: string };
export type ScriptPhase = 'read' | 'write';
export type JapaneseScriptCard = {
  id: string;
  hiragana: string;
  katakana: string;
  readPrompt: string;
  writePrompt: string;
};

export function isJapaneseEnglishPair(pair: JapaneseScriptPair): boolean {
  return pair.target === 'Japanese' && pair.native === 'English';
}

export function isCorrectJapaneseScriptAnswer(
  input: string,
  card: JapaneseScriptCard,
  phase: ScriptPhase,
  pair: JapaneseScriptPair,
): boolean {
  if (!isJapaneseEnglishPair(pair) || (phase !== 'read' && phase !== 'write')) return false;
  const answer = input.normalize('NFKC').trim();
  if (!answer || /\s/u.test(answer)) return false;
  return answer === (phase === 'read' ? card.hiragana : card.katakana);
}
