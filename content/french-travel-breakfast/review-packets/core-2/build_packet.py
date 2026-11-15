import json, re, hashlib, pathlib, subprocess
P=pathlib.Path(__file__).parent
x=json.load(open(P/'input.json')); src=x['source']; old=x['privateDraft']; acts=x['privateActivities']; raw=json.load(open(P/'fable-output.json')); assert not raw['is_error']
s=raw['result'].strip();s=re.sub(r'^```json\s*|\s*```$','',s)
f=json.loads(s)
# Source-grounded self-correction: French idiom for the source's 'takes a table'.
f['frenchReader'][7]="Elle prend place à une table et boit son café."
f['verbForms'][2]['exampleFrench']=f['frenchReader'][7]
f['verbForms'][2]['meaningEnglish']='to take / to drink'
assert len(src['words'])==len(f['frenchCards'])==18
assert len(src['passage']['native'])==len(f['frenchReader'])==8
assert len(f['modes'])==6
cards=[{'id':f'core:2:word:{i+1}','french':v,'english':w['en'],'sourceSpanish':w['es'],'kind':w['kind']} for i,(v,w) in enumerate(zip(f['frenchCards'],src['words']))]
reader=[{'id':f'core:2:line:{i+1}','french':v,'english':w,'sourceSpanish':src['passage']['target'][i]} for i,(v,w) in enumerate(zip(f['frenchReader'],src['passage']['native']))]
for a in f['modes']:
 ref=a['sourceRef'].split(':'); i=int(ref[-1])-1
 match=cards[i] if ref[-2]=='word' else reader[i]
 assert (a['modelFrench'],a['modelEnglish'])==(match['french'],match['english']),a
 assert a['readyForLearner'] is False
 assert a['id'] in [v['id'] for v in acts]
sourceBytes=subprocess.check_output(['git','-C','/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13','show','origin/main:public/lesson-content/es/travel-breakfast.json'])
assert hashlib.sha256(sourceBytes).hexdigest()==x['currentSourceSHA256']
packet={'schema':1,'purpose':'private source-pinned owner-review candidate, not registered','moduleId':'travel-breakfast','targetLanguage':'French','nativeLanguage':'English','stage':'core','lessonKey':'core:2','source':{'path':'public/lesson-content/es/travel-breakfast.json','sha256':hashlib.sha256(sourceBytes).hexdigest(),'originMainAtAudit':x['originMain'],'lessonNumber':2,'privateDraftPR':475},'titleEnglish':old['titleEnglish'],'objectiveEnglish':old['objectiveEnglish'],'focusFrench':old['focusFrench'],'cards':cards,'reader':reader,'verbForms':f['verbForms'],'forms':f['forms'],'modes':f['modes'],'speaking':{'modelFrench':f['speakingFrench'],'objectivesEnglish':f['speakingObjectives']},'reviewState':{'reviewed':False,'registered':False,'audioRegistered':False,'listeningReviewed':False,'qualifiedApproval':False,'learnerReady':False},'internalNotes':f['internalDomainNotes']+['Self-check changed awkward “Elle prend une table” to “Elle prend place à une table” and aligned the prendre verb example. Source card 1/Reader 3 café americano vs French café noir remains a semantic blocker for qualified French/locale review. Older PR #475 full-file source SHA is stale, but current Core 2 English words/Reader exactly match the private draft.'],'unresolved':[v for v in f['unresolved'] if not v.startswith('Source SHA256 and originMain were not')]}
json.dump(packet,open(P/'candidate.json','w'),ensure_ascii=False,indent=2)
print('PASS 18 cards, 8 Reader, 6 mode pairs, false gates, current main source pin')
