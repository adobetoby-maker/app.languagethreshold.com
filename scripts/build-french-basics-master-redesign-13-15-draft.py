#!/usr/bin/env python3
"""Author French Master 13–15 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
SPANISH='src/data/core60/es/master-spanish-basics.json'
PRACTICE='src/data/spanish-basics-practice.json'
PRIOR='content/french-basics/master-10-12-redesign-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
13:{
 'title':'Transformer une demande en tâches prioritaires',
 'scene':'Une coordinatrice prépare une petite exposition. L’équipe doit séparer les tâches obligatoires des améliorations facultatives et définir qui valide le résultat.',
 'focus':'il faut; devoir; avant de; nécessaire/facultatif; responsabilité et critère de fin',
 'grammar':{'explanation':'Identify the deadline and required outcome before dividing a request into tasks. Use il faut or devoir for necessary steps and si nous avons le temps for optional work. Express dependencies with avant de + infinitive: vérifier les légendes avant d’imprimer les affiches. Name one owner per task and an observable completion criterion; a vague “finished” is not enough.', 'model':{'required':'Il faut vérifier les légendes avant d’imprimer les affiches.','optional':'Si nous avons le temps, nous ajouterons une photo.','owner':'Camille vérifie les légendes.','done':'La tâche est terminée quand la coordinatrice approuve le texte.'}, 'caution':'The French task extends a beginner to-do list into priority, dependency and acceptance criteria. The optional pour que construction from the map is omitted here to limit new grammar load.'},
 'terms':[('obligatoire','required'),('facultatif','optional'),('une échéance','a deadline'),('une légende','a caption'),('avant d’imprimer','before printing'),('être responsable de','to be responsible for'),('approuver','to approve'),('un critère de fin','a completion criterion')],
 'readingTitle':'Avant d’imprimer les affiches',
 'pairs':[
 ('Coordinatrice : L’exposition ouvre vendredi ; les affiches doivent être prêtes jeudi soir.','Coordinator: The exhibition opens Friday; the posters must be ready Thursday evening.'),
 ('Coordinatrice : Il faut vérifier les légendes et imprimer quatre affiches lisibles.','Coordinator: You must check the captions and print four readable posters.'),
 ('Camille : La photo supplémentaire est-elle obligatoire pour jeudi ?','Camille: Is the extra photograph required for Thursday?'),
 ('Coordinatrice : Non, elle est facultative si vous avez encore du temps.','Coordinator: No, it is optional if you still have time.'),
 ('Hugo : Nous devons vérifier les légendes avant d’imprimer les affiches.','Hugo: We must check the captions before printing the posters.'),
 ('Camille : Je serai responsable du texte ; je relirai chaque légende avec Nadia.','Camille: I will be responsible for the text; I will reread each caption with Nadia.'),
 ('Nadia : Je vérifierai les noms et les dates sur les documents d’origine.','Nadia: I will check the names and dates against the original documents.'),
 ('Hugo : Après votre validation, j’imprimerai les quatre affiches.','Hugo: After your approval, I will print the four posters.'),
 ('Camille : Comment saurons-nous que le texte est prêt à imprimer ?','Camille: How will we know that the text is ready to print?'),
 ('Coordinatrice : Je dois approuver les quatre légendes corrigées avant l’impression.','Coordinator: I must approve the four corrected captions before printing.'),
 ('Hugo : Ensuite, je vérifierai que les affiches sont lisibles de loin.','Hugo: Then I will check that the posters are readable from a distance.'),
 ('Camille : Nous ajouterons la photo seulement si les tâches obligatoires sont terminées.','Camille: We will add the photograph only if the required tasks are finished.')],
 'speaking':{'role':'Turn an exhibition request into a prioritized team plan.','opening':'Les affiches doivent être prêtes jeudi soir.','objectives':['Distinguish required and optional work','Explain the text-before-print dependency','Assign an owner to each required task','Confirm the approval and readability criteria'], 'complication':'Printing cannot begin until captions are approved.','closure':'Restate the required order and the condition for adding the photograph.'},
 'checks':[('recall','How many posters must be printed?','Four.'),('write','State the dependency in French.','Nous devons vérifier les légendes avant d’imprimer les affiches.'),('listening','Who must approve the captions before printing?','The coordinator.','Je dois approuver les quatre légendes corrigées avant l’impression.'),('comprehension','Is the extra photograph required?','No, it is optional.'),('application','State the required task order and the optional condition in French.','Il faut approuver les légendes avant d’imprimer ; nous ajouterons la photo seulement s’il reste du temps.')],
},
14:{
 'title':'Raconter une habitude et son interruption',
 'scene':'Une équipe prépare une présentation comme d’habitude, mais le projecteur cesse de fonctionner avant la répétition.',
 'focus':'imparfait de routine; soudain; passé composé de rupture; d’abord/ensuite',
 'grammar':{'explanation':'Use the imparfait for the repeated background routine (nous installions le projecteur chaque matin) and the passé composé for the event that interrupted it (il est tombé en panne). Mark the sequence with d’habitude, soudain, d’abord and ensuite. Report what was completed, what stopped, and the revised next action; do not suggest the presentation happened as planned if it did not.', 'model':{'routine':'D’habitude, nous installions le projecteur avant la répétition.','interruption':'Soudain, il est tombé en panne.','completed':'Nous avons déjà distribué les documents.','next':'Nous répéterons sans écran, puis nous demanderons un autre appareil.'}, 'caution':'Check that the imparfait/passé composé contrast and future next-step forms are scaffolded in prior lessons; no plus-que-parfait production is required.'},
 'terms':[('d’habitude','usually'),('soudain','suddenly'),('tomber en panne','to break down'),('une répétition','a rehearsal'),('distribuer','to hand out'),('un appareil de remplacement','a replacement device'),('sans écran','without a screen'),('reprendre','to resume')],
 'readingTitle':'La répétition sans projecteur',
 'pairs':[
 ('Camille : D’habitude, nous installions le projecteur avant la répétition du matin.','Camille: Usually, we set up the projector before the morning rehearsal.'),
 ('Hugo : Ensuite, nous ouvrions les diapositives et distribuions les documents.','Hugo: Then we opened the slides and handed out the documents.'),
 ('Camille : Aujourd’hui, nous avons d’abord distribué les documents.','Camille: Today, we first handed out the documents.'),
 ('Hugo : Puis j’ai allumé le projecteur pour lancer la première diapositive.','Hugo: Then I switched on the projector to show the first slide.'),
 ('Camille : Soudain, l’image a disparu et l’appareil s’est éteint.','Camille: Suddenly, the image disappeared and the device switched off.'),
 ('Hugo : Nous avons vérifié la prise, mais le projecteur ne s’est pas rallumé.','Hugo: We checked the outlet, but the projector did not switch back on.'),
 ('Camille : La répétition a donc été interrompue avant la deuxième partie.','Camille: The rehearsal was therefore interrupted before the second part.'),
 ('Hugo : Pouvons-nous commencer sans écran avec les documents déjà distribués ?','Hugo: Can we start without a screen using the documents already handed out?'),
 ('Camille : Oui, mais signalons d’abord le problème à la coordinatrice.','Camille: Yes, but let us first report the problem to the coordinator.'),
 ('Coordinatrice : Je vais demander un appareil de remplacement pour cet après-midi.','Coordinator: I will request a replacement device for this afternoon.'),
 ('Hugo : En attendant, nous répéterons l’introduction sans projecteur.','Hugo: In the meantime, we will rehearse the introduction without a projector.'),
 ('Camille : Ensuite, nous reprendrons les diapositives quand un autre appareil sera disponible.','Camille: Then we will resume the slides when another device is available.')],
 'speaking':{'role':'Explain a routine interrupted by equipment failure.','opening':'D’habitude, nous installions le projecteur avant la répétition.','objectives':['Describe the normal sequence','Identify the sudden event','Report what was already completed','Agree on the revised order and next action'], 'complication':'The projector stops before the second part of the rehearsal.','closure':'Rehearse the introduction without a screen and wait for replacement equipment.'},
 'checks':[('recall','What normally happened before the rehearsal?','The team set up the projector.'),('write','Describe the interruption in French.','Soudain, l’image a disparu et l’appareil s’est éteint.'),('listening','What will the team rehearse without a projector?','The introduction.','En attendant, nous répéterons l’introduction sans projecteur.'),('comprehension','Had the second part of the rehearsal been completed?','No; the rehearsal was interrupted before it.'),('application','Contrast the usual sequence with today’s interruption and next step in French.','D’habitude, nous installions le projecteur ; aujourd’hui, il est tombé en panne, donc nous répéterons sans écran.')],
},
15:{
 'title':'Guider vers une entrée de remplacement',
 'scene':'L’entrée habituelle de la bibliothèque est fermée. Un visiteur doit suivre un trajet différent et reformuler les étapes.',
 'focus':'tourner; traverser; à côté de; si...alors; vérification par reformulation',
 'grammar':{'explanation':'Give directions in short ordered steps with visible landmarks: passez devant la fontaine, tournez à droite, traversez la cour. If the usual entrance is closed, identify the alternate entrance explicitly. Ask the listener to repeat the route and correct a wrong turn before they leave. Keep directions anchored to landmarks rather than an unverified map position.', 'model':{'closure':'L’entrée principale est fermée aujourd’hui.','route':'Passez devant la fontaine, puis tournez à droite après le café.','check':'Pouvez-vous me redire le trajet ?','repair':'Non, ne tournez pas avant le café ; tournez juste après.'}, 'caution':'This is a fictional route. Location and accessibility of a real entrance would require local verification; do not deploy these directions as real-world guidance.'},
 'terms':[('l’entrée principale','the main entrance'),('l’entrée latérale','the side entrance'),('une fontaine','a fountain'),('une cour','a courtyard'),('tourner à droite','to turn right'),('traverser','to cross'),('juste après','just after'),('redire le trajet','to repeat the route')],
 'readingTitle':'La bibliothèque par la cour',
 'pairs':[
 ('Visiteur : Excusez-moi, comment puis-je entrer dans la bibliothèque aujourd’hui ?','Visitor: Excuse me, how can I enter the library today?'),
 ('Accueil : L’entrée principale est fermée ; utilisez l’entrée latérale.','Reception: The main entrance is closed; use the side entrance.'),
 ('Visiteur : Où se trouve cette autre entrée ?','Visitor: Where is that other entrance?'),
 ('Accueil : Passez devant la fontaine et continuez jusqu’au café.','Reception: Walk past the fountain and continue to the café.'),
 ('Accueil : Tournez à droite juste après le café, pas avant.','Reception: Turn right just after the café, not before it.'),
 ('Accueil : Traversez ensuite la petite cour ; la porte est à côté de l’escalier.','Reception: Then cross the small courtyard; the door is beside the staircase.'),
 ('Visiteur : Si la porte est fermée, dois-je revenir ici ?','Visitor: If the door is closed, should I come back here?'),
 ('Accueil : Oui, revenez à l’accueil ; nous vérifierons l’accès avec vous.','Reception: Yes, return to reception; we will check access with you.'),
 ('Accueil : Pouvez-vous me redire le trajet avant de partir ?','Reception: Can you repeat the route to me before you go?'),
 ('Visiteur : Je passe devant la fontaine, puis je tourne à droite avant le café.','Visitor: I walk past the fountain, then I turn right before the café.'),
 ('Accueil : Presque : tournez juste après le café, puis traversez la cour.','Reception: Almost: turn just after the café, then cross the courtyard.'),
 ('Visiteur : Compris : après le café, à droite, puis la cour et la porte près de l’escalier.','Visitor: Understood: after the café, right, then the courtyard and the door near the staircase.')],
 'speaking':{'role':'Guide a visitor to a fictional alternate library entrance.','opening':'L’entrée principale est fermée aujourd’hui.','objectives':['State the closure and alternate entrance','Give ordered landmark-based directions','Ask the visitor to repeat the route','Correct the before/after wrong turn'], 'complication':'The visitor repeats the turn as before the café rather than after it.','closure':'Confirm the corrected route and what to do if the side door is closed.'},
 'checks':[('recall','Which entrance is closed?','The main entrance.'),('write','Correct the turn in French.','Tournez à droite juste après le café, pas avant.'),('listening','Where is the side door?','Beside the staircase across the courtyard.','Traversez ensuite la petite cour ; la porte est à côté de l’escalier.'),('comprehension','What wrong turn did the visitor repeat?','Turning before the café.'),('application','Give the corrected sequence from the fountain to the side door in French.','Passez devant la fontaine, tournez à droite après le café, traversez la cour et cherchez la porte près de l’escalier.')],
},
}
def checksum(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (13,14,15):
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
out=OUT/'master-13-15-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
