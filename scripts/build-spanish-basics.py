"""Build Spanish 101 Core 60 from original bilingual lesson outlines and a frozen lexicon.
Human language/teaching review remains pending. Run from any working directory.
"""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'content/spanish-basics'
def read(p):return json.loads(p.read_text())
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
outline=read(SOURCE/'outline.json'); base=outline['foundation']+outline['core'];lexicon=read(SOURCE/'lexicon.json');rawverbs=read(SOURCE/'verbs.json')
keys=['yo','tú','él_ella_usted','nosotros','ellos_ustedes']
verbs=[dict(infinitive=v[0],native=v[1],forms=dict(zip(keys,v[2:7])),example=dict(target=v[7],native=v[8]),note='These are present-tense reference forms. The reading may also show a past form or a verb phrase.') for v in rawverbs]
thresholds={'foundation':'Introduce yourself, use articles and plurals, distinguish ser, estar and hay, ask simple questions, and request help.','core':'Build and understand everyday sentences, explain routines and plans, and begin distinguishing completed past actions from past habits.','master':'Apply beginner grammar across reading, recall, listening, typing, speaking and writing; check and revisit errors in familiar situations.'}
masks = [
 ['Soy','Cómo','llamo','estudiante'], ['una','El','La','un'], ['libros','Los','cuadernos','sillas','lápices'], ['Yo','Tú','Ella','Él','Nosotros','Ustedes'],
 ['Soy','es','Somos','son'], ['Estoy','está','Estamos','están'], ['Hay','hay','está'], ['Tengo','tiene','años','diez','once'], ['Sí','No','no','Eres','está','tienes'], ['Soy','Estoy','Hay','entiendo','puedes'],
 ['Estudio','trabaja','Hablamos','escucha','practican'], ['Como','bebo','come','Leemos','comprende','comen'], ['Vivo','vive','Escribimos','abre','reciben'],
 ['roja','rojas','azul','pequeño','interesantes','amable','pequeños'], ['Mi','Mis','tu','Tus','su'], ['Tengo','tiene','Tenemos','tienen','Tienes'],
 ['Voy','va','Vamos','van','al','a'], ['Qué','Cuál'], ['Dónde','Cuándo','Por qué','porque'], ['Son','a las','a la','a qué hora'],
 ['gusta','gustan'], ['Quiero','quiere','Queremos','quieren','Quieres'], ['Puedo','puedes','puede','Podemos','pueden'], ['Necesito','tengo que','necesita','Tenemos que','tiene que'],
 ['Hago','hace','Hacemos','hacen','haces'], ['Me','se','Nos','te'], ['Este','Esta','Esos','Estas','Esa','este'], ['en','cerca del','lejos de','debajo de','delante de','detrás de'],
 ['voy a','va a','Vamos a','van a','Vas a'], ['Estoy','está','Estamos','están','Estás'], ['Sé','sabe','Conozco','conocemos','sabes'], ['más','menos','tan','mejor'],
 ['lo','la','los','las'], ['Le','me','Te','nos','Les'], ['a Ana','a Luis','a la profesora','mi libro','dos hermanos'], ['estudié','compró','Comimos','escribió','hablaron'],
 ['fui','fue','Fuimos','fueron'], ['vivía','Estudiaba','caminaba','Comíamos','tenía'], ['para','por'], ['pero','y','porque','entonces']
]
master=[]
for row in read(SOURCE/'master.json'):
 title,idx,scene,*lines=row;source=base[idx];master.append([title,source[1],scene,*lines,*source[3:]])
practice={}
for stage,rows in [('foundation',outline['foundation']),('core',outline['core']),('master',master)]:
 module='spanish-basics' if stage=='core' else stage+'-spanish-basics';lessons=[];content={};practice[module]={}
 for n,row in enumerate(rows,1):
  title,rule,scene,*lines=row;pairs=[x.split('|') for x in lines];target=[x[0] for x in pairs];native=[x[1] for x in pairs];text=' '.join(target).lower()
  def appears(w):return re.search(r'(?<!\w)'+re.escape(w.lower())+r'(?!\w)',text) is not None
  candidates=[x for x in lexicon if appears(x['es'])];selected=[];seen=set();seen_target=set()
  for w in candidates:
   key=''.join(c for c in unicodedata.normalize('NFD',w['es'].lower()) if not unicodedata.combining(c))
   if w['en'].lower() in seen or key in seen_target:continue
   selected.append(dict(es=w['es'],en=w['en'],kind='term'));seen.add(w['en'].lower());seen_target.add(key)
   if len(selected)==(12 if stage=='master' else 8):break
  assert len(selected)==(12 if stage=='master' else 8),(module,n,title,len(selected))
  phrasepairs=pairs[:(8 if stage=='master' else 6)];words=selected+[dict(es=es,en=en,kind='phrase') for es,en in phrasepairs]
  # A varied contextual reading, plus a speaking brief with a real completion goal.
  speaking=f'Role-play {scene} with a patient classmate. Practice {title.lower()}. Use this lesson\'s grammar, ask a related question, answer the partner, and confirm understanding. Keep language at beginner level; explain unfamiliar words in English when asked.'
  lesson=dict(n=n,title=title,objective=f'{title}: {rule.split(". ")[0].rstrip(".")}.',focus=title,words=words,speaking=speaking)
  if stage=='master':lesson.update(grammar=dict(focus=rule,examples=[dict(es=es,en=en) for es,en in pairs[:2]]),lessonType=['Teach-back','Case','People','Document','Capstone'][(n-1)//4],block='ABCDE'[(n-1)//4])
  def verb_score(v):
   inf=v['infinitive'].removesuffix('se')
   stem=inf[:-2]
   in_reading=any(appears(f) for f in v['forms'].values()) or (len(stem)>=3 and bool(re.search(r'(?<!\w)'+re.escape(stem)+r'\w*',text)))
   if inf in ('ir','ser') and re.search(r'(?<!\w)(fui|fuiste|fue|fuimos|fueron)(?!\w)',text):in_reading=True
   return (v['infinitive'] not in rule.lower(),not in_reading)
  chosen=[dict(v) for v in sorted(verbs,key=verb_score)[:(5 if stage=='master' else 3)]]
  for v in chosen:
   if v['infinitive']=='gustar':v['note']='Use gusta with one thing or an infinitive and gustan with plural things. Me, te and le name the person who likes it.' 
  content[str(n)]=dict(passage=dict(title=scene,target=target,native=native),words=words,verbs=chosen)
  skill_index = n-1 if stage=='foundation' else n+9 if stage=='core' else read(SOURCE/'master.json')[n-1][1]
  checks=[]
  for es,en in pairs:
   for token in masks[skill_index]:
    match=re.search(r'(?<!\w)'+re.escape(token)+r'(?!\w)',es,re.IGNORECASE)
    if match:
     answer=match.group();prompt=es[:match.start()]+'____'+es[match.end():]
     checks.append(dict(prompt=prompt,hint=en,answer=answer,explanation=rule));break
   if len(checks)==3:break
  assert len(checks)==3,(module,n,'missing checks')
  practice[module][str(n)]=dict(stage=stage,reading=dict(title=scene,target=target,native=native),grammar=dict(focus=rule,examples=[dict(es=es,en=en) for es,en in pairs[:2]]),speaking=speaking,openingLine=target[0],partnerRole='A patient Spanish-speaking classmate',checks=checks)
  lessons.append(lesson)
 file=dict(version=1,module=module,language='Spanish',nativeLanguage='English',headline='Spanish 101 '+('Core 30' if stage=='core' else stage.title()),threshold=thresholds[stage],reviewed=False,lessons=lessons)
 if stage!='core':file.update(baseModule='spanish-basics',stage=stage)
 write(ROOT/('src/data/spanish-basics-core.json' if stage=='core' else f'src/data/core60/es/{module}.json'),file)
 write(ROOT/f'public/lesson-content/es/{module}.json',dict(version=1,module=module,language='Spanish',nativeLanguage='English',reviewed=False,lessons=content))
write(ROOT/'src/data/spanish-basics-practice.json',practice)
p=ROOT/'public/lesson-content/index.json';idx=read(p);idx['files']=[x for x in idx['files'] if x['module'] not in practice]
for module,lessons in practice.items():idx['files'].append(dict(language='es',module=module,lessons=len(lessons),bytes=(ROOT/f'public/lesson-content/es/{module}.json').stat().st_size,reviewed=False))
idx['files'].sort(key=lambda x:(x['language'],x['module']));p.write_text(json.dumps(idx,ensure_ascii=False)+'\n')
print('Built Spanish → English scaffold: Foundation 10 / Core 30 / Master 20 (human review pending).')
