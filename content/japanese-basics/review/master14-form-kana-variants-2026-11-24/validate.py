#!/usr/bin/env python3
import json,hashlib,subprocess,sys
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'alternatives.json').read_text());pin=p['source']['mainMaster'];assert hashlib.sha256((root/pin['path']).read_bytes()).hexdigest()==pin['sha256'];lesson=json.loads((root/pin['path']).read_text())['lessons'][13];ids=[]
assert p['pair']=={'target':'Japanese','native':'English'} and p['moduleId']=='master-japanese-basics' and p['lessonNumber']==14
assert len(p['rows'])==2 and [r['mainDialogueTurnOneBased'] for r in p['rows']]==[4,9] and [r['privateRoutineDialogueTurnOneBased'] for r in p['rows']]==[10,14]
for r in p['rows']:
 ja,en=lesson['dialogue'][r['mainDialogueTurnOneBased']-1].split('|');assert (r['canonicalJapanese'],r['canonicalEnglish'])==(ja,en);assert r['privateCanonicalPromptEvidence']['id']==r['sourcePromptId'];assert r['privateCanonicalPromptEvidence']['japaneseAnswer']==ja and r['privateCanonicalPromptEvidence']['englishPrompt']==en
 assert r['selectedJapanese'] is r['audioScript'] is None and r['reviewed'] is False;ids.append(r['id'])
 assert len(r['alternatives'])==2
 for a in r['alternatives']:
  text=a['candidateJapanese']
  if a['kind']=='mixed-script':
   assert a['readingMappings']
   for m in sorted(a['readingMappings'],key=lambda x:len(x['surface']),reverse=True):assert m['surface'] in text;text=text.replace(m['surface'],m['readingKana'])
  else:assert a['kind']=='unspaced-kana'
  assert text.replace(' ','')==ja.replace(' ','')
  assert a['selectedJapanese'] is a['audioScript'] is None and a['reviewed'] is False;ids.append(a['id'])
assert len(ids)==len(set(ids))==6
assert p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is False and p['authoredGrammarErrorClaimed'] is False and all(v is False for v in p['gates'].values())
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
for role,model in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[role]['safeMode'] is True and model in m[role]['actualModelUsage'] and m[role]['isError'] is False
print('PASS main source hash/2exact Japanese-English faces;4unselected spelling variants/explicit kana readings/6unique IDs;nulls/closed gates/actual CLI metadata')
if '--private-pr' in sys.argv:
 blobs={}
 for key,pin in p['privateSource'].items():
  b=subprocess.run(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root,capture_output=True,check=True).stdout;assert hashlib.sha256(b).hexdigest()==pin['sha256'];blobs[key]=b
 prompts=next(x for x in json.loads(blobs['forms'])['lessons'] if x['lesson']==14)['prompts'];routine=json.loads(blobs['routineMaster'])['lessons'][13]
 for r in p['rows']:
  f=next(x for x in prompts if x['id']==r['sourcePromptId']);assert f==r['privateCanonicalPromptEvidence'];assert routine['dialogue'][r['privateRoutineDialogueTurnOneBased']-1]==r['canonicalJapanese']+'|'+r['canonicalEnglish']
 assert 'variant !== line.target' in blobs['bridge'].decode() and 'h-long-vowels' in blobs['bridge'].decode()
 assert any('さいごに' in x for x in json.loads(blobs['extensions'])['14'])
 print('PASS4immutable fetched#488 private-source blobs/form IDs/Reader positions/exact-only bridge/finally extension;no missing-marker error claimed')
else:print('Private PR source hashes are recorded; use --private-pr with fetched immutable revision to reverify those blobs. Main-source validation above does not claim private-source execution.')
