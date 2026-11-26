#!/usr/bin/env python3
import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'context-links.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
def closed(x):assert x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False
for pin in p['unchangedMainPins']:assert (root/pin['path']).read_bytes()==raw(pin),'Prior file changed: '+pin['path']
main={pin['path']:json.loads(raw(pin)) for pin in p['unchangedMainPins']};private={k:json.loads(raw(pin)) for k,pin in p['privateSourcePins'].items()};checkpoint=json.loads(raw(p['checkpointPin']));gaps=[{'lesson':l['lesson'],'sourceTermFace':dict(zip(['japanese','english'],t.split('|')))} for l in checkpoint['lessons'] for t in l['privateTermsWithoutExactScopedDictionaryFace']]
dictionary=main['src/components/dictionary/japaneseWordData.json'];cards=private['cards']['lessons'];mainCards=main['src/data/core60/ja/master-japanese-basics.json']['lessons'];forms=private['forms1To10']['lessons']+private['forms11To20']['lessons'];assert len(gaps)==26 and len(p['entries'])==6
closed(p);assert p['pair']=={'target':'Japanese','native':'English'} and all(z is False for z in p['gates'].values());assert p['newGlobalHeadwords']==p['registeredContextLinks']==0;ids=[];exactForms=adjacentForms=0
for i,(row,gap) in enumerate(zip(p['entries'],gaps[:6])):
 closed(row);assert row['lessonNumber']==gap['lesson'] and row['sourceTermFace']==gap['sourceTermFace'] and row['sourceFaceGapEvidence']==gap;n=gap['lesson'];ja,en=gap['sourceTermFace'].values();assert row['stableLessonKey']==f'master-japanese-basics:{n}';ids.append(row['id']);assert row['selectedGlobalSenseId'] is row['newGlobalHeadwordId'] is None
 assert ja+'|'+en in private['master']['lessons'][n-1]['terms'];exact=[z for z in dictionary if z['word']==ja and z['english']==en];assert row['existingGlobalExactSenseRows']==exact and row['suggestedExistingSenseIds']==[z['id'] for z in exact];assert not [z for z in exact if z.get('moduleId')=='master-japanese-basics' and f'lesson={n}&' in z.get('lessonHref','')]
 assert row['existingGlobalSameJapaneseRowIds']==[z['id'] for z in dictionary if z['word']==ja]
 assert bool(exact)==(i<5);assert row['entryKind']==('lesson-sense-context-link' if i<5 else 'compositional-lesson-source-span-link')
 assert row['contextualGlossEnglish'] and row['explanationJapanese'] and row['explanationEnglish'] and row['usageNoteEnglish'];assert not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',row['explanationJapanese'])
 ex=row['readerExample'];closed(ex);kind=ex['sourceKind'];t=ex['sourceTurnOneBased'];source=private['master']['lessons'][n-1]['dialogue'] if kind=='dialogue' else private['extensions'][str(n)];assert ex['japanese']+'|'+ex['english']==source[t-1] and ja in ex['japanese'];assert row['readerReference']['privateReaderIndexZeroBased']==t-1+(0 if kind=='dialogue' else len(private['master']['lessons'][n-1]['dialogue']))
 assert row['sourcePrivateCardRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(cards[n-1]['words']) if z['es']==ja and z['en']==en] and len(row['sourcePrivateCardRows'])==1
 assert row['sourceMainCardRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(mainCards[n-1]['words']) if z['es']==ja and z['en']==en]
 fs=next(l['prompts'] for l in forms if l['lesson']==n);assert row['containingCanonicalFormIds']==[f['id'] for f in fs if ja in f['japaneseAnswer']];exactForms+=len(row['containingCanonicalFormIds'])
 links=[{'sourcePromptId':f['id'],'sourceDialogueTurn':f['sourceDialogueTurn'],'linkKind':'next-turn-context; term not necessarily present'} for f in fs if kind=='dialogue' and f['sourceDialogueTurn']==t+1];assert row['adjacentContextFormLinks']==links;adjacentForms+=len(links)
assert len(ids)==len(set(ids))==6 and exactForms==2 and adjacentForms==1
last=p['entries'][-1];assert last['lessonNumber']==14 and last['sourceMainCardRows']==[] and last['sourcePrivateCardRows'][0]['value']['kind']=='term';assert [c['japanese'] for c in last['phraseComponents']]==['ふだん','は','あさ'];assert all(c['newHeadwordCreated'] is False for c in last['phraseComponents']);assert last['sourceVersionHold']
assert last['phraseComponents'][2]['existingExactSenseIds']==[z['id'] for z in dictionary if z['word']=='あさ' and z['english']=='morning']
assert p['originalSameLessonFaceGapCount']==26 and p['contextLinkProposalsAdded']==6 and p['remainingUnproposedSourceFaceGapCount']==20 and p['remainingSourceFaceGaps']==gaps[6:];assert p['sourceFaceGapsStillUnregistered']==26
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
for k,name in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[k]['safeMode'] is True and name in m[k]['actualModelUsage'] and m[k]['isError'] is False
print('PASS6context proposals/5existing global sense IDs referenced+1nonlemma source-span note/6exact Reader and private-card links/2literal form links+1adjacent context/6unique review IDs;10prior files byte-exact;20unproposed gaps/26stillunregistered/allnullfalse/actualmetadata')
