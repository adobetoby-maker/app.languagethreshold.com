#!/usr/bin/env python3
"""Build a source-pinned, review-only index from the checked-in candidate packets.

This content is not registered with learner, audio, scoring, or progress runtime.
"""
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
AUDIT = HERE / 'integration-evidence.json'
OUT = HERE / 'index.json'
SOURCE = ROOT / 'src/data/core60/es/master-travel-lunch.json'
READER = ROOT / 'public/lesson-content/es/master-travel-lunch.json'
MODES = ('see', 'recall', 'hear', 'type', 'say', 'write')
CONFLICTS = {
    15: ['The Costa Rica source calls 911; the prior owner draft says 119.',
         'Two private Master 15 enrichment proposals (5 versus 7 forms) remain unselected. The 5-form proposal is shown only as evidence.'],
    16: ['Pinned card 20 says slight fever that night; pinned Reader turn 12 says fever began the next morning. Preserve both pending a source and clinical decision.'],
    20: ["The Spanish source distinguishes crustáceos and mariscos, while English glosses both as shellfish. Japanese uses 甲殻類 for crustáceos; cards 6, 9 and 16 require qualified terminology review."],
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def check(value, message):
    if not value:
        raise ValueError(message)

def main():
    audit = json.loads(AUDIT.read_text())
    check(sha(SOURCE) == audit['pinnedHashes']['curriculum'], 'Spanish curriculum pin changed')
    check(sha(READER) == audit['pinnedHashes']['reader'], 'Spanish Reader pin changed')
    alternate = json.loads((HERE / 'master-15-alternate-enrichment.json').read_text())
    check(alternate['stableId'] == 'master-travel-lunch:15:ja-en' and len(alternate['forms']) == 7 and
          all(alternate.get(gate) is False for gate in ('reviewed', 'registered', 'audioRegistered', 'readyForLearner')),
          'Master 15 alternate proposal or gates changed')
    result = []
    for row in audit['rows']:
        n = row['lesson']
        cp, dp = HERE / f'master-{n}-candidate.json', HERE / f'master-{n}-derived.json'
        check(sha(cp) == row['candidateSha256'] and sha(dp) == row['derivedSha256'], f'Master {n} private packet changed')
        raw, derived = json.loads(cp.read_text()), json.loads(dp.read_text())
        lesson = raw.get('lesson', raw)
        extra = derived.get('lesson', derived['lessons'][0] if isinstance(derived.get('lessons'), list) else derived)
        stable = f'master-travel-lunch:{n}:ja-en'
        check(lesson.get('stableId') == stable, f'Master {n} candidate stable ID missing or changed')
        check(row['identityPass'] and row['stableId'] == stable and row['ownerStableId'] == stable, f'Master {n} identity')
        check(row['cardExactCount'] == row['cardCount'][0] == row['cardCount'][1], f'Master {n} card source mismatch')
        check(row['readerExactCount'] == row['readerCount'][0] == row['readerCount'][1], f'Master {n} Reader source mismatch')
        check(len(row['modes']) == 6 and all(m['matchesCard'] and m['gateFalse'] for m in row['modes']), f'Master {n} mode mismatch')
        check(not row['nonFalseGates']['candidate'] and not row['nonFalseGates']['derived'], f'Master {n} gate opened')
        if n == 14:
            activities = raw['modeActivities']
        elif n == 15:
            activities = json.loads((HERE / 'master-15-modes.json').read_text())['activities']
        else:
            activities = next(obj[key] for obj in (lesson, raw, derived) for key in ('modes','activities','sixModes') if isinstance(obj.get(key), list) and len(obj[key]) == 6)
        normalized = {}
        for activity in activities:
            mode = activity['mode'].lower()
            check(mode in MODES and mode not in normalized and activity['readyForLearner'] is False, f'Master {n} mode gate')
            ref = activity.get('sourceRef', activity.get('sourceCardIndex', activity.get('cardIndex')))
            ref = int(ref.rsplit(':', 1)[-1]) if isinstance(ref, str) else ref
            index = ref if n == 20 else ref - 1
            card = lesson['cards'][index]
            check(card['ja'] == activity['modelJapanese'] and card['en'] == activity['modelEnglish'], f'Master {n} mode face')
            normalized[mode] = {'cueEnglish': activity['cueEnglish'], 'sourceCard': index + 1,
                                'responseKind': activity.get('responseKind', 'review only')}
        check(set(normalized) == set(MODES), f'Master {n} incomplete modes')
        speaking = lesson.get('speaking') or extra.get('speaking') or {}
        objectives = extra.get('speakingObjectives') or speaking.get('objectives') or extra.get('speaking', {}).get('objectives') or []
        bank = extra.get('wordBank', extra.get('cardOnlyWordBank', extra.get('wordBankCardOnly', [])))
        notes = list(CONFLICTS.get(n, []))
        notes += lesson.get('sourceIssues', []) + lesson.get('unresolvedForQualifiedReview', [])
        if extra.get('sourceConflict'):
            notes.append(extra['sourceConflict'])
        result.append({
            'stage': 'master', 'n': n, 'stableId': stable,
            'title': lesson.get('title', lesson.get('titleJapanese', f'Master {n} · source-reconciled candidate')),
            'objective': lesson.get('objective', lesson.get('objectiveEnglish', 'Review the source-reconciled Japanese and English lesson evidence.')),
            'focus': lesson.get('focus', lesson.get('focusEnglish', 'Source-aligned candidate; Japanese forms require review.')),
            'scene': lesson.get('scene', lesson.get('sceneEnglish', 'Pinned Spanish Master Lunch source scene.')),
            'reviewed': False, 'reviewDisposition': 'conflict-evidence' if n in CONFLICTS else 'source-reconciled-candidate',
            'cards': lesson['cards'], 'reader': lesson['reader'], 'forms': extra.get('forms', []), 'modes': normalized,
            'speaking': {'role': speaking.get('role', ''), 'partnerRole': speaking.get('partnerRole', ', '.join(speaking.get('partnerRoles', []))),
                         'opening': speaking.get('opening', ''), 'goal': speaking.get('goal', ''), 'closure': speaking.get('closure', ''),
                         'objectives': objectives, 'wordBank': bank, 'wordBankAuthored': bool(bank)},
            'sourceParityWarning': None,
            'reviewGaps': ['Qualified Japanese and domain review pending', 'Recorded audio and listening approval pending',
                           'Activity scoring and saved progress remap pending'],
            'conflictEvidence': notes,
            'provenance': {'candidateSha256': row['candidateSha256'], 'derivedSha256': row['derivedSha256'],
                           'oldCardsAtSamePosition': row['ownerPositionExact'][0], 'oldReaderAtSamePosition': row['ownerPositionExact'][1],
                           'oldCardCount': row['cardCount'][2], 'oldReaderCount': row['readerCount'][2]},
        })
    check([x['n'] for x in result] == list(range(13, 21)), 'Master 13–20 inventory')
    rendered = json.dumps({'pairKey':'Japanese:English','sourceSha256':audit['pinnedHashes']['curriculum'],
        'readerSourceSha256':audit['pinnedHashes']['reader'], 'reviewed':False,'registered':False,
        'audioRegistered':False,'progressEnabled':False,'lessons':result}, ensure_ascii=False, indent=2)+'\n'
    if '--check' in sys.argv:
        check(OUT.read_text() == rendered, 'review index is stale')
        print(f'Validated {len(result)} review-only candidates')
    else:
        OUT.write_text(rendered)
        print(f'Wrote {OUT} with {len(result)} review-only candidates')

if __name__ == '__main__':
    main()
