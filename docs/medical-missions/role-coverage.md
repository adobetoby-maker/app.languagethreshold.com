# Medical mission role coverage — 2026-10-24

The medicalspanish.app mission pages must describe actual authored app content. Course
completion is language practice, not a clinical credential or interpreter qualification.

| Role                                                   | App module                | Foundation / Core / Master |
| ------------------------------------------------------ | ------------------------- | -------------------------- |
| Orthopedic physician                                   | orthopedics               | 10 / 30 / 20               |
| General surgeon                                        | general-surgery           | 10 / 30 / 20               |
| Primary care physician                                 | family-medicine           | 10 / 30 / 20               |
| Nursing / PACU language practice                       | nursing                   | 10 / 30 / 20               |
| Physical therapist                                     | physical-therapy          | 10 / 30 / 20               |
| Reception / patient support                            | medical-receptionist      | 10 / 30 / 20               |
| Social work / family support                           | social-work               | 10 / 30 / 20               |
| Mission logistics / transport / equipment and supplies | medical-mission-logistics | — / 30 / —                 |

All clinical paths above already existed. The new logistics course adds 30 contextual
readings (180 aligned sentence pairs), 240 term entries, 120 phrase entries, and 90 verb
practice entries. Lessons cover predeparture coordination, buses and accessible transport,
freight quotes, shipping documentation, customs questions directed to authorized partners,
receiving, shortages/damage, supplies, daily briefings, and closeout with the host team.

The content files retain `reviewed: false`: do not market them as independently reviewed
or validated clinical training. Logistics Foundation and Master are not advertised as ready.
New logistics verbs work in the lesson practice kit; they are explicitly deferred from the
separately signed global Verb Games pool pending a review of that pool's changes. The
existing signed data and review report remain reproducible and unchanged.

`tests/medical-missions.test.mjs` checks catalog registration, all advertised clinical
lesson counts, and the readings, vocabulary, phrases, and verbs with the production
content validator. The website's `assets/missions/roles.json` records the exact selected
Core lesson numbers used on each new role page. Planner schedules use those selections
for PT, nursing, reception and logistics; surgery, primary care and social work have
separate selected lesson sequences. Orthopedics retains its eight-session on-site toolkit.

The new landing pages are `/missions/physical-therapy/`, `/missions/nursing/`,
`/missions/physicians/`, `/missions/support/`, and `/missions/logistics/`.
Mission and team pages expose existing team and individual pricing routes. No prices,
billing configuration, demo access, patient records or mission applications are changed.
