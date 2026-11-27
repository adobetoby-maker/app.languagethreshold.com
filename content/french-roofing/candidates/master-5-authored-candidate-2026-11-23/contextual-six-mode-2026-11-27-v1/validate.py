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
assert n in (4,5,6) and a['lessonId']==p['lessonId']
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
assert a['sourceDecisionQuestionRef']=={'artifactPath':a['sourcePacket']['path'],'artifactSha256':a['sourcePacket']['sha256'],'jsonPointer':'/sourceDecisionQuestions'}
assert a['gates']==p['gates'] and not any(a['gates'].values())
for field in ('forms','dictionaryMappings'):
 for x in a['existingRecordRefs'][field]:assert ptr(p,x['jsonPointer'])['id']==x['id']
for x in a['sourceCardRefs']:assert ptr(s,x['jsonPointer'])['id']==x['id'] and ptr(s,x['jsonPointer'])['sourceEnglish']==x['sourceEnglish']
assert set(evidence)<=set(rows)
for i,r in enumerate(s['reader']):
 if r['id'] not in evidence:continue
 e=evidence[r['id']];assert e['sourcePacketReaderPointer']==f'/reader/{i}'
 for k in ('sourceEnglish','sourceSpanish'):assert e[k]==r[k]
 assert e['sourceLegacyRef']==r['legacySourceRef'] and e['sourceSafetyOrMeaningHold']==r['safetyOrMeaningHold']
 c=next(c for c in p['candidateRows'] if c['sourceAnchor']==r['id']);assert e['canonicalReaderId']==c['id'] and e['canonicalReaderHold']==c['hold']
 for f in e['authoredFrenchOptionRefs']:
  assert sha(raw(f['artifactPath']))==f['artifactSha256'] and isinstance(ptr(obj(f['artifactPath']),f['jsonPointer']),str) and f['selectedFrench'] is None

def segment(x):
 r=rows[x['sourceAnchor']];en=re.sub(r'^(Rogelio|Kevin|Supplier|Mr\. Ramírez): ','',r['sourceEnglish']);f=next(f for f in evidence[r['id']]['authoredFrenchOptionRefs'] if f['id']==x['frenchEvidenceId']);fr=re.sub(r'^(Rogelio|Kevin|Fournisseur|Le fournisseur|M\. Ramírez)\s*:\s*','',ptr(obj(f['artifactPath']),f['jsonPointer']));fr=fr[1:-1].strip() if fr.startswith('«') and fr.endswith('»') else fr
 assert x['kind']=='exact-source-face-or-utterance-body' and x['referenceEnglish']==en and x['candidateMeaningFrench']==fr
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
 if act['mode']=='type':assert act['clozeTextEnglish'].replace('_____',act['candidateTargetEnglish'])==act['unmaskedSourceBodyEnglish']==re.sub(r'^(Rogelio|Kevin|Supplier|Mr\. Ramírez): ','',rows[act['clozeSourceAnchor']]['sourceEnglish'])
 else:
  extra=act.get('newCompositionSegments',[]);tailen=''.join(' '+x['referenceEnglish'] for x in extra);tailfr=''.join(' '+x['candidateMeaningFrench'] for x in extra)
  if act.get('targetFormat')=='role-labelled-transcript':
   assert n==5 and act['mode']=='write' and [x['sourceAnchor'].split(':')[-1] for x in act['referenceSegments']]==[str(i) for i in range(7,17)]
   for x in act['referenceSegments']:
    partner=rows[x['sourceAnchor']]['sourceEnglish'].startswith('Mr. Ramírez:');assert x['speakerLabelEnglish']==('Mr. Ramírez' if partner else 'Rogelio') and x['speakerLabelFrench']==('M. Ramírez' if partner else 'Rogelio')
   assert act['candidateTargetEnglish']=='\n'.join(x['speakerLabelEnglish']+': '+x['referenceEnglish'] for x in act['referenceSegments'])
   assert act['candidateMeaningFrench']=='\n'.join(x['speakerLabelFrench']+' : '+x['candidateMeaningFrench'] for x in act['referenceSegments'])
  elif act.get('targetFormat')=='audience-labelled-messages':
   assert n==6 and act['mode']=='write' and len(act['audienceSections'])==2
   assert act['audienceSections'][1]['contextSourceAnchor'].endswith(':reader:13')
   for lang,key in [('English','referenceEnglish'),('French','candidateMeaningFrench')]:
    expected='\n\n'.join(section['heading'+lang]+'\n'+' '.join(x[key] for x in act['referenceSegments'] if x['sourceAnchor'] in section['sourceAnchors']) for section in act['audienceSections'])
    assert act['candidateTargetEnglish' if lang=='English' else 'candidateMeaningFrench']==expected
  else:
   assert act['candidateTargetEnglish']==act.get('targetEnglishPrefix','')+' '.join(x[0] for x in vals)+tailen and act['candidateMeaningFrench']==act.get('targetFrenchPrefix','')+' '.join(x[1] for x in vals)+tailfr
  if extra:assert n==4 and extra[0]['referenceEnglish']=='Will you follow the sheet rather than work from memory?' and 'not a quoted source utterance' in extra[0]['provenance']
 assert set(act['linkedSourceCardIds'])<={r['id'] for r in s['cards']}
 assert set(act['existingFormIds'])=={r['id'] for r in p['forms']} and set(act['dictionaryMappingIds'])=={r['id'] for r in p['dictionaryMappings']}
 if act['mode']=='say':
  turns=act['dialogueSequence'];assert len(turns)=={4:14,5:10,6:8}[n]
  for j,t in enumerate(turns):
   assert t['id']==act['id']+f':turn:{j+1}' and t['id'] not in ids;ids.add(t['id'])
   assert t['selectedFrench'] is t['audioScript'] is None and t['reviewed'] is False
   if t['sourceSpeaker'] is None:
    assert n==4 and j==13 and t['utteranceEnglish']=='Will you follow the sheet rather than work from memory?' and t['speakerRole']=='learner'
   else:
    segment({'sourceAnchor':t['sourceAnchor'],'referenceEnglish':t['utteranceEnglish'],'candidateMeaningFrench':t['candidateMeaningFrench'],'frenchEvidenceId':t['frenchEvidenceId'],'kind':'exact-source-face-or-utterance-body'})
    expected='partner' if rows[t['sourceAnchor']]['sourceEnglish'].startswith(('Kevin:','Supplier:','Mr. Ramírez:')) else 'learner';assert t['speakerRole']==expected
 if act['mode']=='hear':
  assert act['candidateListeningTextEnglish']==re.sub(r'^(Rogelio|Kevin|Supplier|Mr\. Ramírez): ','',rows[act['listeningTextSourceAnchor']]['sourceEnglish'])
  for k in ('technicalAudioValidated','paidSynthesisStarted'):assert act[k] is False
  for k in ('candidateVoice','candidateLocale','synthesisCostEstimate'):assert act[k] is None
for k in ('reviewed','registered','runtimeRegistered','scoringEnabled','offlineRegistered','progressMigrationApproved','v4Registered','sourceMissionCompletionClaim','audioRegistered','listeningReviewed','qualifiedReviewClaimed'):assert a[k] is False
for k in ('selectedEnglish','selectedFrench','audioScript','progressKey'):assert a[k] is None
meta=json.loads((D/'assistance.json').read_text());assert meta['cliCallsAttemptedThisBatch']==0 and meta['newHaikuOpusFableChainClaimed'] is False and meta['qualifiedReview'] is False
if (D/'manifest.json').exists():
 m=json.loads((D/'manifest.json').read_text())
 for path,h in m['fileSha256'].items():assert sha((R/path).read_bytes())==h,path
print(json.dumps({'result':'PASS','lesson':n,'modes':6,'sayTurns':{4:14,5:10,6:8}[n],'sourceReaderAnchorsReferenced':len(anchors),'priorFilesBytePreserved':19,'chosenFrench':0,'audioRecordings':0,'sourceObjectiveComplete':False}))
