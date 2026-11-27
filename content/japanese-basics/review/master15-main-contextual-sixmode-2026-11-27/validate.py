import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'activities.json').read_text());n=p['lesson']
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
d={k:json.loads(raw(v)) for k,v in p['sourcePins'].items()};lesson=d['master']['lessons'][n-1];reader=lesson['dialogue'];version=hashlib.sha256(json.dumps(lesson,ensure_ascii=False,sort_keys=True).encode()).hexdigest();assert p['sourceVersionSha256']==version
private=json.loads(raw(p['privateReaderPin']))['lessons'][n-1]['dialogue'];fs=next(l['prompts'] for l in json.loads(raw(p['privateFormSourcePin']))['lessons'] if l['lesson']==n);cards=d['cards']['lessons'][n-1]['words'];ci=d['cardIdentity']['lessons'][n-1]['rows'];ids=[];links=0
assert [a['mode'] for a in p['activities']]==['see','recall','hear','type','say','write']
for a in p['activities']:
 t=a['sourceTurnOneBased'];face=reader[t-1];assert face==a['targetJapanese']+'|'+a['targetEnglish'];assert a['wordBankJapanese']==a['targetJapanese'].split(' ');assert version in a['id'];ids.append(a['id']);assert a['proposedVersionedReaderFaceId']==f'review-ja-en-master{n}-main:{version}:reader:{t-1}:'+hashlib.sha256(face.encode()).hexdigest()
 for key in ['promptEnglish','promptJapanese','explanationEnglish','explanationJapanese','contextEnglish']:assert a[key]
 assert not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',a['promptJapanese']+a['explanationJapanese'])
 expected=[ci[i]['proposedRowId'] for i,c in enumerate(cards) if c['es']==a['targetJapanese'] and c['en']==a['targetEnglish']];assert a['proposedVersionedCardIds']==(expected or None);links+=len(expected)
 expected=[{'id':f['id'],'sourceDialogueTurn':f['sourceDialogueTurn'],'sourceOwnership':'private488; exact bilingual face only, not adoption'} for f in fs if f['japaneseAnswer']==a['targetJapanese'] and f['englishPrompt']==a['targetEnglish']];assert a['privateCanonicalFormEvidence']==(expected or None)
 assert a['privateExactDialogueTurnsOneBased']==[i+1 for i,z in enumerate(private) if z==face]
 assert a['selectedJapanese'] is a['audioScript'] is None and a['reviewed'] is False
 if a['mode']=='hear':
  q=a['hear'];assert q['textOnlyUnsynthesized'] is True and q['playbackEnabled'] is False and q['correctChoiceIndexZeroBased']==1 and len(q['choices'])==3
  for c in q['choices']:assert c['japanese']+'|'+c['english']==reader[c['sourceTurnOneBased']-1]
  assert q['choices'][1]['japanese']==a['targetJapanese'] and len({c['japanese'] for c in q['choices']})==3
assert len(set(ids))==6 and links==(5 if n==15 else 4)
assert p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is p['registered'] is False and all(x is False for x in p['gates'].values())
for k in ['master','extensions','cards']:assert (root/p['sourcePins'][k]['path']).read_bytes()==raw(p['sourcePins'][k])
print('PASS Master',n,':6exact current-main pairs/fullkana/prompts/roles/grammar/ReaderIDs;',links,'cardlinks;private anchors explicit;3literal text-only choices;source byte-exact/allnullfalse.')
