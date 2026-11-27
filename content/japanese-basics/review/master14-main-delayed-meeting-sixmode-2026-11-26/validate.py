import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'activities.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
d={k:json.loads(raw(v)) for k,v in p['sourcePins'].items()};forms=next(l['prompts'] for l in json.loads(raw(p['privateFormSourcePin']))['lessons'] if l['lesson']==14);reader=d['master']['lessons'][13]['dialogue'];v=d['identity']['versions']['mainDelayedMeeting'];ci=d['cardIdentity']['lessons'][13]['rows'];cards=d['cards']['lessons'][13]['words'];assert len(reader)==9 and len(v['readerRows'])==13
assert [x['mode'] for x in p['activities']]==['see','recall','hear','type','say','write'];assert [x['sourceTurnOneBased'] for x in p['activities']]==[1,3,4,5,7,9]
ids=[];cardlinks=formlinks=0
for a in p['activities']:
 t=a['sourceTurnOneBased'];assert a['targetJapanese']+'|'+a['targetEnglish']==reader[t-1] and a['sourceReaderIndexZeroBased']==t-1;assert a['proposedVersionedReaderFaceId']==v['readerRows'][t-1]['proposedVersionedReaderFaceId'];assert v['versionSha256'] in a['id'];ids.append(a['id'])
 assert ' '.join(a['wordBankJapanese'])==a['targetJapanese'];assert all(a[k] for k in ['promptEnglish','promptJapanese','contextEnglish','explanationEnglish','explanationJapanese']);assert not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',a['promptJapanese']+a['explanationJapanese'])
 expected=[ci[i]['proposedRowId'] for i,c in enumerate(cards) if c['es']==a['targetJapanese'] and c['en']==a['targetEnglish']];assert a['proposedVersionedCardIds']==(expected or None);cardlinks+=len(expected)
 fm=[{'id':f['id'],'relationship':'exact bilingual target only; private routine source ownership not adopted'} for f in forms if f['japaneseAnswer']==a['targetJapanese'] and f['englishPrompt']==a['targetEnglish']];assert a['privateCanonicalFormEvidence']==(fm or None);formlinks+=len(fm)
 assert a['targetSpeakerRoleEnglish']=='Narrator' and a['learnerPracticeRoleEnglish']==('Listener' if a['mode']=='hear' else 'Narrator')
 assert a['selectedJapanese'] is a['audioScript'] is None and a['reviewed'] is False
 if a['mode']=='hear':
  q=a['hear'];assert q['textOnlyUnsynthesized'] is True and q['playbackEnabled'] is False and q['correctChoiceIndexZeroBased']==1;assert len(q['choices'])==3
  for choice in q['choices']:assert choice['japanese']+'|'+choice['english']==reader[choice['sourceTurnOneBased']-1]
  assert q['choices'][1]['japanese']==a['targetJapanese'] and len({c['japanese'] for c in q['choices']})==3
assert len(set(ids))==6 and cardlinks==4 and formlinks==2
assert p['selectedJapanese'] is p['audioScript'] is None and p['registered'] is p['reviewed'] is False and all(v is False for v in p['gates'].values()) and p['independentParentCritiquePending'] is True
for k in ['master','extensions','cards']:assert (root/p['sourcePins'][k]['path']).read_bytes()==raw(p['sourcePins'][k])
print('PASS: 6 exact main delayed-meeting contextual activities; 6 versioned Reader links/4 exact card links/2 exact private form references; 3 literal text-only Hear choices; exact banks/fullkana; source byte-exact/all gates false.')
