#!/usr/bin/env python3
"""Pin Spanish 101 English source and author French Core 28–30 draft only."""
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
for n in (28, 29, 30):
    lesson = core[n - 1]
    source['lessons'].append({
        'n': n, 'title': lesson['title'], 'objective': lesson['objective'],
        'focus': lesson['focus'], 'words': lesson['words'],
        'speaking': lesson['speaking'], 'reading': practice[str(n)]['reading'],
    })
source_path = OUT / 'source-english-core-28-30.json'
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

A = {
  28: {
    'title': 'Avant et maintenant',
    'objective': 'Décrivez d’anciennes habitudes et situations à l’imparfait, puis opposez-les à la vie actuelle au présent.',
    'foundationTie': 'Contrasts Core 26 completed actions with past habits/background and reuses Core 18 places.',
    'focus': 'imparfait: -ais/-ait/-ions/-iez/-aient; avoir → avait; maintenant + présent',
    'grammar': {
      'explanation': 'Use the French imparfait for a repeated past habit or background situation: avant, j’habitais près de l’école; Ana allait à pied à la bibliothèque; nous mangions ensemble le vendredi. Form most imperfect endings from the present nous stem: nous habitons → habit- → j’habitais. Common verbs need attention: avoir → avait; être → était; aller → allait. A current situation uses present tense: maintenant, nous habitons dans une autre ville.',
      'model': {'home': 'Avant, j’habitais près de l’école.', 'study': 'J’étudiais l’espagnol l’après-midi.', 'walk': 'Ana allait à pied à la bibliothèque.', 'now': 'Maintenant, nous habitons dans une autre ville.'},
      'caution': 'The English source explicitly says the learner used to study Spanish, so l’espagnol remains the subject of that line. French imparfait is not a word-for-word copy of Spanish imperfect forms; examples use natural French. For a single completed event, use the passé composé taught in Core 26.'
    },
    'scene': 'Deux amis comparent leurs habitudes scolaires d’autrefois avec leur vie dans une nouvelle ville.',
    'readingTitle': 'Avant et maintenant',
    'reading': ['Avant, j’habitais près de l’école.', 'J’étudiais l’espagnol l’après-midi.', 'Ana allait à pied à la bibliothèque.', 'Nous mangions ensemble le vendredi.', 'Luis avait un sac à dos bleu.', 'Maintenant, nous habitons dans une autre ville.'],
    'speaking': 'Compare an earlier school routine with today. Say where you used to live, what you studied in the afternoon, how Ana went to the library, and when you ate together. Describe Luis’s backpack, then say where you live now and ask your partner what changed for them.',
    'frWords': ['sac à dos', 'la', 'une', 'un sac à dos', 'dans / sur / à', 'bleu / bleue', 'les', 'de', 'Avant, j’habitais près de l’école.', 'J’étudiais l’espagnol l’après-midi.', 'Ana allait à pied à la bibliothèque.', 'Nous mangions ensemble le vendredi.', 'Luis avait un sac à dos bleu.', 'Maintenant, nous habitons dans une autre ville.'],
    'wordMeta': {1: {'note': 'La can be an article or an object pronoun depending on context.'}, 3: {'note': 'French sac is masculine, so the phrase is un sac à dos despite the English source’s feminine Spanish word.'}, 4: {'note': 'Choose dans, sur or à by location; they are not interchangeable.'}, 5: {'note': 'Bleu agrees with a masculine noun; bleue with a feminine noun.'}, 6: {'note': 'Les is a plural article or object pronoun, regardless of gender.'}, 9: {'note': 'The source says Spanish, so l’espagnol is retained for exact English meaning.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the old habit: Avant, j’___ près de l’école.', 'answer': 'habitais'},
      {'type': 'write', 'prompt': 'Write in French: Luis had a blue backpack.', 'answer': 'Luis avait un sac à dos bleu.'},
      {'type': 'listening', 'audioText': 'Nous mangions ensemble le vendredi.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: when did we used to eat together?', 'answer': 'On Fridays.'},
      {'type': 'comprehension', 'prompt': 'Where do we live now in the reading?', 'answer': 'In another city.'},
      {'type': 'recall', 'prompt': 'Complete the current contrast: Maintenant, nous ___ dans une autre ville.', 'answer': 'habitons'},
    ],
  },
  29: {
    'title': 'Pour, par et vers',
    'objective': 'Choisissez pour pour un bénéficiaire ou un but, par pour un passage ou une cause, et vers pour une direction.',
    'foundationTie': 'Reuses Core 22 place comparison, Core 24 recipients and Core 25 school locations; adds purpose, passage, cause and direction.',
    'focus': 'pour + bénéficiaire/infinitif; par + passage/cause; vers + direction',
    'grammar': {
      'explanation': 'French pour can identify a beneficiary (ce livre est pour Ana) or purpose (j’étudie pour apprendre). Par can describe a route through a place (nous passons par le parc) and occurs in merci pour ton aide. A cause often needs à cause de (fermé à cause de la pluie), rather than par. For heading toward a place without promising arrival, use vers: je me dirige vers la bibliothèque.',
      'model': {'recipient': 'Ce livre est pour Ana.', 'purpose': 'J’étudie pour apprendre l’espagnol.', 'route': 'Nous passons par le parc à pied.', 'direction': 'Je me dirige vers la bibliothèque.'},
      'caution': 'Spanish por/para are not a universal two-word French map. The source’s “because of the rain” becomes à cause de la pluie, while “toward the library” becomes vers la bibliothèque. English “through / because of” is pinned as a source gloss, but par by itself does not cover every because-of case; the French card includes a contextual note.'
    },
    'scene': 'Ana reçoit un livre avant une promenade; la pluie change ensuite le trajet vers la bibliothèque.',
    'readingTitle': 'Un cadeau et une promenade',
    'reading': ['Ce livre est pour Ana.', 'J’étudie pour apprendre l’espagnol.', 'Nous passons par le parc à pied.', 'Merci pour ton aide.', 'Je me dirige vers la bibliothèque.', 'Le magasin est fermé à cause de la pluie.'],
    'speaking': 'Give a book to Ana, explain why you study, and plan a walk through the park. Thank a friend for helping. Say that you are heading toward the library, then explain why the store is closed. Ask your partner to choose a different route if it rains.',
    'frWords': ['livre', 'est', 'est / se trouve', 'le', 'la', 'pour', 'bibliothèque', 'par / à cause de', 'Ce livre est pour Ana.', 'J’étudie pour apprendre l’espagnol.', 'Nous passons par le parc à pied.', 'Merci pour ton aide.', 'Je me dirige vers la bibliothèque.', 'Le magasin est fermé à cause de la pluie.'],
    'wordMeta': {1: {'note': 'French est covers identity, condition and location; there is no ser/estar split.'}, 2: {'note': 'Est can state a condition or location; se trouve highlights location.'}, 4: {'note': 'La is a feminine article or object pronoun by syntax.'}, 5: {'note': 'Pour may mark a beneficiary or a purpose; a destination may require a different construction.'}, 7: {'note': 'Par can mean through in a route; because of rain is normally à cause de la pluie. The source English gloss spans different French constructions.'}, 9: {'note': 'The source says learn Spanish; l’espagnol is retained for exact English meaning.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the purpose: J’étudie ___ apprendre.', 'answer': 'pour'},
      {'type': 'write', 'prompt': 'Write in French: The store is closed because of the rain.', 'answer': 'Le magasin est fermé à cause de la pluie.'},
      {'type': 'listening', 'audioText': 'Nous passons par le parc à pied.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: which place does the route pass through?', 'answer': 'The park.'},
      {'type': 'comprehension', 'prompt': 'Who is the book for in the reading?', 'answer': 'Ana.'},
      {'type': 'recall', 'prompt': 'Complete the direction: Je me dirige ___ la bibliothèque.', 'answer': 'vers'},
    ],
  },
  30: {
    'title': 'Relier ses idées',
    'objective': 'Reliez une idée supplémentaire, une opposition, une raison et une conséquence avec et, mais, parce que et donc/alors.',
    'foundationTie': 'Core capstone reuses place, possession, future plan and object pronouns from earlier lessons.',
    'focus': 'et; mais; parce que; donc/alors; puis/ensuite',
    'grammar': {
      'explanation': 'Et joins ideas, mais contrasts them, parce que gives a reason, and donc or alors marks a result or next step. Puis and ensuite place one event after another. Keep each connector attached to a complete thought: je veux étudier, mais la bibliothèque est fermée; nous allons au café parce qu’il est ouvert; Luis n’a pas d’argent, alors Ana l’invite. The final line returns to aller + infinitive for a plan tomorrow.',
      'model': {'contrast': 'Je veux étudier, mais la bibliothèque est fermée.', 'addition': 'Ana a un livre et deux cahiers.', 'reason': 'Nous allons au café parce qu’il est ouvert.', 'result': 'Luis n’a pas d’argent, alors Ana l’invite.'},
      'caution': 'In café context, Ana l’invite means she treats Luis; elsewhere inviter may only mean “invite,” so the scene supplies the payment meaning. The source also uses “then” in a separate line; French ensuite marks sequence, while donc/alors can signal a consequence.'
    },
    'scene': 'La bibliothèque est fermée, alors des amis changent leur plan d’étude et se retrouvent au café.',
    'readingTitle': 'Un plan qui change',
    'reading': ['Je veux étudier, mais la bibliothèque est fermée.', 'Ana a un livre et deux cahiers.', 'Nous allons au café parce qu’il est ouvert.', 'Luis n’a pas d’argent, alors Ana l’invite.', 'Nous étudions pendant une heure, puis nous rentrons à pied.', 'Demain, nous allons réviser ensemble.'],
    'speaking': 'Tell a classmate that the library is closed, explain why the group goes to the café, and say how Ana helps Luis. Add the books and notebooks to the plan, describe an hour of study and the walk home, then agree to review together tomorrow. Ask the partner to restate the reason and result.',
    'frWords': ['livre', 'est', 'la', 'un', 'une', 'et', 'deux', 'cahiers', 'Je veux étudier, mais la bibliothèque est fermée.', 'Ana a un livre et deux cahiers.', 'Nous allons au café parce qu’il est ouvert.', 'Luis n’a pas d’argent, alors Ana l’invite.', 'Nous étudions pendant une heure, puis nous rentrons à pied.', 'Demain, nous allons réviser ensemble.'],
    'wordMeta': {1: {'note': 'Est expresses condition or location here; French does not have a ser/estar split.'}, 2: {'note': 'La can be an article or a direct-object pronoun by context.'}, 11: {'note': 'Ana l’invite means she treats him in the café/payment context; without that context, inviter may only mean “invite”.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the contrast: Je veux étudier, ___ la bibliothèque est fermée.', 'answer': 'mais'},
      {'type': 'write', 'prompt': 'Write in French: We are going to the café because it is open.', 'answer': 'Nous allons au café parce qu’il est ouvert.'},
      {'type': 'listening', 'audioText': 'Luis n’a pas d’argent, alors Ana l’invite.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: who pays for Luis in the café context?', 'answer': 'Ana.'},
      {'type': 'comprehension', 'prompt': 'What will the group do tomorrow in the reading?', 'answer': 'Review together.'},
      {'type': 'recall', 'prompt': 'Complete the result: Luis n’a pas d’argent, ___ Ana l’invite.', 'answer': 'alors'},
    ],
  },
}

draft = {
    'target': 'French', 'native': 'English', 'moduleId': 'french-basics', 'stage': 'core',
    'reviewed': False, 'state': 'authored-draft',
    'source': {'path': 'content/french-basics/source-english-core-28-30.json',
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
(OUT / 'core-28-30-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-28-30-draft.json')
