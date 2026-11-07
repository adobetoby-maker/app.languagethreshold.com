#!/usr/bin/env python3
"""Author French Master 1–3 candidate pairs from map; keep Spanish source as provenance."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'content/french-basics'
MAP='docs/french-program/french-101-master-curriculum-map.json'
LEGACY='content/french-basics/source-english-master-1-3.json'
OLD='content/french-basics/master-1-3-draft.json'
plan=json.loads((ROOT/MAP).read_text())['lessons']
A={
1:{
 'title':'Présenter une nouvelle camarade au groupe',
 'scene':'Une professeure demande une présentation de bienvenue; un camarade veut connaître la raison de l’arrivée et réclame une formule plus formelle.',
 'focus':'présenter quelqu’un; tu/vous; venir de; parce que; reformulation polie',
 'grammar':{'explanation':'Use elle s’appelle and elle vient de to introduce another person. Tu fits peers; vous fits a formal group or unfamiliar adult. Explain a reason with parce que. To repair an overly informal first introduction, restate the same facts with vous and a fuller greeting; do not change the facts.', 'model':{'peer':'Je te présente Camille. Elle vient de Lyon.', 'formal':'Je vous présente Camille, notre nouvelle camarade.', 'reason':'Elle nous rejoint parce qu’elle veut pratiquer la conversation.'}, 'caution':'A polished introduction is a multi-turn task, not a vowel drill. The old Spanish Master 1 reading stays only in provenance; these are new French/English pairs.'},
 'terms':[('nouvelle camarade','new classmate'),('je vous présente','I introduce to you (formal/plural)'),('elle vient de','she comes from'),('elle nous rejoint','she is joining us'),('parce que','because'),('pourriez-vous','could you (formal)'),('plus formellement','more formally'),('si j’ai bien compris','if I understood correctly')],
 'readingTitle':'Une présentation à deux registres',
 'pairs':[
  ('Professeure : Pourriez-vous présenter notre nouvelle camarade au groupe ?', 'Teacher: Could you introduce our new classmate to the group?'),
  ('Élève : Bien sûr. Je vous présente Camille, qui vient de Lyon.', 'Student: Of course. I would like to introduce Camille, who comes from Lyon.'),
  ('Professeure : Quel rôle aura-t-elle dans notre projet ?', 'Teacher: What role will she have in our project?'),
  ('Élève : Elle coordonnera les échanges avec les autres groupes.', 'Student: She will coordinate the exchanges with the other groups.'),
  ('Camarade : Pourquoi a-t-elle choisi de nous rejoindre ?', 'Classmate: Why did she choose to join us?'),
  ('Élève : Parce qu’elle veut pratiquer la conversation et partager son expérience.', 'Student: Because she wants to practise conversation and share her experience.'),
  ('Camille : Merci. Puis-je aussi vous poser une question ?', 'Camille: Thank you. May I ask you a question as well?'),
  ('Élève : Bien entendu ; nous pourrons parler après la réunion.', 'Student: Certainly; we can talk after the meeting.'),
  ('Camarade : Tu peux la présenter à notre responsable plus formellement ?', 'Classmate: Can you introduce her to our coordinator more formally?'),
  ('Élève : Madame, je vous présente Camille, notre nouvelle collègue de projet.', 'Student: Ma’am, I would like to introduce Camille, our new project colleague.'),
  ('Responsable : Si j’ai bien compris, elle coordonnera les échanges ?', 'Coordinator: If I understood correctly, she will coordinate the exchanges?'),
  ('Élève : Exactement. Camille, souhaitez-vous ajouter quelque chose ?', 'Student: Exactly. Camille, would you like to add anything?')],
 'speaking':{'role':'Introduce a new classmate to a teacher and a peer.', 'opening':'Je vous présente Camille, qui vient de Lyon.', 'objectives':['Give name, origin and project role','Answer why she joined','Switch from tu to vous when asked','Confirm the coordinator understood'], 'complication':'The peer asks for a more formal introduction to the coordinator.', 'closure':'Invite Camille to add something and confirm the handoff.'},
 'checks':[('recall','Complete the formal introduction: Je ___ présente Camille.','vous'),('write','Write a formal French sentence: I would like to introduce Camille, our new project colleague.','Je vous présente Camille, notre nouvelle collègue de projet.'),('listening','What role will Camille have?','She will coordinate exchanges with other groups.','Elle coordonnera les échanges avec les autres groupes.'),('comprehension','Why did Camille join?','To practise conversation and share her experience.'),('application','How do you ask Camille formally if she wants to add something?','Camille, souhaitez-vous ajouter quelque chose ?')],
},
2:{
 'title':'Adapter une liste de matériel',
 'scene':'Un groupe lit un bref courriel sur le matériel du cours; un cahier grand format manque et une solution de remplacement doit être validée.',
 'focus':'il faut; il manque; avoir besoin de; à la place de; confirmation explicite',
 'grammar':{'explanation':'Extract obligations from a written brief with il faut or nous avons besoin de. Contrast available items with a missing one using il y a and il manque. Propose a substitute with à la place de, but ask whether it meets the actual need before treating it as approved. Distinguish dans (inside a bag) from sur (on a table).', 'model':{'required':'Il faut un cahier grand format pour le cours.', 'missing':'Il nous manque un cahier grand format.', 'substitute':'Peut-on utiliser deux cahiers ordinaires à la place ?', 'confirmation':'Cela convient-il pour le travail en groupe ?'}, 'caution':'The original Spanish Master 2 source teaches articles and isolated classroom objects. This redesigned task requires reading, reconciliation, substitution and confirmation; its English pairs are new.'},
 'terms':[('consigne','instruction'),('matériel','supplies'),('cahier grand format','large-format notebook'),('il nous manque','we are missing'),('à la place de','instead of'),('cela convient-il','is that suitable'),('sur la table','on the table'),('dans le sac','in the bag')],
 'readingTitle':'Un courriel avant le cours',
 'pairs':[
  ('Courriel : Pour le travail de demain, apportez un cahier grand format et deux stylos.', 'Email: For tomorrow’s work, bring one large-format notebook and two pens.'),
  ('Léa : J’ai déjà les deux stylos dans mon sac.', 'Léa: I already have the two pens in my bag.'),
  ('Noé : Le cahier qui est sur la table est-il assez grand ?', 'Noé: Is the notebook on the table large enough?'),
  ('Léa : Non, c’est un petit cahier ; il nous manque le grand format.', 'Léa: No, it is a small notebook; we are missing the large format.'),
  ('Noé : Le magasin est fermé ce soir, donc nous ne pouvons pas en acheter un.', 'Noé: The shop is closed this evening, so we cannot buy one.'),
  ('Léa : Nous avons pourtant deux cahiers ordinaires.', 'Léa: We do, however, have two ordinary notebooks.'),
  ('Noé : Peut-on les utiliser à la place du grand cahier ?', 'Noé: Can we use them instead of the large notebook?'),
  ('Léa : Je vais demander si cela convient pour le travail en groupe.', 'Léa: I will ask whether that is suitable for the group work.'),
  ('Professeure : Oui, à condition de numéroter les pages dans le même ordre.', 'Teacher: Yes, provided that you number the pages in the same order.'),
  ('Noé : Alors, je mettrai un cahier dans chaque sac.', 'Noé: Then I will put one notebook in each bag.'),
  ('Léa : Je vérifierai aussi que les stylos fonctionnent.', 'Léa: I will also check that the pens work.'),
  ('Noé : Parfait, nous avons maintenant tout ce qu’il faut pour demain.', 'Noé: Great, we now have everything we need for tomorrow.')],
 'speaking':{'role':'Reconcile a supplies email with a classmate.', 'opening':'Il faut un cahier grand format et deux stylos pour demain.', 'objectives':['Read the requirement','State what is present and missing','Propose two ordinary notebooks as a substitute','Ask the teacher to confirm the condition'], 'complication':'The large-format notebook cannot be purchased tonight.', 'closure':'Recap who brings which notebook and confirm the pens work.'},
 'checks':[('recall','Complete: Il nous ___ un cahier grand format.','manque'),('write','Write in French: Can we use them instead of the large notebook?','Peut-on les utiliser à la place du grand cahier ?'),('listening','What condition does the teacher set?','Number the pages in the same order.','Oui, à condition de numéroter les pages dans le même ordre.'),('comprehension','Why can’t the group buy a large notebook tonight?','The shop is closed.'),('application','How do you ask whether the substitute is suitable?','Cela convient-il pour le travail en groupe ?')],
},
3:{
 'title':'Répartir le matériel entre quatre personnes',
 'scene':'Quatre camarades préparent un atelier; deux réclament le même dictionnaire, tandis que cahiers et crayons doivent être distribués.',
 'focus':'il manque; il nous faut; chacun; lui/leur; proposer une répartition équitable',
 'grammar':{'explanation':'For a group allocation, state the total with il y a, the shortage with il manque and the need with il nous faut. Use lui for one recipient and leur for several: je lui donne un cahier; je leur donne les crayons. Chacun can mean each person; make the division explicit rather than assuming everyone receives the same object. Explain and confirm a compromise when two people need one resource.', 'model':{'total':'Il y a quatre personnes, mais seulement trois cahiers.', 'recipient':'Je donne un cahier à Ana ; je lui donne aussi un crayon.', 'group':'Je leur distribue les crayons.', 'compromise':'Ana utilisera le dictionnaire d’abord, puis Hugo le prendra.'}, 'caution':'The original Spanish Master 3 source repeats beginner plural inventories. This redesign adds a shortage, named recipients, a shared resource conflict and negotiated order. It has new French and English learner pairs.'},
 'terms':[('répartition','allocation'),('il manque','there is a shortage of'),('il nous faut','we need'),('chacun','each person'),('lui','to him or her'),('leur','to them'),('d’abord','first'),('à tour de rôle','in turns')],
 'readingTitle':'Un dictionnaire pour deux',
 'pairs':[
  ('Maya : Nous sommes quatre, mais il n’y a que trois cahiers.', 'Maya: There are four of us, but there are only three notebooks.'),
  ('Hugo : Il nous en faut un de plus avant de commencer.', 'Hugo: We need one more before we begin.'),
  ('Ana : Je peux apporter le mien ; je le donnerai à Léa.', 'Ana: I can bring mine; I will give it to Léa.'),
  ('Maya : Merci. Je lui donnerai aussi un crayon.', 'Maya: Thank you. I will give her a pencil as well.'),
  ('Hugo : Et les autres crayons, à qui les donne-t-on ?', 'Hugo: And the other pencils, who do we give them to?'),
  ('Maya : Je les distribue au groupe ; chacun en aura un.', 'Maya: I will distribute them to the group; each person will have one.'),
  ('Ana : Hugo et moi avons tous les deux besoin du dictionnaire.', 'Ana: Hugo and I both need the dictionary.'),
  ('Léa : Il n’y en a qu’un, alors comment allons-nous faire ?', 'Léa: There is only one, so how are we going to manage?'),
  ('Maya : Ana l’utilisera d’abord pendant dix minutes.', 'Maya: Ana will use it first for ten minutes.'),
  ('Hugo : Ensuite, elle me le passera et je vérifierai les mots.', 'Hugo: After that, she will pass it to me and I will check the words.'),
  ('Ana : Cela me convient, si nous gardons le même ordre.', 'Ana: That works for me, if we keep the same order.'),
  ('Maya : D’accord : un cahier et un crayon chacun, puis le dictionnaire à tour de rôle.', 'Maya: Agreed: one notebook and one pencil each, then the dictionary in turns.')],
 'speaking':{'role':'Allocate supplies to a group of four.', 'opening':'Nous sommes quatre, mais il n’y a que trois cahiers.', 'objectives':['Count the shortage','Give a named person a notebook and pencil','Distribute the other pencils to the group','Negotiate dictionary use between Ana and Hugo'], 'complication':'Ana and Hugo both need the only dictionary.', 'closure':'Recap one notebook and pencil each plus the agreed dictionary order.'},
 'checks':[('recall','Complete: Je ___ donnerai aussi un crayon.','lui'),('write','Write in French: Ana will use it first for ten minutes.','Ana l’utilisera d’abord pendant dix minutes.'),('listening','Who receives the extra notebook?','Léa.','Je peux apporter le mien ; je le donnerai à Léa.'),('comprehension','How many notebooks are there at first?','Three.'),('application','State the final dictionary arrangement in French.','Ana l’utilisera d’abord, puis Hugo le prendra.')],
}}

def checksum(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
lessons=[]
for n in (1,2,3):
 a=A[n]; m=plan[n-1]
 assert len(a['terms'])==8 and len(a['pairs'])==12 and len(a['checks'])==5
 words=[{'order':i+1,'fr':fr,'en':en,'kind':'term'} for i,(fr,en) in enumerate(a['terms'])]
 words += [{'order':i+9,'fr':fr,'en':en,'kind':'phrase'} for i,(fr,en) in enumerate(a['pairs'])]
 checks=[]
 for item in a['checks']:
  kind,prompt,answer,*extra=item
  check={'type':kind,'prompt':prompt,'answer':answer}
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
   'legacySpanishEnglishSource':LEGACY,'legacySpanishEnglishSourceSha256':checksum(LEGACY),
   'legacyFrenchDraft':OLD,'legacyFrenchDraftSha256':checksum(OLD),
   'policy':'Legacy English pairs remain provenance only; candidate learner pairs are newly authored and unreviewed'},
 'draftModel':'Codex-authored; independent Fable/Opus and qualified human review pending',
 'lessons':lessons}
out=OUT/'master-1-3-redesign-draft.json'
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {out.relative_to(ROOT)}: {sum(len(x["words"]) for x in lessons)} cards, {sum(len(x["reading"]["target"]) for x in lessons)} reading pairs')
