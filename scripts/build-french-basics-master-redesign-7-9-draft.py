#!/usr/bin/env python3
"""Author French Master 7–9 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
SPANISH='src/data/core60/es/master-spanish-basics.json'
PRACTICE='src/data/spanish-basics-practice.json'
PRIOR='content/french-basics/master-4-6-redesign-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
7:{
 'title':'Adapter son programme d’étude',
 'scene':'Un cours change d’horaire; deux camarades distinguent leurs habitudes d’une exception et réorganisent la semaine.',
 'focus':'imparfait habituel; présent exceptionnel; sauf; au lieu de; proposer un autre créneau',
 'grammar':{'explanation':'Use the imparfait for a repeated past routine (je révisais chaque mardi) and present or near future for the current exception (aujourd’hui, je travaille; cette semaine, je vais réviser jeudi). Add normalement, d’habitude, cette semaine, sauf and au lieu de so a listener can separate habit from a one-off change. Confirm a revised time, not just an intention.', 'model':{'habit':'D’habitude, je révisais le mardi après le cours.','exception':'Cette semaine, le cours a lieu jeudi.','proposal':'Au lieu de mardi, révisons ensemble vendredi.','confirmation':'Vendredi à dix-sept heures me convient.'}, 'caution':'The Spanish source drills present -ar endings. French Master 7 should evaluate a change to a real routine; review the imparfait and time sequence for learner readiness.'},
 'terms':[('d’habitude','usually'),('cette semaine','this week'),('au lieu de','instead of'),('sauf','except'),('un créneau','a time slot'),('réviser','to review'),('déplacer le cours','to move the class'),('cela me convient','that works for me')],
 'readingTitle':'Un autre jour pour réviser',
 'pairs':[
 ('Camille : D’habitude, je révisais le mardi après notre cours de langue.','Camille: I usually reviewed on Tuesdays after our language class.'),
 ('Hugo : Moi aussi, mais le cours de cette semaine a été déplacé au jeudi.','Hugo: I did too, but this week’s class has been moved to Thursday.'),
 ('Camille : Donc notre séance habituelle de mardi ne convient plus.','Camille: So our usual Tuesday study session no longer works.'),
 ('Hugo : Exactement. Mardi, je dois préparer une présentation au lieu de réviser.','Hugo: Exactly. On Tuesday I have to prepare a presentation instead of reviewing.'),
 ('Camille : Je peux étudier seule mercredi, sauf entre quatorze et seize heures.','Camille: I can study alone on Wednesday, except between two and four.'),
 ('Hugo : Et si nous révisions ensemble vendredi après le cours ?','Hugo: What if we reviewed together on Friday after class?'),
 ('Camille : Vendredi me convient, mais je termine mon travail à seize heures trente.','Camille: Friday works for me, but I finish work at four thirty.'),
 ('Hugo : Nous pourrions commencer à dix-sept heures à la bibliothèque.','Hugo: We could start at five o’clock at the library.'),
 ('Camille : Avant, nous étudiions pendant une heure ; cette fois, prévoyons quatre-vingt-dix minutes.','Camille: Before, we studied for an hour; this time, let us plan ninety minutes.'),
 ('Hugo : D’accord. Je préparerai les questions de lecture jeudi soir.','Hugo: Agreed. I will prepare the reading questions on Thursday evening.'),
 ('Camille : Je ferai les cartes de vocabulaire, puis nous comparerons nos réponses vendredi.','Camille: I will make the vocabulary cards, then we will compare our answers on Friday.'),
 ('Hugo : C’est confirmé : vendredi à dix-sept heures, à la bibliothèque.','Hugo: It is confirmed: Friday at five o’clock, at the library.')],
 'speaking':{'role':'Agree on a revised study routine with a classmate.','opening':'Notre cours a été déplacé au jeudi cette semaine.','objectives':['Describe the usual Tuesday routine','Identify this week’s exception','Offer an alternate study slot','Confirm place, time, and preparation'], 'complication':'The class time changes and Tuesday is occupied by another commitment.','closure':'Confirm the new Friday plan and what each person prepares.'},
 'checks':[('recall','Complete the contrast: D’habitude, je ___ le mardi.','révisais'),('write','Write in French: Friday works for me, but I finish work at four thirty.','Vendredi me convient, mais je termine mon travail à seize heures trente.'),('listening','Where and when is the revised session?','Friday at five o’clock at the library.','C’est confirmé : vendredi à dix-sept heures, à la bibliothèque.'),('comprehension','Why can Hugo not review on Tuesday?','He must prepare a presentation.'),('application','State the usual routine and the one-off Friday plan.','D’habitude, nous révisions le mardi ; cette semaine, nous réviserons vendredi à dix-sept heures.')],
},
8:{
 'title':'Lire un message et négocier un rendez-vous',
 'scene':'Une coordinatrice demande une réponse avant midi; son horaire proposé entre en conflit avec un autre engagement.',
 'focus':'repérer demande et échéance; demander de; répondre que; conditionnel poli; convenir de',
 'grammar':{'explanation':'Extract the requested action and deadline from a written message before replying. Use demander de + infinitive to report a request (elle demande de répondre avant midi) and répondre que + clause for your reply. State the conflict precisely, propose a realistic alternate time with the conditional (pourrions-nous), then restate the agreed time in writing.', 'model':{'request':'Elle demande de confirmer le rendez-vous avant midi.','conflict':'Je ne suis pas disponible mardi à quinze heures.','proposal':'Pourrions-nous nous voir mercredi à neuf heures ?','confirmation':'Je confirme notre rendez-vous mercredi à neuf heures.'}, 'caution':'The Spanish source repeats -ir morphology. This task evaluates reading a deadline and composing a concise reply; confirm that the conditional is scaffolded for this stage.'},
 'terms':[('une échéance','a deadline'),('avant midi','before noon'),('un rendez-vous','an appointment'),('être indisponible','to be unavailable'),('pourrions-nous','could we'),('convenir de','to agree on'),('confirmer par écrit','to confirm in writing'),('un autre créneau','another time slot')],
 'readingTitle':'Répondre avant midi',
 'pairs':[
 ('Coordinatrice : Bonjour Camille, merci de confirmer le rendez-vous avant midi.','Coordinator: Hello Camille, please confirm the appointment before noon.'),
 ('Coordinatrice : Je propose mardi à quinze heures dans mon bureau.','Coordinator: I suggest Tuesday at three o’clock in my office.'),
 ('Camille : Je dois d’abord repérer la demande et son échéance.','Camille: I first need to identify the request and its deadline.'),
 ('Camille : Elle demande une confirmation avant midi, mais mardi à quinze heures ne me convient pas.','Camille: She asks for confirmation before noon, but Tuesday at three does not work for me.'),
 ('Hugo : Tu as déjà un autre engagement à cette heure-là ?','Hugo: Do you already have another commitment at that time?'),
 ('Camille : Oui, mon cours se termine seulement à quinze heures trente.','Camille: Yes, my class does not finish until three thirty.'),
 ('Hugo : Réponds brièvement et propose un créneau précis.','Hugo: Reply briefly and suggest a specific time slot.'),
 ('Camille : Bonjour, merci pour votre message et votre proposition.','Camille: Hello, thank you for your message and your suggestion.'),
 ('Camille : Je ne suis pas disponible mardi à quinze heures ; pourrions-nous nous voir mercredi à neuf heures ?','Camille: I am unavailable Tuesday at three; could we meet Wednesday at nine?'),
 ('Coordinatrice : Mercredi à neuf heures me convient, dans le même bureau.','Coordinator: Wednesday at nine works for me, in the same office.'),
 ('Camille : Je vous remercie et confirme notre rendez-vous mercredi à neuf heures.','Camille: Thank you, and I confirm our appointment for Wednesday at nine.'),
 ('Hugo : Tu as répondu avant midi et vérifié le nouvel horaire par écrit.','Hugo: You replied before noon and checked the new time in writing.')],
 'speaking':{'role':'Read a coordinator’s message and negotiate an appointment.','opening':'Je propose mardi à quinze heures; merci de répondre avant midi.','objectives':['Identify request and reply deadline','Explain the conflict without overexplaining','Propose a precise alternate slot politely','Confirm the accepted time and place'], 'complication':'The original time conflicts with a class.','closure':'Restate the agreed Wednesday meeting in writing.'},
 'checks':[('recall','When must Camille answer?','Before noon.'),('write','Write a polite alternate-time request in French.','Pourrions-nous nous voir mercredi à neuf heures ?'),('listening','Which time does the coordinator accept?','Wednesday at nine.','Mercredi à neuf heures me convient, dans le même bureau.'),('comprehension','Why is Tuesday at three impossible?','Camille’s class ends at three thirty.'),('application','Confirm the accepted appointment in French.','Je confirme notre rendez-vous mercredi à neuf heures.')],
},
9:{
 'title':'Comparer des options et justifier son choix',
 'scene':'Deux camarades choisissent une lampe de travail; leur premier choix est épuisé, donc ils évaluent une solution de rechange.',
 'focus':'plus/moins/aussi...que; meilleur; cependant; vérifier la préférence',
 'grammar':{'explanation':'Compare the properties that matter for the task, not just color. Use plus/moins/aussi + adjective + que and meilleur for better quality; adjective agreement still applies (une lampe légère, des lampes légères). Give a reason, acknowledge a limitation with cependant, and ask for the other person’s preference. If the preferred item is unavailable, compare the second option against the same criteria.', 'model':{'comparison':'La lampe A est plus légère que la lampe B.','tradeoff':'La lampe B est moins chère, mais son autonomie est plus courte.','choice':'Je préfère la lampe A parce que sa batterie dure plus longtemps.','fallback':'Cependant, elle est épuisée ; choisissons la lampe C.'}, 'caution':'The Spanish source teaches basic adjective agreement. This Master task adds reasoned comparison and a fallback; verify price, battery, and availability terminology for the setting.'},
 'terms':[('une lampe de travail','a work lamp'),('autonomie','battery life'),('plus légère que','lighter than'),('moins chère que','less expensive than'),('aussi solide que','as sturdy as'),('épuisée','sold out'),('une solution de rechange','an alternative'),('cependant','however')],
 'readingTitle':'La lampe qui convient',
 'pairs':[
 ('Ana : Pour notre atelier, il nous faut une lampe facile à transporter.','Ana: For our workshop, we need a lamp that is easy to carry.'),
 ('Hugo : La lampe A est plus légère que la lampe B.','Hugo: Lamp A is lighter than lamp B.'),
 ('Ana : Elle a aussi une meilleure autonomie pour les longues séances.','Ana: It also has better battery life for long sessions.'),
 ('Hugo : La lampe B est moins chère, mais sa batterie dure moins longtemps.','Hugo: Lamp B is less expensive, but its battery lasts less time.'),
 ('Ana : Je choisirais la lampe A, car nous travaillons parfois loin d’une prise.','Ana: I would choose lamp A because we sometimes work far from an outlet.'),
 ('Hugo : Quelle option préfères-tu si nous ne pouvons pas acheter la lampe A ?','Hugo: Which option do you prefer if we cannot buy lamp A?'),
 ('Ana : Vérifions d’abord le stock avant de décider.','Ana: Let us check the stock before deciding.'),
 ('Vendeur : La lampe A est épuisée, mais la lampe C est disponible.','Salesperson: Lamp A is sold out, but lamp C is available.'),
 ('Hugo : La lampe C est aussi solide que la lampe A, mais un peu plus lourde.','Hugo: Lamp C is as sturdy as lamp A, but a little heavier.'),
 ('Ana : Cependant, son autonomie reste meilleure que celle de la lampe B.','Ana: However, its battery life is still better than lamp B’s.'),
 ('Hugo : Alors je préfère la lampe C ; elle répond à nos deux critères principaux.','Hugo: Then I prefer lamp C; it meets our two main criteria.'),
 ('Ana : D’accord. Confirmons le prix et choisissons la lampe C.','Ana: Agreed. Let us confirm the price and choose lamp C.')],
 'speaking':{'role':'Choose a practical lamp with a classmate.','opening':'Quelle lampe convient le mieux à notre atelier ?','objectives':['Compare two relevant properties','Explain the preferred choice','Handle the sold-out option','Check the other person’s preference and confirm the fallback'], 'complication':'Lamp A is sold out; compare C against B with the same criteria.','closure':'Confirm the price before buying the selected lamp.'},
 'checks':[('recall','Which lamp is lighter than B?','Lamp A.'),('write','Write in French: Lamp C is as sturdy as lamp A, but a little heavier.','La lampe C est aussi solide que la lampe A, mais un peu plus lourde.'),('listening','Why is lamp C preferred over B?','Its battery life is better.','Cependant, son autonomie reste meilleure que celle de la lampe B.'),('comprehension','Why can they not choose lamp A?','It is sold out.'),('application','Give a reasoned fallback choice in French.','Je préfère la lampe C parce que son autonomie est meilleure que celle de la lampe B.')],
},
}
def checksum(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (7,8,9):
 a=A[n];m=plan[n-1]
 assert len(a['terms'])==8 and len(a['pairs'])==12 and len(a['checks'])==5
 words=[{'order':i+1,'fr':fr,'en':en,'kind':'term'} for i,(fr,en) in enumerate(a['terms'])]
 words += [{'order':i+9,'fr':fr,'en':en,'kind':'phrase'} for i,(fr,en) in enumerate(a['pairs'])]
 checks=[]
 for item in a['checks']:
  kind,prompt,answer,*extra=item;check={'type':kind,'prompt':prompt,'answer':answer}
  if kind=='listening':check.update(audioText=extra[0],locale='fr-FR',voiceStatus='script-only; no recorded audio')
  checks.append(check)
 lessons.append({'n':n,'stableLessonKey':m['stableLessonKey'],'title':a['title'],
  'objective':m['proposedObjectiveEnglish'],'prerequisites':m['prerequisites'],
  'focus':a['focus'],'grammar':a['grammar'],'scene':a['scene'],'speaking':a['speaking'],
  'reading':{'title':a['readingTitle'],'target':[x[0] for x in a['pairs']],
             'native':[x[1] for x in a['pairs']]},
  'dialogue':[f'{fr}|{en}' for fr,en in a['pairs']],
  'words':words,'checks':checks,'locale':'fr-FR'})
report={'target':'French','native':'English','moduleId':'french-basics','stage':'master',
 'reviewed':False,'state':'redesigned-authored-draft','registered':False,
 'source':{'curriculumMap':MAP,'curriculumMapSha256':checksum(MAP),
  'legacySpanishCourse':SPANISH,'legacySpanishCourseSha256':checksum(SPANISH),
  'legacySpanishPractice':PRACTICE,'legacySpanishPracticeSha256':checksum(PRACTICE),
  'priorRedesign':PRIOR,'priorRedesignSha256':checksum(PRIOR),
  'policy':'Legacy English pairs remain provenance only; candidate learner pairs are newly authored and unreviewed'},
 'draftModel':'Codex-authored; independent French and qualified human review pending',
 'lessons':lessons}
out=OUT/'master-7-9-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
