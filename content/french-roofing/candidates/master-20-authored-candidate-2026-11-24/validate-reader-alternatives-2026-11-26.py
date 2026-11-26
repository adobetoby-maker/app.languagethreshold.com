import pathlib,json,hashlib,subprocess
D=pathlib.Path(__file__).resolve().parent;R=D.parents[3];a=json.loads((D/'reader-alternatives-2026-11-26.json').read_text());f=R/a['canonicalCandidatePath'];p=json.loads(f.read_text());sf=R/a['sourcePacket']['path'];s=json.loads(sf.read_text())
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
  ids.append(v['id']);assert v['id'].startswith(a['lessonId']+':reader-alternative:'+row['sourceAnchor'].rsplit(':',1)[1]+':')
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

assert len(a['rows'])==len(s['reader']) and {r['sourceAnchor'] for r in a['rows']}=={r['id'] for r in s['reader']}
assert a['remainingMissingReaderAnchorsWithoutThisSupplement']==[]
for row in a['rows']:
 anchor=row['sourceAnchor'];text=row['alternatives'][0]['candidateFrench'].lower()
 if anchor=='master-roofing:19:fr-en:reader:3':assert 'deux fois' in text and 'si' in text
 if anchor=='master-roofing:19:fr-en:reader:7':assert 'couvrirait' in text and 'certificat' in text
 if anchor=='master-roofing:19:fr-en:reader:8':assert 'sans' in text and not any(z in text for z in ('autorisation','permission','accord préalable'))
 if anchor=='master-roofing:19:fr-en:reader:9':assert 'pourrait' in text and 'exclusion' in text
 if anchor=='master-roofing:19:fr-en:reader:10':assert 'assurance' in text and 'à moins' in text and 'défaut' in text
 if anchor=='master-roofing:19:fr-en:reader:11':assert 'cette semaine' in text and 'ligne' in text
 if anchor=='master-roofing:19:fr-en:reader:15':assert 'suffirait' in text and 'deux fois' in text and 'sol' in text
 if anchor=='master-roofing:20:fr-en:reader:5':assert 'serait' in text and 'ouest' in text and 'nord' in text
 if anchor in ('master-roofing:20:fr-en:reader:6','master-roofing:20:fr-en:reader:7'):assert 'pourri' in text
 if anchor=='master-roofing:20:fr-en:reader:9':assert 'ligne de vie' in text and 'mouillé' in text
 if anchor=='master-roofing:20:fr-en:reader:10':assert 'cinq minutes' in text
 if anchor=='master-roofing:20:fr-en:reader:11':assert 'aurait pu' in text and 'grave' in text
 if anchor=='master-roofing:20:fr-en:reader:13':assert 'kevin et julio' in text and 'nord' in text and 'marcos' in text
 if anchor=='master-roofing:20:fr-en:reader:15':assert 'deux' in text and 'quatre' in text and 'réparées' in text and 'remplacés' in text and 'a écrit' in text

for row in a['rows']:
 text=row['alternatives'][0]['candidateFrench']
 if row['sourceAnchor']=='master-roofing:20:fr-en:reader:7':assert text.startswith('Rogelio au propriétaire :') and 'Monsieur' in text and 'jour de plus' in text
 if row['sourceAnchor']=='master-roofing:20:fr-en:reader:18':assert text.startswith('Rogelio à l’équipe :') and 'demain' in text
 if row['sourceAnchor']=='master-roofing:19:fr-en:reader:5':assert text.startswith('Mme Novak :') and 'hiver prochain' in text
 if row['sourceAnchor']=='master-roofing:19:fr-en:reader:14':assert 'quelques jours' in text and not any(w in text.lower() for w in ('résolue','réglée','indemnisée'))
assert a['sourceLanguageObjectiveIssue']['status']=='open'
