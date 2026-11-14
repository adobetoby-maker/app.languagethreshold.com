# V6-style PWA

The PWA uses the native V6 main layout across the app, rather than only changing a lesson. The colors come from `LanguageThresholdV6/App/Theme.swift`: ink #09111a, panel #121b26, gold #e8bd69, and muted #9eb0c2. System body type, system serif headings, a compact course/tutor/review/menu header, and a simple bottom mode bar follow V6's sizing and spacing. The requested Speak button joins the six study modes at the bottom.

Opening the root starts in Speak / free conversation. Explicit lesson, course, tool, account, and return links retain their destination. First-run language selection remains; the extra marketing entry page is removed. Partner setup is available as a disclosure so the conversation controls have space.

The web app continues to supply lesson material, practice components, recorder/replay, AI replies, configured voices, authentication, and scoped progress. No native content or backend was copied into a second engine. Course selection and More use the existing website dialogs. Study buttons resume the course lesson and select the existing practice mode; visits are not mastery.

`/demo/lesson-workspace` is a public temporary preview sharing the same header and dock, opening in Speak. It uses published Foundation Roofing lesson material, with links to real speaking and study activities. It does not generate pretend AI replies or write account progress. Its sample pronunciation audio is labeled device voice; the actual app retains its configured voice service.

Claude CLI Fable 5.2 at max effort reviewed navigation integration risks, especially pending study-mode handoff, account hydration, deep links, and compact screens. Browser checks exercise those behaviors at desktop and phone sizes. Physical iPhone Safari and installed-PWA acceptance remains for owner review.

This branch is for PR review and a preview deployment. It does not change production or the native V6 app.
