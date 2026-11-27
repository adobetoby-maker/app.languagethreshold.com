#!/usr/bin/env python3
import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'context-links.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
def closed(x):assert x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False
for pin in p['unchangedMainPins']:assert (root/pin['path']).read_bytes()==raw(pin),'Prior file changed: '+pin['path']
main={pin['path']:json.loads(raw(pin)) for pin in p['unchangedMainPins']};private={k:json.loads(raw(pin)) for k,pin in p['privateSourcePins'].items()};checkpoint=json.loads(raw(p['checkpointPin']));gaps=[{'lesson':l['lesson'],'sourceTermFace':dict(zip(['japanese','english'],t.split('|')))} for l in checkpoint['lessons'] for t in l['privateTermsWithoutExactScopedDictionaryFace']]
dictionary=main['src/components/dictionary/japaneseWordData.json'];cards=private['cards']['lessons'];mainCards=main['src/data/core60/ja/master-japanese-basics.json']['lessons'];forms=private['forms1To10']['lessons']+private['forms11To20']['lessons'];assert len(gaps)==26 and len(p['entries'])==8
closed(p);assert p['pair']=={'target':'Japanese','native':'English'} and all(z is False for z in p['gates'].values());assert p['newGlobalHeadwords']==p['registeredContextLinks']==0;ids=[];exactForms=adjacentForms=0
for i,(row,gap) in enumerate(zip(p['entries'],gaps[18:])):
 closed(row);assert row['lessonNumber']==gap['lesson'] and row['sourceTermFace']==gap['sourceTermFace'] and row['sourceFaceGapEvidence']==gap;n=gap['lesson'];ja,en=gap['sourceTermFace'].values();assert row['stableLessonKey']==f'master-japanese-basics:{n}';ids.append(row['id']);assert row['selectedGlobalSenseId'] is row['newGlobalHeadwordId'] is None
 assert ja+'|'+en in private['master']['lessons'][n-1]['terms'];exact=[z for z in dictionary if z['word']==ja and z['english']==en];assert row['existingGlobalExactSenseRows']==exact and row['suggestedExistingSenseIds']==[z['id'] for z in exact];assert not [z for z in exact if z.get('moduleId')=='master-japanese-basics' and f'lesson={n}&' in z.get('lessonHref','')]
 assert row['existingGlobalSameJapaneseRowIds']==[z['id'] for z in dictionary if z['word']==ja]
 assert bool(exact);assert row['entryKind']==('lesson-proper-name-context-link' if i==1 else 'lesson-sense-context-link')
 assert row['contextualGlossEnglish'] and row['explanationJapanese'] and row['explanationEnglish'] and row['usageNoteEnglish'];assert not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',row['explanationJapanese'])
 ex=row['readerExample'];closed(ex);kind=ex['sourceKind'];t=ex['sourceTurnOneBased'];source=private['master']['lessons'][n-1]['dialogue'] if kind=='dialogue' else private['extensions'][str(n)];assert ex['japanese']+'|'+ex['english']==source[t-1] and ja in ex['japanese'];assert row['readerReference']['privateReaderIndexZeroBased']==t-1+(0 if kind=='dialogue' else len(private['master']['lessons'][n-1]['dialogue']))
 assert row['sourcePrivateCardRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(cards[n-1]['words']) if z['es']==ja and z['en']==en]
 assert row['sourcePrivateContainingPhraseRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(cards[n-1]['words']) if z['kind']=='phrase' and ja in z['es']]
 assert row['sourceMainCardRows']==[{'rowIndexZeroBased':j,'value':z} for j,z in enumerate(mainCards[n-1]['words']) if z['es']==ja and z['en']==en]
 fs=next(l['prompts'] for l in forms if l['lesson']==n);assert row['containingCanonicalFormIds']==[f['id'] for f in fs if ja in f['japaneseAnswer']];exactForms+=len(row['containingCanonicalFormIds'])
 links=[{'sourcePromptId':f['id'],'sourceDialogueTurn':f['sourceDialogueTurn'],'linkKind':'next-turn-context; term not necessarily present'} for f in fs if kind=='dialogue' and f['sourceDialogueTurn']==t+1];assert row['adjacentContextFormLinks']==links;adjacentForms+=len(links)
assert len(ids)==len(set(ids))==8 and exactForms==5 and adjacentForms==2
prior=[e for pin in p['previousContextProposalPins'] for e in json.loads(raw(pin))['entries']];assert [e['sourceFaceGapEvidence'] for e in prior]==gaps[:18]
assert p['originalSameLessonFaceGapCount']==26 and p['contextLinkProposalsAdded']==8 and p['cumulativeContextProposals']==26 and p['remainingUnproposedSourceFaceGapCount']==0 and p['remainingSourceFaceGaps']==[] and p['sourceFaceGapsStillUnregistered']==26
assert p['proposedCardFaces']==[]
for row in p['entries']:
 n=row['lessonNumber'];assert row['sourceVersionStatus'] and row['sourceLessonMatchesPinnedMain'] is True;assert private['master']['lessons'][n-1]==main['content/japanese-basics/master.json']['lessons'][n-1] and private['extensions'][str(n)]==main['content/japanese-basics/master-extensions.json'][str(n)];assert row['sourcePrivateCardRows'] and row['sourcePrivateContainingPhraseRows'] and row['proposedCardId'] is None
allEntries=prior+p['entries'];allKeys=[(e['lessonNumber'],e['sourceTermFace']['japanese'],e['sourceTermFace']['english']) for e in allEntries];assert len(allKeys)==len(set(allKeys))==26
assert len({e['id'] for e in allEntries})==26
refs=[i for e in allEntries for i in e['suggestedExistingSenseIds']];assert len(refs)==24 and len(set(refs))==22
assert len({i for e in p['entries'] for i in e['suggestedExistingSenseIds']})==7
assert p['draftContextCoverageOnly'] is True
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
assert m['selfAuthored'] is True
assert m['haikuAttempt']['safeMode'] is True and m['haikuAttempt']['requestedModel']=='claude-haiku-5-5'
assert m['haikuAttempt']['actualModelUsage']=={} and m['haikuAttempt']['isError'] is True and m['haikuAttempt']['apiErrorStatus']==429 and m['haikuAttempt']['apiError']=='usage_limit_reached'
assert m['opus']['attempted'] is False and m['fable']['attempted'] is False
print('PASS: 8 final scoped proposals; 8 exact global references (7 unique IDs); 8 literal Reader and existing term/phrase card contexts; 5 literal form and 2 adjacent context links; 26/26 draft context coverage only, 26 still unregistered; 11 prior files byte-exact; all selections/audio null and gates false; truthful CLI quota failure/self-authored provenance.')
