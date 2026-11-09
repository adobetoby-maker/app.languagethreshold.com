#!/usr/bin/env python3
"""Build a disabled French 101 Core candidate with source-pinned authored modes."""
import hashlib
import json
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'content/french-basics/private-runtime-core-1-30.json'
PROMPTS = [ROOT / f'content/french-basics/private-core-{first}-{last}-mode-prompts-fr-en.json'
           for first, last in ((1, 3), (4, 6))]
OUT = ROOT / 'content/french-basics/private-runtime-core-1-30-authored-modes.json'
MODES = ('see', 'recall', 'hear', 'type', 'say', 'write')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


base = json.loads(BASE.read_text())
assert (base['target'], base['native'], base['registered'], base['reviewed']) == ('French', 'English', False, False)
assert [item['n'] for item in base['support']] == list(range(1, 31))
result = deepcopy(base)
result['authoredModeSources'] = []
result['authoredModeCoverage'] = list(range(1, 7))

for path, numbers in zip(PROMPTS, (range(1, 4), range(4, 7))):
  fixture = json.loads(path.read_text())
  assert fixture['pairKey'] == 'French:English'
  assert fixture['sourceFile'] == str(BASE.relative_to(ROOT)) and fixture['sourceSha256'] == digest(BASE)
  assert fixture['registered'] is False and fixture['reviewed'] is False
  assert [item['lesson'] for item in fixture['lessons']] == list(numbers)
  result['authoredModeSources'].append({'path': str(path.relative_to(ROOT)), 'sha256': digest(path),
                                        'basePath': fixture['sourceFile'], 'baseSha256': fixture['sourceSha256']})
  for entry in fixture['lessons']:
      n = entry['lesson']
      support = result['support'][n - 1]
      assert entry['stableLessonKey'] == support['stableLessonKey'] == f'french-basics:{n}'
      assert set(entry['modes']) == set(MODES) == set(support['modes'])
      assert (support['reader']['language'], support['reader']['nativeLanguage']) == ('French', 'English')
      reader = set(support['reader']['target'])
      cards = {card['target'] for card in support['cards']}
      grammar = set(support['grammarNotes'].get('model', {}).values())
      prompts = set()
      for mode in MODES:
          activity = entry['modes'][mode]
          allowed = reader if mode == 'see' else cards | grammar
          assert activity['targetText'] in allowed, (n, mode, activity['targetText'])
          prompt = activity['prompt'].strip()
          assert len(prompt) >= 35 and prompt not in prompts
          prompts.add(prompt)
          if mode == 'hear':
              assert activity['recordedAudio'] is False and support['modes'][mode]['recordedAudio'] is False
          support['modes'][mode]['authoredPrompt'] = {'prompt': activity['prompt'], 'targetText': activity['targetText']}

assert result['coreCurriculum'] == base['coreCurriculum']
assert all('authoredPrompt' not in item['modes']['see'] for item in result['support'][6:])
assert result['registered'] is False and result['reviewed'] is False
serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert OUT.read_text() == serialized, f'{OUT} needs regeneration'
else:
    OUT.write_text(serialized)
print('French 101 Core 1–6: 36 authored prompts in disabled Core 1–30 candidate')
