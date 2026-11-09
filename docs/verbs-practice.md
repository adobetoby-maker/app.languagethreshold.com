# Dedicated Verbs practice

The primary Verbs tab gathers matching, Hangman, choose/type forms, Bubble Pop, Verb Crush, the existing conjugation game and Pattern Lab. The Spanish/English workshop reuses 28 authored teaching families with ten verbs each; these are teaching families, not a claim that Spanish has exactly 28 tenses. Rebuild the extracted subset with `python3 scripts/build-verbs-practice-patterns.py`.

Twelve speaking frames practice infinitives, gerunds and participles with ten verbs, locally checked answers, useful sentence contexts and explanatory notes. Correct optional subject pronouns are accepted in Spanish conjugation typing while accents and person agreement remain significant. Other selected language pairs retain their own selection and show availability instead of receiving Spanish drills.

The daily plan is ten minutes. Time counts only while focused, visible and recently active. New verb-specific minutes, answer counts, review items and reminder preferences are stored locally per learner/reset/language pair; this feature does not add cloud synchronization or lesson/mastery credit. Existing general study tracking is unchanged.

Settings includes “Before you go, study your verbs,” enabled initially. Finish study session and desktop top-edge exit intent can offer practice. After an immediate browser/OS departure, unfinished practice is queued for return. Browsers cannot reliably display custom UI during actual tab close or OS termination. Reminders avoid interrupting Speak and stop after ten minutes or dismissal for that local day. No browser close trap or native notification is added.

Validation: focused unit/navigation/game regressions, desktop and phone browser flows, TypeScript and changed-file lint. This implementation is web-only; no native binary or TestFlight upload is implied. New examples use the existing speech service; this change does not generate a new set of prerecorded HD assets.

Core 60 includes the same practice entry on each course overview and the See It lesson screen. Links preserve module, target and native language, use the canonical `tab=verbs` URL, and allow browser Back to return to the lesson. Existing lesson-specific verb games remain in place. Native clients can use this route as their web entry; native packaging is a separate implementation.
