import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[4];p=json.loads((h/'activities.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];assert (root/pin['path']).read_bytes()==b;return b
d={k:json.loads(raw(v)) for k,v in p['sourcePins'].items()};s=d['sidecar'];ids=[]
assert p['pair']=={'target':'English','nativeSupport':'Japanese'} and [a['mode'] for a in p['activities']]==['see','recall','hear','say']
def closed(x):assert x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False
for a in p['activities']:
 r=next(r for r in s['rows'] if r['id']==a['sourceSidecarRowId']);assert a['sourceCardPositionOneBased']==r['oneBasedPosition'] and a['targetEnglish']==r['sourceEnglish'] and a['supportJapaneseProposal']==r['alternatives'][0]['candidateJapanese'] and a['sourceAlternativeId']==r['alternatives'][0]['id'] and a['preservedSpanishContrast']==r['sourceSpanish'];assert a['wordBankEnglish']==a['targetEnglish'].split(' ');assert a['promptEnglish'] and a['promptJapanese'] and not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',a['promptJapanese']);closed(a);ids.append(a['id'])
 if a['mode']=='hear':
  q=a['hear'];assert q['textOnlyUnsynthesized'] is True and q['playbackEnabled'] is False and q['correctChoiceIndexZeroBased']==2;assert [x['english'] for x in q['choices']]==[r['sourceEnglish'] for r in s['rows']]
f=p['formProposal'];assert f['preservedPriorForm']==s['downstreamAudit']['priorAffectedForm'] and f['targetEnglish']==s['rows'][2]['sourceEnglish'] and f['supportJapaneseProposal']==s['rows'][2]['alternatives'][0]['candidateJapanese'] and f['sourceReaderIndexZeroBased']==8 and f['sourceCardPositionOneBased']==17;closed(f);ids.append(f['id'])
a=p['speakingProposal'];assert a['preservedPriorObjective']==s['downstreamAudit']['priorAffectedSpeakingObjective'] and a['openingEnglish']==f['targetEnglish'] and a['openingJapaneseSupportProposal']==f['supportJapaneseProposal'] and a['partnerReplyEnglish'] is None and a['ingredientAnswerSelected'] is False;closed(a);ids.append(a['id']);assert len(set(ids))==6
closed(p);assert p['selectedBranch'] is None and p['registered'] is False and all(x is False for x in p['gates'].values()) and p['independentParentCritiquePending'] is True
print('PASS:4conditional English-label activities/3literal Hear choices/1aligned English form/1bounded speaking scenario;6review IDs;exact sidecar links/prior preserved/source byte-exact/allnullfalse/no ingredient claim.')
