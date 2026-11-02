"""Explicit teaching families, not a claim that Spanish has exactly 28 tenses.
Five reference persons follow the app's Latin American convention (ustedes, no vosotros).
Commands list only meaningful addressees. Sources and review status: sources.json.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
KEYS=['yo','tú','él_ella_usted','nosotros','ellos_ustedes']
PRONOUNS=['yo','tú','él / ella / usted','nosotros / nosotras','ellos / ellas / ustedes']
DATA='''hablar|speak
trabajar|work
estudiar|study
comprar|buy
caminar|walk
llamar|call
escuchar|listen
mirar|look
ayudar|help
necesitar|need
comer|eat
beber|drink
aprender|learn
comprender|understand
vender|sell
correr|run
leer|read
creer|believe
responder|answer
romper|break
vivir|live
escribir|write
abrir|open
recibir|receive
subir|go up
decidir|decide
permitir|allow
compartir|share
cumplir|fulfill
asistir|attend
pensar|think
querer|want
empezar|begin
comenzar|start
cerrar|close
entender|understand
perder|lose
preferir|prefer
sentir|feel
mentir|lie
poder|be able to
volver|return
dormir|sleep
contar|count / tell
encontrar|find
recordar|remember
mostrar|show
costar|cost
probar|try
sonar|sound
pedir|ask for
servir|serve
repetir|repeat
seguir|follow / continue
conseguir|obtain
perseguir|pursue
vestir|dress
competir|compete
impedir|prevent
medir|measure
tener|have
venir|come
poner|put
salir|go out
hacer|do / make
decir|say / tell
traer|bring
oír|hear
caer|fall
valer|be worth
conocer|know / meet
parecer|seem
ofrecer|offer
obedecer|obey
crecer|grow
merecer|deserve
pertenecer|belong
establecer|establish
reconocer|recognize
agradecer|thank
lavarse|wash oneself
levantarse|get up
ducharse|take a shower
prepararse|get ready
quedarse|stay
llamarse|be called
peinarse|comb one's hair
afeitarse|shave
bañarse|bathe
cepillarse|brush one's teeth
buscar|look for
sacar|take out
tocar|touch / play
explicar|explain
practicar|practice
llegar|arrive
pagar|pay
jugar|play
almorzar|have lunch
cruzar|cross
andar|walk / go around
estar|be (condition / location)
saber|know (facts / skills)
ser|be (identity)
haber|have (auxiliary)
ir|go
pasar|happen / pass
llevar|carry / wear
quedar|remain / arrange to meet
dejar|leave / let
gustar|be pleasing to
coger|take (Spain; vulgar in some Latin American regions)
unir|join
meter|put in
entrar|enter
preguntar|ask a question
tomar|take / drink
cambiar|change
esperar|wait / hope
echar|throw / put
acordar|agree
ganar|win / earn
mandar|send / order'''
GLOSS=dict(line.split('|') for line in DATA.splitlines())
AR='hablar trabajar estudiar comprar caminar llamar escuchar mirar ayudar necesitar'.split()
ER='comer beber aprender comprender vender correr leer creer responder romper'.split()
IR='vivir escribir abrir recibir subir decidir permitir compartir cumplir asistir'.split()
EIE='pensar querer empezar comenzar cerrar entender perder preferir sentir mentir'.split()
OUE='poder volver dormir contar encontrar recordar mostrar costar probar sonar'.split()
EI='pedir servir repetir seguir conseguir perseguir vestir competir impedir medir'.split()
GO='tener venir poner salir hacer decir traer oír caer valer'.split()
ZCO='conocer parecer ofrecer obedecer crecer merecer pertenecer establecer reconocer agradecer'.split()
REF='lavarse levantarse ducharse prepararse quedarse llamarse peinarse afeitarse bañarse cepillarse'.split()
SPELL='buscar sacar tocar explicar practicar llegar pagar jugar almorzar cruzar'.split()
STRONG='tener estar andar poder poner saber querer venir hacer decir'.split()
STEMPAST='pedir servir repetir seguir conseguir perseguir vestir competir dormir sentir'.split()
FUTSTEMS=dict(tener='tendr',venir='vendr',poner='pondr',salir='saldr',hacer='har',decir='dir',poder='podr',querer='querr',saber='sabr',haber='habr',valer='valdr')
PRETSTEMS=dict(tener='tuv',estar='estuv',andar='anduv',poder='pud',poner='pus',saber='sup',querer='quis',venir='vin',hacer='hic',decir='dij',traer='traj',haber='hub')
IRREG={
 'ser':'soy eres es somos son','estar':'estoy estás está estamos están','ir':'voy vas va vamos van','haber':'he has ha hemos han',
 'tener':'tengo tienes tiene tenemos tienen','venir':'vengo vienes viene venimos vienen','poner':'pongo pones pone ponemos ponen',
 'salir':'salgo sales sale salimos salen','hacer':'hago haces hace hacemos hacen','decir':'digo dices dice decimos dicen',
 'traer':'traigo traes trae traemos traen','oír':'oigo oyes oye oímos oyen','caer':'caigo caes cae caemos caen','valer':'valgo vales vale valemos valen',
 'coger':'cojo coges coge cogemos cogen','dar':'doy das da damos dan','almorzar':'almuerzo almuerzas almuerza almorzamos almuerzan','saber':'sé sabes sabe sabemos saben','seguir':'sigo sigues sigue seguimos siguen','conseguir':'consigo consigues consigue conseguimos consiguen','perseguir':'persigo persigues persigue perseguimos persiguen',
 'jugar':'juego juegas juega jugamos juegan','acordar':'acuerdo acuerdas acuerda acordamos acuerdan'}
PART=dict(escribir='escrito',abrir='abierto',romper='roto',volver='vuelto',poner='puesto',hacer='hecho',decir='dicho',ver='visto',morir='muerto')
GLOSS['ver']='see'; IRREG['ver']='veo ves ve vemos ven'
GLOSS.update(dict(deber='have to / owe',realizar='carry out',crear='create',presentar='present / introduce',tratar='try / deal with',utilizar='use',incluir='include',desarrollar='develop',destacar='highlight / stand out',existir='exist',producir='produce',considerar='consider',mantener='maintain / keep',partir='depart / split',formar='form',suponer='suppose / entail',obtener='obtain'))
IRREG.update(dict(incluir='incluyo incluyes incluye incluimos incluyen',producir='produzco produces produce producimos producen',mantener='mantengo mantienes mantiene mantenemos mantienen',suponer='supongo supones supone suponemos suponen',obtener='obtengo obtienes obtiene obtenemos obtienen'))
PRETSTEMS.update(dict(producir='produj',mantener='mantuv',suponer='supus',obtener='obtuv'))
FUTSTEMS.update(dict(mantener='mantendr',suponer='supondr',obtener='obtendr'))

def stemchange(stem,old,new):
 pos=stem.rfind(old);assert pos>=0,(stem,old);return stem[:pos]+new+stem[pos+len(old):]
def present(v):
 if v.endswith('se'):
  return [p+' '+f for p,f in zip(['me','te','se','nos','se'],present(v[:-2]))]
 if v in IRREG:return IRREG[v].split()
 stem,end=v[:-2],v[-2:];ends={'ar':['o','as','a','amos','an'],'er':['o','es','e','emos','en'],'ir':['o','es','e','imos','en']}[end]
 if v in EIE: stems=[stemchange(stem,'e','ie') if i!=3 else stem for i in range(5)]
 elif v in OUE:stems=[stemchange(stem,'o','ue') if i!=3 else stem for i in range(5)]
 elif v in EI:stems=[stemchange(stem,'e','i') if i!=3 else stem for i in range(5)]
 else:stems=[stem]*5
 forms=[s+e for s,e in zip(stems,ends)]
 if v in ZCO:forms[0]=stem[:-1]+'zc'+'o'
 if v=='leer':forms[3]='leemos'
 return forms
def preterite(v):
 if v=='dar':return 'di diste dio dimos dieron'.split()
 if v in ['ser','ir']:return 'fui fuiste fue fuimos fueron'.split()
 if v=='ver':return 'vi viste vio vimos vieron'.split()
 if v in PRETSTEMS:
  stem=PRETSTEMS[v];f=[stem+e for e in ['e','iste','o','imos','eron' if stem.endswith('j') else 'ieron']]
  if v=='hacer':f[2]='hizo'
  return f
 stem,end=v[:-2],v[-2:];ends=['é','aste','ó','amos','aron'] if end=='ar' else ['í','iste','ió','imos','ieron'];f=[stem+e for e in ends]
 if end=='ar':
  if v.endswith('car'):f[0]=stem[:-1]+'qué'
  if v.endswith('gar'):f[0]=stem+'ué'
  if v.endswith('zar'):f[0]=stem[:-1]+'cé'
 if end=='ir' and v in EIE+EI+OUE:
  changed=stemchange(stem,'o','u') if v=='dormir' else stemchange(stem,'e','i')
  f[2]=changed+'ió';f[4]=changed+'ieron'
 if v=='incluir':f[2]='incluyó';f[4]='incluyeron'
 if v in ['leer','creer','oír','caer']:
  f=[stem+'í',stem+'íste',stem+'yó',stem+'ímos',stem+'yeron']
 return f
def subj(v):
 special={'dar':'dé des dé demos den','ser':'sea seas sea seamos sean','estar':'esté estés esté estemos estén','ir':'vaya vayas vaya vayamos vayan','haber':'haya hayas haya hayamos hayan','saber':'sepa sepas sepa sepamos sepan'}
 if v in special:return special[v].split()
 stem=present(v)[0][:-1];ends=['e','es','e','emos','en'] if v.endswith('ar') else ['a','as','a','amos','an']
 if v.endswith('car'):stem=stem[:-1]+'qu'
 if v.endswith('gar'):stem=stem+'u'
 if v.endswith('zar'):stem=stem[:-1]+'c'
 f=[stem+e for e in ends]
 if v in EIE+OUE and not v.endswith('ir'):f[3]=v[:-2]+ends[3]
 if v in EIE+OUE and v.endswith('ir'):
  base=stemchange(v[:-2],'o','u') if v=='dormir' else stemchange(v[:-2],'e','i');f[3]=base+'amos'
 if v in ['seguir','conseguir','perseguir']:f[3]=stem+'amos'
 return f
def participle(v):
 if v in PART:return PART[v]
 if v in ['leer','creer','oír','caer','traer']:return v[:-2]+'ído'
 return v[:-2]+('ado' if v.endswith('ar') else 'ido')
def focused(v,pattern):
 if pattern.startswith('present-') or pattern=='reflexive':return dict(zip(KEYS,present(v)))
 if pattern=='near-future':return dict(zip(KEYS,[x+' a '+v for x in present('ir')]))
 if pattern.startswith('preterite-'):return dict(zip(KEYS,preterite(v)))
 if pattern.startswith('imperfect-'):
  special={'ser':'era eras era éramos eran','ir':'iba ibas iba íbamos iban','ver':'veía veías veía veíamos veían'}
  f=special[v].split() if v in special else [v[:-2]+e for e in (['aba','abas','aba','ábamos','aban'] if v.endswith('ar') else ['ía','ías','ía','íamos','ían'])]
  return dict(zip(KEYS,f))
 if pattern in ['future','conditional']:
  stem=FUTSTEMS.get(v,v);ends=['é','ás','á','emos','án'] if pattern=='future' else ['ía','ías','ía','íamos','ían'];return dict(zip(KEYS,[stem+x for x in ends]))
 if pattern=='subjunctive':return dict(zip(KEYS,subj(v)))
 if pattern=='past-subjunctive':
  stem=preterite(v)[4][:-3];f=[stem+e for e in ['ra','ras','ra','ramos','ran']]
  # Nosotros carries the stress on the vowel before -ramos.
  f[3]=stem[:-1]+stem[-1].translate(str.maketrans('aeiou','áéíóú'))+'ramos'
  return dict(zip(KEYS,f))
 if pattern=='command-tu':
  special=dict(decir='di',hacer='haz',ir='ve',poner='pon',salir='sal',ser='sé',tener='ten',venir='ven')
  return {'tú':special.get(v,present(v)[2])}
 if pattern=='command-negative':return {'tú':'no '+subj(v)[1]}
 if pattern=='command-formal':return {'usted':subj(v)[2],'ustedes':subj(v)[4]}
 if pattern=='progressive':
  if v=='ir':g='yendo'
  elif v in ['leer','creer','oír','caer','traer']:g=v[:-2]+'yendo'
  else:
   stem=v[:-2]
   if v.endswith('ir') and v in EIE+EI+OUE:stem=stemchange(stem,'o','u') if v=='dormir' else stemchange(stem,'e','i')
   g=stem+('ando' if v.endswith('ar') else 'iendo')
  return dict(zip(KEYS,[x+' '+g for x in present('estar')]))
 if pattern in ['perfect','pluperfect','conditional-perfect']:
  aux={'perfect':present('haber'),'pluperfect':['había','habías','había','habíamos','habían'],'conditional-perfect':['habría','habrías','habría','habríamos','habrían']}[pattern]
  return dict(zip(KEYS,[a+' '+participle(v) for a in aux]))
 raise ValueError(pattern)
PATTERNS=[
 ('present-ar','Regular -ar present','Remove -ar; add -o, -as, -a, -amos, -an. Use the present for habits and current facts.',AR),
 ('present-er','Regular -er present','Remove -er; add -o, -es, -e, -emos, -en. Notice nosotros ends in -emos.',ER),
 ('present-ir','Regular -ir present','Remove -ir; add -o, -es, -e, -imos, -en. Nosotros distinguishes -ir from -er.',IR),
 ('present-e-ie','Present e → ie','Change the last stem e to ie in stressed forms; nosotros keeps e. The endings follow the infinitive family.',EIE),
 ('present-o-ue','Present o → ue','Change the last stem o to ue in stressed forms; nosotros keeps o. Costar commonly describes a thing, not a person.',OUE),
 ('present-e-i','Present e → i','These -ir verbs change the last stem e to i in stressed forms. Nosotros keeps e. Seguir also loses u before o.',EI),
 ('present-go','Present irregular yo in -go','Memorize the yo form in -go. Tener and venir also change e to ie; decir changes e to i; oír has y in several other persons.',GO),
 ('present-zco','Present yo in -zco','These selected verbs use -zco in yo and regular present endings elsewhere. This is a teaching family, not a rule for every -cer or -cir verb.',ZCO),
 ('reflexive','Reflexive present','Match me, te, se, nos, se to the subject; put the pronoun before the conjugated verb. The infinitive ends in -se.',REF),
 ('near-future','Plans: ir a + infinitive','Conjugate ir for the person, then add a and the unchanged infinitive. This construction describes plans or an approaching event.',AR),
 ('preterite-ar','Regular -ar preterite','Completed bounded events use -é, -aste, -ó, -amos, -aron. Yo and él forms require written accents; nosotros matches present in spelling.',AR),
 ('preterite-er-ir','Regular -er / -ir preterite','Use -í, -iste, -ió, -imos, -ieron. This bank avoids vowel-stem and other irregular preterites.',[x for x in ER+IR if x not in ['leer','creer']][:10]),
 ('preterite-spelling','Preterite spelling changes','In yo, -car becomes -qué, -gar becomes -gué, and -zar becomes -cé to preserve pronunciation. Other persons follow regular -ar endings.',SPELL),
 ('preterite-strong','Strong irregular preterite','Use the memorized irregular stem with -e, -iste, -o, -imos, -ieron, without written accents. Decir uses dijeron; hacer uses hizo.',STRONG),
 ('preterite-stem','Preterite -ir stem changes','These -ir verbs change e to i or o to u only in él / ella / usted and ellos / ellas / ustedes. Nosotros keeps the infinitive stem.',STEMPAST),
 ('imperfect-ar','Past habits: -ar imperfect','Use -aba, -abas, -aba, -ábamos, -aban for background, ongoing situations and habitual past actions. Context separates yo from él.',AR),
 ('imperfect-er-ir','Past habits: -er / -ir imperfect','Use -ía, -ías, -ía, -íamos, -ían for background and repeated past actions. All these endings carry a written accent.',ER),
 ('future','Future simple','Add -é, -ás, -á, -emos, -án to the infinitive or listed irregular future stem. The future can predict and can express a guess.',['hablar','comer','vivir','tener','venir','poner','salir','hacer','decir','poder']),
 ('conditional','Conditional simple','Add -ía, -ías, -ía, -íamos, -ían to the infinitive or irregular future stem. Use for hypothetical results and softened requests.', ['hablar','comer','vivir','tener','venir','poner','salir','hacer','decir','poder']),
 ('subjunctive','Present subjunctive','After a suitable trigger such as Espero que, use the present subjunctive. Start from yo present, remove o, and switch ar to e endings, er/ir to a endings; learn exceptions.', ['hablar','comer','vivir','tener','hacer','poder','pedir','dormir','ser','ir']),
 ('past-subjunctive','Imperfect subjunctive: -ra','Take the preterite ellos form, remove -ron, and add -ra, -ras, -ra, -ramos, -ran; accent the nosotros stem vowel. Used after past wishes and in si hypotheses.', ['hablar','comer','vivir','tener','hacer','poder','pedir','dormir','ser','ir']),
 ('command-tu','Affirmative tú commands','For regular affirmative tú commands use the él present form. Memorize di, haz, ve, pon, sal, sé, ten and ven; this bank practices those eight plus two regular verbs.', ['decir','hacer','ir','poner','salir','ser','tener','venir','hablar','comer']),
 ('command-negative','Negative tú commands','Use no plus the tú present subjunctive. Affirmative and negative tú commands use different patterns. Any object pronoun goes before the verb.', ['hablar','comer','vivir','tener','hacer','poder','pedir','dormir','ser','ir']),
 ('command-formal','Usted / ustedes commands','Use the usted or ustedes present subjunctive for formal commands. No creates a negative command with the same verb form. Both addressees are practiced.', ['hablar','comer','vivir','tener','hacer','poder','pedir','dormir','ser','ir']),
 ('progressive','Present progressive','Use estar plus -ando for -ar or -iendo for -er/-ir to emphasize an action in progress. Leer uses leyendo; dormir uses durmiendo; pedir uses pidiendo.', ['hablar','comer','vivir','escribir','leer','dormir','pedir','seguir','hacer','trabajar']),
 ('perfect','Present perfect','Use he, has, ha, hemos, han plus an invariant participle. Regular participles end in -ado or -ido; learn the listed irregular ones. Regional use versus the preterite varies.', ['hablar','comer','vivir','escribir','abrir','romper','volver','poner','hacer','decir']),
 ('pluperfect','Pluperfect: earlier past','Use había, habías, había, habíamos, habían plus an invariant participle for an action already completed before another past reference point.', ['hablar','comer','vivir','escribir','abrir','romper','volver','poner','hacer','decir']),
 ('conditional-perfect','Conditional perfect','Use habría, habrías, habría, habríamos, habrían plus an invariant participle for a hypothetical completed action. A counterfactual si clause needs the appropriate past subjunctive.', ['hablar','comer','vivir','escribir','abrir','romper','volver','poner','hacer','decir'])]
assert len(PATTERNS)==28
assert all(len(p[3])==10 and len(set(p[3]))==10 for p in PATTERNS)
if __name__=='__main__':
 for key,title,rule,bank in PATTERNS:
  for v in bank:assert focused(v,key)
 print('28 teaching families; 10 distinct verbs per family; complete deterministic forms.')
