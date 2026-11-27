#!/usr/bin/env python3
"""Independent exact-source/identity/direction preservation check, not qualified review."""
import pathlib,json,hashlib,subprocess,re
D=pathlib.Path(__file__).resolve().parent
R=next(p for p in D.parents if (p/'package.json').exists() and (p/'.git').exists())
a=json.loads((D/'activities.json').read_text());rev=a['sourceAuditOriginMain'];cache={}
def raw(p):
 if p not in cache:cache[p]=subprocess.check_output(['git','show',rev+':'+p],cwd=R)
 return cache[p]
def obj(p):return json.loads(raw(p))
def sha(b):return hashlib.sha256(b).hexdigest()
def ptr(o,p):
 for x in p.strip('/').split('/'):
  x=x.replace('~1','/').replace('~0','~');o=o[int(x)] if isinstance(o,list) else o[x]
 return o
cp=a['canonicalCandidate']['path'];p=obj(cp);s=obj(a['sourcePacket']['path']);rows={r['id']:r for r in s['reader']};evidence={e['sourceAnchor']:e for e in a['sourceEvidence']};n=int(a['lessonId'].split(':')[1])
assert n in (2,3) and a['lessonId']==p['lessonId']
assert sha(raw(cp))==a['canonicalCandidate']['sha256']
assert a['sourcePacket']==p['sourcePacket'] and sha(raw(a['sourcePacket']['path']))==p['sourcePacket']['sha256']
for path,h in a['inputArtifactSha256'].items():assert sha(raw(path))==h,path
for path,h in s['sourceFileSha256'].items():assert a['inputArtifactSha256'][path]==h and sha(raw(path))==h
prior=subprocess.check_output(['git','ls-tree','-r','--name-only',rev,cp.rsplit('/',1)[0]],cwd=R,text=True).splitlines()
assert set(prior)==set(a['preservedMainArtifactSha256'])==set(a['preservedWorkingTreeArtifactSha256']) and len(prior)==19
for path in prior:
 assert sha(raw(path))==a['preservedMainArtifactSha256'][path]
 assert sha((R/path).read_bytes())==a['preservedWorkingTreeArtifactSha256'][path]
for field in ('sourceObjectiveEnglish','sourceSpeakingEnglish'):assert a[field]==p[field]
assert a['existingLexicalObjectiveEnglish']==p['candidateObjectiveEnglish'] and 'held/incomplete' in a['sourceObjectiveCompletionStatus']
assert a['sourceDecisionQuestions']==s['sourceDecisionQuestions'] and a['gates']==p['gates'] and not any(a['gates'].values())
assert a['existingFormsEvidence']==p['forms'] and a['existingDictionaryEvidence']==p['dictionaryMappings'] and a['sourceCardsEvidence']==s['cards']
assert set(evidence)==set(rows)
for i,r in enumerate(s['reader']):
 e=evidence[r['id']];assert e['sourcePacketReaderPointer']==f'/reader/{i}'
 for k in ('sourceEnglish','sourceSpanish'):assert e[k]==r[k]
 assert e['sourceLegacyRef']==r['legacySourceRef'] and e['sourceSafetyOrMeaningHold']==r['safetyOrMeaningHold']
 c=next(c for c in p['candidateRows'] if c['sourceAnchor']==r['id']);assert e['canonicalReaderId']==c['id'] and e['canonicalReaderHold']==c['hold']
 for f in e['authoredFrenchOptions']:
  assert sha(raw(f['artifactPath']))==f['artifactSha256'] and ptr(obj(f['artifactPath']),f['jsonPointer'])==f['candidateFrench'] and f['selectedFrench'] is None

def segment(x):
 r=rows[x['sourceAnchor']];en=re.sub(r'^(Rogelio|Kevin): ','',r['sourceEnglish']);f=next(f for f in evidence[r['id']]['authoredFrenchOptions'] if f['id']==x['frenchEvidenceId']);fr=re.sub(r'^(Rogelio|Kevin)\s*:\s*','',f['candidateFrench']);fr=fr[1:-1].strip() if fr.startswith('«') and fr.endswith('»') else fr
 if x['kind']=='exact-source-embedded-speech':
  assert n==3 and r['id'].endswith(':reader:13');en=en.split(': ',1)[1];fr=fr.split(':',1)[1].strip().strip('«»').strip()
 else:assert x['kind']=='exact-source-utterance-body'
 assert x['referenceEnglish']==en and x['candidateMeaningFrench']==fr
 return en,fr
assert [x['mode'] for x in a['activities']]==['see','recall','hear','type','say','write']
ids=set();anchors=set()
for act in a['activities']:
 assert act['id']==a['lessonId']+':contextual-activity:v1:'+act['mode'] and act['id'] not in ids;ids.add(act['id'])
 assert act['responseLanguage']=='English' and act['meaningSupportLanguage']=='French'
 for k in ('promptEnglish','promptFrench','candidateTargetEnglish','candidateMeaningFrench','explanationEnglish','explanationFrench'):assert act[k]
 for k in ('reviewed','registered','runtimeRegistered','offlineRegistered','progressRegistered','audioRegistered','listeningReviewed','scoringEnabled'):assert act[k] is False
 for k in ('selectedEnglish','selectedFrench','audioScript','selectedRecording'):assert act[k] is None
 vals=[segment(x) for x in act['referenceSegments']];anchors.update(act['sourceAnchors']);assert set(act['sourceAnchors'])<=set(rows)
 if act['mode']=='type':assert act['clozeTextEnglish'].replace('_____',act['candidateTargetEnglish'])==act['unmaskedSourceBodyEnglish']==re.sub(r'^Rogelio: ','',rows[act['clozeSourceAnchor']]['sourceEnglish'])
 else:
  assert act['candidateTargetEnglish']==' '.join(x[0] for x in vals) and act['candidateMeaningFrench']==' '.join(x[1] for x in vals)
 assert set(act['linkedSourceCardIds'])<={r['id'] for r in s['cards']}
 assert set(act['existingFormIds'])=={r['id'] for r in p['forms']} and set(act['dictionaryMappingIds'])=={r['id'] for r in p['dictionaryMappings']}
 if act['mode']=='say':
  turns=act['dialogueSequence'];assert len(turns)==8
  for j,t in enumerate(turns):
   assert t['id']==act['id']+f':turn:{j+1}' and t['id'] not in ids;ids.add(t['id'])
   assert t['speakerRole']==('partner' if j%2==0 else 'learner')
   assert t['selectedFrench'] is t['audioScript'] is None and t['reviewed'] is False
   if j%2==0:assert t['sourceSpeaker'] is None and 'not a source quotation' in t['provenance']
   else:
    v=[segment(x) for x in t['referenceSegments']];assert t['utteranceEnglish']==' '.join(x[0] for x in v) and t['candidateMeaningFrench']==' '.join(x[1] for x in v)
 if act['mode']=='hear':
  assert act['candidateListeningTextEnglish']==re.sub(r'^Rogelio: ','',rows[act['listeningTextSourceAnchor']]['sourceEnglish'])
  for k in ('technicalAudioValidated','paidSynthesisStarted'):assert act[k] is False
  for k in ('candidateVoice','candidateLocale','synthesisCostEstimate'):assert act[k] is None
for k in ('reviewed','registered','runtimeRegistered','scoringEnabled','offlineRegistered','progressMigrationApproved','v4Registered','sourceMissionCompletionClaim','audioRegistered','listeningReviewed','qualifiedReviewClaimed'):assert a[k] is False
for k in ('selectedEnglish','selectedFrench','audioScript','progressKey'):assert a[k] is None
meta=json.loads((D/'assistance.json').read_text());assert meta['cliCallsAttemptedThisBatch']==0 and meta['newHaikuOpusFableChainClaimed'] is False and meta['qualifiedReview'] is False
if (D/'manifest.json').exists():
 m=json.loads((D/'manifest.json').read_text())
 for path,h in m['fileSha256'].items():assert sha((R/path).read_bytes())==h,path
print(json.dumps({'result':'PASS','lesson':n,'modes':6,'sayTurns':8,'sourceReaderAnchorsReferenced':len(anchors),'priorFilesBytePreserved':19,'chosenFrench':0,'audioRecordings':0,'sourceObjectiveComplete':False}))
