#!/usr/bin/env python3
"""Read-only integrity checks for proposed French Master curriculum map."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
map_path=ROOT/'docs/french-program/french-101-master-curriculum-map.json'
data=json.loads(map_path.read_text())
assert data['state']=='curriculum-proposal-unreviewed'
assert (data['target'],data['native'])==('French','English')
assert len(data['lessons'])==20
for path in data['sourcePaths']:
    assert data['sourceSha256'][path]==hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),path
master=json.loads((ROOT/'src/data/core60/es/master-spanish-basics.json').read_text())['lessons']
practice=json.loads((ROOT/'src/data/spanish-basics-practice.json').read_text())
prior={}
for stage in ('foundation-spanish-basics','spanish-basics'):
    for n,lesson in practice[stage].items():
        for line in lesson['reading']['native']:
            prior.setdefault(line,[]).append({'stage':stage,'n':int(n)})
repeated=0
for n,row in enumerate(data['lessons'],1):
    src=master[n-1]
    lines=practice['master-spanish-basics'][str(n)]['reading']['native']
    expected=[{'line':i,'earlier':prior[line]} for i,line in enumerate(lines,1) if line in prior]
    assert row['n']==n and row['stableLessonKey']==f'master-french-basics:{n}'
    assert row['spanishSourceTitle']==src['title']
    assert row['spanishSourceObjectiveEnglish']==src['objective']
    assert row['sourceWordCount']==len(src['words'])==20
    assert row['sourceReaderLineCount']==len(lines)==12
    assert row['exactEarlierEnglishReaderLines']==expected
    assert row['exactEarlierEnglishReaderLineCount']==len(expected)>=6
    assert all(row[field].strip() for field in ('proposedFrenchMasterTitle','proposedObjectiveEnglish','frenchFormsAndDiscourse','performanceComplication','pairPolicy'))
    assert row['prerequisites'] and all(x.startswith(('core:','foundation:','master:')) for x in row['prerequisites'])
    repeated+=len(expected)
assert data['sourceAudit']['exactEarlierEnglishReaderLines']==repeated==123
assert data['sourceAudit']['totalMasterReaderLines']==240
print('French 101 Master map: 20 stable slots, source hashes/objectives, 123/240 repeated Reader lines and proposed progression valid; curriculum not reviewed')
