#!/usr/bin/env python3
"""Source/identity/direction validator; not qualified language or roofing review."""
import hashlib,json,pathlib,re,subprocess
D=pathlib.Path(__file__).resolve().parent
R=next(x for x in D.parents if (x/'package.json').exists() and (x/'.git').exists())
a=json.loads((D/'activities.json').read_text());revision=a['sourceAuditOriginMain'];cache={}
def raw(path):
    if path not in cache:cache[path]=subprocess.check_output(['git','show',revision+':'+path],cwd=R)
    return cache[path]
def obj(path):return json.loads(raw(path))
def digest(b):return hashlib.sha256(b).hexdigest()
def pointer(value,path):
    for part in path.lstrip('/').split('/'):
        part=part.replace('~1','/').replace('~0','~')
        value=value[int(part)] if isinstance(value,list) else value[part]
    return value
cp=a['canonicalCandidate']['path'];p=obj(cp);s=obj(a['sourcePacket']['path']);source={r['id']:r for r in s['reader']};canonical={r['sourceAnchor']:r for r in p['candidateRows']}
assert digest(raw(cp))==a['canonicalCandidate']['sha256']
assert a['sourcePacket']==p['sourcePacket'] and digest(raw(a['sourcePacket']['path']))==p['sourcePacket']['sha256']
for path,sha in a['inputArtifactSha256'].items():assert digest(raw(path))==sha,path
for path,sha in s['sourceFileSha256'].items():assert a['inputArtifactSha256'][path]==sha and digest(raw(path))==sha
priorPaths=subprocess.check_output(['git','ls-tree','-r','--name-only',revision,cp.rsplit('/',1)[0]],cwd=R,text=True).splitlines()
assert set(a['preservedMainArtifactSha256'])==set(priorPaths)
assert set(a['preservedWorkingTreeArtifactSha256'])==set(priorPaths) and len(priorPaths)==19
for path,sha in a['preservedMainArtifactSha256'].items():assert digest(raw(path))==sha
for path,sha in a['preservedWorkingTreeArtifactSha256'].items():assert digest((R/path).read_bytes())==sha,path
assert a['sourceObjectiveEnglish']==p['sourceObjectiveEnglish'] and a['sourceSpeakingEnglish']==p['sourceSpeakingEnglish']
assert a['existingLexicalObjectiveEnglish']==p['candidateObjectiveEnglish']
assert 'held' in a['sourceObjectiveCompletionStatus'].lower()
assert a['sourceDecisionQuestions']==s['sourceDecisionQuestions'] and a['gates']==p['gates']
assert all(value is False for value in a['gates'].values())
for key in ('reviewed','registered','runtimeRegistered','scoringEnabled','offlineRegistered','progressMigrationApproved','v4Registered','sourceMissionCompletionClaim','audioRegistered','listeningReviewed','qualifiedReviewClaimed'):assert a[key] is False
assert a['selectedEnglish'] is a['selectedFrench'] is a['audioScript'] is a['progressKey'] is None
assert 'Crew lead' in a['learnerRoleEnglish'] and a['partnerRoleEnglish']=='Kevin, a new hire on day one.'
assert a['lessonId']==p['lessonId']=='master-roofing:1:fr-en'
evidence={e['sourceAnchor']:e for e in a['sourceEvidence']};assert set(evidence)==set(source)
for index,src in enumerate(s['reader']):
    e=evidence[src['id']]
    assert e['sourcePacketReaderPointer']==f'/reader/{index}'
    for key in ('sourceEnglish','sourceSpanish'):assert e[key]==src[key]
    assert e['sourceLegacyRef']==src['legacySourceRef'] and e['sourceSafetyOrMeaningHold']==src['safetyOrMeaningHold']
    assert e['canonicalReaderId']==canonical[src['id']]['id'] and e['canonicalReaderHold']==canonical[src['id']]['hold']
    assert e['authoredFrenchOptions']
    for f in e['authoredFrenchOptions']:
        assert f['selectedFrench'] is None and digest(raw(f['artifactPath']))==f['artifactSha256']
        doc=obj(f['artifactPath']);assert pointer(doc,f['jsonPointer'])==f['candidateFrench']
        parts=f['jsonPointer'].split('/')
        row=doc['candidateRows'][int(parts[2])] if parts[1]=='candidateRows' else doc['rows'][int(parts[2])]
        assert row['sourceAnchor']==src['id']
        refer=row if parts[1]=='candidateRows' else row['alternatives'][int(parts[4])]
        assert refer['id']==f['id'] and refer['selectedFrench'] is None

def sid(i):return a['lessonId']+f':reader:{i}'
def body(i):return re.sub(r'^(Rogelio|Kevin): ','',source[sid(i)]['sourceEnglish'])
def frbody(i):
    x=evidence[sid(i)]['authoredFrenchOptions'][0]['candidateFrench'];x=re.sub(r'^(Rogelio|Kevin)\s*:\s*','',x)
    return x[1:-1].strip() if x.startswith('«') and x.endswith('»') else x
assert a['sourceContextEnglish']==source[sid(1)]['sourceEnglish']
assert a['candidateContextFrench']==evidence[sid(1)]['authoredFrenchOptions'][0]['candidateFrench']
acts=a['activities'];assert [m['mode'] for m in acts]==['see','recall','hear','type','say','write']
namespace=a['lessonId']+':contextual-activity:v1:';ids=[m['id'] for m in acts]
assert len(ids)==len(set(ids))==6 and not set(ids).intersection({x['id'] for x in p['activities']})
for m in acts:
    assert m['id']==namespace+m['mode'] and m['responseLanguage']=='English' and m['meaningSupportLanguage']=='French'
    for key in ('promptEnglish','promptFrench','candidateTargetEnglish','candidateMeaningFrench','explanationEnglish','explanationFrench','referenceTargetProvenance'):assert m[key].strip()
    assert m['sourceAnchors'] and set(m['sourceAnchors'])<=set(source)
    assert m['learnerRoleEnglish']==a['learnerRoleEnglish']
    for key in ('reviewed','scoringEnabled','registered','runtimeRegistered','offlineRegistered','progressRegistered','audioRegistered','listeningReviewed'):assert m[key] is False
    assert m['selectedEnglish'] is m['selectedFrench'] is m['audioScript'] is m['selectedRecording'] is None
see,recall,hear,typed,say,write=acts
assert see['sourceAnchors']==[sid(3),sid(12)]
assert see['sourceDisplayEnglish']==[{'sourceAnchor':sid(i),'text':source[sid(i)]['sourceEnglish']} for i in (3,12)]
for f in see['candidateDisplayMeaningFrench']:
    e=evidence[f['sourceAnchor']]['authoredFrenchOptions'][0];assert f['candidateFrench']==e['candidateFrench'] and f['evidenceId']==e['id']
assert see['candidateTargetEnglish']=='The underlayment comes after the deck, and the ridge cap comes after the ridge vent.'
assert recall['sourceAnchors']==[sid(11)] and recall['candidateTargetEnglish']==body(11)
assert recall['cueFrench']==recall['candidateMeaningFrench']==frbody(11)
assert hear['candidateListeningTextEnglish']==body(5) and hear['listeningTextSourceAnchor']==sid(5)
clause=body(5).split(', because ',1)[1];assert hear['candidateTargetEnglish']==clause[0].upper()+clause[1:]
frclause=frbody(5).split('parce que ',1)[1];assert hear['candidateMeaningFrench']==frclause[0].upper()+frclause[1:]
assert hear['audioRequired'] is True and hear['paidSynthesisStarted'] is hear['technicalAudioValidated'] is False
assert hear['candidateVoice'] is hear['candidateLocale'] is hear['synthesisCostEstimate'] is None
assert 'Text-only unsynthesized' in hear['audioStatus']
assert typed['clozeSourceAnchor']==sid(9) and typed['unmaskedSourceBodyEnglish']==body(9)
assert typed['clozeTextEnglish'].replace('_____',typed['candidateTargetEnglish'])==body(9)
assert typed['candidateTargetEnglish']=="That's why" and typed['candidateMeaningOfWholeLineFrench']==frbody(9)
assert say['sourceAnchors']==[sid(i) for i in range(2,17)]
sequence=say['dialogueSequence'];assert len(sequence)==15 and len({x['id'] for x in sequence})==15
assert [x['sourceAnchor'] for x in sequence]==say['sourceAnchors']
for j,turn in enumerate(sequence):
    i=int(turn['sourceAnchor'].rsplit(':',1)[1]);speaker=source[sid(i)]['sourceEnglish'].split(':',1)[0]
    assert turn['sourceSpeaker']==speaker and turn['speakerRole']==('learner' if speaker=='Rogelio' else 'partner')
    assert turn['id']==say['id']+f':turn:{j+1}' and turn['utteranceEnglish']==body(i)
    assert turn['candidateMeaningFrench']==frbody(i) and turn['frenchEvidenceId']==evidence[sid(i)]['authoredFrenchOptions'][0]['id']
    assert turn['reviewed'] is False and turn['selectedFrench'] is turn['audioScript'] is None
learners=[x for x in sequence if x['speakerRole']=='learner'];partners=[x for x in sequence if x['speakerRole']=='partner']
assert say['candidateTargetEnglish']=='\n'.join(x['utteranceEnglish'] for x in learners)
assert say['candidateMeaningFrench']=='\n'.join(x['candidateMeaningFrench'] for x in learners)
assert say['partnerCueSourceAnchors']==[x['sourceAnchor'] for x in partners]==[sid(7),sid(15)]
assert [x['sourceAnchor'] for x in write['referenceSegments']]==write['sourceAnchors']==[sid(i) for i in (2,3,4,5,6,8,9,10,11,12,13)]
for segment in write['referenceSegments']:
    i=int(segment['sourceAnchor'].rsplit(':',1)[1]);en,fr=body(i),frbody(i)
    if i==8:
        assert segment['kind']=='source-clause-sentence-adaptation' and segment['modification']
        en=en[len('Because '):];en=en[0].upper()+en[1:]
        fr=fr[len('Parce que '):];fr=fr[0].upper()+fr[1:]
    else:assert segment['kind']=='exact-source-utterance-body' and segment['modification'] is None
    assert segment['referenceEnglish']==en and segment['candidateMeaningFrench']==fr
assert write['candidateTargetEnglish']==' '.join(x['referenceEnglish'] for x in write['referenceSegments'])
assert write['candidateMeaningFrench']==' '.join(x['candidateMeaningFrench'] for x in write['referenceSegments'])
assert 'always' in write['candidateTargetEnglish'] and 'never' in write['candidateTargetEnglish'] and 'weak points' in write['candidateTargetEnglish']
assert all(m['englishReferenceVisible'] is False for m in acts if m['mode']!='see')
meta=json.loads((D/'assistance.json').read_text());assert meta['cliCallsAttemptedThisBatch']==0 and meta['newHaikuOpusFableChainClaimed'] is meta['qualifiedReview'] is False
assert meta['independentParentCritiqueStatus']=='pending' and meta['sourceAuditOriginMain']==revision
bundle=json.loads((D/'manifest.json').read_text())
assert bundle['sidecarId']==a['sidecarId'] and bundle['sourceAuditOriginMain']==revision
assert bundle['chosenFrench']==0 and bundle['qualifiedReview'] is False and bundle['sourceOnly'] is True
assert bundle['independentParentCritiqueStatus']=='pending'
assert {x['path'] for x in bundle['files']}=={'activities.json','assistance.json','validate.py','README.md'} and len(bundle['files'])==4
for item in bundle['files']:assert digest((D/item['path']).read_bytes())==item['sha256']
assert bundle['activityCount']==6 and bundle['dialogueTurns']==15 and bundle['uniqueReaderAnchors']==15
print(f'PASS Master1 contextual six-mode v1: 6 bilingual English-target modes, 15 distinct Reader anchors, 15 source dialogue turns; exact quotes/adaptation provenance, 19 prior artifacts preserved, all gates false/null, Hear unsynthesized, zero CLI calls. Parent critique and qualified review pending.')
