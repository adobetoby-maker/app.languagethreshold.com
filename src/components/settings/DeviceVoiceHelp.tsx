const guides = [
  {
    device: "iPhone / iPad",
    steps: [
      "Open Settings → Accessibility → Read & Speak → Voices. Older versions call this Spoken Content.",
      "Choose your learning language and dialect, then download a voice. Choose Enhanced or Premium when offered; use Wi-Fi and wait for the download to finish.",
    ],
    href: "https://support.apple.com/guide/iphone/hear-whats-on-the-screen-or-typed-iph96b214f0/ios",
    source: "Apple voice settings",
  },
  {
    device: "Mac",
    steps: [
      "Open System Settings → Accessibility → Read & Speak (Spoken Content on older versions).",
      "Open System voice and its information button. Choose a language and voice, then download it and wait until it is ready.",
    ],
    href: "https://support.apple.com/guide/mac-help/change-the-voice-your-mac-uses-to-speak-text-mchlp2290/mac",
    source: "Apple Mac voice guide",
  },
  {
    device: "Android",
    steps: [
      "In device Settings, search for Text-to-speech output. It is usually under Accessibility; names vary by manufacturer.",
      "Open your speech engine's settings, choose Install voice data, then choose the language to download.",
    ],
    href: "https://support.google.com/accessibility/android/answer/6006983?hl=en",
    source: "Google text-to-speech guide",
  },
  {
    device: "Windows",
    steps: [
      "Open Settings → Time & language → Language & region. Add your learning language, or open its language options.",
      "Install its Text-to-speech feature when available. Voice preferences are under Time & language → Speech.",
    ],
    href: "https://support.microsoft.com/en-us/education/learning-accelerators/download-languages-and-voices-for-immersive-reader-read-mode-and-read-aloud",
    source: "Microsoft voice download guide",
  },
];

export function DeviceVoiceHelp() {
  return (
    <details className="rounded-xl border border-border/50 bg-card/30 p-3 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-foreground">
        Add voices to your device
      </summary>
      <div className="space-y-3 pt-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          Download a voice in your device settings, then select it in Language Threshold's voice
          picker.
        </p>
        {guides.map((guide) => (
          <details key={guide.device} className="rounded-lg border border-border/40 p-3">
            <summary className="min-h-11 cursor-pointer py-3 font-semibold text-foreground">
              {guide.device}
            </summary>
            <ol className="list-decimal space-y-2 pl-4">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a
              href={guide.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-gold underline"
            >
              {guide.source}
            </a>
          </details>
        ))}
        <p>
          When the download finishes, return here and choose the voice. If it is missing, save your
          work and reopen the app or browser. Your browser may expose only some installed voices;
          online voices still need an internet connection.
        </p>
      </div>
    </details>
  );
}
