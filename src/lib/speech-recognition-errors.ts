/** Browser recognition failures need actionable guidance, without discarding typed answers. */
export function speechRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "native-not-allowed":
      return "Allow Microphone and Speech Recognition for Language Threshold in iPhone Settings, then tap the microphone again. You can also type your answer.";
    case "native-audio-capture":
      return "The iPhone microphone could not start. Close other recording apps and try again, or type your answer.";
    case "native-language-not-supported":
      return "On-device speech recognition is unavailable for this language on your iPhone. Use keyboard dictation or type your answer.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone or speech recognition access is blocked. Allow microphone access in this website’s browser settings, then tap the microphone again. You can also type or use your keyboard’s dictation button.";
    case "audio-capture":
      return "The browser could not access a microphone. Check your microphone connection and close other recording apps, then try again. You can also type your answer.";
    case "network":
      return "The browser’s speech recognition service could not connect. Check your internet connection and try again, or use keyboard dictation or type your answer.";
    case "language-not-supported":
      return "The browser’s speech recognition service does not support this language. Use keyboard dictation or type your answer.";
    case "no-speech":
      return "I did not hear speech. Tap the microphone to retry, or use keyboard dictation or type your answer.";
    default:
      return "Speech recognition stopped unexpectedly. Tap the microphone to retry, or use keyboard dictation or type your answer.";
  }
}
