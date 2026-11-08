"""Reuse the 28 existing authored course patterns in the dedicated practice area."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=json.loads((root/'src/data/spanish-next-practice.json').read_text())
patterns={}
for prefix in ['foundation-','','master-']:
    for lesson in source[prefix+'spanish-conjugation-patterns'].values():
        pattern=lesson.get('pattern')
        if pattern:patterns.setdefault(pattern['id'],pattern)
assert len(patterns)==28
(root/'src/data/verbs-practice-patterns.json').write_text(json.dumps({'source':'Spanish Conjugation Patterns Core 60; first occurrence of each authored teaching family','reviewed':False,'patterns':list(patterns.values())},ensure_ascii=False,indent=2)+'\n')
