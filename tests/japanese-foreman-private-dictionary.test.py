"""Keep the Foreman glossary exact-pair sourced and private."""

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
inventory = json.loads((ROOT / 'content/japanese-construction-foreman/private-dictionary-draft-ja-en.json').read_text())

assert inventory['pairKey'] == 'Japanese:English'
assert inventory['reviewed'] is False and inventory['registered'] is False
assert inventory['counts']['lessons'] == 60
assert len(inventory['entries']) == inventory['counts']['exactPairs']
assert sum(len(entry['occurrences']) for entry in inventory['entries']) == inventory['counts']['placements']
assert len({(entry['target'], entry['native']) for entry in inventory['entries']}) == len(inventory['entries'])
assert all(entry['reviewed'] is False and entry['partOfSpeech'] is None and
           entry['inflection'] is None and entry['sourceIds'] and entry['occurrences']
           for entry in inventory['entries'])
assert all(occ['courseId'].endswith('-ja-en') and occ['sourceFile'] in inventory['sourceSha256']
           for entry in inventory['entries'] for occ in entry['occurrences'])
assert Counter(occ['stage'] for entry in inventory['entries'] for occ in entry['occurrences']) == {
    'foundation': 163, 'core': 450, 'master': 462,
}
manifest = (ROOT / 'src/data/core60/manifest.ts').read_text()
assert 'construction-foreman-ja-en' not in manifest
print('Private Japanese Foreman dictionary exact-pair, provenance and isolation checks passed')
