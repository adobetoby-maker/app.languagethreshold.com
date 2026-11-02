"""Reproducible Spanish→English courses. Original scenes, frozen vocabulary and explicit forms.
Run python3 scripts/build-spanish-next.py. No AI/network calls. Human review remains pending.
"""
import json,re,sys,unicodedata,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent;SRC=ROOT/'content/spanish-next';sys.path.insert(0,str(SRC))
from conjugation import *
def read(p):return json.loads(p.read_text())
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def blocks(name):return [x.splitlines() for x in (SRC/name).read_text().strip().split('\n\n')]
def pairs(lines):return [x.split('|') for x in lines]
base=[]
for row in blocks('spanish102.txt'):
 title,rule,scene=row[0].split('|');base.append(dict(title=title,rule=rule,scene=scene,pairs=pairs(row[1:])))
for index,row in enumerate(base):
 checks=[]
 for es,en in row['pairs']:
  for token in read(SRC/'spanish102-checks.json')[index]:
   match=re.search(r'(?<!\w)'+re.escape(token)+r'(?!\w)',es)
   if match:
    checks.append(dict(prompt=es[:match.start()]+'____'+es[match.end():],hint=en,answer=match.group(),explanation=row['rule']));break
  if len(checks)==3:break
 assert len(checks)==3,(index,row['title'],'focused 102 checks')
 row['checks']=checks
masters=[]
for row in blocks('master102.txt'):
 title,idx=row[0].split('|');source=base[int(idx)];masters.append(dict(title=title,rule=source['rule'],scene=title,pairs=source['pairs']+pairs(row[1:]),checks=source['checks']))
frequency=[]
for row in blocks('frequent-verbs.txt'):
 verb,title,rule,idx=row[0].split('|');p=pairs(row[1:]);idx=int(idx)
 # A different purpose on returning to a scene: verb meanings and argument structure.
 if idx>=0:p=base[idx]['pairs']+p
 frequency.append(dict(title=title,rule=rule,scene=title,pairs=p,primaryVerb=verb,verbExamples=pairs(row[1:])))
assert len(base)==40 and len(masters)==20 and len(frequency)==60
usage=[]
usage_extra={int(row[0]):pairs(row[1:]) for row in blocks('usage-master-continuations.txt')}
ranked=read(SRC/'usage-frequency.json')['rows']
for ordinal,row in enumerate(blocks('usage-first.txt'),1):
 verb,title,rule=row[0].split('|');assert ranked[ordinal-1]['verb']==verb
 ps=pairs(row[1:]);extras=usage_extra.get(ordinal,[])
 usage.append(dict(title=f"{ordinal}. {verb} · {title}",rule=rule,scene=title,pairs=ps+extras,primaryVerb=verb,verbExamples=ps,frequencyRank=ordinal))
common=[]
case_map=[16,9,8,30,5,34,35,36,39,39,2,29,29,9,18,15,15,28,4,23]
for ordinal,row in enumerate(blocks('common-patterns.txt'),1):
 title,rule,scene=row[0].split('|');ps=pairs(row[1:])
 if ordinal>=41:ps+=base[case_map[ordinal-41]]['pairs']
 structure_checks=[]
 for es,en in ps:
  for token in read(SRC/'structure-checks.json')[ordinal-1]:
   match=re.search(r'(?<!\w)'+re.escape(token)+r'(?!\w)',es)
   if match:
    structure_checks.append(dict(prompt=es[:match.start()]+'____'+es[match.end():],hint=en,answer=match.group(),explanation=rule));break
  if len(structure_checks)==3:break
 assert len(structure_checks)==3,(ordinal,title,'focused structure checks')
 common.append(dict(title=title,rule=rule,scene=scene,pairs=ps,structureId=f'structure-{ordinal:02d}',checks=structure_checks))
assert len(usage)==len(common)==60

lex=read(ROOT/'content/spanish-basics/lexicon.json')
if (SRC/'lexicon.json').exists():lex+=read(SRC/'lexicon.json')
# Explicit present forms can serve as reference vocabulary without relabeling another tense.
for v,en in GLOSS.items():lex.append(dict(es=v,en='to '+en))
knownverbs={v[0]:v for v in read(ROOT/'content/spanish-basics/verbs.json')}
for v in knownverbs:
 if v not in GLOSS:GLOSS[v]=knownverbs[v][1].removeprefix('to ')
def reference(v):
 f=present(v)
 return dict(infinitive=v,native='to '+GLOSS[v],forms=dict(zip(KEYS,f)),example=dict(target=(('Me '+f[0].split(' ',1)[1]) if v.endswith('se') else f[0].capitalize())+'.',native=('I '+GLOSS[v])+'.'),note='These are present-tense reference forms. Use the focused pattern table and practice check for this lesson’s other forms.')
# Verb examples are short, grammatical contextual sentences, not guessed English conjugations.
for v,row in knownverbs.items():
 if v in GLOSS:
  pass
EXAMPLES={v:dict(target=es,native=en) for v,es,en in [line.split('|') for line in (SRC/'verb-examples.txt').read_text().strip().splitlines()]}
DEFAULT_V=['hablar','comer','vivir','tener','hacer']
def verb_reference(v):
 out=reference(v)
 if v in EXAMPLES:out['example']=EXAMPLES[v]
 elif v in knownverbs:out['example']=dict(target=knownverbs[v][7],native=knownverbs[v][8])
 elif v.endswith('se'):out['example']=dict(target=present(v)[0].capitalize()+' cada mañana.',native='I '+GLOSS[v]+' every morning.')
 else:out['example']=dict(target='Quiero '+v+'.',native='I want to '+GLOSS[v]+'.')
 return out
# Mapping the focused family to an existing authored context intentionally reuses narrative
# evidence; transfer lessons revisit a different narrative, with new person/form checks.
scene_map=[0,25,39,31,36,3,21,17,13,20,0,5,1,2,3,4,5,20,21,30,36,26,27,28,25,22,24,36]
conjugation=[]
for ordinal in range(60):
 pindex=ordinal if ordinal<28 else (ordinal-28)%28;key,title,rule,bank=PATTERNS[pindex]
 if ordinal<10:context=frequency[ordinal]
 elif ordinal<40:context=base[scene_map[pindex]]
 else:context=masters[(ordinal-40)%20]
 label=title if ordinal<28 else title+' · '+('transfer' if ordinal<40 else 'independent practice')
 # Exactly one family per lesson. Each of ten verbs has a visible model and a checked form.
 table=[dict(infinitive=v,native='to '+GLOSS[v],forms=focused(v,key)) for v in bank]
 checks=[]
 for j,v in enumerate(bank):
  forms=focused(v,key);person=list(forms)[(j+ordinal//28)%len(forms)]
  checks.append(dict(prompt=f'{v} · {person} → ____',hint=f'{title}: to {GLOSS[v]}. Supply the complete form, including any pronoun or auxiliary.',answer=forms[person],explanation=rule))
 conjugation.append(dict(title=label,rule=rule,scene=context['scene'],pairs=context['pairs'][:12 if ordinal>=40 else 9],pattern=dict(id=key,title=title,verbs=table),checks=checks))
NAMES={'spanish-usage-verbs':'Spanish Usage-First Verbs','spanish-common-patterns':'Spanish Common Grammar Patterns','spanish-102':'Spanish 102','spanish-frequent-verbs':'Spanish Frequent Verbs','spanish-conjugation-patterns':'Spanish Conjugation Patterns'}
THRESHOLDS={'spanish-usage-verbs':'Sixty verb lemmas in descending Spanish Web 2011 corpus frequency, with new usage scenes. Inflected forms count together; frequency varies by genre and region.','spanish-common-patterns':'Use sixty everyday structures, including tener que, hay que, ir a, acabar de and common clause patterns. Ordered for learning, not an asserted statistical frequency ranking.','spanish-102':'Expand Spanish 101 through past narration, objects, plans, requests, commands and introductory subjunctive choices.','spanish-frequent-verbs':'Recognize and use sixty frequent spoken verbs, their everyday meanings, complements and regional cautions.','spanish-conjugation-patterns':'Practice 28 named teaching patterns across 60 lessons, with ten distinct verbs and checked forms in every lesson.'}
practice={};cores={};gaps=[]
for course,rows in [('spanish-102',base+masters),('spanish-frequent-verbs',frequency),('spanish-conjugation-patterns',conjugation),('spanish-usage-verbs',usage),('spanish-common-patterns',common)]:
 for stage,start,count in [('foundation',0,10),('core',10,30),('master',40,20)]:
  module=course if stage=='core' else stage+'-'+course;lessons=[];content={};practice[module]={}
  for n,row in enumerate(rows[start:start+count],1):
   ps=row['pairs'];target=[p[0] for p in ps];native=[p[1] for p in ps];text=' '.join(target).lower()
   def appears(w):return bool(re.search(r'(?<!\w)'+re.escape(w.lower())+r'(?!\w)',text))
   selected=[];seen=set();need=12 if stage=='master' else 8
   for w in lex:
    folded=''.join(c for c in unicodedata.normalize('NFD',w['es'].lower()) if not unicodedata.combining(c))
    if appears(w['es']) and folded not in seen and w['en'].lower() not in {x['en'].lower() for x in selected}:
     selected.append(dict(es=w['es'],en=('reflexive / reciprocal / impersonal marker (context determines meaning)' if w['es']=='se' else w['en']),kind='term'));seen.add(folded)
    if len(selected)==need:break
   if len(selected)<need:gaps.append((module,n,row['title'],need-len(selected),text))
   words=selected+[dict(es=es,en=en,kind='phrase') for es,en in ps[:8 if stage=='master' else 6]]
   title=row['title'];rule=row['rule'];scene=row['scene']
   speaking=f'You and a Spanish-speaking classmate are discussing {scene.lower()}. {rule} Ask for the missing detail, respond to the partner, clarify one misunderstanding, and agree on the next step. Use examples from the reading and your own details. Explain the grammar in English if asked.'
   if 'pattern' in row:speaking=f'Use {row["pattern"]["title"]} while discussing {scene.lower()}. '+speaking
   grammar=dict(focus=rule,examples=[dict(es=es,en=en) for es,en in ps[:2]])
   if 'pattern' in row:
    grammar['examples']=[dict(es=v['infinitive']+' · '+next(iter(v['forms']))+': '+next(iter(v['forms'].values())),en=v['native']+' · '+row['pattern']['title']) for v in row['pattern']['verbs'][:2]]
   lesson=dict(n=n,title=title,objective=f'{title}: {rule.split(". ")[0].rstrip(".")}.',focus=title,words=words,speaking=speaking)
   if stage=='master':lesson.update(grammar=grammar,lessonType=['Teach-back','Case','People','Document','Capstone'][(n-1)//4],block='ABCDE'[(n-1)//4])
   checks=row.get('checks')
   if not checks:
    checks=[]
    # Mask a conjugated form actually present in the scene. Original translations provide context.
    primary=row.get('primaryVerb');pool=[]
    if primary:
     pool+=present(primary)+preterite(primary)+[primary]
     for family in ['future','conditional','perfect','pluperfect','subjunctive','command-tu','command-negative','imperfect-ar','past-subjunctive','progressive']:
      pool+=list(focused(primary,family).values())
     if primary=='haber':pool+=['hay','había','hubo']
    pool+=['había','habíamos','he','hemos','ha','han','sea','tenga','tengamos','pueda','podamos','llegue','venga','fuera','tuviera','si','cuando','que','le','lo','la','los','las','se','me','nos','por','para','desde','más','menos','hay','era','eran','estaba','estaban','tenía','teníamos']
    for es,en in row.get('verbExamples',[])+ps:
     matches=[m for token in pool if (m:=re.search(r'(?<!\w)'+re.escape(token)+r'(?!\w)',es,re.IGNORECASE))]
     if not matches:
      # A vocabulary-backed gap is explicit rather than falsely labeled a conjugation test.
      matches=[m for w in selected if (m:=re.search(r'(?<!\w)'+re.escape(w['es'])+r'(?!\w)',es,re.IGNORECASE))]
     if matches:
      m=matches[0];checks.append(dict(prompt=es[:m.start()]+'____'+es[m.end():],hint=en,answer=m.group(),explanation=rule))
     if len(checks)==3:break
    assert len(checks)==3,(module,n,'checks')
   if 'pattern' in row:chosen=row['pattern']['verbs'];vnames=[v['infinitive'] for v in chosen]
   else:
    primary=row.get('primaryVerb');vnames=([primary] if primary else [])+[v for v in DEFAULT_V if v!=primary];vnames=vnames[:5 if stage=='master' else 3]
   content[str(n)]=dict(passage=dict(title=scene,target=target,native=native),words=words,verbs=[verb_reference(v) for v in vnames])
   teaching=dict(stage=stage,reading=dict(title=scene,target=target,native=native),grammar=grammar,speaking=speaking,openingLine=target[0],partnerRole='A Spanish-speaking classmate solving the situation with you',checks=checks)
   if 'pattern' in row:teaching['pattern']=row['pattern']
   if row.get('primaryVerb'):teaching['primaryVerb']=row['primaryVerb']
   if row.get('frequencyRank'):teaching['frequencyRank']=row['frequencyRank']
   if row.get('structureId'):teaching['structureId']=row['structureId']
   practice[module][str(n)]=teaching;lessons.append(lesson)
  definition=dict(version=1,module=module,language='Spanish',nativeLanguage='English',headline=NAMES[course]+' '+('Core 30' if stage=='core' else stage.title()),threshold=THRESHOLDS[course],reviewed=False,lessons=lessons)
  if stage!='core':definition.update(baseModule=course,stage=stage)
  if stage=='core':cores[course]=definition
  else:write(ROOT/f'src/data/core60/es/{module}.json',definition)
  write(ROOT/f'public/lesson-content/es/{module}.json',dict(version=1,module=module,language='Spanish',nativeLanguage='English',reviewed=False,lessons=content))
write(ROOT/'src/data/spanish-next-core.json',cores);write(ROOT/'src/data/spanish-next-practice.json',practice)
write(SRC/'patterns.json',[dict(id=key,title=title,explanation=rule,verbs=bank) for key,title,rule,bank in PATTERNS])
write(SRC/'vocabulary-gaps.json',gaps)
index=read(ROOT/'public/lesson-content/index.json');index['files']=[f for f in index['files'] if f['module'] not in practice]
for module,lessons in practice.items():index['files'].append(dict(language='es',module=module,lessons=len(lessons),bytes=(ROOT/f'public/lesson-content/es/{module}.json').stat().st_size,reviewed=False))
index['files'].sort(key=lambda x:(x['language'],x['module']));(ROOT/'public/lesson-content/index.json').write_text(json.dumps(index,ensure_ascii=False)+'\n')
print(f'Built {sum(len(x) for x in practice.values())} lessons; vocabulary gaps: {len(gaps)} (see content/spanish-next/vocabulary-gaps.json)')
