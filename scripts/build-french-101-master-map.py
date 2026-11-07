#!/usr/bin/env python3
"""Build source-backed French Master curriculum map without changing lessons."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
M = 'src/data/core60/es/master-spanish-basics.json'
P = 'src/data/spanish-basics-practice.json'
master = json.loads((ROOT / M).read_text())['lessons']
practice = json.loads((ROOT / P).read_text())
prior = {}
for stage in ('foundation-spanish-basics', 'spanish-basics'):
    for n, lesson in practice[stage].items():
        for line in lesson['reading']['native']:
            prior.setdefault(line, []).append({'stage': stage, 'n': int(n)})

# Stable Master numbers; objectives/tasks are proposed, not authored or reviewed lessons.
PLAN = [
 (1, 'Introduce a classmate for a real purpose', 'Introduce a new classmate to a group, adapt tu/vous and role information, and answer two follow-up questions without prompts.', ['foundation:1','core:21','core:30'], 'The listener asks why the classmate joined and requests a more formal introduction.'),
 (2, 'Prepare from a changing supplies brief', 'Read a short supplies brief, reconcile what is already available with what is missing, and explain a revised packing list.', ['foundation:2','core:14','core:23'], 'One listed item is unavailable; propose a substitute and confirm it.'),
 (3, 'Allocate materials among four people', 'Count and allocate shared materials to named recipients, explain a shortage, and agree who will bring the missing items.', ['foundation:3','core:24','core:30'], 'Two people need the same item; negotiate a fair allocation.'),
 (4, 'Clarify identity, role and current condition', 'Distinguish a person’s role from a temporary condition, ask a clarification question and restate the confirmed facts.', ['foundation:5','foundation:6','core:21'], 'The listener confuses who is responsible with who is available today.'),
 (5, 'Report what a room contains and what changed', 'Describe a room from two observations, distinguish people from objects, and explain what moved or is missing.', ['foundation:7','core:18','core:26'], 'A missing item appears in a new location; update the report.'),
 (6, 'Repair a misunderstood request', 'Recognize a misunderstood request, reformulate it politely, check the answer and summarize the agreement.', ['foundation:9','foundation:10','core:8'], 'The partner repeats the wrong item or time; correct it without guessing.'),
 (7, 'Explain and adjust a study routine', 'Describe a weekly study routine, contrast it with today’s exception and agree on a revised schedule.', ['core:1','core:10','core:28'], 'A class time changes; distinguish habitual from one-off actions.'),
 (8, 'Read and answer a short message', 'Extract a request and deadline from a message, write a concise reply, and confirm a new meeting time.', ['core:3','core:10','core:19'], 'The suggested time conflicts with another commitment.'),
 (9, 'Compare options and choose an item', 'Compare two candidate items using relevant properties, give a reason for the choice and check the other person’s preference.', ['core:4','core:17','core:22'], 'The preferred item is unavailable; choose a second-best option.'),
 (10, 'Return the correct belonging', 'Identify an owner from several clues, describe the item precisely and return it while confirming its ownership.', ['core:5','core:17','core:23'], 'Two similar belongings have different owners.'),
 (11, 'Order for people with different preferences', 'Ask about two people’s preferences and a restriction, place an order and confirm that each person receives the right item.', ['core:11','core:12','core:24'], 'One requested ingredient is unavailable; offer an acceptable alternative.'),
 (12, 'Negotiate a feasible group plan', 'Combine ability, permission, location and timing to propose a plan that everyone can follow.', ['core:10','core:13','core:19'], 'One member cannot attend the first time; revise the plan.'),
 (13, 'Turn a request into a prioritized task list', 'Read a short request, distinguish required from optional tasks, assign responsibility and confirm completion criteria.', ['core:14','core:24','core:30'], 'One task must be done before another can start.'),
 (14, 'Narrate a routine and an interruption', 'Describe a normal sequence, then explain a specific interruption and the next action.', ['core:16','core:26','core:28'], 'The routine is interrupted halfway; communicate the revised order.'),
 (15, 'Guide someone through an unfamiliar place', 'Give multi-step directions using landmarks, ask the listener to repeat the route and correct a wrong turn.', ['core:9','core:18','core:30'], 'The usual entrance is closed; use another route.'),
 (16, 'Separate an action now from a future plan', 'Report what is happening now, state a near-future intention and explain what must finish first.', ['core:19','core:20','core:30'], 'A current delay changes tomorrow’s plan.'),
 (17, 'Refer back in a longer conversation', 'Track two people and several objects across turns, use unambiguous references and repair a pronoun misunderstanding.', ['core:21','core:23','core:24'], 'The partner mistakes which object or person a pronoun refers to.'),
 (18, 'Give a coherent account of yesterday', 'Narrate a completed outing in time order, include who went where and what happened, then answer follow-up questions.', ['core:26','core:27','core:30'], 'The partner asks which event happened first and why plans changed.'),
 (19, 'Contrast a past habit with one event', 'Explain what usually happened before, what happened once, and how the one event affected the routine.', ['core:26','core:28','core:30'], 'A single event breaks the established habit; keep the timeline clear.'),
 (20, 'Carry a multi-turn French conversation', 'Open, clarify, compare, decide, report a past event and close a conversation with minimal prompting and suitable register.', ['core:22','core:24','core:26','core:28','master:1-19'], 'A plan changes mid-conversation; negotiate a response and recap the agreement.'),
]
FORMS = [
 'tu/vous; je m’appelle; il/elle s’appelle; parce que',
 'il faut; avoir besoin de; dans/sur; à la place de',
 'il y a; il manque; lui/leur; chacun',
 'être; se sentir; sembler; qui/quel',
 'il y avait vs il y a; être à/se trouver; passé composé',
 'pardon; pourriez-vous répéter; si je comprends bien; donc',
 'imparfait habituel; présent exceptionnel; sauf/au lieu de',
 'demander de; répondre que; conditionnel poli; convenir de',
 'plus/moins/aussi...que; meilleur; cependant',
 'mon/ma/mes; celui/celle; le/la/les; appartenir à',
 'aimer/préférer; sans; au lieu de; lui/leur',
 'pouvoir; devoir; si + présent; d’abord/ensuite',
 'il faut; devoir; avant de; pour que (optional extension)',
 'd’habitude; soudain; passé composé vs imparfait',
 'tourner; traverser; à côté de; si...alors',
 'être en train de; aller + infinitif; avant de',
 'le/la/les; lui/leur; celui-ci/celle-là; reformulation',
 'passé composé avec avoir/être; d’abord/puis/finalement',
 'imparfait habituel vs passé composé ponctuel; depuis',
 'tu/vous; clarifier; comparer; négocier; récapituler',
]
assert len(FORMS)==20
rows=[]
for n, title, objective, prereqs, complication in PLAN:
    src=master[n-1]
    reader=practice['master-spanish-basics'][str(n)]['reading']['native']
    matches=[{'line': i, 'earlier': prior[line]} for i,line in enumerate(reader,1) if line in prior]
    rows.append({'n':n,'stableLessonKey':f'master-french-basics:{n}',
        'spanishSourceTitle':src['title'],'spanishSourceObjectiveEnglish':src['objective'],
        'sourceWordCount':len(src['words']),'sourceReaderLineCount':len(reader),
        'exactEarlierEnglishReaderLineCount':len(matches),'exactEarlierEnglishReaderLines':matches,
        'proposedFrenchMasterTitle':title,'proposedObjectiveEnglish':objective,
        'prerequisites':prereqs,'frenchFormsAndDiscourse':FORMS[n-1],'performanceComplication':complication,
        'pairPolicy':'replace legacy beginner English card/Reader pairs with new Master-level English support paired to original French; keep legacy source only as immutable provenance; no runtime overwrite or progress migration without review'})
report={'schema':1,'state':'curriculum-proposal-unreviewed','target':'French','native':'English',
    'moduleIds':['foundation-french-basics','french-basics','master-french-basics'],
    'sourcePaths':[M,P],'sourceSha256':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in (M,P)},
    'sourceAudit':{'masterLessons':len(master),'readerLinesPerLesson':12,
        'totalMasterReaderLines':sum(x['sourceReaderLineCount'] for x in rows),
        'exactEarlierEnglishReaderLines':sum(x['exactEarlierEnglishReaderLineCount'] for x in rows),
        'masterObjectivesRepeatFoundationOrCoreConcepts':20},
    'lessons':rows}
out=ROOT/'docs/french-program/french-101-master-curriculum-map.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}; exact repeated lines {report["sourceAudit"]["exactEarlierEnglishReaderLines"]}/240')
