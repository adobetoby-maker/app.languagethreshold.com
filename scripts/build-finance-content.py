"""Derive finance course assets from Haiku-authored / Opus-reviewed exact-pair sources."""
import json,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
COUNTS={'foundation':10,'core':30,'master':20}
NAMES={'accounting':'Accounting & Financial Services','personal-money':'Personal Money & Banking','travel-money':'Travel Money & Payments'}
parser=argparse.ArgumentParser();parser.add_argument('--only',choices=list(NAMES));args=parser.parse_args()
cores=json.loads((ROOT/'src/data/finance-core.json').read_text()) if (ROOT/'src/data/finance-core.json').exists() else {}
practice=json.loads((ROOT/'src/data/finance-practice.json').read_text()) if (ROOT/'src/data/finance-practice.json').exists() else {}
entries=[]
for base,name in NAMES.items():
 if args.only and base != args.only: continue
 for pair,target,native,code in [('es-en','Spanish','English','es'),('en-es','English','Spanish','en')]:
  track=base if code=='es' else f'{base}-english'
  rows=json.loads((ROOT/f'content/finance/{base}/{pair}.json').read_text())
  for stage,count in COUNTS.items():
   selected=[r for r in rows if r['stage']==stage]
   assert [r['lesson']['n'] for r in selected]==list(range(1,count+1)),(track,stage)
   module=track if stage=='core' else f'{stage}-{track}'
   lessons=[];public={}
   for row in selected:
    lesson=dict(row['lesson']);n=lesson['n'];content=dict(row['content']);content['words']=lesson['words']
    lesson['readingTemplate']=f'seed-{code}-{module}-lesson-{n}'
    lessons.append(lesson);public[str(n)]=content
    practice.setdefault(module,{})[str(n)]={'stage':stage,'target':target,'native':native,'reading':content['passage'],'speaking':lesson['speaking'],'openingLine':lesson['openingLine'],'partnerRole':lesson['partnerRole'],'grammar':lesson['grammar']}
   file={'version':1,'module':module,'language':target,'nativeLanguage':native,'headline':f'{name} · {target} · {stage.title()}','threshold':f'Use {target} to complete the {stage} {name.lower()} conversations and explain the next step.','reviewed':False,'lessons':lessons}
   if stage=='core':cores[module]=file
   else:
    file.update(baseModule=track,stage=stage)
    if stage=='foundation':
     file['lessons']=[{k:v for k,v in l.items() if k not in ['grammar','lessonType','block']} for l in lessons]
    (ROOT/f'src/data/core60/{code}/{module}.json').write_text(json.dumps(file,ensure_ascii=False,indent=2)+'\n')
   path=ROOT/f'public/lesson-content/{code}/{module}.json'
   path.write_text(json.dumps({'version':1,'module':module,'language':target,'nativeLanguage':native,'reviewed':False,'lessons':public},ensure_ascii=False,indent=2)+'\n')
   entries.append({'language':code,'module':module,'lessons':count,'bytes':path.stat().st_size,'reviewed':False})
pack_dir=ROOT/'src/data/finance-courses';pack_dir.mkdir(parents=True,exist_ok=True)
for track,core in cores.items():
 pack={'core':core,'practice':{id:lessons for id,lessons in practice.items() if id.replace('foundation-','',1).replace('master-','',1)==track}}
 (pack_dir/f'{track}.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/data/finance-core.json').write_text(json.dumps(cores,ensure_ascii=False,indent=2)+'\n')
(ROOT/'src/data/finance-practice.json').write_text(json.dumps(practice,ensure_ascii=False,indent=2)+'\n')
p=ROOT/'public/lesson-content/index.json';index=json.loads(p.read_text());ids={e['module'] for e in entries};index['files']=[e for e in index['files'] if e['module'] not in ids]+entries;index['files'].sort(key=lambda e:(e['language'],e['module']));p.write_text(json.dumps(index,ensure_ascii=False)+'\n')
print(f'Built {args.only or "all finance paths"}: 10/30/20 lessons for each exact pair.')
