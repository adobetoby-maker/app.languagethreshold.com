export interface DocumentWordCard {
  headword: string;
  meaning: string;
  grammar: string;
  context: string;
}
export function documentWordParts(text: string) {
  return text.split(/(\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*)/u);
}
export function isDocumentWord(part: string) {
  return /^\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*$/u.test(part);
}
export function documentWordKey(word: string) {
  return word.normalize("NFC").toLocaleLowerCase();
}
