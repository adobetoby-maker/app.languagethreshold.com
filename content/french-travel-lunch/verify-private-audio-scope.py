#!/usr/bin/env python3
"""Pin the private French Lunch card/Reader HD-audio candidate scope."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'content/french-travel-lunch'
SOURCES = {
    'foundation': ('foundation-1-3-draft.json', 'foundation-4-10-draft.json'),
    'core': tuple(f'core-{n}-{n+4}-draft.json' for n in (1, 6, 11, 16, 21, 26)),
    'master': tuple(f'master-{n}-{n+4}-draft.json' for n in (1, 6, 11, 16)),
}
EXPECTED = {'foundation': 10, 'core': 30, 'master': 20}
SCOPE = DIR / 'audio-scope-candidate.json'


def require(value, message):
    if not value:
        raise ValueError(message)


def build():
    source_hashes = {}
    stages = {}
    all_texts = []
    all_ids = set()
    for stage, filenames in SOURCES.items():
        stage_texts = []
        ids = []
        for filename in filenames:
            path = DIR / filename
            raw = path.read_bytes()
            draft = json.loads(raw)
            source_hashes[filename] = hashlib.sha256(raw).hexdigest()
            require(draft['stageId'] == f'{stage}-travel-lunch' and
                    draft['pairKey'] == 'French:English' and
                    draft['locale'] == 'fr-FR' and
                    draft['reviewed'] is False and
                    draft['registered'] is False and
                    draft['readyForLearner'] is False and
                    draft['audio'] == 'none',
                    f'{filename}: pair or release gate changed')
            for lesson in draft['lessons']:
                ids.append(lesson['stableId'])
                require(lesson['reviewed'] is False,
                        f'{filename}: lesson review changed')
                stage_texts.extend(card['fr'] for card in lesson['cards'])
                stage_texts.extend(turn['fr'] for turn in lesson['reader'])
        require(len(ids) == EXPECTED[stage] and len(set(ids)) == len(ids),
                f'{stage}: incomplete or repeated lesson identities')
        require(not all_ids.intersection(ids), 'Cross-stage lesson identity overlap')
        all_ids.update(ids)
        unique = set(stage_texts)
        stages[stage] = {'lessons': len(ids), 'placements': len(stage_texts),
                         'uniqueTexts': len(unique), 'uniqueCharacters': sum(map(len, unique))}
        all_texts.extend(stage_texts)
    unique = set(all_texts)
    return {'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English',
            'locale': 'fr-FR', 'scope': 'cards-and-reader-only',
            'voices': ['fr-FR-Chirp3-HD-Aoede', 'fr-FR-Chirp3-HD-Charon'],
            'sourceSha256': source_hashes, 'stages': stages,
            'placements': len(all_texts), 'uniqueTexts': len(unique),
            'proposedTwoVoiceClips': 2 * len(unique),
            'uniqueCharacters': sum(map(len, unique)),
            'proposedTwoVoiceCharacters': 2 * sum(map(len, unique)),
            'synthesized': False, 'textReviewed': False,
            'listeningReviewed': False, 'registered': False}


if __name__ == '__main__':
    result = build()
    if sys.argv[1:] == ['--write']:
        SCOPE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    else:
        require(json.loads(SCOPE.read_text()) == result,
                'Pinned private audio candidate scope differs from source')
    print(json.dumps({'lessons': sum(x['lessons'] for x in result['stages'].values()),
                      'placements': result['placements'],
                      'uniqueTexts': result['uniqueTexts'],
                      'proposedTwoVoiceClips': result['proposedTwoVoiceClips'],
                      'proposedTwoVoiceCharacters': result['proposedTwoVoiceCharacters'],
                      'synthesized': result['synthesized']}))
