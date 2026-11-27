import json,hashlib,subprocess
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'manifest.json').read_text())
def digest(x):return hashlib.sha256(x).hexdigest()
def canonical(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert digest(b)==pin['sha256'];return b
d={k:json.loads(raw(v)) for k,v in p['sourcePins'].items() if k!='cardState'};forms=[l for pin in p['privateFormSourcePins'] for l in json.loads(raw(pin))['lessons']];assert '`${moduleId}:${entry.id}`' in raw(p['sourcePins']['cardState']).decode()
ids=[];nulls={'reader':0,'forms':0,'dictionary':0};duplicateRows=0
assert len(p['lessons'])==20 and p['pair']=={'target':'Japanese','native':'English'}
for n,l in enumerate(p['lessons'],1):
 words=d['cards']['lessons'][n-1]['words'];assert l['lesson']==n and [r['exactFace'] for r in l['rows']]==words
 version=digest(canonical({'pair':p['pair'],'module':p['moduleId'],'lesson':n,'words':words}));assert l['sourceVersionSha256']==version
 fs=next(f['prompts'] for f in forms if f['lesson']==n);dialogue=d['reader']['lessons'][n-1]['dialogue'];extension=d['extensions'][str(n)]
 for i,r in enumerate(l['rows']):
  face=words[i];ja,en=face['es'],face['en'];payload={'pair':p['pair'],'moduleId':p['moduleId'],'lesson':n,'sourceVersionSha256':version,'rowIndexZeroBased':i,'face':face};hash=digest(canonical(payload));assert r['identityPayload']==payload and r['identitySha256']==hash and r['proposedRowId']=='review-ja-en-master-card:'+hash and r['faceSha256']==digest(canonical(face));ids.append(r['proposedRowId'])
  assert r['existingRowId'] is r['existingRuntimeSavedCardId'] is r['selectedJapanese'] is r['audioScript'] is None and r['reviewed'] is False
  dup=[j for j,z in enumerate(words) if z==face and j!=i];assert r['duplicateFaceOtherRowIndexes']==dup;duplicateRows+=bool(dup)
  matches=[]
  for kind,seq in [('dialogue',dialogue),('extension',extension)]:
   for t,text in enumerate(seq):
    j,e=text.split('|');exact=j==ja and e==en
    if exact or (face['kind']=='term' and ja in j):matches.append({'sourceKind':kind,'turnOneBased':t+1,'readerIndexZeroBased':t+(0 if kind=='dialogue' else len(dialogue)),'exactReaderFace':text,'matchKind':'exact-bilingual-face' if exact else 'literal-Japanese-substring-only; not segmented or sense-certified','bilingualEquivalenceSelected':False})
  assert r['readerEvidence']==(matches or None);nulls['reader']+=not bool(matches)
  fm=[{'id':f['id'],'sourceDialogueTurn':f['sourceDialogueTurn'],'japaneseAnswer':f['japaneseAnswer'],'englishPrompt':f['englishPrompt'],'matchKind':'exact-Japanese-target' if ja==f['japaneseAnswer'] else 'literal-Japanese-substring-only','sourceVersion':'private488; not main adoption'} for f in fs if ja in f['japaneseAnswer']];assert r['privateCanonicalFormEvidence']==(fm or None);nulls['forms']+=not bool(fm)
  ds=[{'id':z['id'],'word':z['word'],'english':z['english'],'moduleId':z.get('moduleId'),'lessonHref':z.get('lessonHref'),'contextOwnershipSelected':False} for z in d['dictionary'] if z['word']==ja and z['english']==en];assert r['exactGlobalDictionaryEvidence']==(ds or None);nulls['dictionary']+=not bool(ds)
assert len(ids)==len(set(ids))==p['rowCount']==p['missingExplicitRowIdCount']==360
assert p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is p['registered'] is False and all(x is False for x in p['gates'].values());assert p['independentParentCritiquePending'] is True and p['identityPolicy']['migrationSelected'] is False
for key in ['cards','reader','extensions','dictionary']:assert (root/p['sourcePins'][key]['path']).read_bytes()==raw(p['sourcePins'][key])
print('PASS: 360/360 immutable card rows; 360 unique full-hash review IDs; all exact source/evidence/null mappings verified; duplicate row count',duplicateRows,'; unavailable mappings',nulls,'; four source files byte-exact; no assigned saved IDs or opened gates.')
