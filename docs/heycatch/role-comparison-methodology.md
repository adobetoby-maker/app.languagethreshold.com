# Role comparison and product proof

## Scope and counts

`/compare` compares Language Threshold, Duolingo, ClinicaLingo and CanopyLearn in that order. Rows are grouped as Medical, Trades and Coaching & Sports. Scope is Spanish target / English support, not all languages combined. This snapshot has 35 role courses and 2,070 lessons: Medical 12 / 690, Trades 12 / 720, Sports 11 / 660. Medical Mission Logistics is Core 30 only. Other included courses have Foundation 10 + Core 30 + Master 20. A coaching role uses its sports course and is never added to the count a second time.

The generator reads MODULES, the curriculum registry, registered stage files and published Spanish lesson content. The build regenerates the small public catalog. Course sample titles, objectives, speaking tasks and Master tasks come from the real curricula. Spanish/English excerpts come from actual lesson content. Audio is used only on an exact existing recording match, with no device voice fallback or new paid synthesis. The current first-Core samples for Roofing, Rugby and Sport Fishing have no exact recorded match and show text instead. Home examples use a separate 2 KB summary rather than loading the full catalog into the homepage.

Tests verify reproducibility, counts, non-duplication, real sample lesson identity and local audio existence. To refresh: `node scripts/marketing/build-comparison-catalog.mjs`. To detect drift: add `--check`.

## Competitor scope and proficiency

Sources are linked directly on the page and were checked November 7, 2026:

- Duolingo's own Spanish/French CEFR milestone guide describes general Spanish through B2. It does not publish specialty-specific lesson totals. No invented total or medical CEFR rating is supplied.
- ClinicaLingo's rendered public catalog lists 29 free scenarios. Shared clinical scenarios can be relevant to multiple specialties. Orthopedics overlap identifies wound repair, the hip-fracture fall encounter and postoperative opioid counseling. OB/GYN overlap identifies early-pregnancy bleeding, postpartum bleeding and labor/epidural consent. Pain overlap identifies chest-pain assessment and opioid counseling. These are identified examples, not dedicated specialty courses or disjoint totals.
- CanopyLearn's 2026 Medical Spanish syllabus lists 36 lessons, including reviews, over three levels and about 45 hours. Identified overlap comes from lesson topics: injury + trauma for orthopedics; pain + headache for pain management; contraception + obstetrics + women's cancers + infant care for OB/GYN. Shared topics are not added up across rows. The course advertises CE/CME credit; Language Threshold does not inherit that claim.

Course stages, curriculum coverage and a learner's proficiency result are different things. The table does not assign unsupported A1–B2 medical ratings or pretend lessons, scenarios and units have equal size. Language Threshold's advanced task preview demonstrates actual course demands rather than claiming a tested B2 exit level.

## How we compete

Implemented now: a reachable complete role syllabus, real Core and Master speaking examples, recorded Spanish previews, direct lesson/speaking links, source-linked coverage and recommendations based on the visitor's goal. The same concrete examples are visible on the homepage and comparison links appear across the three existing competitor pages.

Recommendation criteria are explicit: daily role-specific practice → Language Threshold; medical Spanish with CE/CME → CanopyLearn; quick free clinical encounter → ClinicaLingo; broad general-Spanish progression through B2 → Duolingo. These are publisher recommendations based on the documented product scope, not independently measured rankings.

Next decisions outside this PR: documented outcome evidence from users; a defined proficiency-assessment study before making an exit-level claim; an accredited education partnership if continuing-education credit becomes a business priority. No certifications, independent ratings, testimonials or accreditation are fabricated.
