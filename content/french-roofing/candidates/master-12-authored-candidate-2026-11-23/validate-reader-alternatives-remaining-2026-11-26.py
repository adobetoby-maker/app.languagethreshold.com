import pathlib,json,hashlib,subprocess
D=pathlib.Path(__file__).resolve().parent;R=D.parents[3];a=json.loads((D/'reader-alternatives-remaining-2026-11-26.json').read_text());f=R/a['canonicalCandidatePath'];p=json.loads(f.read_text());sf=R/a['sourcePacket']['path'];s=json.loads(sf.read_text())
assert hashlib.sha256(f.read_bytes()).hexdigest()==a['canonicalCandidateSha256']
assert f.read_bytes()==subprocess.check_output(['git','show',a['originMain']+':'+a['canonicalCandidatePath']],cwd=R)
assert hashlib.sha256(sf.read_bytes()).hexdigest()==a['sourcePacket']['sha256'] and a['sourcePacket']==p['sourcePacket']
for path,sha in s['sourceFileSha256'].items():assert hashlib.sha256((R/path).read_bytes()).hexdigest()==sha,path
assert a['lessonId']==p['lessonId'] and a['sourceObjectiveEnglish']==p['sourceObjectiveEnglish'] and a['sourceSpeakingEnglish']==p['sourceSpeakingEnglish']
assert a['gates']==p['gates'] and all(v is False for v in a['gates'].values())
for k in ('reviewed','scoringEnabled','registered','audioRegistered','listeningReviewed','offlineRegistered','progressMigrationApproved','sourceMissionCompletionClaim'):assert a[k] is False
assert a['selectedFrench'] is a['audioScript'] is None
ids=[]
for row in a['rows']:
 src=next(x for x in s['reader'] if x['id']==row['sourceAnchor']);canonical=next(x for x in p['candidateRows'] if x['sourceAnchor']==row['sourceAnchor'])
 assert row['sourceEnglish']==src['sourceEnglish'] and row['sourceSpanish']==src['sourceSpanish'] and row['legacySourceRef']==src['legacySourceRef']
 assert row['candidateRowId']==canonical['id'] and canonical['candidateFrench'] is None and row['originalCandidateHold']==canonical['hold'] and canonical['hold']
 assert row['reviewed'] is row['scoringEnabled'] is row['holdResolved'] is False and row['selectedFrench'] is row['audioScript'] is None
 for q in row['sourceDecisionQuestions']:
  i=q['ordinal1Based']-1;assert q['jsonPointer']=='/sourceDecisionQuestions/'+str(i) and q['question']==s['sourceDecisionQuestions'][i]['question'] and row['sourceAnchor'] in s['sourceDecisionQuestions'][i]['affectedIds']
 for v in row['alternatives']:
  ids.append(v['id']);assert v['id'].startswith(a['lessonId']+':reader-remaining-alternative:'+row['sourceAnchor'].rsplit(':',1)[1]+':')
  assert v['reviewed'] is v['scoringEnabled'] is False and v['selectedFrench'] is v['audioScript'] is None
  assert v['candidateFrench'] and not v['candidateFrench'].strip().endswith(':')
  if row['sourceEnglish'].startswith('Rogelio:'):assert v['candidateFrench'].startswith('Rogelio : ')
  assert not any(x in v['candidateFrench'].lower() for x in ("n'hésitez","n’hésite","n'hésite","deux tuiles"))
assert len(ids)==len(set(ids)) and not set(ids).intersection({x['id'] for x in p['candidateRows']})
print('PASS',a['lessonId'],len(a['rows']),'missing Reader anchors,',len(ids),'complete unselected French alternatives; original canonical/source/holds/IDs/gates unchanged')

coverage=a['coverage'];readers=[r for r in p['candidateRows'] if ':reader:' in r['sourceAnchor']]
assert coverage['canonicalReaderTotal']==len(readers)
assert coverage['canonicalFrenchProposedBefore']==coverage['canonicalFrenchProposedAfter']==sum(bool(r['candidateFrench']) for r in readers)
assert coverage['canonicalRowsPromoted']==0 and coverage['supplementalAnchorCount']==len(a['rows'])
assert coverage['supplementalAnchors']==[r['sourceAnchor'] for r in a['rows']]
assert coverage['supplementalFullFaceAlternativeCount']==sum(len(r['alternatives']) for r in a['rows'])
for row in a['rows']:
 for variant in row['alternatives']:
  if row['sourceEnglish'].startswith('Kevin:'):assert variant['candidateFrench'].startswith('Kevin : ')
  if row['sourceEnglish'].startswith('Supplier:'):assert variant['candidateFrench'].startswith(('Le fournisseur : ','Fournisseur : '))
 for q in row.get('inferredSourceDecisionQuestions',[]):
  i=q['ordinal1Based']-1
  assert q['jsonPointer']=='/sourceDecisionQuestions/'+str(i) and q['question']==s['sourceDecisionQuestions'][i]['question']
  assert row['sourceAnchor'] not in s['sourceDecisionQuestions'][i]['affectedIds']

def normalize_archive(v):return ' '.join(v.replace("'",'’').split()) if v else None
for row in a['rows']:
 src=next(r for r in s['reader'] if r['id']==row['sourceAnchor'])
 assert row['archivedFrenchEvidence']==src.get('archivedFrenchEvidence')
 for variant in row['alternatives']:
  assert variant['matchesArchivedFrenchAfterWhitespaceApostropheNormalization']==(normalize_archive(variant['candidateFrench'])==normalize_archive(src.get('archivedFrenchEvidence')))
 if 'candidateSourceHoldDifference' in row:
  assert row['candidateSourceHoldDifference']['sourceSafetyOrMeaningHold']==src['safetyOrMeaningHold']
  assert row['candidateSourceHoldDifference']['sourceConditionalFrenchPresent']==bool(src.get('conditionalFrench'))

for row in a['rows']:
 for variant in row['alternatives']:
  if row['sourceEnglish'].startswith('Julio:'):assert variant['candidateFrench'].startswith('Julio : ')
  if row['sourceEnglish'].startswith('Mrs. Flores:'):assert variant['candidateFrench'].startswith(('Mme Flores : ','Madame Flores : '))
  if row['sourceEnglish'].startswith('Adjuster:'):assert variant['candidateFrench'].startswith(('L’expert : ',"L'expert : ",'Expert : '))
 if 'sourceLanguageMeaningDifference' in row:
  assert row['sourceLanguageMeaningDifference']['exactEnglish']==row['sourceEnglish'] and row['sourceLanguageMeaningDifference']['exactSpanish']==row['sourceSpanish']
  assert row['sourceLanguageMeaningDifference']['status']=='open'

assert a['sourceLanguageObjectiveIssue']['status']=='open'
assert set(a['sourceLanguageObjectiveIssue']['sourceRowsWithSpanishRegisterTerms']) <= {r['id'] for r in s['reader']}

for row in a['rows']:
 if row['sourceAnchor'].endswith(':reader:12'):
  for variant in row['alternatives']:assert all(term in variant['candidateFrench'] for term in ('Quisiera','me gustaría','podría'))
 if row['sourceAnchor'].endswith(':reader:14'):
  for variant in row['alternatives']:assert 'usted' in variant['candidateFrench'] and 'tú' in variant['candidateFrench']
for rel,sha in a['priorArtifactSha256'].items():
 assert hashlib.sha256((R/rel).read_bytes()).hexdigest()==sha,rel
 assert (R/rel).read_bytes()==subprocess.check_output(['git','show',a['originMain']+':'+rel],cwd=R),rel
u=a['distinctCoverageUnion'];canonical={r['sourceAnchor'] for r in p['candidateRows'] if ':reader:' in r['sourceAnchor'] and r['candidateFrench']};prior=set()
for rel in a['priorArtifactSha256']:
 q=pathlib.Path(rel)
 if q.name.startswith('reader-alternatives-') and q.suffix=='.json' and 'ai-assistance' not in q.name:prior.update(r['sourceAnchor'] for r in json.loads((R/rel).read_text())['rows'])
new={r['sourceAnchor'] for r in a['rows']};allids={r['id'] for r in s['reader']}
assert not new.intersection(canonical|prior)
assert set(u['canonicalAnchors'])==canonical and set(u['priorSidecarAnchors'])==prior and set(u['newSidecarAnchors'])==new
assert u['coveredBeforeCount']==len(canonical|prior) and u['coveredAfterCount']==len(canonical|prior|new)==len(allids)==u['sourceReaderTotal']
assert u['actualRemainingReaderAnchors']==a['remainingMissingReaderAnchorsWithoutThisSupplement']==[]


meta=json.loads((D/'reader-alternatives-remaining-ai-assistance-2026-11-26.json').read_text())
assert meta['cliCallsAttemptedThisBatch']==0 and meta['qualifiedReview'] is False
assert meta['haikuAuthoringPerformedThisBatch'] is meta['opusCritiquePerformedThisBatch'] is meta['fableCorrectionPerformedThisBatch'] is False
for row in a['rows']:
 anchor=row['sourceAnchor'];text=row['alternatives'][0]['candidateFrench']
 if anchor=='master-roofing:10:fr-en:reader:11':assert text.startswith('Le patron :') and 'était' in text
 if anchor=='master-roofing:10:fr-en:reader:13':assert text.startswith('Rogelio a réuni') and 'solutions' in text and 'rien' in text
 if anchor=='master-roofing:10:fr-en:reader:14':assert 'chaque' in text and 'photo' in text and 'dernier' in text
 if anchor=='master-roofing:10:fr-en:reader:15':assert 'Julio' in text and 'nord' in text and 'Marcos' in text and 'sud' in text
 if anchor=='master-roofing:11:fr-en:reader:8':assert 'Chaque heure' in text and 'eau' in text and 'ombre' in text and 'personne' in text
 if anchor=='master-roofing:11:fr-en:reader:10':assert 'étourdissements' in text and 'tout de suite' in text
 if anchor=='master-roofing:11:fr-en:reader:13':assert 'sans risques' in text and 'chacun' in text
 if anchor=='master-roofing:11:fr-en:reader:16':assert text.startswith('Dans l’après-midi, Rogelio a appelé') and 'vendredi' in text
 if anchor=='master-roofing:12:fr-en:reader:4':assert 'je dis' in text and 'bois pourri' in text and 'monte' in text
 if anchor=='master-roofing:12:fr-en:reader:11':assert 'je dirais' in text and 'J’aimerais' in text and 'nous le recouvrions' in text
 for term in row.get('spanishMetalinguisticTerms',[]):assert term in row['sourceEnglish'] and term in text
 if anchor=='master-roofing:12:fr-en:reader:16':assert 'usted' in text and 'n’offense personne' in text and row['culturalClaimIssue']['status']=='open'
