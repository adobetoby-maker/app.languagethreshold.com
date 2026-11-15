import json, hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
x=json.loads((p/'candidate-fable.json').read_text())
source=Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13/public/lesson-content/es/travel-breakfast.json')
x['sourcePath']='public/lesson-content/es/travel-breakfast.json'
x['sourceSha256']=hashlib.sha256(source.read_bytes()).hexdigest()
x['reviewed']=False;x['registered']=False;x['audioRegistered']=False;x['listeningReviewed']=False
for i,c in enumerate(x['cards'],1):c['id']=f'core:7:word:{i}'
r=x['reader']
x['reader']=[{'id':f'core:7:line:{i+1}','english':e,'spanish':s,'french':f} for i,(e,s,f) in enumerate(zip(r['english'],r['spanish'],r['french']))]
x['readerTitles']={k:r[k] for k in ['titleSpanish','titleEnglish','titleFrench'] if k in r}
for mode in x['modes']:
 mode['id']=f"core:7:mode:{mode['mode'].lower()}"
 mode['sourceCardId']=x['cards'][mode['sourceCardIndex']]['id']
for f in x['forms']:f['id']=f"core:7:form:{f['sourceInfinitiveSpanish']}"
(p/'private-packet.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
