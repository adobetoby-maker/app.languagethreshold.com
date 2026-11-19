"""Rebuild two authored Spanish→English-scaffold Core 60 courses from source.py.
Every lesson has its own scene. Review status is deliberately kept false.
"""
import json,runpy,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
source=runpy.run_path(str(ROOT/'content/interests-spanish/source.py'))
LESSONS,COURSES=source['LESSONS'],source['COURSES']
KEYS=['yo','tú','él_ella_usted','nosotros','ellos_ustedes']
IRREG={
'ser':'soy eres es somos son','estar':'estoy estás está estamos están','haber':'he has ha hemos han','ir':'voy vas va vamos van','dar':'doy das da damos dan','hacer':'hago haces hace hacemos hacen','tener':'tengo tienes tiene tenemos tienen','poder':'puedo puedes puede podemos pueden','poner':'pongo pones pone ponemos ponen','querer':'quiero quieres quiere queremos quieren','saber':'sé sabes sabe sabemos saben','salir':'salgo sales sale salimos salen','decir':'digo dices dice decimos dicen','venir':'vengo vienes viene venimos vienen','ver':'veo ves ve vemos ven','traer':'traigo traes trae traemos traen','pedir':'pido pides pide pedimos piden','seguir':'sigo sigues sigue seguimos siguen','elegir':'elijo eliges elige elegimos eligen','repetir':'repito repites repite repetimos repiten','preferir':'prefiero prefieres prefiere preferimos prefieren','sentir':'siento sientes siente sentimos sienten','entender':'entiendo entiendes entiende entendemos entienden','empezar':'empiezo empiezas empieza empezamos empiezan','contar':'cuento cuentas cuenta contamos cuentan','costar':'cuesto cuestas cuesta costamos cuestan','mostrar':'muestro muestras muestra mostramos muestran','probar':'pruebo pruebas prueba probamos prueban','recordar':'recuerdo recuerdas recuerda recordamos recuerdan','comprobar':'compruebo compruebas comprueba comprobamos comprueban','mantener':'mantengo mantienes mantiene mantenemos mantienen','proponer':'propongo propones propone proponemos proponen','reducir':'reduzco reduces reduce reducimos reducen','parecer':'parezco pareces parece parecemos parecen','ofrecer':'ofrezco ofreces ofrece ofrecemos ofrecen','reconocer':'reconozco reconoces reconoce reconocemos reconocen','conseguir':'consigo consigues consigue conseguimos consiguen','incluir':'incluyo incluyes incluye incluimos incluyen','enviar':'envío envías envía enviamos envían','referir':'refiero refieres refiere referimos refieren','reunir':'reúno reúnes reúne reunimos reúnen',
}
# Original short examples, with accurate English glosses and complete present tables.
VERBS={}
def V(lemma,meaning,target,native):VERBS[lemma]=(meaning,target,native)
DATA='''aclarar~to clarify~Aclaro una duda.~I clarify a question.
anotar~to note down~Anoto el horario.~I note down the schedule.
apoyar~to support or rest~Apoyo la mano aquí.~I rest my hand here.
aprender~to learn~Aprendo una palabra nueva.~I learn a new word.
avisar~to let someone know~Aviso antes de llegar.~I give notice before arriving.
bailar~to dance~Bailo con mi equipo.~I dance with my team.
buscar~to look for~Busco una referencia.~I look for a reference.
cambiar~to change~Cambio el orden.~I change the order.
combinar~to combine~Combino dos colores.~I combine two colors.
comparar~to compare~Comparo las dos opciones.~I compare the two options.
compartir~to share~Comparto mi idea.~I share my idea.
comprobar~to check~Compruebo la información.~I check the information.
comunicar~to communicate~Comunico el cambio.~I communicate the change.
conectar~to connect~Conecto las dos partes.~I connect the two parts.
confirmar~to confirm~Confirmo el acuerdo.~I confirm the agreement.
conseguir~to obtain~Consigo la información.~I obtain the information.
conservar~to keep or preserve~Conservo el largo.~I keep the length.
contar~to count or tell~Cuento ocho tiempos.~I count eight beats.
costar~to cost or be difficult~Esta parte me cuesta.~This part is difficult for me.
cruzar~to cross~Cruzo el salón.~I cross the room.
cumplir~to keep or fulfill~Cumplo el acuerdo.~I keep the agreement.
dar~to give~Doy una explicación.~I give an explanation.
decidir~to decide~Decido después de preguntar.~I decide after asking.
decir~to say or tell~Digo lo que necesito.~I say what I need.
dejar~to leave or let~Dejo espacio para otra persona.~I leave room for another person.
describir~to describe~Describo el detalle.~I describe the detail.
elegir~to choose~Elijo una opción.~I choose an option.
empezar~to start~Empiezo con una pregunta.~I start with a question.
entender~to understand~Entiendo la explicación.~I understand the explanation.
enviar~to send~Envío la confirmación.~I send the confirmation.
escuchar~to listen~Escucho tu opinión.~I listen to your opinion.
esperar~to wait or hope~Espero la señal.~I wait for the cue.
estar~to be (state or location)~Estoy en el salón.~I am in the room.
explicar~to explain~Explico el plan.~I explain the plan.
faltar~to be missing or remain~Falta una confirmación.~One confirmation is missing.
fijar~to establish or fix~Fijo una referencia.~I establish a reference point.
formar~to form~Formo parte del equipo.~I am part of the team.
grabar~to record~Grabo una muestra.~I record a sample.
guardar~to put away or save~Guardo el accesorio.~I put away the accessory.
gustar~to please (used with me gusta for I like)~Me gusta este estilo.~I like this style.
haber~to have (auxiliary); hay means there is or are~He confirmado el horario.~I have confirmed the schedule.
hablar~to speak~Hablo con mi compañera.~I speak with my teammate.
hacer~to do or make~Hago una pregunta.~I ask a question.
identificar~to identify~Identifico el problema.~I identify the problem.
importar~to matter~Tu opinión importa.~Your opinion matters.
incluir~to include~Incluyo el detalle en la nota.~I include the detail in the note.
indicar~to indicate~Indico el lugar correcto.~I indicate the correct place.
intentar~to try~Intento explicarlo otra vez.~I try to explain it again.
ir~to go~Voy a la escuela.~I go to school.
lavar~to wash~Lavo el cabello.~I wash the hair.
leer~to read~Leo la instrucción.~I read the instruction.
levantar~to raise~Levanto la mano.~I raise my hand.
llamarse~to be named~Me llamo Ana.~My name is Ana.
llegar~to arrive~Llego a tiempo.~I arrive on time.
llevar~to bring or wear~Llevo una foto.~I bring a photo.
mantener~to keep or maintain~Mantengo el mismo orden.~I keep the same order.
mejorar~to improve~Mejoro con la práctica.~I improve with practice.
mirar~to look~Miro la referencia.~I look at the reference.
mostrar~to show~Muestro el detalle.~I show the detail.
necesitar~to need~Necesito una aclaración.~I need clarification.
notar~to notice~Noto una diferencia.~I notice a difference.
ofrecer~to offer~Ofrezco otra opción.~I offer another option.
organizar~to organize~Organizo mi tiempo.~I organize my time.
parar~to stop~Paro un momento.~I stop for a moment.
parecer~to seem~Me parece una buena idea.~It seems like a good idea to me.
pasar~to pass~Paso la toalla.~I pass the towel.
pedir~to ask for~Pido permiso.~I ask permission.
permitir~to allow~Permito que mi compañera explique.~I let my teammate explain.
poder~to be able to~Puedo explicarlo.~I can explain it.
poner~to put~Pongo la muestra aquí.~I put the sample here.
practicar~to practice~Practico otra vez.~I practice again.
preferir~to prefer~Prefiero esta opción.~I prefer this option.
preguntar~to ask a question~Pregunto por el horario.~I ask about the schedule.
preparar~to prepare~Preparo mi material.~I prepare my materials.
priorizar~to prioritize~Priorizo una tarea.~I prioritize one task.
probar~to try~Pruebo otra opción.~I try another option.
proponer~to propose~Propongo un cambio.~I propose a change.
querer~to want~Quiero confirmar el plan.~I want to confirm the plan.
recibir~to receive~Recibo el mensaje.~I receive the message.
reconocer~to recognize~Reconozco tu esfuerzo.~I recognize your effort.
recordar~to remember~Recuerdo el orden.~I remember the order.
reducir~to reduce~Reduzco el tiempo de espera.~I reduce the waiting time.
referirse~to refer to~Me refiero a este lado.~I mean this side.
repasar~to review~Repaso la secuencia.~I review the sequence.
repetir~to repeat~Repito la pregunta.~I repeat the question.
reservar~to reserve or book~Reservo una cita.~I book an appointment.
respetar~to respect~Respeto tu decisión.~I respect your decision.
resultar~to turn out or prove~Esta opción resulta cómoda.~This option turns out to be comfortable.
resumir~to summarize~Resumo el acuerdo.~I summarize the agreement.
reunirse~to meet up~Me reúno con mi equipo.~I meet with my team.
revisar~to review or check~Reviso la nota.~I check the note.
romperse~to break~Se rompe una uña.~A nail breaks.
saber~to know facts or how~Sé lo que necesito.~I know what I need.
salir~to leave or go out~Salgo a las cuatro.~I leave at four.
seguir~to follow or continue~Sigo la instrucción.~I follow the instruction.
sentir~to feel~Siento una molestia.~I feel discomfort.
separar~to separate~Separo una sección.~I separate a section.
ser~to be (identity or description)~Soy estudiante.~I am a student.
señalar~to point out~Señalo la muestra.~I point to the sample.
simplificar~to simplify~Simplifico el diseño.~I simplify the design.
sujetar~to hold or secure~Sujeto el accesorio.~I secure the accessory.
tener~to have~Tengo una pregunta.~I have a question.
terminar~to finish~Termino el resumen.~I finish the summary.
tomar~to take~Tomo una nota.~I take a note.
traer~to bring~Traigo mi material.~I bring my materials.
usar~to use~Uso esta referencia.~I use this reference.
venir~to come~Vengo a la cita.~I come to the appointment.
ver~to see~Veo la diferencia.~I see the difference.
verse~to look or see oneself~Me veo en el espejo.~I see myself in the mirror.'''
for line in DATA.splitlines():V(*line.split('~'))
def verb(lemma):
 meaning,target,native=VERBS[lemma];reflexive=lemma.endswith('se');base=lemma[:-2] if reflexive else lemma
 if base in IRREG:forms=IRREG[base].split()
 else:
  assert base.endswith(('ar','er','ir')),base
  stem=base[:-2];endings={'ar':['o','as','a','amos','an'],'er':['o','es','e','emos','en'],'ir':['o','es','e','imos','en']}[base[-2:]];forms=[stem+e for e in endings]
 if reflexive:forms=[p+' '+f for p,f in zip(['me','te','se','nos','se'],forms)]
 row=dict(infinitive=lemma,native=meaning,forms=dict(zip(KEYS,forms)),example=dict(target=target,native=native))
 if lemma in ['gustar','costar','importar','faltar','parecer','resultar']:row['note']='The example uses the natural subject and indirect-object pattern; the table lists the full present tense.'
 if lemma=='haber':row['note']='Hay is the impersonal there is/are form. He, has, ha, hemos and han are auxiliary forms used with a past participle.'
 return row

GRAMMAR={}
def G(key,focus,a,b):GRAMMAR[key]={'focus':focus,'examples':[dict(zip(['es','en'],s.split('~'))) for s in [a,b]]}
G('ser','Use ser for identity and descriptions; estar for location or current state. Spanish subject pronouns are often optional.','Soy estudiante.~I am a student.','Estoy en clase.~I am in class.')
G('hay','Hay means there is or there are. Use está/están to locate a specific person or item.','Hay una mesa.~There is a table.','La mesa está aquí.~The table is here.')
G('numbers','Use cuánto for how much, cuántos for how many masculine items, and a qué hora for at what time.','¿Cuántos minutos tenemos?~How many minutes do we have?','¿A qué hora empieza?~What time does it start?')
G('directions','State whose perspective is used. A la derecha de locates something to the right of a reference; hacia indicates direction.','La puerta está a mi derecha.~The door is to my right.','Miro hacia la puerta.~I look toward the door.')
G('tener','Tener expresses possession. Tener + noun is also used in expressions such as tener una duda.','Tengo una foto.~I have a photo.','Tenemos una pregunta.~We have a question.')
G('questions','Use question words with their written accents: qué, cómo, cuál, dónde and cuándo. Include both Spanish question marks.','¿Qué quieres cambiar?~What do you want to change?','¿Cómo quieres explicarlo?~How do you want to explain it?')
G('necesitar','Necesitar can be followed by a noun or an infinitive. The second verb stays in its dictionary form.','Necesito una pausa.~I need a break.','Necesito descansar.~I need to rest.')
G('schedule','Use a las with most clock times; a la una is singular. Days follow el for one specified day and los for a repeated schedule.','El viernes llego a las cuatro.~On Friday I arrive at four.','Los lunes llego a la una.~On Mondays I arrive at one.')
G('gustar','Me gusta is used with one thing or an activity; me gustan with plural things. The thing liked determines the verb.','Me gusta este color.~I like this color.','Me gustan estos colores.~I like these colors.')
G('sequence','Primero, después and al final organize actions. Antes de and después de are followed by a noun or an infinitive.','Primero reviso el plan.~First I review the plan.','Confirmo antes de empezar.~I confirm before starting.')
G('commands','Positive tú commands include mira, escucha and confirma. Put attached object pronouns after a positive command.','Mira la muestra.~Look at the sample.','Mírala otra vez.~Look at it again.')
G('comparative','Use más/menos + adjective + que to compare. Match the adjective to the noun; mejor and peor are irregular comparisons.','Esta opción es más cómoda.~This option is more comfortable.','Este intento es mejor que el anterior.~This attempt is better than the previous one.')
G('estar','Estar describes a current state or location. It agrees with the subject: está for one, están for more than one.','La silla está aquí.~The chair is here.','Las sillas están aquí.~The chairs are here.')
G('gerund','Estar + gerund describes an action in progress. Regular endings are -ando for -ar and -iendo for -er/-ir.','Estoy practicando.~I am practicing.','Estamos leyendo.~We are reading.')
G('tenerque','Tener que + infinitive expresses a need or obligation. The second verb is not conjugated.','Tengo que confirmar.~I have to confirm.','Tenemos que preguntar.~We have to ask.')
G('poder','Poder + infinitive expresses ability or a request. Puedo, puedes and puede change o to ue; podemos keeps o.','¿Puedo preguntar?~May I ask?','Podemos hacer una pausa.~We can take a break.')
G('preterite','The preterite describes completed past events. Regular -ar yo forms end in -é; regular -er/-ir yo forms end in -í.','Ayer practiqué.~Yesterday I practiced.','Después escribí una nota.~Then I wrote a note.')
G('voy','Ir a + infinitive expresses a plan. Change ir for the person; leave the action verb in its dictionary form.','Voy a practicar.~I am going to practice.','¿Qué vas a preguntar?~What are you going to ask?')
G('pronouns','Lo/la/los/las replace direct objects. Put them before a conjugated verb or attach them to an infinitive or positive command.','La guardo aquí.~I put it here.','Voy a guardarla aquí.~I am going to put it here.')
G('querer','Querer + noun or infinitive expresses a preference. Me gustaría makes a softer request; clarify rather than assume.','Quiero este diseño.~I want this design.','Me gustaría comparar otra opción.~I would like to compare another option.')
G('porque','Por qué asks why; porque introduces a reason. Explain the reason and then say what you can do next.','¿Por qué llegas tarde?~Why are you arriving late?','Llego tarde porque hay tráfico.~I am arriving late because there is traffic.')
G('imperfect','Use the imperfect for past habits and background descriptions; use the preterite for completed events.','Antes ensayábamos los lunes.~We used to rehearse on Mondays.','Ayer ensayamos el final.~Yesterday we rehearsed the ending.')
G('conditional','The conditional softens suggestions. Podríamos means we could; preferiría means I would prefer.','Podríamos probar otra opción.~We could try another option.','Preferiría confirmar primero.~I would prefer to confirm first.')
G('antesdespues','Antes de and después de introduce an infinitive when the subject stays the same.','Pregunto antes de empezar.~I ask before starting.','Confirmo después de revisar.~I confirm after checking.')
G('perfect','Haber + past participle connects a completed action to the present situation. Use he/has/ha/hemos/han; the participle stays unchanged.','He confirmado la cita.~I have confirmed the appointment.','Hemos confirmado el horario.~We have confirmed the schedule.')
G('frequency','Con qué frecuencia asks how often. Use normalmente, a veces or a repeated-day phrase for a habit.','¿Con qué frecuencia practicas?~How often do you practice?','Normalmente practico los viernes.~I normally practice on Fridays.')
G('subjunctive','A wish or request about another subject often uses que + subjunctive. Compare quiero confirmar with quiero que confirmes.','Quiero confirmar el plan.~I want to confirm the plan.','Quiero que confirmes el plan.~I want you to confirm the plan.')
G('pastcontrast','Use the imperfect for background, preterite for events, and había + participle for an earlier past action.','Estábamos esperando cuando llegó el aviso.~We were waiting when the notice arrived.','Ya habíamos confirmado el horario.~We had already confirmed the schedule.')
SHARED=[dict(target='¿Puedes repetirlo más despacio?',native='Can you repeat it more slowly?'),dict(target='Quiero confirmar que entendí.',native='I want to confirm that I understood.')]
COUNTS={'foundation':10,'core':30,'master':20}
def write(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
practice={};native=[]
for course,meta in COURSES.items():
 for stage,count in COUNTS.items():
  rows=[l for l in LESSONS if l['course']==course and l['stage']==stage];assert len(rows)==count,(course,stage,len(rows))
  module=course if stage=='core' else stage+'-'+course;out=[];public={};practice[module]={}
  for n,row in enumerate(rows,1):
   words=[dict(es=w['target'],en=w['native'],kind='term') for w in row['terms']]+[dict(es=w['target'],en=w['native'],kind='phrase') for w in row['phrases']+SHARED]
   notes={'los tenis':'Common in Mexico and parts of Latin America; also zapatos deportivos or zapatillas.','la liga':'In this hair context, a hair tie; also goma or gomita in other regions.','el moño':'Here, a hair bun; the same word can mean a bow in other contexts.','el retiro':'Here, product removal; retirada is another regional term.','el curado':'In nail-product instructions, curing; this is different from air drying.'}
   for word in words:
    if word['es'] in notes:word['note']=notes[word['es']]
   grammar=GRAMMAR[row['grammarKey']];reading=dict(title=row['title'],target=[s['target'] for s in row['story']],native=[s['native'] for s in row['story']])
   lesson=dict(n=n,title=row['title'],objective=row['goal'],focus=grammar['focus'],grammar=grammar,words=words,speaking=row['goal']+' Speak in Spanish; ask for help or slower speech when needed. End by confirming the agreed next step.',openingLine=row['opening'],partnerRole=row['partner'],readingTemplate=f'seed-es-{module}-lesson-{n}')
   if stage=='master':lesson.update(lessonType=['Teach-back','Case','People','Document','Capstone'][(n-1)%5],block='ABCDE'[(n-1)//4])
   if stage!='master':lesson.pop('grammar')
   out.append(lesson);v=[verb(v) for v in row['verbs']];assert len(v)==(5 if stage=='master' else 3),(module,n,len(v))
   public[str(n)]=dict(passage=reading,words=words,verbs=v)
   practice[module][str(n)]=dict(stage=stage,reading=reading,speaking=lesson['speaking'],openingLine=row['opening'],partnerRole=row['partner'],grammar=grammar)
   native.append(dict(module=course,stage=stage,n=n,title=row['title'],objective=row['goal'],explanation=grammar['focus'],words=words,passage=reading,verbs=v,speaking=lesson['speaking'],openingLine=row['opening'],partnerRole=row['partner']))
  common=dict(version=1,module=module,language='Spanish',nativeLanguage='English',headline=meta['title']+' '+('Core 30' if stage=='core' else stage.title()),threshold=f'Use Spanish to complete the {meta["title"]} situations, ask for clarification, and confirm a shared plan.',reviewed=False,lessons=out)
  if stage!='core':common.update(baseModule=course,stage=stage)
  write(ROOT/('src/data/interests-spanish-'+course+'-core.json' if stage=='core' else f'src/data/core60/es/{module}.json'),common)
  write(ROOT/f'public/lesson-content/es/{module}.json',dict(version=1,module=module,language='Spanish',nativeLanguage='English',reviewed=False,lessons=public))
write(ROOT/'src/data/interests-spanish-practice.json',practice)
write(ROOT/'content/interests-spanish/native-lessons.json',native)
indexpath=ROOT/'public/lesson-content/index.json';index=json.loads(indexpath.read_text());ids=set(practice);index['files']=[x for x in index['files'] if not (x['language']=='es' and x['module'] in ids)]
for module,lessons in practice.items():index['files'].append(dict(language='es',module=module,lessons=len(lessons),bytes=(ROOT/f'public/lesson-content/es/{module}.json').stat().st_size,reviewed=False))
index['files'].sort(key=lambda x:(x['language'],x['module']));indexpath.write_text(json.dumps(index,ensure_ascii=False)+'\n')
write(ROOT/'content/interests-spanish/review.json',dict(status='authored 60 draft for each course; integration validation pending',target='Spanish',native='English',courses=list(COURSES),humanReviewed=False,recordedAudio='Not generated by this builder. Web uses existing speech service; V4 needs exact-text recording coverage before claiming full Hear It audio.',source='source.py',authoredSourceSHA256=hashlib.sha256((ROOT/'content/interests-spanish/source.py').read_bytes()).hexdigest(),customAssessment=False,customSceneImages=False))
print('Built 120 original lessons: two 10/30/20 Spanish courses, with aligned readings, vocabulary, grammar and verbs.')
