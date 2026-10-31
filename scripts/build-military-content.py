"""Build the Military English course assets from the authored bilingual lesson source.
Run from the repository root. Content remains unreviewed until human sign-off.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'content/military/lessons.json'
rows = json.loads(SOURCE.read_text())
counts = {'foundation': 10, 'core': 30, 'master': 20}
thresholds = {
    'foundation': 'By Lesson 10, introduce yourself, identify basic team and equipment terms, understand simple classroom instructions, and ask for clarification in English.',
    'core': 'By Lesson 30, explain small-team and weapons terminology, interpret practice radio messages, read military classroom material, and give a clear administrative briefing in English.',
    'master': 'By Lesson 20, explain technical distinctions, resolve ambiguous messages, compare documents, and give accurate spoken and written summaries in English.'
}
for row in rows:
    row['content']['words'] = row['lesson']['words']
for stage, count in counts.items():
    selected = [row for row in rows if row['stage'] == stage]
    assert len(selected) == count
    assert [row['lesson']['n'] for row in selected] == list(range(1, count + 1))
    module = 'military' if stage == 'core' else f'{stage}-military'
    headline = f'Military English {"Core 30" if stage == "core" else stage.title()}'
    curriculum = dict(version=1, module=module, language='English', nativeLanguage='Spanish',
                      headline=headline, threshold=thresholds[stage], reviewed=False,
                      lessons=[row['lesson'] for row in selected])
    if stage != 'core':
        curriculum.update(baseModule='military', stage=stage)
        destination = ROOT / f'src/data/core60/en/{module}.json'
    else:
        destination = ROOT / 'src/data/military-core.json'
    destination.write_text(json.dumps(curriculum, ensure_ascii=False, indent=2) + '\n')
    public = dict(version=1, module=module, language='English', nativeLanguage='Spanish',
                  reviewed=False, lessons={str(row['lesson']['n']): row['content'] for row in selected})
    destination = ROOT / f'public/lesson-content/en/{module}.json'
    destination.write_text(json.dumps(public, ensure_ascii=False, indent=2) + '\n')

index_path = ROOT / 'public/lesson-content/index.json'
index = json.loads(index_path.read_text())
entries = index['files']
entries[:] = [entry for entry in entries if entry['module'] not in {'military', 'foundation-military', 'master-military'}]
for stage, count in counts.items():
    module = 'military' if stage == 'core' else f'{stage}-military'
    entries.append(dict(language='en', module=module, lessons=count,
                        bytes=(ROOT / f'public/lesson-content/en/{module}.json').stat().st_size, reviewed=False))
entries.sort(key=lambda entry: (entry['language'], entry['module']))
index_path.write_text(json.dumps(index, ensure_ascii=False) + '\n')
print('Built Military English: 10 Foundation, 30 Core, 20 Master lessons (unreviewed).')
