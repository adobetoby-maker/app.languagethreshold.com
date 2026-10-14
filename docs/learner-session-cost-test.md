# Learner session cost benchmark

Purpose: measure marginal API cost for a defined learning session, then model monthly active learners. This is a repeatable workload, not a claim about the average customer before production usage data exists.

## Baseline 30-minute session

- Review 25 existing flashcards (no new model call).
- Look up five new words and repeat two; measure actual application-cache results rather than assume hits.
- Generate one field story, one batch of eight custom card translations, and one grammar lesson.
- Make five tutor and five speaking-chat turns, retaining conversation history.
- `--heavy` extends each conversation to 15 turns so history growth is measured.
- Separate device speech (no cloud TTS call) from cloud voice characters. Google voice estimates use published gross rates without free-tier credits.

## Run

Requires Node with native TypeScript support, installed app dependencies, and the build artifact matching the tested deployment. The benchmark uses that app version's TanStack RPC transport and function IDs. Do not commit fixture credentials.

```sh
npm run build
node scripts/benchmark-learning-session.mjs --output=/absolute/output/directory
node scripts/benchmark-learning-session.mjs --live --heavy --base-url=https://app.languagethreshold.com --profile-config=/absolute/private-fixture.json --output=/absolute/output/directory
```

The first command is a dry run. Live mode signs in only as the dedicated admin test alias, requires its private fixture file, caps the workload at 50 requests, and stops further requests once observed text API spend exceeds $1. A request already in flight may cross that threshold. It never buys a subscription, emails a customer, changes a crew roster, or records private conversation text in its output.

## Receipts and limits

`X-LT-AI-Usage` headers on measured server functions and a final `metering` SSE packet on completed tutor/speaking streams carry numeric usage only. Cumulative stream counters are replaced, not summed. Unknown models, missing receipts, and incomplete streams remain unpriced rather than being counted as free. Google TTS responses additionally report voice tier and Unicode character count.

Prices were verified on 2026-10-14: [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), [Google TTS](https://cloud.google.com/text-to-speech/pricing). Refresh rates before using the benchmark later. Sonnet 5.5 comparisons reuse measured tokens and therefore are estimates; a different tokenizer/response length can change the real result.

This sample does not establish the full site bill. Reconcile with provider invoices for retries, discounts, taxes, hosting, database/storage/egress, email, monitoring and payment processing. Shared monthly costs should be allocated over active users (and reviewed separately per paid seat). Browser-native speech recognition/synthesis is not metered cloud audio; the separate Pashto/ElevenLabs path is outside this Spanish benchmark.
