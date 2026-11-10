#!/usr/bin/env python3
"""Author French Master 4–6 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
SPANISH='src/data/core60/es/master-spanish-basics.json'
PRACTICE='src/data/spanish-basics-practice.json'
PRIOR='content/french-basics/master-1-3-redesign-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
4:{
 'title':'Préciser un rôle et un état passager',
 'scene':'Une équipe prépare une réunion. Un nouveau membre confond la responsable de la séance avec la personne disponible cet après-midi.',
 'focus':'être responsable de; être disponible; se sentir; sembler; demander qui et quand',
 'grammar':{'explanation':'French être can describe a role, identity, condition or availability; it does not split these functions into two verbs like Spanish ser/estar. Add context and time markers to distinguish a durable assignment (Maya est responsable de la réunion) from a temporary state (elle ne se sent pas bien aujourd’hui). Use qui to ask who is responsible and quand or à quelle heure to check availability. Restate the two confirmed facts separately.', 'model':{'role':'Maya est responsable de la réunion.', 'state':'Elle ne se sent pas bien aujourd’hui.', 'availability':'Léa sera là avant quinze heures pour préparer la salle.', 'repair':'Si j’ai bien compris, Maya dirige la réunion, mais Léa remplace Maya cet après-midi.'}, 'caution':'The Spanish Master 4 source contrasts ser and estar. French has no such grammatical split; a role/state distinction comes from the predicate and context. Future forms in the dialogue should be checked for prerequisite load.'},
 'terms':[('responsable de','responsible for'),('disponible','available'),('se sentir','to feel'),('remplacer','to stand in for'),('aujourd’hui','today'),('cet après-midi','this afternoon'),('si j’ai bien compris','if I understood correctly'),('à quelle heure','at what time')],
 'readingTitle':'Qui dirige la réunion ?',
 'pairs':[
  ('Noé : Qui est responsable de la réunion de cet après-midi ?', 'Noé: Who is responsible for this afternoon’s meeting?'),
  ('Léa : Maya en est responsable depuis le début du projet.', 'Léa: Maya has been responsible for it since the project began.'),
  ('Noé : Donc Maya sera disponible pour ouvrir la séance ?', 'Noé: So Maya will be available to open the meeting?'),
  ('Léa : Pas forcément : elle ne se sent pas bien aujourd’hui.', 'Léa: Not necessarily: she does not feel well today.'),
  ('Noé : J’ai confondu son rôle avec sa disponibilité.', 'Noé: I confused her role with her availability.'),
  ('Léa : Oui, elle garde ce rôle, mais je la remplacerai cet après-midi.', 'Léa: Yes, she keeps that role, but I will stand in for her this afternoon.'),
  ('Noé : À quelle heure pourras-tu arriver ?', 'Noé: At what time will you be able to arrive?'),
  ('Léa : Je serai là avant quinze heures pour préparer la salle.', 'Léa: I will be there before three o’clock to prepare the room.'),
  ('Noé : Et Maya, faut-il lui envoyer le compte rendu ?', 'Noé: And Maya, should we send her the minutes?'),
  ('Léa : Oui, elle doit rester informée des décisions.', 'Léa: Yes, she needs to stay informed of the decisions.'),
  ('Noé : Si j’ai bien compris, tu ouvres la séance et Maya reste responsable du projet.', 'Noé: If I understood correctly, you open the meeting and Maya remains responsible for the project.'),
  ('Léa : Exactement ; je lui transmettrai le compte rendu ensuite.', 'Léa: Exactly; I will send her the minutes afterward.')],
 'speaking':{'role':'Clarify who holds a role and who is available today.', 'opening':'Qui est responsable de la réunion de cet après-midi ?', 'objectives':['Identify Maya’s ongoing role','Ask who can open the meeting today','Correct the role-versus-availability confusion','Confirm the arrival time and minutes handoff'], 'complication':'The listener assumes the project lead must also be available this afternoon.', 'closure':'Restate the two confirmed facts and who receives the minutes.'},
 'checks':[('recall','Complete the role: Maya est ___ de la réunion.','responsable'),('write','Write in French: I confused her role with her availability.','J’ai confondu son rôle avec sa disponibilité.'),('listening','Who will stand in for Maya this afternoon?','Léa.','Oui, elle garde ce rôle, mais je la remplacerai cet après-midi.'),('comprehension','Why will Maya not open the meeting?','She does not feel well today.'),('application','Restate who opens the meeting and who remains project lead.','Léa ouvre la séance et Maya reste responsable du projet.')],
},
5:{
 'title':'Signaler ce qui a changé dans une salle',
 'scene':'Deux camarades comparent une salle avant et après le rangement; un classeur paraît manquer avant d’être retrouvé.',
 'focus':'il y avait / il y a; se trouver; être dans/sur/sous; déplacer; manquer',
 'grammar':{'explanation':'Compare two observations with il y avait (there was/were) and il y a (there is/are). Use se trouver or être with a location for objects and people. A completed movement uses the passé composé: quelqu’un a déplacé le classeur. A missing item may be absent from its expected place without being lost; verify the new location before reporting that it is gone.', 'model':{'before':'Ce matin, il y avait un classeur sur la table.', 'now':'Maintenant, il y a deux livres à sa place.', 'change':'Quelqu’un a déplacé le classeur.', 'resolved':'Il se trouve sous la table, près de la fenêtre.'}, 'caution':'The original Spanish Master 5 source reuses hay and room descriptions. This task requires comparing observations and correcting an apparent loss; it is not a simple inventory drill.'},
 'terms':[('classeur','binder'),('se trouver','to be located'),('déplacer','to move'),('il manquait','was missing'),('à sa place','in its place'),('sous la table','under the table'),('près de la fenêtre','near the window'),('en réalité','in fact')],
 'readingTitle':'Le classeur a changé de place',
 'pairs':[
  ('Maya : Ce matin, il y avait un classeur sur la grande table.', 'Maya: This morning there was a binder on the large table.'),
  ('Noé : Maintenant, deux livres se trouvent à sa place.', 'Noé: Now two books are in its place.'),
  ('Maya : Quelqu’un a donc déplacé le classeur ?', 'Maya: So has someone moved the binder?'),
  ('Noé : Je ne sais pas encore ; cherchons avant de le signaler comme perdu.', 'Noé: I do not know yet; let us look before reporting it as lost.'),
  ('Maya : Il y a trois personnes dans la salle, mais personne ne sait qui l’a déplacé.', 'Maya: There are three people in the room, but no one knows who moved it.'),
  ('Noé : La professeure est près de la porte et deux élèves sont à la fenêtre.', 'Noé: The teacher is near the door and two pupils are at the window.'),
  ('Maya : Je vois un objet bleu sous la table ; est-ce le classeur ?', 'Maya: I can see a blue object under the table; is it the binder?'),
  ('Noé : Oui, il se trouve sous la table, près de la fenêtre.', 'Noé: Yes, it is under the table, near the window.'),
  ('Maya : Hier, il était sur l’étagère ; il a donc changé de place deux fois.', 'Maya: Yesterday it was on the shelf; it has therefore changed places twice.'),
  ('Noé : Nous devons corriger la liste avant que le groupe arrive.', 'Noé: We need to correct the list before the group arrives.'),
  ('Maya : Écrivons : le classeur était attendu sur la table, mais il est sous la table.', 'Maya: Let us write: the binder was expected on the table, but it is under the table.'),
  ('Noé : En réalité, rien ne manque ; seul l’emplacement a changé.', 'Noé: In fact, nothing is missing; only the location has changed.')],
 'speaking':{'role':'Report a changed room to a classmate.', 'opening':'Ce matin, il y avait un classeur sur la grande table.', 'objectives':['Compare morning and current observations','Separate people from objects in the room','Find and verify the binder','Correct the list instead of reporting a loss'], 'complication':'The binder seems missing but is found under the table.', 'closure':'State its current location and what changed.'},
 'checks':[('recall','Complete the earlier observation: Ce matin, il y ___ un classeur.','avait'),('write','Write in French: In fact, nothing is missing; only the location has changed.','En réalité, rien ne manque ; seul l’emplacement a changé.'),('listening','Where was the binder found?','Under the table, near the window.','Oui, il se trouve sous la table, près de la fenêtre.'),('comprehension','How many people are currently in the room?','Three.'),('application','Correct the missing-item report in French.','Le classeur est sous la table ; rien ne manque.')],
},
6:{
 'title':'Corriger une demande mal comprise',
 'scene':'Une réservation de salle a été mal comprise : le partenaire répète la mauvaise salle et la mauvaise heure.',
 'focus':'pardon; pourriez-vous répéter; je voulais dire; si je comprends bien; confirmer',
 'grammar':{'explanation':'When a request is misunderstood, first identify the incorrect detail, then reformulate the intended one: je voulais dire la salle B, pas la salle D. Use pourriez-vous répéter for a polite request and si je comprends bien to check what the other person heard. Confirm both place and time before ending; do not infer that an unconfirmed reservation is final.', 'model':{'repair':'Pardon, je voulais dire la salle B, pas la salle D.', 'time':'La réunion commence à quinze heures trente, pas à quatorze heures trente.', 'check':'Si je comprends bien, vous avez noté la salle B à quinze heures trente ?', 'close':'La salle B à quinze heures trente reste à confirmer ; j’attends votre réponse écrite.'}, 'caution':'The original Spanish Master 6 source repeats beginner negation. This task adds precise correction and teach-back in a realistic multi-turn exchange. The dialogue uses a formal vous register.'},
 'terms':[('je voulais dire','I meant'),('pourriez-vous répéter','could you repeat'),('si je comprends bien','if I understand correctly'),('salle réservée','reserved room'),('à quinze heures trente','at 3:30 p.m.'),('pas à quatorze heures trente','not at 2:30 p.m.'),('par écrit','in writing'),('c’est bien cela','that is correct')],
 'readingTitle':'Une salle, deux erreurs',
 'pairs':[
  ('Léa : Bonjour, je voudrais réserver la salle B pour demain.', 'Léa: Hello, I would like to reserve room B for tomorrow.'),
  ('Agent : Bien sûr. À quelle heure commence la réunion ?', 'Clerk: Of course. At what time does the meeting begin?'),
  ('Léa : À quinze heures trente, si la salle est libre.', 'Léa: At 3:30 p.m., if the room is available.'),
  ('Agent : J’ai noté la salle D à quatorze heures trente.', 'Clerk: I wrote down room D at 2:30 p.m.'),
  ('Léa : Pardon, je voulais dire la salle B, pas la salle D.', 'Léa: Sorry, I meant room B, not room D.'),
  ('Agent : Pourriez-vous répéter l’heure, s’il vous plaît ?', 'Clerk: Could you repeat the time, please?'),
  ('Léa : La réunion commence à quinze heures trente, pas à quatorze heures trente.', 'Léa: The meeting begins at 3:30 p.m., not at 2:30 p.m.'),
  ('Agent : Merci. Je vais vérifier la disponibilité de la salle B.', 'Clerk: Thank you. I will check whether room B is available.'),
  ('Léa : Si je comprends bien, la réservation n’est pas encore confirmée ?', 'Léa: If I understand correctly, the reservation is not yet confirmed?'),
  ('Agent : Exactement ; je dois d’abord vérifier le calendrier.', 'Clerk: Exactly; I must check the calendar first.'),
  ('Léa : Pourriez-vous me confirmer la salle et l’heure par écrit ?', 'Léa: Could you confirm the room and time to me in writing?'),
  ('Agent : Oui. Je vous enverrai la confirmation après avoir vérifié la disponibilité.', 'Clerk: Yes. I will send you confirmation after checking availability.')],
 'speaking':{'role':'Correct a room reservation with a clerk.', 'opening':'Je voudrais réserver la salle B pour demain à quinze heures trente.', 'objectives':['Identify wrong room and time','Reformulate both details politely','Check what is actually confirmed','Request written confirmation'], 'complication':'The clerk repeats room D at 2:30 p.m. instead of room B at 3:30 p.m.', 'closure':'Leave with the reservation still pending until availability is confirmed.'},
 'checks':[('recall','Complete the correction: Je voulais dire la salle B, ___ la salle D.','pas'),('write','Write in French: Sorry, I meant room B, not room D.','Pardon, je voulais dire la salle B, pas la salle D.'),('listening','What incorrect time did the clerk write down?','2:30 p.m.','J’ai noté la salle D à quatorze heures trente.'),('comprehension','Is room B already confirmed?','No; the clerk must check availability first.'),('application','Ask for written confirmation of both room and time in French.','Pourriez-vous me confirmer la salle et l’heure par écrit ?')],
}}

def checksum(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (4,5,6):
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
out=OUT/'master-4-6-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
