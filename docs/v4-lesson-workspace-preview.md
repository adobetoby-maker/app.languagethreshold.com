# Native-style PWA preview

The owner's latest speaking screenshot is the primary reference: a centered Speak header with back/menu controls, current partner and open conversation at the top, a large conversation area, and a single bottom reply dock. The dock contains the reply field, Speak/Send, and Text/Feedback/Voice/Repeat. Reset, role selection, scenarios, and broader navigation are behind sheets. The large disabled-state warning, exchange counter, extra tutor bar, and setup panels are removed from the opening surface. Word lookup still opens the existing pocket tutor on demand.

Speak opens first. Existing account consent is opened directly by Start speaking, rather than sending the learner to find a Settings page. The isolated `language-threshold-v6-preview.vercel.app` alias supports the existing temporary adult guest speech flow, without granting guest access to production, unrelated previews, or non-speech APIs. Recording still uses the established capture/transcription/replay pipeline. Mic permission and one-time processing confirmation remain explicit.

Study follows the supplied V6 reference: the course header, a practice-mode strip above Study/Speak, and one bilingual phrase card with Listen, Slow, Previous, and Next/Finish round. It uses the same authored lesson content and configured speech provider. Finishing a phrase round moves to the existing Recall practice; it does not mark mastery. Other practice tools remain collapsed below the card. Explicit course/lesson/tool links retain their destination.

Colors come from native V6 Theme.swift: ink #09111a, panel #121b26, gold #e8bd69, muted #9eb0c2. System body fonts and system serif lesson text follow the native sizing. Rendering can vary slightly between Safari/Chrome and native SwiftUI.

The actual PWA and `/demo/lesson-workspace` share the new speaking presentation. The public demo does not pretend to record or generate replies: Speak/Send open the real app. All conversation state, AI replies, recording/replay, configured voices, authentication, and scoped lesson progress remain powered by the website.

Preview configuration: the existing sensitive ELEVEN_API_KEY and ANTHROPIC_API_KEY variables were previously Production-only. Their targets now also include Preview. Values and Production targets were preserved; no secret value was exposed or committed. This makes the established speech/AI services available to preview builds under their existing server access rules.

No production deployment, merge, or native-app change is part of this PR. Physical iPhone Safari/installed-PWA acceptance remains an owner review step.
