"""Reproducible OR cleaning pair integration. Source passages retain their draft review status.
Spanish track adapts existing aligned bilingual readings; grammar/verbs are authored for Spanish.
"""
import json,re,pathlib,copy
R=pathlib.Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def save(p,d):
 p=R/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
source=R/'content/or-cleaning/english-source.json'
if not source.exists():
 s=(R/'src/data/curriculum.ts').read_text().split('const OREVS_LESSONS: Lesson[] = [',1)[1].split('\n];',1)[0]
 titles=re.findall(r'title: "([^"]+)"',s)
 data={}
 for stage,prefix in [('foundation','foundation-'),('core',''),('master','master-')]:
  mid=prefix+'or-evs'; pub=read(f'public/lesson-content/en/{mid}.json')
  meta=read(f'src/data/core60/en/{mid}.json') if prefix else {'lessons':[{'n':i+1,'title':t} for i,t in enumerate(titles)]}
  data[stage]={'meta':meta,'content':pub}
 save('content/or-cleaning/english-source.json',data)
data=read('content/or-cleaning/english-source.json')
# Lemma, native meaning, all five present persons; examples belong to this workplace.
verbs=[
 ('limpiar','clean',['limpio','limpias','limpia','limpiamos','limpian'],'Limpio la mesa del quirófano.','I clean the operating room table.'),
 ('revisar','check',['reviso','revisas','revisa','revisamos','revisan'],'Reviso la etiqueta antes de usar el producto.','I check the label before using the product.'),
 ('confirmar','confirm',['confirmo','confirmas','confirma','confirmamos','confirman'],'Confirmo que la sala está lista.','I confirm that the room is ready.'),
 ('necesitar','need',['necesito','necesitas','necesita','necesitamos','necesitan'],'Necesito más guantes para este turno.','I need more gloves for this shift.'),
 ('hablar','speak',['hablo','hablas','habla','hablamos','hablan'],'Hablo con la enfermera antes de entrar.','I speak with the nurse before entering.'),
 ('estar','be (state or location)',['estoy','estás','está','estamos','están'],'La sala está lista para la revisión.','The room is ready for inspection.'),
 ('tener','have',['tengo','tienes','tiene','tenemos','tienen'],'Tengo que revisar el piso.','I have to check the floor.'),
 ('poder','can / be able to',['puedo','puedes','puede','podemos','pueden'],'¿Puede repetir la instrucción?','Can you repeat the instruction?'),
 ('ir','go',['voy','vas','va','vamos','van'],'Voy a buscar los suministros.','I am going to get the supplies.'),
 ('hacer','do / make',['hago','haces','hace','hacemos','hacen'],'Hago una pausa para confirmar la instrucción.','I pause to confirm the instruction.'),
 ('ser','be (identity or role)',['soy','eres','es','somos','son'],'Soy parte del equipo de limpieza.','I am part of the cleaning team.'),
 ('entender','understand',['entiendo','entiendes','entiende','entendemos','entienden'],'No entiendo la última instrucción.','I do not understand the last instruction.'),
]
keys=['yo','tú','él_ella_usted','nosotros','ellos_ustedes']
foundation=[
 ('Spanish sounds and greetings','Spanish five vowels; ll/y and written stress','Buenos días. ¿Cómo se llama?','Good morning. What is your name?'),
 ('Numbers, time and quantities','Numbers, la una / las dos, and quantities','¿A qué hora empieza su turno?','What time does your shift start?'),
 ('Identity, condition and location','ser versus estar: soy técnico / la sala está lista','¿Dónde está el carrito de limpieza?','Where is the cleaning cart?'),
 ('Supplies and what you need','tener, hay and necesitar + infinitive','¿Qué suministros necesita?','What supplies do you need?'),
 ('Plans and permission','ir a + infinitive; poder + infinitive','¿Puede entrar ahora o necesita esperar?','Can you enter now or do you need to wait?'),
 ('Daily cleaning routines','Regular present verbs; subject pronouns may be omitted','¿Qué limpia al empezar el turno?','What do you clean at the start of the shift?'),
 ('Ask useful questions','qué, dónde, cuándo, quién and cómo','¿Qué instrucción necesita confirmar?','Which instruction do you need to confirm?'),
 ('Negation and quantities','no / nunca; cuánto and cuántos agree with the noun','¿Cuántas cajas de guantes quedan?','How many boxes of gloves are left?'),
 ('Polite requests and commands','puede + infinitive; formal usted commands','Por favor, revise la etiqueta. ¿Necesita ayuda?','Please check the label. Do you need help?'),
 ('Clarify and ask for help','¿Puede repetir?; más despacio; ¿qué significa…?','¿Qué palabra quiere que le explique?','Which word would you like me to explain?'),
]
patterns=[
 ('Present routines','Trabajo con el equipo y reviso la sala.','I work with the team and check the room.','Present forms describe routines. Use no before the verb for a negative.'),
 ('Plans and obligations','Voy a revisar la sala; tengo que confirmar la hora.','I am going to check the room; I have to confirm the time.','Conjugate ir or tener; the following verb stays in the infinitive.'),
 ('Completed actions and reports','He revisado la sala y he informado a la enfermera.','I have checked the room and informed the nurse.','Present perfect uses he/ha/hemos/han + an unchanged participle; abierto, hecho and visto are irregular.'),
]
masterpatterns=[
 ('Explain and demonstrate','Revise la etiqueta y confirme el tiempo de contacto.','Check the label and confirm the contact time.','Formal usted commands: revise, limpie, confirme; negative: no entre. Pronoun placement changes with negative commands.'),
 ('Explain reasons and conditions','Es importante que la superficie permanezca húmeda.','It is important that the surface remain wet.','Es importante que introduces a subjunctive clause. Si + present can state an open condition.'),
 ('Report, clarify and hand over','Ya habíamos revisado la sala cuando llegó la supervisora.','We had already checked the room when the supervisor arrived.','Use había + participle for an action completed before another past event. Contrast revisé with revisaba.'),
 ('Lead a difficult shift','Si tuviéramos más suministros, podríamos terminar a tiempo.','If we had more supplies, we could finish on time.','Hypothetical si + imperfect subjunctive pairs with a conditional result; it is not a prediction.'),
]
practice={}; cores={}; index=read('public/lesson-content/index.json')
for target,native,code,base in [('English','Spanish','en','or-evs'),('Spanish','English','es','or-cleaning')]:
 for stage,prefix in [('foundation','foundation-'),('core',''),('master','master-')]:
  mid=prefix+base; src=data[stage]; lessons=[]; content={}; practice[mid]={}
  for j,(number,original) in enumerate(src['content']['lessons'].items()):
   n=int(number); old=next(x for x in src['meta']['lessons'] if x['n']==n); item=copy.deepcopy(original); item['words']=copy.deepcopy(original.get('words',old.get('words',[])))
   original=item
   title=old['title']; focus=old.get('focus','Communicate clearly during the cleaning shift')
   if target=='Spanish':
    item['passage']={'title':original['passage']['title'],'target':original['passage']['native'],'native':original['passage']['target']}
    item['words']=[{'es':w['en'],'en':w['es'],'kind':w['kind']} for w in original['words']]
    # Swap references to the learned/support language in this adapted dialogue.
    # This preserves contrasts such as "in Spanish, without English".
    def swap_mentions(text):
     for x,y in [('inglés','español'),('Inglés','Español'),('English','Spanish')]:
      text=text.replace(x,'__LANGUAGE_SWAP__').replace(y,x).replace('__LANGUAGE_SWAP__',y)
     return text
    item['passage']['title']=swap_mentions(item['passage']['title'])
    item['passage']['target']=[swap_mentions(line).replace('cubeta en español','bucket en español') for line in item['passage']['target']]
    item['passage']['native']=[swap_mentions(line).replace('cubeta in Spanish','bucket in Spanish') for line in item['passage']['native']]
    for word in item['words']:
     word['es']=swap_mentions(word['es']).replace('cubeta en español','bucket en español')
     word['en']=swap_mentions(word['en']).replace('cubeta in Spanish','bucket in Spanish')
    title=swap_mentions(title)
    picks=([10,5,3,11,4] if stage=='foundation' and n<=4 else [6,7,8,9,11] if stage=='foundation' and n<=7 else [0,1,2,3,4])
    item['verbs']=[{'infinitive':verbs[k][0],'native':verbs[k][1],'forms':dict(zip(keys,verbs[k][2])),'example':{'target':verbs[k][3],'native':verbs[k][4]}} for k in picks]
    if stage=='foundation':
     title,focus,opening,opening_native=foundation[n-1];grammar=None
    else:
     pat=(masterpatterns if stage=='master' else patterns)[min((n-1)//(5 if stage=='master' else 10),3 if stage=='master' else 2)]
     focus=pat[0];grammar={'focus':pat[0]+': '+pat[3],'examples':[{'es':pat[1],'en':pat[2]}, {'es':('No entre hasta que la enfermera confirme que puede pasar.' if stage=='master' and n<=5 else 'Necesito que me explique la instrucción.' if stage=='master' and n<=10 else 'Ya había terminado cuando llegó el equipo.' if stage=='master' and n<=15 else 'Si necesitáramos ayuda, llamaríamos a la supervisora.' if stage=='master' else 'Reviso el equipo antes de entrar.' if n<=10 else 'Tengo que confirmar la hora.' if n<=20 else 'Hemos terminado la limpieza.'),'en':('Do not enter until the nurse confirms that you may come in.' if stage=='master' and n<=5 else 'I need you to explain the instruction to me.' if stage=='master' and n<=10 else 'I had already finished when the team arrived.' if stage=='master' and n<=15 else 'If we needed help, we would call the supervisor.' if stage=='master' else 'I check the equipment before entering.' if n<=10 else 'I have to confirm the time.' if n<=20 else 'We have finished cleaning.')}]}
     opening=f"Vamos a hablar de esta situación: {item['passage']['target'][0]} ¿Qué necesita confirmar primero?"
    objective=f"Handle {title.lower()} in Spanish: exchange the relevant details, clarify an instruction and confirm the next step."
    speaking=f"You are an OR cleaning crew member. Discuss {title.lower()} with your partner in Spanish. Use the lesson vocabulary and {focus.lower()}. Ask for clarification, then confirm the plan."
   else:
    objective=old.get('objective',f"Handle {title.lower()} in English and confirm understanding with the OR team.")
    speaking=old.get('speaking',f"Discuss {title.lower()} with the OR team in English. Explain what you need, ask a follow-up question, and confirm the next step.")
    opening=f"Let's discuss this situation: {item['passage']['target'][0]} What do you need to confirm first?"
    grammar=old.get('grammar')
   role='A new OR cleaning technician asking the learner for guidance' if stage=='master' and n%3==1 else 'An OR circulating nurse coordinating the room' if n%3==2 else 'An OR cleaning supervisor discussing the shift'
   if not (target=='Spanish' and stage=='foundation'):
    questions = [line for line in item['passage']['target'] if '?' in line]
    if questions:
     question=questions[0]
     if target=='Spanish' and '¿' in question: opening=question[question.index('¿'):]
     elif ': ' in question: opening=question.split(': ',1)[1]
     else: opening=question
    else:
     opening='¿Qué falta para que la sala esté lista?' if target=='Spanish' else 'What remains before the room is ready?'
   entry={'n':n,'title':title,'objective':objective,'focus':focus,'speaking':speaking,'words':item['words'],'readingTemplate':f'seed-{code}-{mid}-lesson-{n}'}
   if grammar:entry['grammar']=grammar
   if stage=='master':
    entry['lessonType']=old.get('lessonType',['Teach-back','Case','People','Document','Capstone'][(n-1)%5]);entry['block']=old.get('block','ABCDE'[(n-1)//4])
   lessons.append(entry);content[str(n)]=item
   practice[mid][str(n)]={'stage':stage,'target':target,'native':native,'reading':item['passage'],'speaking':speaking,'openingLine':opening,'partnerRole':role}
  pub={'version':1,'module':mid,'language':target,'nativeLanguage':native,'reviewed':False,'lessons':content}
  save(f'public/lesson-content/{code}/{mid}.json',pub)
  meta={'version':1,'module':mid,'baseModule':base,'stage':stage,'language':target,'nativeLanguage':native,'headline':f'OR Cleaning Crew · {stage.title()}','threshold':f'Communicate during OR cleaning shifts in {target}, ask for clarification and confirm room readiness.','reviewed':False,'lessons':lessons}
  if stage=='core':cores[mid]=meta
  else:save(f'src/data/core60/{code}/{mid}.json',meta)
  index['files']=[x for x in index['files'] if not(x['language']==code and x['module']==mid)]
  index['files'].append({'language':code,'module':mid,'lessons':len(lessons),'bytes':(R/f'public/lesson-content/{code}/{mid}.json').stat().st_size,'reviewed':False})
save('src/data/or-cleaning-practice.json',practice);save('src/data/or-cleaning-core.json',cores)
index['files'].sort(key=lambda x:(x['language'],x['module']));(R/'public/lesson-content/index.json').write_text(json.dumps(index,ensure_ascii=False)+'\n')
