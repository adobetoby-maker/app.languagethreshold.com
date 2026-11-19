"""Export the authored courses in V4's existing Codable schema, without installing
an incomplete-audio course into its live catalog. No app identities are changed.
"""
import hashlib,json,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
rows=json.loads((ROOT/'content/interests-spanish/native-lessons.json').read_text())
meta={'dance-team':('Dance Team','figure.dance'),'cosmetology':('Cosmetology: Hair & Nails','scissors')}
modules=[]
for course,(title,symbol) in meta.items():
 lessons=[]
 for row in [r for r in rows if r['module']==course]:
  stage=row['stage'];sourceID=course if stage=='core' else stage+'-'+course;n=row['n'];identity=f'core60:Spanish:English:{sourceID}:{n}'
  items=[dict(id=f'{identity}:word:{i}',target=w['es'],native=w['en'],note=w.get('note','')) for i,w in enumerate(row['words'])]
  passage=[dict(id=f'{identity}:passage:{i}',target=t,native=row['passage']['native'][i],note='') for i,t in enumerate(row['passage']['target'])]
  lessons.append(dict(id=identity,number=n+(10 if stage=='core' else 40 if stage=='master' else 0),stage='working' if stage=='core' else stage,title=row['title'],objective=row['objective'],explanation=row['explanation'],speakingPrompt=row['speaking'],items=items,passage=passage,verbs=row['verbs'],source=f'public/lesson-content/es/{sourceID}.json',reviewed=False,sourceModuleID=sourceID,sourceLessonNumber=n))
 assert len(lessons)==60 and [r['number'] for r in lessons]==list(range(1,61))
 modules.append(dict(id=course,title=title,kind='interest',symbol=symbol,lessons=lessons))
pack=dict(version=1,language='Spanish',nativeLanguage='English',modules=modules)
p=ROOT/'content/interests-spanish/v4-course-pack.json';p.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'courses':2,'lessons':sum(len(m['lessons']) for m in modules),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'installedInV4':False}))
