import json,hashlib
from pathlib import Path
h=Path(__file__).resolve().parent;r=h.parents[3];p=json.loads((h/'candidate.json').read_text());s=p['sourceReview'];assert hashlib.sha256((r/s['path']).read_bytes()).hexdigest()==s['sha256'];old=json.loads((r/s['path']).read_text());rows={x['id']:x for x in old['cards']+old['reader']};assert p['pair']=={'target':'English','native':'Japanese'};assert {a['mode'] for a in p['activities']}=={'see','recall','hear','type','say','write'}
for a in p['activities']:
 assert a['targetEnglish'] == rows[a['sourceAnchor']]['sourceEnglish'];assert a['promptJapanese'];assert a['selectedJapanese'] is a['audioScript'] is None and a['reviewed'] is False
for a in p['forms']+p['dictionary']:assert a['sourceAnchor'] in rows and a['reviewed'] is False
assert len(p['forms'])==len(p['dictionary'])==3;assert all(v is False for v in p['gates'].values());assert p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is False
print('PASS contextual candidate source anchors, six activities, forms/dictionary and closed gates')

for pin in p['source'].values():
 assert hashlib.sha256((r/pin['path']).read_bytes()).hexdigest()==pin['sha256'],pin['path']
all_items=p['activities']+p['forms']+p['dictionary']+[p['speaking']]
ids=[x['id'] for x in all_items]
assert len(ids)==len(set(ids)) and all(x.startswith(p['lessonId']+':') for x in ids)
assert p['speaking']['reviewed'] is False
assert all(a in rows for a in p['speaking']['sourceAnchors'])
assert p['speaking']['roles']['learner'] and p['speaking']['roles']['partner']
assert p['speaking']['openingEnglish'] and p['speaking']['closureEnglish']
assert len(p['speaking']['objectivesEnglish'])==3
for a in p['activities']:
 assert a['hearScriptCandidateEnglish']==(a['targetEnglish'] if a['mode']=='hear' else None)
for a in p['forms']:
 assert a['exampleEnglish'].lower() in rows[a['sourceAnchor']]['sourceEnglish'].lower()
 assert a['explanationJapanese']
for a in p['dictionary']:assert a['headEnglish'] and a['glossJapanese'] and a['senseJapanese']
print('PASS upstream hashes, unique IDs, exact activity targets, form examples, speaking anchors and Hear candidates')

hear=next(a for a in p["activities"] if a["mode"]=="hear")
assert len(set(hear["candidateOptionsEnglish"]))==3 and hear["targetEnglish"] in hear["candidateOptionsEnglish"]

assert p['kind']=='inert-contextual-candidate' and p['schema']==1
assert p['source']==old['source']
assert len({a['targetEnglish'] for a in p['activities']})==6
assert all(a['id']==p['lessonId']+':activity:'+a['mode'] for a in p['activities'])
assert set(p['gates'])=={'qualifiedJapanese','qualifiedRoofing','qualifiedDictionary','learnerRuntime','scoring','audioRegistered','listeningReviewed','offline','savedProgress','browser','v4'}
assert json.loads((h/'ai-assistance-metadata.json').read_text())['qualifiedApproval'] is False
