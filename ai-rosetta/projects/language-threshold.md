---
project_id: language-threshold
status: active
repository: adobetoby-maker/app.languagethreshold.com
production_url: https://app.languagethreshold.com
production_branch: main
production_commit: 8dff4f2b03f5e81a55894574e8ef3326d80d1116
deployment_provider: vercel
deployment_project: language-threshold-app
active_task: LT-20260726-usability-onboarding
---

# Language Threshold

## Product north star

Language Threshold helps learners move from recognizing language to using it
in meaningful professional and real-world situations.

The signature loop is:

**Reader → tap a word → sentence-aware Word Card → contextual Tutor → My
Vocab → targeted practice → real-world use**

The individual tools are valuable. Simplification should reduce competing
chrome and explain relationships among tools—not remove the toolkit.

## Current coordination state

- Canonical repository was renamed to `app.languagethreshold.com`.
- GitHub-to-Vercel automatic deployment has been verified.
- `main` and production were last verified at `8dff4f2`.
- Claude's mobile review and Codex's source review should remain independently
  attributable.
- Production changes require Toby's explicit approval.

## Local surfaces

| Surface | Role |
|---|---|
| Claude mobile | Product discussion, GitHub-visible state, Toby decisions |
| Mac Studio | Claude Code working checkout |
| MacBook Air | Claude Code working checkout |
| Codex workspace | Codex working checkout |
| GitHub | Durable coordination authority |

