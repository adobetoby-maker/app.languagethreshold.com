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

for row in a['rows']:
 anchor=row['sourceAnchor'];text=row['alternatives'][0]['candidateFrench'].lower()
 if anchor=='master-roofing:16:fr-en:reader:11':assert 'deux rangs' in text and 'garage' in text
 if anchor=='master-roofing:16:fr-en:reader:15':assert 'si' in text and 'confirmée' in text
 if anchor=='master-roofing:17:fr-en:reader:5':assert '7 h 00' in text and '15 h 30' in text and 'cinq' in text
 if anchor=='master-roofing:17:fr-en:reader:6':assert '14' in text and 'est' in text and 'noue' in text
 if anchor in ('master-roofing:17:fr-en:reader:7','master-roofing:17:fr-en:reader:8'):assert 'pourri' in text
 if anchor=='master-roofing:17:fr-en:reader:11':assert '15' in text and text.count('3 ')==2
 if anchor=='master-roofing:18:fr-en:reader:5':assert 'à huit heures' in text and 'vers huit' not in text and 'mercredi' in text
 if anchor=='master-roofing:18:fr-en:reader:13':assert 'serait' in text and 'vendredi' in text
 if anchor=='master-roofing:18:fr-en:reader:15':assert 'confirme' in text and '8 h 00' in text and 'à l’avance' in text and 'si' in text
# Per-sidecar gap arithmetic replaced by full canonical/prior/new union assertions below.
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
 if anchor=='master-roofing:16:fr-en:reader:1':assert 'onze heures' in text and 'M. Wong' in text and 'côté sud' in text
 if anchor=='master-roofing:16:fr-en:reader:2':assert text.startswith('Rogelio est descendu du toit et l’a salué :') and 'permis' in text
 if anchor=='master-roofing:16:fr-en:reader:4':assert text.startswith('L’inspecteur :') and 'fixation' in text and 'solins' in text
 if anchor=='master-roofing:16:fr-en:reader:5':assert 'Aimeriez-vous' in text and 'préféreriez-vous' in text and 'photos' in text
 if anchor=='master-roofing:16:fr-en:reader:6':assert 'préférerais' in text and 'cloués' in text
 if anchor=='master-roofing:16:fr-en:reader:8':assert 'Chaque rang' in text and 'rapport du jour' in text
 if anchor=='master-roofing:16:fr-en:reader:12':assert 'Pourriez-vous' in text and 'exactement' in text and 'exigence' in text
 if anchor=='master-roofing:16:fr-en:reader:14':assert 'aujourd’hui' in text and 'demanderons' in text and 'réinspection' in text and 'site web de la ville' in text
 if anchor=='master-roofing:16:fr-en:reader:16':assert text.startswith('À la fin, Rogelio a dit à Kevin :') and 'si tu vois' in text
 if anchor=='master-roofing:17:fr-en:reader:2':assert text.startswith('D’abord, il a envoyé un message à Kevin :') and 'contreplaqué' in text
 if anchor=='master-roofing:17:fr-en:reader:3':assert 'plus formel que' in text
 if anchor=='master-roofing:17:fr-en:reader:4':assert '14 octobre' in text and '418 Pine Street' in text and 'Ortega' in text
 if anchor=='master-roofing:17:fr-en:reader:9':assert 'De même' in text and 'noue' in text and 'autour' in text
 if anchor=='master-roofing:17:fr-en:reader:12':assert 'ouest' in text and 'reste à faire' in text and 'encore nettoyer' in text
 if anchor=='master-roofing:17:fr-en:reader:13':assert 'demain après-midi' in text and 'par conséquent' in text and 'six heures trente du matin' in text
 if anchor=='master-roofing:17:fr-en:reader:15':assert text=='Rogelio Mendoza, chef d’équipe.'
 if anchor=='master-roofing:17:fr-en:reader:16':assert 'Avant de l’envoyer' in text and 'relu' in text and 'deux nombres' in text and row['sourceNumericalCorrectionIssue']['earlierSourceValuesChanged'] is False
 if anchor=='master-roofing:18:fr-en:reader:1':assert 'Mardi' in text and 'toute la journée' in text and 'Mme Kim' in text
 if anchor=='master-roofing:18:fr-en:reader:2':assert 'cinq heures' in text and 'message texte' in text
 if anchor in ('master-roofing:18:fr-en:reader:3','master-roofing:18:fr-en:reader:8'):assert 'Mendoza Roofing' in text
 if anchor=='master-roofing:18:fr-en:reader:7':assert 'Une heure plus tard' in text and 'ne connaissait pas' in text
 if anchor=='master-roofing:18:fr-en:reader:10':assert 'Ne vous inquiétez pas' in text and 'seraient' in text and 'vendredi' in text
 if anchor=='master-roofing:18:fr-en:reader:11':assert 'M. Kim' in text and 'vendredi' in text.lower() and 'entends pas bien' in text
 if anchor=='master-roofing:18:fr-en:reader:14':assert 'mon numéro' in text and 'au cas où' in text and 'enverrai' in text
 if anchor=='master-roofing:18:fr-en:reader:16':assert text.startswith('M. Kim a répondu :') and 'rendez-vous est confirmé' in text
