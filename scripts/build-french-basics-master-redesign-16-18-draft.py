#!/usr/bin/env python3
"""Author French Master 16–18 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
SPANISH='src/data/core60/es/master-spanish-basics.json'
PRACTICE='src/data/spanish-basics-practice.json'
PRIOR='content/french-basics/master-13-15-redesign-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
16:{
 'title':'Distinguer le travail en cours du plan de demain',
 'scene':'Une affiche doit être remise demain. La vérification d’une légende retarde l’impression prévue aujourd’hui.',
 'focus':'être en train de; aller + infinitif; avant de; conséquence sur un plan proche',
 'grammar':{'explanation':'Use être en train de + infinitive to stress an action underway now, and aller + infinitive for a near-future intention. Name the dependency with avant de + infinitive: vérifier la légende avant d’imprimer. If a current delay changes the plan, state both the cause and the revised time; do not present an intention as a completed action.', 'model':{'now':'Je suis en train de vérifier la dernière légende.','dependency':'Nous devons la corriger avant d’imprimer.','plan':'Nous allons imprimer demain matin.','change':'Comme la correction prend plus de temps, nous n’imprimerons pas ce soir.'}, 'caution':'The source Spanish Master 16 contrasts present and future. This French scenario adds an explicit dependency; the simple future in one line may be reviewed as an extension rather than assessed production.'},
 'terms':[('être en train de','to be in the middle of'),('aller imprimer','to be going to print'),('une légende','a caption'),('une correction','a correction'),('avant d’envoyer','before sending'),('prendre du retard','to run late'),('demain matin','tomorrow morning'),('un nouveau délai','a new deadline')],
 'readingTitle':'L’affiche sera imprimée demain',
 'pairs':[
 ('Hugo : Es-tu en train d’imprimer l’affiche maintenant ?','Hugo: Are you printing the poster right now?'),
 ('Camille : Non, je suis en train de vérifier la dernière légende.','Camille: No, I am checking the final caption right now.'),
 ('Hugo : Je pensais que nous allions imprimer avant la fermeture.','Hugo: I thought we were going to print before closing.'),
 ('Camille : C’était le plan, mais une date doit encore être corrigée.','Camille: That was the plan, but a date still needs correcting.'),
 ('Hugo : Pouvons-nous imprimer l’affiche et corriger la date ensuite ?','Hugo: Can we print the poster and correct the date afterward?'),
 ('Camille : Non, il faut vérifier la date avant d’envoyer le fichier à l’imprimerie.','Camille: No, we must check the date before sending the file to the printer.'),
 ('Hugo : Qui peut confirmer la bonne date ce soir ?','Hugo: Who can confirm the correct date this evening?'),
 ('Camille : Nadia est en train de consulter le document d’origine.','Camille: Nadia is checking the original document right now.'),
 ('Hugo : Si elle répond tard, que va-t-il se passer ?','Hugo: If she replies late, what is going to happen?'),
 ('Camille : Nous allons corriger le fichier ce soir et imprimer demain matin.','Camille: We are going to correct the file tonight and print tomorrow morning.'),
 ('Hugo : Alors je vais prévenir la coordinatrice du nouveau délai.','Hugo: Then I am going to tell the coordinator about the new deadline.'),
 ('Camille : Merci ; nous confirmerons l’impression seulement après la correction.','Camille: Thank you; we will confirm printing only after the correction.')],
 'speaking':{'role':'Explain how work in progress changes a near-future plan.','opening':'Je suis en train de vérifier la dernière légende.','objectives':['Say what is happening now','Identify what must finish before printing','State the revised near-future plan','Tell the coordinator without claiming printing is complete'], 'complication':'The date correction is taking longer than expected.','closure':'Confirm correction tonight and printing tomorrow morning, pending the source check.'},
 'checks':[('recall','What is Camille doing now?','Checking the final caption.'),('write','State the revised printing plan in French.','Nous allons corriger le fichier ce soir et imprimer demain matin.'),('listening','Who is checking the original document?','Nadia.','Nadia est en train de consulter le document d’origine.'),('comprehension','Why cannot the poster be printed first?','The date must be verified before sending the file.'),('application','Explain the dependency and new deadline in French.','Il faut vérifier la date avant d’envoyer le fichier ; nous allons imprimer demain matin.')],
},
17:{
 'title':'Réparer une référence ambiguë',
 'scene':'Deux organisatrices et deux dossiers sont mentionnés. Un pronom ambigu provoque une confusion sur le destinataire et l’objet.',
 'focus':'le/la/les; lui/leur; celui-ci/celle-là; reformulation explicite',
 'grammar':{'explanation':'Pronouns save repetition only when their referent is clear. Use le/la/les for direct objects, lui/leur for recipients, and celui-ci/celle-là to contrast two masculine objects; for two feminine folders use celle-ci/celle-là. When a listener guesses the wrong person or item, repeat the noun and name rather than adding another ambiguous pronoun.', 'model':{'objects':'Ce dossier bleu est pour Nadia ; le dossier vert est pour Camille.','recipient':'Je vais lui donner le dossier bleu, à Nadia.','repair':'Non, par “lui”, je voulais dire Nadia.','contrast':'Celui-ci est bleu ; celui-là est vert.'}, 'caution':'The dialogue intentionally includes one ambiguous lui, followed immediately by explicit repair. A reviewer should check referent clarity and avoid teaching ambiguity as the model answer.'},
 'terms':[('un dossier bleu','a blue folder'),('un dossier vert','a green folder'),('celui-ci','this one'),('celui-là','that one'),('lui donner','to give it to him or her'),('leur envoyer','to send it to them'),('le destinataire','the recipient'),('reformuler','to rephrase')],
 'readingTitle':'Quel dossier pour quelle personne ?',
 'pairs':[
 ('Hugo : Nadia et Camille attendent chacune un dossier après la réunion.','Hugo: Nadia and Camille are each expecting a folder after the meeting.'),
 ('Léa : Le dossier bleu contient les notes pour Nadia.','Léa: The blue folder contains the notes for Nadia.'),
 ('Hugo : Et le dossier vert contient les images pour Camille, c’est bien cela ?','Hugo: And the green folder contains the images for Camille, is that right?'),
 ('Léa : Oui. Celui-ci, le bleu, doit aller à Nadia ; celui-là, le vert, à Camille.','Léa: Yes. This one, the blue one, goes to Nadia; that one, the green one, to Camille.'),
 ('Hugo : Je vais lui donner le bleu dès qu’elle arrivera.','Hugo: I will give her the blue one as soon as she arrives.'),
 ('Léa : Par “lui”, veux-tu dire Nadia ou Camille ?','Léa: By “her,” do you mean Nadia or Camille?'),
 ('Hugo : Je voulais dire Nadia ; je lui donnerai le dossier bleu.','Hugo: I meant Nadia; I will give the blue folder to her.'),
 ('Léa : Merci de préciser, car Camille arrivera en même temps.','Léa: Thanks for clarifying, because Camille will arrive at the same time.'),
 ('Hugo : Pour Camille, je garderai le dossier vert sur la table.','Hugo: For Camille, I will keep the green folder on the table.'),
 ('Léa : Et les copies numériques, peux-tu les leur envoyer ce soir ?','Léa: And the digital copies, can you send them to both of them tonight?'),
 ('Hugo : Oui, je les enverrai à Nadia et à Camille après la réunion.','Hugo: Yes, I will send them to Nadia and Camille after the meeting.'),
 ('Léa : Alors répétons : le bleu pour Nadia, le vert pour Camille, les copies pour les deux.','Léa: Then let us repeat: blue for Nadia, green for Camille, copies for both.')],
 'speaking':{'role':'Track two people and two folders across a handoff.','opening':'Nadia et Camille attendent chacune un dossier.','objectives':['Identify each folder and recipient','Notice an ambiguous pronoun','Repair the reference with a name and object','Confirm who receives the digital copies'], 'complication':'A listener cannot tell which woman lui refers to.','closure':'Restate blue for Nadia, green for Camille, copies for both.'},
 'checks':[('recall','Who receives the blue folder?','Nadia.'),('write','Repair the ambiguous pronoun in French.','Je voulais dire Nadia ; je lui donnerai le dossier bleu.'),('listening','Who receives the digital copies?','Nadia and Camille.','Oui, je les enverrai à Nadia et à Camille après la réunion.'),('comprehension','Why was “lui” unclear?','Both Nadia and Camille were mentioned and were arriving together.'),('application','State each folder and recipient explicitly in French.','Le dossier bleu va à Nadia et le dossier vert va à Camille.')],
},
18:{
 'title':'Raconter une sortie passée dans l’ordre',
 'scene':'Une visite au musée a changé à cause de la pluie. Un ami demande quel événement est arrivé d’abord et pourquoi le groupe a modifié son trajet.',
 'focus':'passé composé avec avoir/être; d’abord/puis/finalement; cause et ordre',
 'grammar':{'explanation':'Use the passé composé to report completed events in a clear sequence: nous sommes partis, nous avons traversé, nous sommes entrés. With être, the participle agrees with the subject when required (nous sommes arrivés for a mixed group). D’abord, puis, ensuite, enfin and parce que make order and cause explicit. If asked what happened first, answer from the timeline rather than summarizing the whole outing again.', 'model':{'departure':'Nous sommes partis à neuf heures.','interruption':'Il a commencé à pleuvoir après notre arrivée.','change':'Nous sommes entrés par la porte du jardin parce que la cour était fermée.','end':'Finalement, nous avons vu l’exposition avant de rentrer.'}, 'caution':'The route and museum are fictional; this is narrative practice, not visitor guidance. Review auxiliary choice and agreement in the completed-event forms.'},
 'terms':[('une sortie','an outing'),('le musée','the museum'),('d’abord','first'),('puis','then'),('finalement','finally'),('il a plu','it rained'),('changer de trajet','to change route'),('rentrer','to return home')],
 'readingTitle':'La sortie au musée sous la pluie',
 'pairs':[
 ('Camille : Hier, notre groupe est parti pour le musée à neuf heures.','Camille: Yesterday our group left for the museum at nine o’clock.'),
 ('Hugo : Nous avons pris le bus et sommes arrivés avant l’ouverture.','Hugo: We took the bus and arrived before opening time.'),
 ('Camille : D’abord, nous avons attendu près de la cour du musée.','Camille: First, we waited near the museum courtyard.'),
 ('Hugo : Puis la pluie a commencé et la cour a été fermée aux visiteurs.','Hugo: Then the rain began and the courtyard was closed to visitors.'),
 ('Camille : Nous avons donc changé de trajet pour rejoindre la porte du jardin.','Camille: So we changed route to reach the garden door.'),
 ('Hugo : Là, une employée nous a indiqué l’entrée couverte.','Hugo: There, a staff member showed us the covered entrance.'),
 ('Camille : Nous sommes entrés et avons laissé nos manteaux au vestiaire.','Camille: We went in and left our coats at the cloakroom.'),
 ('Hugo : Ensuite, nous avons visité l’exposition sur les cartes anciennes.','Hugo: Next, we visited the exhibition on old maps.'),
 ('Camille : Nadia a posé une question sur une carte du dix-neuvième siècle.','Camille: Nadia asked a question about a nineteenth-century map.'),
 ('Hugo : Après la visite, nous avons déjeuné dans le café du musée.','Hugo: After the visit, we had lunch in the museum café.'),
 ('Camille : Finalement, nous sommes rentrés en bus vers seize heures.','Camille: Finally, we went home by bus around four o’clock.'),
 ('Hugo : La pluie est arrivée avant le changement de trajet, pas après la visite.','Hugo: The rain came before the route change, not after the visit.')],
 'speaking':{'role':'Give a coherent account of yesterday’s museum outing.','opening':'Hier, notre groupe est parti pour le musée à neuf heures.','objectives':['Say who went where and when','Narrate the events in order','Explain why the route changed','Answer which event happened first'], 'complication':'The listener thinks the rain began after the museum visit.','closure':'Clarify that rain came before the route change and exhibition.'},
 'checks':[('recall','How did the group travel to the museum?','By bus.'),('write','Explain the changed route in French.','Nous avons donc changé de trajet pour rejoindre la porte du jardin.'),('listening','What did the group visit after entering?','An exhibition on old maps.','Ensuite, nous avons visité l’exposition sur les cartes anciennes.'),('comprehension','Did the rain happen before or after the route change?','Before the route change.'),('application','Give the first three events in French.','Nous sommes partis à neuf heures, avons pris le bus et avons attendu près de la cour.')],
},
}
def checksum(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (16,17,18):
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
out=OUT/'master-16-18-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
