#!/usr/bin/env python3
"""Author French Master 19–20 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
SPANISH='src/data/core60/es/master-spanish-basics.json'
PRACTICE='src/data/spanish-basics-practice.json'
PRIOR='content/french-basics/master-16-18-redesign-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
19:{
 'title':'Expliquer comment une habitude a changé',
 'scene':'Une élève allait d’habitude au cours à vélo; un orage a interrompu un trajet et l’a conduite à changer son organisation.',
 'focus':'imparfait habituel; passé composé ponctuel; depuis; cause et conséquence',
 'grammar':{'explanation':'Use the imparfait for a repeated past habit (je venais à vélo chaque mardi), the passé composé for the single event (un orage a éclaté), and depuis to state the resulting routine that continues now (depuis cet incident, je prends le bus). Keep the time line explicit: old habit, one interruption, new routine. Do not let a single event sound like a recurring event.', 'model':{'habit':'Avant, je venais à vélo chaque mardi.','event':'Un jour, un orage a éclaté pendant le trajet.','result':'Depuis cet incident, je prends le bus quand la météo annonce de la pluie.','nuance':'Par beau temps, je viens encore à vélo.'}, 'caution':'The event does not mean the learner permanently stopped cycling. Review aspect and depuis with present-tense continuing routine.'},
 'terms':[('une habitude','a habit'),('un trajet','a journey'),('un orage','a thunderstorm'),('éclater','to break out'),('depuis cet incident','since that incident'),('par beau temps','in good weather'),('prévoir de la pluie','to forecast rain'),('changer d’organisation','to change one’s routine')],
 'readingTitle':'Le mardi après l’orage',
 'pairs':[
 ('Camille : Avant, je venais au cours à vélo presque tous les mardis.','Camille: Before, I came to class by bicycle almost every Tuesday.'),
 ('Hugo : C’était ton trajet habituel depuis longtemps ?','Hugo: Had that been your usual journey for a long time?'),
 ('Camille : Oui, je partais à huit heures et j’arrivais avant les autres.','Camille: Yes, I used to leave at eight and arrive before the others.'),
 ('Hugo : Quel événement a changé cette habitude ?','Hugo: What event changed that habit?'),
 ('Camille : Un mardi, un orage a éclaté alors que je traversais le parc.','Camille: One Tuesday, a thunderstorm broke out while I was crossing the park.'),
 ('Hugo : Tu as continué ton trajet à vélo ce jour-là ?','Hugo: Did you continue your bicycle journey that day?'),
 ('Camille : Non, je me suis arrêtée à l’abri et j’ai prévenu le professeur.','Camille: No, I stopped under shelter and informed the teacher.'),
 ('Hugo : Et comment viens-tu au cours depuis cet incident ?','Hugo: And how do you come to class since that incident?'),
 ('Camille : Quand la météo annonce de la pluie, je prends le bus.','Camille: When the forecast calls for rain, I take the bus.'),
 ('Hugo : Donc tu ne viens plus jamais à vélo ?','Hugo: So you never come by bicycle anymore?'),
 ('Camille : Si, par beau temps je viens encore à vélo ; je vérifie simplement la météo avant de partir.','Camille: I do still come by bicycle in good weather; I simply check the forecast before leaving.'),
 ('Hugo : Je comprends : l’orage a changé ta préparation, pas supprimé le vélo.','Hugo: I understand: the storm changed your preparation; it did not eliminate cycling.')],
 'speaking':{'role':'Explain a past habit, a one-time interruption, and today’s routine.','opening':'Avant, je venais au cours à vélo presque tous les mardis.','objectives':['Describe the old repeated routine','Identify the single storm event','Explain what has changed since then','Correct the mistaken inference that cycling stopped entirely'], 'complication':'The listener assumes one event ended the habit altogether.','closure':'Restate that the learner checks the forecast and still cycles in good weather.'},
 'checks':[('recall','How did Camille usually travel before?','By bicycle.'),('write','Describe the one-time event in French.','Un mardi, un orage a éclaté alors que je traversais le parc.'),('listening','How does Camille travel when rain is forecast now?','By bus.','Quand la météo annonce de la pluie, je prends le bus.'),('comprehension','Did Camille stop cycling entirely?','No; she still cycles in good weather.'),('application','State the old habit, one event, and current routine in French.','Avant, je venais à vélo ; un orage a éclaté ; depuis, je prends le bus quand il risque de pleuvoir.')],
},
20:{
 'title':'Mener une conversation complète en français',
 'scene':'Deux collègues organisent un atelier. Une salle devient indisponible pendant l’échange; ils clarifient les besoins, comparent les options et conviennent d’un plan provisoire.',
 'focus':'ouvrir; clarifier; comparer; négocier; événement passé; récapituler; tu/vous',
 'grammar':{'explanation':'Integrate earlier forms rather than introducing a new paradigm. Open with the purpose, ask for clarification, compare options using explicit criteria, negotiate when a plan changes, report a relevant past event in the passé composé, and close by restating who will do what and when. Use informal tu between familiar colleagues and formal vous when addressing staff. Ask a follow-up before treating a proposed room as booked.', 'model':{'open':'Nous devons préparer l’atelier de jeudi.','clarify':'De combien de places avons-nous besoin ?','compare':'La petite salle est plus calme, mais elle a moins de places.','close':'Hugo vérifiera la grande salle auprès de l’accueil ; Camille préviendra les participants après confirmation.'}, 'caution':'This is a capstone performance draft, not evidence of spontaneous speech proficiency. Review whether earlier lessons actually scaffold every required move and whether the change-of-plan decision is genuinely negotiated.'},
 'terms':[('un atelier','a workshop'),('clarifier','to clarify'),('une capacité','a capacity'),('comparer','to compare'),('être indisponible','to be unavailable'),('une solution de rechange','a fallback option'),('récapituler','to recap'),('confirmer auprès de','to confirm with')],
 'readingTitle':'Le nouvel atelier du jeudi',
 'pairs':[
 ('Camille : Bonjour Hugo, pouvons-nous finaliser l’atelier de jeudi ?','Camille: Hi Hugo, can we finalize Thursday’s workshop?'),
 ('Hugo : Oui. De combien de places avons-nous besoin exactement ?','Hugo: Yes. How many seats do we need exactly?'),
 ('Camille : Douze personnes sont inscrites, et deux autres attendent une réponse.','Camille: Twelve people are registered, and two others are waiting for a reply.'),
 ('Hugo : La petite salle est plus calme, mais elle ne peut accueillir que douze personnes.','Hugo: The small room is quieter, but it can hold only twelve people.'),
 ('Camille : La grande salle peut en accueillir seize ; je la préfère pour éviter de refuser quelqu’un.','Camille: The large room can hold sixteen; I prefer it so we do not have to turn anyone away.'),
 ('Hugo : Je viens de recevoir un message : la grande salle n’est plus disponible jeudi matin.','Hugo: I just received a message: the large room is no longer available Thursday morning.'),
 ('Camille : Alors, comparons jeudi après-midi dans la grande salle et vendredi matin dans la petite.','Camille: Then let us compare Thursday afternoon in the large room and Friday morning in the small one.'),
 ('Hugo : Vendredi dernier, deux participants ont manqué la séance du matin.','Hugo: Last Friday, two participants missed the morning session.'),
 ('Camille : Cela plaide pour jeudi après-midi, mais il faut vérifier que la grande salle est libre.','Camille: That favors Thursday afternoon, but we need to check that the large room is free.'),
 ('Hugo : Je demanderai sa disponibilité à l’accueil et tu préviendras les participants.','Hugo: I will check its availability with reception, and you will notify the participants.'),
 ('Camille : Attends la confirmation avant que j’envoie le nouvel horaire.','Camille: Wait for confirmation before I send the new time.'),
 ('Hugo : D’accord : nous visons jeudi après-midi ; je confirme la salle, puis tu annonces l’horaire.','Hugo: Agreed: we are aiming for Thursday afternoon; I will confirm the room, then you will announce the time.')],
 'speaking':{'role':'Lead a full multi-turn workshop planning conversation with minimal prompting.','opening':'Pouvons-nous finaliser l’atelier de jeudi ?','objectives':['Open and clarify capacity','Compare two room and time options','Respond to a mid-conversation availability change','Report a relevant past event','Negotiate and recap pending confirmation'], 'complication':'The preferred room becomes unavailable Thursday morning after the first comparison.','closure':'Recap who checks the new room and who notifies participants, without claiming a booking before confirmation.'},
 'checks':[('recall','How many people are registered initially?','Twelve.'),('write','State the provisional decision and order of actions in French.','Nous visons jeudi après-midi ; je confirme la salle, puis tu annonces l’horaire.'),('listening','What relevant past event does Hugo mention?','Two participants missed last Friday morning’s session.','Vendredi dernier, deux participants ont manqué la séance du matin.'),('comprehension','Is Thursday afternoon already booked?','No; room availability still needs confirmation.'),('application','Recap the negotiated plan in French without claiming confirmation.','Nous visons jeudi après-midi ; Hugo vérifiera la grande salle auprès de l’accueil et Camille préviendra les participants après confirmation.')],
},
}
def checksum(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (19,20):
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
out=OUT/'master-19-20-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
