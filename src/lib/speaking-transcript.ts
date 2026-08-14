export function bestAvailableSpeechTranscript(finalText: string, interimText: string) {
  return finalText.trim() || interimText.trim();
}
