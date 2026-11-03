"""Derive app assets from the authored Spanish sound-course source. No network or model calls."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
BASE='sound-like-a-native'
rows=json.loads((ROOT/f'content/{BASE}/lessons.json').read_text())
families=json.loads((ROOT/f'content/{BASE}/families.json').read_text())
(ROOT/'src/data/sound-families.json').write_text(json.dumps(families,ensure_ascii=False,indent=2)+'\n')
practice={}
for stage,count in [('foundation',10),('core',30),('master',20)]:
 selected=[r for r in rows if r['stage']==stage]
 assert [r['n'] for r in selected]==list(range(1,count+1))
 module=BASE if stage=='core' else f'{stage}-{BASE}'
 lessons=[];content={};practice[module]={}
 for r in selected:
  words=[{'es':w['target'],'en':w['native'],'kind':'term'} for w in r['vocabulary']]
  words += [{'es':p['target'],'en':p['native'],'kind':'phrase'} for p in r['phrases']]
  passage={'title':r['readingTitle'],'target':[s['target'] for s in r['sentences']],'native':[s['native'] for s in r['sentences']]}
  lesson={'n':r['n'],'title':r['title'],'objective':r['objective'],'focus':r['coachingFocus'],'words':words,'speaking':r['speaking'],'readingTemplate':f'seed-es-{module}-lesson-{r["n"]}'}
  if stage=='master':lesson.update(grammar=r['grammar'],lessonType=['Teach-back','Case','People','Document','Capstone'][(r['n']-1)//4],block='ABCDE'[(r['n']-1)//4])
  lessons.append(lesson)
  content[str(r['n'])]={'words':words,'passage':passage,'verbs':r['verbs']}
  practice[module][str(r['n'])]={'stage':stage,'title':r['title'],'familyId':r['familyId'],'familyIds':r['familyIds'],'coachingFocus':r['coachingFocus'],'reading':passage,'speaking':r['speaking'],'openingLine':r['openingLine'],'partnerRole':r['partnerRole'],'regionalNotes':r['regionalNotes'],'wordAnchors':r['vocabulary'],'phrases':r['phrases'],'regionalComparison':stage=='master' and r['n'] in (16,17),'recordingStatus':r['recordingStatus']}
 curriculum={'version':1,'module':module,'language':'Spanish','nativeLanguage':'English','headline':f'Sound Like a Native · {"Core 30" if stage=="core" else stage.title()}','threshold':'Carry clear consonant–vowel patterns into natural Spanish words, phrases, and conversation.','reviewed':False,'lessons':lessons}
 if stage=='core':destination=ROOT/'src/data/sound-like-a-native-core.json'
 else:
  curriculum.update(baseModule=BASE,stage=stage)
  destination=ROOT/f'src/data/core60/es/{module}.json'
 destination.write_text(json.dumps(curriculum,ensure_ascii=False,indent=2)+'\n')
 public={'version':1,'module':module,'language':'Spanish','nativeLanguage':'English','reviewed':False,'lessons':content}
 (ROOT/f'public/lesson-content/es/{module}.json').write_text(json.dumps(public,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/data/sound-like-a-native-practice.json').write_text(json.dumps(practice,ensure_ascii=False,indent=2)+'\n')
p=ROOT/'public/lesson-content/index.json';index=json.loads(p.read_text());index['files']=[f for f in index['files'] if f['module'] not in practice]
for module,items in practice.items():index['files'].append({'language':'es','module':module,'lessons':len(items),'bytes':(ROOT/f'public/lesson-content/es/{module}.json').stat().st_size,'reviewed':False})
index['files'].sort(key=lambda f:(f['language'],f['module']));p.write_text(json.dumps(index,ensure_ascii=False)+'\n')
print('Built Sound Like a Native: Foundation 10, Core 30, Master 20; exact Spanish/English pair, review pending.')
