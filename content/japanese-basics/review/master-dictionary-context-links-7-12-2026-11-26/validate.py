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
for i,(row,gap) in enumerate(zip(p['entries'],gaps[6:12])):
 closed(row);assert row['lessonNumber']==gap['lesson'] and row['sourceTermFace']==gap['sourceTermFace'] and row['sourceFaceGapEvidence']==gap;n=gap['lesson'];ja,en=gap['sourceTermFace'].values();assert row['stableLessonKey']==f'master-japanese-basics:{n}';ids.append(row['id']);assert row['selectedGlobalSenseId'] is row['newGlobalHeadwordId'] is None
 assert ja+'|'+en in private['master']['lessons'][n-1]['terms'];exact=[z for z in dictionary if z['word']==ja and z['english']==en];assert row['existingGlobalExactSenseRows']==exact and row['suggestedExistingSenseIds']==[z['id'] for z in exact];assert not [z for z in exact if z.get('moduleId')=='master-japanese-basics' and f'lesson={n}&' in z.get('lessonHref','')]
 assert row['existingGlobalSameJapaneseRowIds']==[z['id'] for z in dictionary if z['word']==ja]
 assert bool(exact)==(i!=4);assert row['entryKind']==('lesson-lexical-sense-candidate' if i==4 else 'lesson-sense-context-link')
 assert row['contextualGlossEnglish'] and row['explanationJapanese'] and row['explanationEnglish'] and row['usageNoteEnglish'];assert not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',row['explanationJapanese'])
 ex=row['readerExample'];closed(ex);kind=ex['sourceKind'];t=ex['sourceTurnOneBased'];source=private['master']['lessons'][n-1]['dialogue'] if kind=='dialogue' else private['extensions'][str(n)];assert ex['japanese']+'|'+ex['english']==source[t-1] and ja in ex['japanese'];assert row['readerReference']['privateReaderIndexZeroBased']==t-1+(0 if kind=='dialogue' else len(private['master']['lessons'][n-1]['dialogue']))
 assert row['sourcePrivateCardRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(cards[n-1]['words']) if z['es']==ja and z['en']==en]
 assert row['sourcePrivateContainingPhraseRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(cards[n-1]['words']) if z['kind']=='phrase' and ja in z['es']]
 assert row['sourceMainCardRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(mainCards[n-1]['words']) if z['es']==ja and z['en']==en]
 fs=next(l['prompts'] for l in forms if l['lesson']==n);assert row['containingCanonicalFormIds']==[f['id'] for f in fs if ja in f['japaneseAnswer']];exactForms+=len(row['containingCanonicalFormIds'])
 links=[{'sourcePromptId':f['id'],'sourceDialogueTurn':f['sourceDialogueTurn'],'linkKind':'next-turn-context; term not necessarily present'} for f in fs if kind=='dialogue' and f['sourceDialogueTurn']==t+1];assert row['adjacentContextFormLinks']==links;adjacentForms+=len(links)
assert len(ids)==len(set(ids))==6 and exactForms==3 and adjacentForms==0
prior=json.loads(raw(p['previousContextProposalPin']));assert [e['sourceFaceGapEvidence'] for e in prior['entries']]==gaps[:6]
assert p['originalSameLessonFaceGapCount']==26 and p['contextLinkProposalsAdded']==6 and p['cumulativeContextProposals']==12 and p['remainingUnproposedSourceFaceGapCount']==14 and p['remainingSourceFaceGaps']==gaps[12:] and p['sourceFaceGapsStillUnregistered']==26
modecards=json.loads(raw(p['existingModeCardProposalPin']))['proposedCardFaces'];proposals={c['id']:c for c in p['proposedCardFaces']};assert len(proposals)==1
for row in p['entries']:
 assert row['sourceVersionHold'];ja=row['sourceTermFace']['japanese'];assert row['existingReviewCardProjectionIds']==[c['id'] for c in modecards if ja in c['es']]
 if not row['sourcePrivateCardRows'] and not row['sourcePrivateContainingPhraseRows']:
  c=proposals[row['proposedCardId']];closed(c);ex=row['readerExample'];assert ja=='さいごに' and c['es']==ex['japanese'] and c['en']==ex['english'] and c['sourceKind']=='extension' and c['sourceTurnOneBased']==4 and c['runtimeSavedCardId'] is None
 else:assert row['proposedCardId'] is None
assert p['entries'][4]['lookupScopeNote'];assert [z for z in dictionary if z['word'] in ['しごと','仕事']]==[]
assert len(set(ids)|set(proposals))==7
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
for k,name in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[k]['safeMode'] is True and name in m[k]['actualModelUsage'] and m[k]['isError'] is False
print('PASS6next context proposals/5existing exact global references+1unregistered lexical candidate/6exact Reader links/5existing private card contexts+1inert card/3literal form links/7unique review IDs;12prior files byte-exact;14unproposed gaps/26stillunregistered/allnullfalse/actualmetadata')
