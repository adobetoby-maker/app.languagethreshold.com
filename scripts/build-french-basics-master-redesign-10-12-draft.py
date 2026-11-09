#!/usr/bin/env python3
"""Author French Master 10–12 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
SPANISH='src/data/core60/es/master-spanish-basics.json'
PRACTICE='src/data/spanish-basics-practice.json'
PRIOR='content/french-basics/master-7-9-redesign-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
10:{
 'title':'Retrouver le propriétaire d’un objet',
 'scene':'Deux écharpes semblables ont été oubliées après un atelier. Une élève suit plusieurs indices avant de les rendre.',
 'focus':'possessifs; celui/celle; le/la/les; appartenir à; demander confirmation',
 'grammar':{'explanation':'Use the item’s gender and number for possessives. A feminine noun beginning with a vowel takes mon before it (mon écharpe), while a feminine noun beginning with a consonant takes ma (ma veste). Use celui/celle to distinguish similar objects and appartenir à to state ownership. Confirm the owner before handing an item over; a clue alone is not proof.', 'model':{'clue':'Celle-ci porte les initiales de Nadia.','contrast':'L’autre écharpe appartient peut-être à Camille.','question':'Est-ce que cette écharpe vous appartient ?','return':'Oui, c’est la mienne ; merci de me l’avoir rendue.'}, 'caution':'French mon écharpe reflects vowel onset, not masculine gender. Possessives alone do not establish ownership; this dialogue uses two independent clues and explicit confirmation.'},
 'terms':[('une écharpe','a scarf'),('les initiales','initials'),('celle-ci','this one'),('l’autre','the other one'),('appartenir à','to belong to'),('la mienne','mine'),('rendre un objet','to return an item'),('un indice','a clue')],
 'readingTitle':'Deux écharpes semblables',
 'pairs':[
 ('Ana : Deux écharpes ont été oubliées après l’atelier de ce matin.','Ana: Two scarves were left behind after this morning’s workshop.'),
 ('Hugo : Elles se ressemblent ; comment trouver leurs propriétaires ?','Hugo: They look alike; how can we find their owners?'),
 ('Ana : Celle-ci est bleue et porte les initiales N. D. sur son étiquette.','Ana: This one is blue and has the initials N. D. on its label.'),
 ('Hugo : Nadia a une écharpe bleue, mais vérifions avant de la lui rendre.','Hugo: Nadia has a blue scarf, but let us check before returning it to her.'),
 ('Ana : L’autre est grise et contient un billet de bibliothèque au nom de Camille.','Ana: The other one is gray and contains a library slip with Camille’s name.'),
 ('Hugo : Ce billet pourrait avoir été glissé là par quelqu’un d’autre.','Hugo: Someone else might have put that slip there.'),
 ('Ana : Nadia, est-ce que cette écharpe bleue vous appartient ?','Ana: Nadia, does this blue scarf belong to you?'),
 ('Nadia : Oui, c’est la mienne ; regardez, mes initiales sont sur l’étiquette.','Nadia: Yes, it is mine; look, my initials are on the label.'),
 ('Ana : Je vous la rends. Merci d’avoir confirmé le détail.','Ana: I am returning it to you. Thank you for confirming the detail.'),
 ('Hugo : Camille, avez-vous perdu une écharpe grise aujourd’hui ?','Hugo: Camille, did you lose a gray scarf today?'),
 ('Camille : Oui, la mienne a une petite couture rouge près du bord.','Camille: Yes, mine has a small red seam near the edge.'),
 ('Ana : Cette couture est bien là ; nous pouvons vous rendre l’autre écharpe.','Ana: That seam is indeed there; we can return the other scarf to you.')],
 'speaking':{'role':'Identify owners of two similar lost belongings.','opening':'Deux écharpes ont été oubliées après l’atelier.','objectives':['Describe and distinguish both items','Use clues without assuming ownership','Ask each possible owner to confirm a detail','Return each item to the confirmed owner'], 'complication':'A library slip may not prove ownership of the second scarf.','closure':'Confirm the seam and return the correct scarf to Camille.'},
 'checks':[('recall','What initials are on the blue scarf?','N. D.'),('write','Ask in French whether the blue scarf belongs to Nadia.','Nadia, est-ce que cette écharpe bleue vous appartient ?'),('listening','What detail confirms Camille’s scarf?','A small red seam near the edge.','Oui, la mienne a une petite couture rouge près du bord.'),('comprehension','Why is the library slip insufficient on its own?','Someone else could have put it there.'),('application','Explain in French why the second scarf can be returned.','La couture rouge est bien là ; nous pouvons rendre l’écharpe à Camille.')],
},
11:{
 'title':'Commander pour deux personnes',
 'scene':'Deux amis commandent au café. L’un préfère une boisson sans lait de vache; le lait d’avoine demandé est épuisé.',
 'focus':'aimer/préférer; sans; au lieu de; lui/leur; confirmer chaque commande',
 'grammar':{'explanation':'Ask each person’s preference and restriction separately before ordering. Use sans to exclude an ingredient, au lieu de for a proposed substitute, and lui/leur when describing delivery to a person. If a requested ingredient is unavailable, ask whether the specific alternative is acceptable; do not silently substitute it. Repeat the two orders before serving.', 'model':{'preference':'Nadia préfère un café sans lait de vache.','unavailable':'Nous n’avons plus de lait d’avoine.','alternative':'Le lait de soja vous conviendrait-il au lieu du lait d’avoine ?','confirmation':'Un café au lait de soja pour Nadia et un thé nature pour Hugo.'}, 'caution':'A dietary preference is not a medical allergy. If a learner states an allergy, the staff must check ingredients and cross-contact rather than promise safety. Verify the register and indirect-object forms in review.'},
 'terms':[('une préférence','a preference'),('sans lait de vache','without cow’s milk'),('du lait d’avoine','oat milk'),('du lait de soja','soy milk'),('au lieu de','instead of'),('cela vous conviendrait-il','would that suit you'),('un thé nature','plain tea'),('confirmer la commande','to confirm the order')],
 'readingTitle':'Deux boissons, une substitution',
 'pairs':[
 ('Serveuse : Bonjour. Qu’aimeriez-vous boire tous les deux ?','Server: Hello. What would you both like to drink?'),
 ('Hugo : Je voudrais un thé nature, sans sucre.','Hugo: I would like a plain tea, without sugar.'),
 ('Nadia : Pour moi, un café avec du lait d’avoine, s’il vous plaît.','Nadia: For me, a coffee with oat milk, please.'),
 ('Serveuse : Préférez-vous le lait d’avoine pour le goût ou évitez-vous le lait de vache ?','Server: Do you prefer oat milk for the taste, or are you avoiding cow’s milk?'),
 ('Nadia : J’évite le lait de vache, mais le lait de soja me convient aussi.','Nadia: I avoid cow’s milk, but soy milk also works for me.'),
 ('Serveuse : Nous n’avons plus de lait d’avoine aujourd’hui.','Server: We have no oat milk left today.'),
 ('Serveuse : Un café au lait de soja vous conviendrait-il au lieu du lait d’avoine ?','Server: Would a coffee with soy milk work for you instead of oat milk?'),
 ('Nadia : Oui, merci ; je préfère cette option à un café noir.','Nadia: Yes, thank you; I prefer that option to black coffee.'),
 ('Hugo : Mon thé reste sans sucre, n’est-ce pas ?','Hugo: My tea is still without sugar, right?'),
 ('Serveuse : Exactement : un thé nature sans sucre pour vous.','Server: Exactly: a plain tea without sugar for you.'),
 ('Serveuse : Et pour Nadia, un café au lait de soja, sans lait de vache.','Server: And for Nadia, a coffee with soy milk, without cow’s milk.'),
 ('Nadia : C’est bien notre commande ; apportez-lui le thé et servez-moi le café au lait de soja.','Nadia: That is our order; please bring him the tea and serve me the coffee with soy milk.')],
 'speaking':{'role':'Place and confirm two café orders.','opening':'Qu’aimeriez-vous boire tous les deux ?','objectives':['Ask each person’s preference','Record the no-cow-milk restriction','Offer soy only after oat milk is unavailable','Confirm who receives each drink'], 'complication':'Oat milk is unavailable; the substitution needs Nadia’s consent.','closure':'Repeat both final drinks and excluded ingredients.'},
 'checks':[('recall','What does Hugo order?','Plain tea without sugar.'),('write','Offer soy milk instead of oat milk politely in French.','Un café au lait de soja vous conviendrait-il au lieu du lait d’avoine ?'),('listening','Does Nadia accept soy milk?','Yes.','Oui, merci ; je préfère cette option à un café noir.'),('comprehension','What ingredient does Nadia avoid?','Cow’s milk.'),('application','Repeat both final orders in French.','Un thé nature sans sucre pour Hugo et un café au lait de soja sans lait de vache pour Nadia.')],
},
12:{
 'title':'Négocier un projet de groupe réalisable',
 'scene':'Un groupe doit préparer une présentation. Une première heure exclut un membre et la salle voulue n’est pas libre.',
 'focus':'pouvoir; devoir; si + présent; d’abord/ensuite; vérifier permissions et horaires',
 'grammar':{'explanation':'Combine ability (pouvoir), obligation (devoir), permission (avoir le droit de), place and timing in a single workable plan. A si + present condition can state what happens if a room is unavailable: si la salle est prise, nous irons à la bibliothèque. Sequence the plan with d’abord and ensuite, and confirm that every member can attend the revised time before assigning tasks.', 'model':{'constraint':'Léa ne peut pas venir à quatorze heures.','permission':'Nous avons le droit de réserver la petite salle après seize heures.','condition':'Si elle est prise, nous travaillerons à la bibliothèque.','sequence':'D’abord, nous choisirons les sources ; ensuite, nous préparerons les diapositives.'}, 'caution':'Future and si + present are used; verify that learners have enough earlier support. Do not claim a room is reserved before confirmation.'},
 'terms':[('un horaire commun','a time that works for everyone'),('avoir le droit de','to be allowed to'),('réserver une salle','to book a room'),('si la salle est prise','if the room is occupied'),('d’abord','first'),('ensuite','then'),('les diapositives','the slides'),('confirmer sa présence','to confirm attendance')],
 'readingTitle':'Un horaire que tous peuvent suivre',
 'pairs':[
 ('Camille : Nous devons préparer la présentation avant vendredi.','Camille: We must prepare the presentation before Friday.'),
 ('Hugo : Pouvons-nous nous réunir mardi à quatorze heures ?','Hugo: Can we meet Tuesday at two o’clock?'),
 ('Léa : Je ne peux pas venir à quatorze heures ; mon cours finit à quinze heures.','Léa: I cannot come at two; my class ends at three.'),
 ('Camille : Nous devons trouver un horaire qui convient à tout le groupe.','Camille: We must find a time that works for the whole group.'),
 ('Hugo : La grande salle est-elle libre après seize heures ?','Hugo: Is the large room free after four?'),
 ('Camille : Non, elle est déjà prise ; nous pouvons demander la petite salle.','Camille: No, it is already occupied; we can request the small room.'),
 ('Léa : Avons-nous le droit de la réserver pour une heure ?','Léa: Are we allowed to book it for one hour?'),
 ('Camille : Oui, mais il faut attendre la confirmation de l’accueil.','Camille: Yes, but we have to wait for confirmation from the front desk.'),
 ('Hugo : Si la petite salle est prise, nous irons à la bibliothèque.','Hugo: If the small room is occupied, we will go to the library.'),
 ('Léa : Mardi à seize heures trente me convient dans les deux lieux.','Léa: Tuesday at four thirty works for me at either location.'),
 ('Camille : D’abord, nous choisirons les sources ; ensuite, nous préparerons les diapositives.','Camille: First we will choose the sources; then we will prepare the slides.'),
 ('Hugo : Je confirme ma présence ; attendons la réponse avant d’annoncer la salle.','Hugo: I confirm I can attend; let us wait for the reply before announcing the room.')],
 'speaking':{'role':'Negotiate a feasible group meeting.','opening':'Nous devons préparer la présentation avant vendredi.','objectives':['Ask about everyone’s availability','Check room permission and status','Propose a fallback location','Confirm time and sequence of tasks'], 'complication':'Léa cannot attend at two, and the large room is occupied.','closure':'Agree on four thirty and leave room choice pending confirmation.'},
 'checks':[('recall','At what time can Léa attend?','Tuesday at four thirty.'),('write','Write the fallback condition in French.','Si la petite salle est prise, nous irons à la bibliothèque.'),('listening','What is the first group task?','Choose the sources.','D’abord, nous choisirons les sources ; ensuite, nous préparerons les diapositives.'),('comprehension','Why is the meeting room not yet announced?','The front desk has not confirmed the small room.'),('application','State a time, fallback place, and order of work in French.','Mardi à seize heures trente, nous irons à la bibliothèque si la salle est prise ; d’abord, nous choisirons les sources.')],
},
}
def checksum(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (10,11,12):
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
out=OUT/'master-10-12-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
