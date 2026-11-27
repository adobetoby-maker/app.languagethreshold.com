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
 text=row['alternatives'][0]['candidateFrench'].lower();anchor=row['sourceAnchor']
 if anchor=='master-roofing:13:fr-en:reader:2':assert '8 pieds' in text and 'environ' in text
 if anchor=='master-roofing:13:fr-en:reader:4':assert '911' in text and 'tout de suite' in text and '112' not in text
 if anchor=='master-roofing:13:fr-en:reader:15':assert text.startswith('cause probable') and 'ni' in text and 'ligne de vie' in text and 'ancrage' in text
 if anchor=='master-roofing:14:fr-en:reader:9':assert '60 livres' in text and 'marque' in text and 'tuer' in text
 if anchor=='master-roofing:15:fr-en:reader:10':assert text.count('s’il tonne')+text.count("s'il tonne")==2 and 'éclairs' in text and 'maintenant' in text
 if anchor=='master-roofing:15:fr-en:reader:16':assert 'la propriétaire' in text and 'couvert' in text
 assert not any(z in text for z in ('(lanyard)','(lifeline)','(roof bracket)','(pickup)'))
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
 if anchor=='master-roofing:13:fr-en:reader:1':assert 'Mardi' in text and 'dix heures et quart' in text and 'bord du toit' in text and 'coulissante' in text
 if anchor=='master-roofing:13:fr-en:reader:6':assert 'en route' in text and 'ne bouge pas' in text
 if anchor=='master-roofing:13:fr-en:reader:8':assert 'Kevin' in text and 'premiers soins de base' in text and 'Marcos' in text and 'ruban' in text
 if anchor=='master-roofing:13:fr-en:reader:9':assert 'paramédicaux' in text and 'dix heures et demie' in text and 'blessé' in text and 'hôpital' in text
 if anchor=='master-roofing:13:fr-en:reader:10':assert text.startswith('Ensuite, Rogelio a appelé le superviseur') and 'accident' in text and 'en route' in text
 if anchor=='master-roofing:13:fr-en:reader:11':assert text.startswith('Le superviseur :') and 'exactement' in text
 if anchor=='master-roofing:13:fr-en:reader:12':assert 'ne connais pas' in text and 'dix heures quinze' in text and 'dix heures vingt' in text
 if anchor=='master-roofing:13:fr-en:reader:13':assert 'rapport d’incident' in text and 'environ 10 h 15' in text
 if anchor=='master-roofing:13:fr-en:reader:16':assert 'toute l’équipe' in text and 'sans être déconnecté' in text
 if anchor=='master-roofing:14:fr-en:reader:2':assert 'deux pas' in text and 'voisin' in text and 'chien' in text
 if anchor=='master-roofing:14:fr-en:reader:3':assert 'Personne' in text and 'blessure' in text and 'tout le monde' in text
 if anchor=='master-roofing:14:fr-en:reader:7':assert 'mon pote' in text
 if anchor=='master-roofing:14:fr-en:reader:16':assert 'Marcos a proposé' in text and 'cônes' in text and 'panneau' in text and 'trottoir' in text and 'montée des matériaux' in text
 if anchor=='master-roofing:14:fr-en:reader:17':assert 'toute l’entreprise' in text
 if anchor=='master-roofing:15:fr-en:reader:1':assert 'une heure et demie' in text and 'environ 20 miles' in text and 'km' not in text
 if anchor=='master-roofing:15:fr-en:reader:7':assert 'Kevin et Julio' in text and 'partie ouverte' in text and 'maintenant' in text
 if anchor=='master-roofing:15:fr-en:reader:9':assert 'Marcos' in text and 'au sol' in text and 'rafale peut' in text
 if anchor=='master-roofing:15:fr-en:reader:11':assert 'deux heures moins dix' in text and 'premier coup de tonnerre' in text
 if anchor=='master-roofing:15:fr-en:reader:12':assert 'par radio' in text and 'tout le monde en bas, maintenant' in text
 if anchor=='master-roofing:15:fr-en:reader:13':assert text.startswith('Julio :') and 'je descends' in text and 'est fixée' in text
 if anchor=='master-roofing:15:fr-en:reader:15':assert 'deux heures précises' in text and 'à verse' in text and 'beaucoup de vent' in text
 if anchor=='master-roofing:15:fr-en:reader:17':assert 'Si le soleil' in text and 'demain' in text and 'sept heures' in text and 'bardeaux' in text
