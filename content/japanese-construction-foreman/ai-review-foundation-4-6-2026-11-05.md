# Construction Foreman Japanese Foundation 4–6 — AI review

On November 5, 2026, Claude CLI using the `opus` model alias independently reviewed the Japanese→English draft in `foundation-draft.json`, scoped to lessons 4–6. This is **AI review only**, not native-speaker, curriculum or construction-specialist approval.

The first pass found four material problems: Lesson 6 omitted Tanaka as the subject of a work-location question and used the generic `はたらきます` with no real `に`/`で` location contrast; Lesson 4 used `と` before explaining it; Lessons 5–6 referred to an ambiguous tool box after Lesson 4 counted three boxes. It also noted that Lesson 4 counted the Lesson 3 helper Kobayashi as a carpenter. Corrections name Tanaka in the question, use `さぎょうします` for two distinct task locations, teach `と`, ask about specific tools, and count Tanaka with Ito as the two carpenters.

The second scoped Opus pass found those issues resolved but caught a new material speaker error: Sato referred to his own hammer and saw as `さとうさんの`. Both lines and their English glosses now use `わたしの`; the Lesson 5 term teaches that form. The structural validator now rejects a known speaker using `さん` on that speaker's own name. A final scoped Opus pass found **no remaining material issue in lessons 4–6**. It checked the Japanese, English glosses, speaker alignment, scene coherence, and progression from lessons 1–3. Its minor observation was that Kobayashi's helper role appears in a scene note rather than learner dialogue.

All six drafted Foundation lessons retain `reviewed: false`. Core and Master remain a map only. No mapped learner course, recorded audio, V4 import, browser acceptance, or qualified human/domain approval exists for this track. The scoped AI pass does not clear those release gates.
