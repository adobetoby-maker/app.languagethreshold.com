#!/usr/bin/env python3
"""Pin Spanish 101 English source and author French Core 25–27 draft only."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'content/french-basics'
CORE = 'src/data/spanish-basics-core.json'
PRACTICE = 'src/data/spanish-basics-practice.json'
core = json.loads((ROOT / CORE).read_text())['lessons']
practice = json.loads((ROOT / PRACTICE).read_text())['spanish-basics']
source = {
    'sourceRevision': '0c901168b28e484aaffb432ef3f2ae8081e21eac',
    'target': 'French', 'native': 'English', 'sourcePaths': [CORE, PRACTICE],
    'sourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in (CORE, PRACTICE)},
    'lessons': [],
}
for n in (25, 26, 27):
    lesson = core[n - 1]
    source['lessons'].append({
        'n': n, 'title': lesson['title'], 'objective': lesson['objective'],
        'focus': lesson['focus'], 'words': lesson['words'],
        'speaking': lesson['speaking'], 'reading': practice[str(n)]['reading'],
    })
source_path = OUT / 'source-english-core-25-27.json'
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

A = {
  25: {
    'title': 'Chercher une personne',
    'objective': 'Parlez de personnes et de choses que vous cherchez, voyez ou connaissez, sans ajouter de préposition devant le complément direct en français.',
    'foundationTie': 'Reuses Core 21 connaître and Core 23 direct objects, now comparing person and thing objects.',
    'focus': 'verbe transitif + personne/chose; pas de « a » personnel en français',
    'grammar': {
      'explanation': 'Spanish often marks a specific person who is a direct object with a personal a. French normally does not: je cherche Ana, je vois Luis, je connais ma sœur. The same basic order works for a thing: je cherche mon livre. À can still appear for an indirect recipient (je donne un livre à Ana), but not merely because the direct object is a person. A person may be replaced by a direct-object pronoun: je la cherche.',
      'model': {'person': 'Je cherche Ana à la bibliothèque.', 'another person': 'Je vois Luis près de la porte.', 'thing': 'Je cherche mon livre dans le sac à dos.', 'question': 'Tu connais ma sœur ?'},
      'caution': 'The source lesson teaches a Spanish-only personal a. This French lesson deliberately teaches the contrasting French rule rather than inventing a matching particle. In “Je cherche Ana à la bibliothèque,” à marks the location, not Ana.'
    },
    'scene': 'Deux amis cherchent leurs proches et leurs affaires avant une visite à l’école.',
    'readingTitle': 'Retrouver ses amis',
    'reading': ['Je cherche Ana à la bibliothèque.', 'Je vois Luis près de la porte.', 'Nous rendons visite à la professeure aujourd’hui.', 'Je cherche mon livre dans le sac à dos.', 'J’ai deux frères.', 'Tu connais ma sœur ?'],
    'speaking': 'Look for friends with a classmate. Ask whether they have seen Ana, Luis or your sister, then say where your book is. Contrast direct person objects in chercher, voir and connaître with the recipient construction in rendre visite à. Confirm where to meet.',
    'frWords': ['sac à dos', 'livre', 'la', 'dans / sur / à', 'j’ai', 'deux', 'professeure', 'mon / ma', 'Je cherche Ana à la bibliothèque.', 'Je vois Luis près de la porte.', 'Nous rendons visite à la professeure aujourd’hui.', 'Je cherche mon livre dans le sac à dos.', 'J’ai deux frères.', 'Tu connais ma sœur ?'],
    'wordMeta': {2: {'note': 'La may be a feminine article, a direct-object pronoun, or “her” in context.'}, 3: {'note': 'Choose dans, sur or à by location; they are not interchangeable.'}, 6: {'note': 'Professeure is a female teacher; enseignante is another common term.'}, 7: {'note': 'Use mon before a masculine noun and ma before a feminine noun; both mean “my”.'}, 10: {'note': 'Rendre visite à takes à because of the French verb construction; this is not a personal a rule.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete without a personal a: Je cherche ___ à la bibliothèque.', 'answer': 'Ana'},
      {'type': 'write', 'prompt': 'Write in French: I see Luis near the door.', 'answer': 'Je vois Luis près de la porte.'},
      {'type': 'listening', 'audioText': 'Je cherche mon livre dans le sac à dos.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: what is being sought in the backpack?', 'answer': 'My book.'},
      {'type': 'comprehension', 'prompt': 'Who are we visiting today in the reading?', 'answer': 'The female teacher.'},
      {'type': 'recall', 'prompt': 'Complete: Tu connais ___ sœur ?', 'answer': 'ma'},
    ],
  },
  26: {
    'title': 'Raconter hier',
    'objective': 'Racontez des actions achevées hier au passé composé avec avoir et distinguez les participes réguliers de quelques formes fréquentes irrégulières.',
    'foundationTie': 'Builds on Core 19 plans and Core 24 class materials; now locates completed actions in the past.',
    'focus': 'passé composé: avoir au présent + participe passé; -é/-i/-u and acheté, étudié, parlé, fini, mangé, écrit',
    'grammar': {
      'explanation': 'For these completed actions, use the present of avoir plus a past participle: j’ai étudié, Ana a acheté, nous avons mangé. Many -er verbs form -é (parler → parlé); many -ir verbs form -i (finir → fini), and many -re verbs form -u (vendre → vendu), but there are exceptions. Écrire → écrit is irregular. A simple question can use est-ce que: Est-ce que tu as fini les devoirs hier ?',
      'model': {'study': 'Hier, j’ai étudié à la bibliothèque.', 'buy': 'Ana a acheté un cahier.', 'eat': 'Nous avons mangé à la cafétéria.', 'write': 'Luis a écrit un message.'},
      'caution': 'The Spanish source calls this the preterite, but French does not use one analogous everyday form for all these lines. This lesson uses the conversational passé composé. “Comimos” and “escribió” yield French mangé and irregular écrit; the lesson title “regular” must not hide that contrast.'
    },
    'scene': 'Le lendemain d’une journée à l’école, des amis racontent ce qu’ils ont fait.',
    'readingTitle': 'Hier à l’école',
    'reading': ['Hier, j’ai étudié à la bibliothèque.', 'Ana a acheté un cahier.', 'Nous avons mangé à la cafétéria.', 'Luis a écrit un message.', 'Mes amis ont parlé avec la professeure.', 'Est-ce que tu as fini les devoirs hier ?'],
    'speaking': 'Tell a classmate what happened yesterday at school. Say where you studied, what Ana bought and where you ate; report Luis’s message and your friends’ talk with the teacher. Ask whether your classmate finished the homework, then repeat one answer using a different subject.',
    'frWords': ['cahier', 'la', 'un', 'un cahier', 'dans / sur / à', 'professeure', 'amis', 'bibliothèque', 'Hier, j’ai étudié à la bibliothèque.', 'Ana a acheté un cahier.', 'Nous avons mangé à la cafétéria.', 'Luis a écrit un message.', 'Mes amis ont parlé avec la professeure.', 'Est-ce que tu as fini les devoirs hier ?'],
    'wordMeta': {1: {'note': 'La is a feminine article or object pronoun by context.'}, 4: {'note': 'Choose dans, sur or à by location; the pinned English gloss is broad.'}, 5: {'note': 'Professeure refers here to a female teacher.'}, 13: {'note': 'Les devoirs is the usual French noun for school homework.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the past: Hier, j’___ étudié.', 'answer': 'ai'},
      {'type': 'write', 'prompt': 'Write in French: Luis wrote a message.', 'answer': 'Luis a écrit un message.'},
      {'type': 'listening', 'audioText': 'Nous avons mangé à la cafétéria.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: where did we eat?', 'answer': 'In the cafeteria.'},
      {'type': 'comprehension', 'prompt': 'Who bought a notebook in the reading?', 'answer': 'Ana.'},
      {'type': 'recall', 'prompt': 'Complete the irregular participle: Luis a ___ un message.', 'answer': 'écrit'},
    ],
  },
  27: {
    'title': 'Aller ou être hier',
    'objective': 'Distinguez un déplacement accompli avec être allé d’un état ou jugement passé avec a été, et accordez allé avec le sujet.',
    'foundationTie': 'Extends Core 19 aller + infinitive and Core 26 passé composé to a movement verb and a past state.',
    'focus': 'aller: être + allé(e)(s); être: avoir + été',
    'grammar': {
      'explanation': 'Unlike Spanish fui, French everyday past forms for “went” and “was” are different. Aller uses être as its auxiliary: je suis allé(e), Ana est allée, nous sommes allé(e)s. The participle agrees with the subject. Être uses avoir in the passé composé: la visite a été intéressante, le voyage a été difficile. These forms let you say whether someone went somewhere or what an experience was like.',
      'model': {'I went': 'Hier, je suis allé au musée.', 'Ana went': 'Ana est allée avec sa sœur.', 'visit was': 'La visite a été intéressante.', 'we went': 'Nous sommes allés au café ensuite.'},
      'caution': 'The Spanish source teaches that fui/fue/fuimos can belong to both ir and ser. French does not share that form; teach two distinct constructions instead. Je suis allé assumes a male speaker, je suis allée a female speaker. Nous sommes allés is mixed/masculine; an all-female group writes allées. Spoken endings may sound alike.'
    },
    'scene': 'Après une sortie au musée, des amis racontent où ils sont allés et ce qu’ils ont pensé de la visite.',
    'readingTitle': 'Une sortie au musée',
    'reading': ['Hier, je suis allé au musée.', 'Ana est allée avec sa sœur.', 'La visite a été intéressante.', 'Nous sommes allés au café ensuite.', 'Les amis ont été très gentils.', 'Le voyage a été difficile ?'],
    'speaking': 'Describe a museum trip to a classmate. Say where you went, who accompanied Ana, what the visit was like, and where your group went afterward. Ask whether the trip was difficult, then confirm who was kind. Use être allé for movement and a été/ont été for descriptions.',
    'frWords': ['le', 'la', 'les', 'amis', 'gentils / gentilles', 'avec', 'café', 'son / sa / ses', 'Hier, je suis allé au musée.', 'Ana est allée avec sa sœur.', 'La visite a été intéressante.', 'Nous sommes allés au café ensuite.', 'Les amis ont été très gentils.', 'Le voyage a été difficile ?'],
    'wordMeta': {1: {'note': 'La can be a feminine article or object pronoun.'}, 2: {'note': 'Les is a plural article or object pronoun for any gender.'}, 4: {'note': 'Gentils is masculine/mixed plural; gentilles is feminine plural.'}, 6: {'note': 'Café means the drink or the place, depending on context; the reading means the place.'}, 7: {'note': 'French son/sa/ses agrees with the thing possessed, not the possessor; English his/her/your/their requires context.'}, 8: {'note': 'Allé marks a male speaker; a female speaker writes allée.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete for Ana: Ana est ___ avec sa sœur.', 'answer': 'allée'},
      {'type': 'write', 'prompt': 'Write in French: The visit was interesting.', 'answer': 'La visite a été intéressante.'},
      {'type': 'listening', 'audioText': 'Nous sommes allés au café ensuite.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: where did the group go afterward?', 'answer': 'To the café.'},
      {'type': 'comprehension', 'prompt': 'How were the friends in the reading?', 'answer': 'Very kind.'},
      {'type': 'recall', 'prompt': 'Complete the past description: La visite a ___ intéressante.', 'answer': 'été'},
    ],
  },
}

draft = {
    'target': 'French', 'native': 'English', 'moduleId': 'french-basics', 'stage': 'core',
    'reviewed': False, 'state': 'authored-draft',
    'source': {'path': 'content/french-basics/source-english-core-25-27.json',
               'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
               'sourcePaths': [CORE, PRACTICE], 'sourceFileSha256': source['sourceSha256'],
               'use': 'Exact English objectives, word meanings, reading meanings and progression; French grammar and examples authored separately'},
    'draftModel': 'Codex authored; independent Fable/Opus and human review pending',
    'sourceNotes': ['Core 22 source objective is truncated; examples determine the broader comparison scope.',
                    'French le/la/les and lui/leur do not map one-to-one to Spanish object pronouns.',
                    'Broad English source glosses receive notes rather than false universal equivalents.'],
    'lessons': [],
}
for english in source['lessons']:
    n = english['n']; a = A[n]
    assert len(a['frWords']) == len(english['words']) == 14
    assert len(a['reading']) == len(english['reading']['native']) == 6
    words = [{'order': i + 1, 'fr': fr, 'en': original['en'], 'kind': original['kind'],
              **a['wordMeta'].get(i, {})} for i, (fr, original) in enumerate(zip(a['frWords'], english['words']))]
    dialogue = [f'{fr}|{en}' for fr, en in zip(a['reading'], english['reading']['native'])]
    draft['lessons'].append({'n': n, 'title': a['title'], 'sourceTitleEnglish': english['title'],
                             'sourceObjectiveEnglish': english['objective'], 'objective': a['objective'],
                             'foundationTie': a['foundationTie'], 'focus': a['focus'], 'grammar': a['grammar'],
                             'scene': a['scene'], 'dialogue': dialogue, 'speaking': a['speaking'], 'words': words,
                             'reading': {'title': a['readingTitle'], 'sourceTitleEnglish': english['reading']['title'],
                                         'target': a['reading'], 'native': english['reading']['native']},
                             'checks': a['checks'], 'locale': 'fr-FR'})
(OUT / 'core-25-27-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-25-27-draft.json')
