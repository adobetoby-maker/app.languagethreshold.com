# Optional weekly signup choice

Language Threshold frontend-only change rebased onto verified app production ffcd449873c271371453d8b64e30bc7ac0489b87.

Adult signup confirmation and immediate-success screens offer an optional, identity-free link to https://juniorlinguist.com/free-downloads. Creating an account does not subscribe anyone. The separate weekly form requires adult identity, explicit unchecked weekly consent, a chosen track, anti-abuse verification and email confirmation. Password-reset messages do not show the invitation. No signup payload, billing route, webhook, secret or API handler changes.

Authenticated Account Settings also offers the choice. Card uses existing foreground/card/border theme tokens.

TypeScript check passed. The original UI commit was based on153d14ab0; this release branch preserves all app production changes throughffcd44987. Current main is moving: compare fresh actual APP production before promotion, or merge this bounded UI change through the current main branch. Do not deploy an older snapshot over newer language work. No source from separate resource-offer/billing candidates is included.

Shared independent browser verification lives under learning-products-2026-11-16/renderer/validation/check-signup-choice-ui.mjs and signup-choice-ui/report.json in the parent workspace. Thirteen production-built mocked browser cases passed across both products, desktop/mobile, with no provider traffic or browser errors. Tests preserve auth payloads and primary learning navigation, exclude reset/child flows, and check light/dark account-card readability. No production promotion or emails were performed by this change.
