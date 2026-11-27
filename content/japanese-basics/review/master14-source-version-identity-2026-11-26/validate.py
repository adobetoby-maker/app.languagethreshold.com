import json,hashlib,subprocess
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'mapping.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
allids=[]
for name,pins in p['sourcePins'].items():
 d={x['path']:json.loads(raw(x)) for x in pins};lesson=d['content/japanese-basics/master.json']['lessons'][13];ext=d['content/japanese-basics/master-extensions.json']['14'];cards=d['src/data/core60/ja/master-japanese-basics.json']['lessons'][13]['words'];v=p['versions'][name]
 expected=hashlib.sha256(json.dumps({'lesson':lesson,'extension':ext,'cards':cards},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();assert v['versionSha256']==expected
 assert [r['exactFace'] for r in v['readerRows']]==lesson['dialogue']+ext
 assert [r['exactValue'] for r in v['cardRows']]==cards
 allids.append(v['proposedVersionedReaderId'])
 for i,r in enumerate(v['readerRows']):
  assert r['indexZeroBased']==i and r['existingRuntimeId'] is None;assert expected[:20] in r['proposedVersionedReaderFaceId'];allids.append(r['proposedVersionedReaderFaceId'])
 for i,r in enumerate(v['cardRows']):assert r['indexZeroBased']==i and r['existingRuntimeSavedCardId'] is None;allids.append(r['proposedVersionedCardId'])
 # Source material in the reused worktree remains unchanged wherever that source matches its pinned main blob.
 if name=='mainDelayedMeeting':
  for pin in pins:
   if pin['path'].endswith('master.json') or pin['path'].endswith('master-extensions.json'):assert (root/pin['path']).read_bytes()==raw(pin)
a=p['versions']['mainDelayedMeeting'];b=p['versions']['privateRoutine'];assert len(a['readerRows'])==13 and len(b['readerRows'])==18 and len(a['cardRows'])==len(b['cardRows'])==18
assert len(allids)==len(set(allids))==69
assert len(p['readerIndexCollisions'])==13
for i,r in enumerate(p['readerIndexCollisions']):assert r['indexZeroBased']==i and r['mainFace']==a['readerRows'][i]['exactFace'] and r['privateFace']==b['readerRows'][i]['exactFace'] and r['mainFace']!=r['privateFace'] and r['relationship']=='different-bilingual-face; automatic-index-remap-forbidden'
assert p['privateReaderRowsBeyondMainLength']==[13,14,15,16,17]
expected=[{'mainIndexZeroBased':x['indexZeroBased'],'privateIndexZeroBased':y['indexZeroBased'],'face':x['exactFace'],'adopted':False} for x in a['readerRows'] for y in b['readerRows'] if x['exactFace']==y['exactFace']];assert p['exactReaderFaceCrossVersionLinks']==expected and len(expected)==8
expected=[{'mainIndexZeroBased':x['indexZeroBased'],'privateIndexZeroBased':y['indexZeroBased'],'adopted':False} for x in a['cardRows'] for y in b['cardRows'] if x['exactValue']==y['exactValue']];assert p['exactCardFaceCrossVersionLinks']==expected
prior=json.loads(raw(p['priorSixModePin']));assert p['progressEvidence']==prior['progressPolicy'];assert len(p['modeMappings'])==6
for m,t in zip(p['modeMappings'],prior['activities']):
 i=t['readerReference']['privateReaderIndexZeroBased'];assert m['preservedActivityId']==t['id'] and m['preservedCanonicalFormIds']==t['matchingCanonicalFormIds'] and m['proposedVersionedReaderFaceId']==b['readerRows'][i]['proposedVersionedReaderFaceId'] and b['readerRows'][i]['exactFace']==t['targetJapanese']+'|'+t['targetEnglish'] and m['adopted'] is False
adapters=[raw(x).decode() for x in p['identityAdapterPins']];assert 'context.enrollmentId ?? null' in adapters[0] and 'log?.lessons[String(n)]' in adapters[1] and '`${moduleId}:${entry.id}`' in adapters[2]
assert p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is False and all(v is False for v in p['gates'].values()) and p['migrationPlanSelected'] is False and p['independentParentCritiquePending'] is True
metadata=json.loads((h/'metadata.json').read_text());assert metadata['newModelCalls']==0 and metadata['qualifiedApproval'] is False
print('PASS: 13 main/18 private Reader faces; all 13 same-index faces differ; 8 exact cross-index faces; 36 card rows; 69 distinct review-only versioned IDs; 6 preserved mode/form links; immutable pins and false gates; no source or saved-item changes.')
