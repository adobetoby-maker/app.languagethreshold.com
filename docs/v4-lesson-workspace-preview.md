# V4 PWA and website-wrapper preview

The current native V4 Swift source, version 2.0 build 29, is the visual reference. Its checkpoint is `/Volumes/Drive 2/lt-v4-build29-2026-11-14/v4-build29-source-checkpoint.zip`. The source's `App/SpeakHubView.swift` SHA-256 is `eb16410c61f44948211b236db313518a17bc866333485856f35ee6100034e542`, matching the release evidence and current integrated source. `RootView.swift`, `PracticeSessionView.swift` and `Theme.swift` were also inspected. The independent native V4 source was not modified or released by this work.

Speak opens directly, retaining the owner's quick-start requirement. It follows V4's conversation screen, with partner/topic selection, a large transcript area, a bottom reply composer, Speak/Send, Text/Feedback/Voice/Repeat, and a persistent Study/Speak bar. Reset, scenarios, partner settings, courses and account/settings remain in deeper menus. The native V4's initial conversation-choices page remains a reference capture; the PWA does not insert that additional page before speaking.

Study follows V4's compact course/tutor/lesson fraction/review/more header, existing study-activity clock, six practice modes, Study/Speak bar, and one bilingual card with Listen, Slow and Previous/Next. The former seventh Verbs tab stays in deeper navigation. The actual app retains its authored lesson content, progress and audio provider. Finishing a phrase round opens Recall and does not mark mastery. The public demo shows the published Foundation Roofing vocabulary in the same card presentation; practice there remains temporary.

V4 Theme.swift supplies ink #09111a, panel #121b26, gold #e8bd69 and muted #9eb0c2. Explicit native point sizes, system body fonts and system serif lesson text replace the prior approximate sizing. Browser/native font rendering and platform icons still differ; this is a closer visual match, not a verified pixel-identical result.

The Language Threshold shell is the Capacitor iOS target `com.languagethreshold.app`, separate from native V4 `com.languagethreshold.core60v4`. Its Swift bridge already registers native voice, Watch Talk and on-device Phone Dictation. The shell continues to load the same website, so it receives these shared screens after an approved website merge/deploy. The shell's status bar, window, webview and launch background now use V4 ink; webview rubber-band bounce is disabled and keyboard dismissal is interactive. Its microphone/voice/authentication bridges and production URL are preserved. Simulator builds are local checks only; no TestFlight/App Store upload is included.

Preview: https://language-threshold-v6-preview.vercel.app/demo/lesson-workspace (the existing stable alias is retained). The demo does not record or generate AI replies. Speak/Send open the actual app. The separate preview's existing adult-guest speech gate remains limited to that exact approved alias and speech routes; no guest access is granted to production or unrelated previews.

## Validation

- 68 focused unit checks: speech lifecycle, phone dictation, locale selection, preview access, study timing and Core 30 progress.
- 11 desktop/phone browser cases including first-run language-to-Speak, persistent Study/Speak, menu/reset, one-card navigation, all six practice modes, no demo account/progress writes, failed-fetch retry, short screens and explicit lesson links.
- TypeScript and changed-file lint; iOS wrapper simulator build.
- Native V4 reference captures and PWA phone captures are stored in the session's `v4-reference-2026-11-14` artifact folder with source hashes.

Live transcription/AI provider troubleshooting remains deferred at the owner's request. The earlier transcription 503 and chat 502 are not claimed resolved. No main merge, production deployment or native V4 release is included.
