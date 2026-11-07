#!/usr/bin/env python3
"""Pin English source and build French 101 Core 16–18 authored drafts."""
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
    'sourceRevision': 'c6c4f26b0d911ac2871e82586fa01ee38644dc9a',
    'target': 'French', 'native': 'English', 'sourcePaths': [CORE, PRACTICE],
    'sourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in (CORE, PRACTICE)},
    'lessons': [],
}
for n in (16, 17, 18):
    lesson = core[n - 1]
    source['lessons'].append({
        'n': n, 'title': lesson['title'], 'objective': lesson['objective'],
        'focus': lesson['focus'], 'words': lesson['words'],
        'speaking': lesson['speaking'], 'reading': practice[str(n)]['reading'],
    })
source_path = OUT / 'source-english-core-16-18.json'
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

A = {
  16: {
    'title': 'Les gestes du matin',
    'objective': 'Racontez une routine avec les verbes pronominaux au présent et accordez le pronom avec la personne.',
    'foundationTie': 'Reuses Core 10 clock times and Core 12 daily plans; introduces reflexive forms for a morning routine.',
    'focus': 'se lever, se doucher, se préparer, se coucher, se réveiller; me, te, se, nous, vous, se',
    'grammar': {
      'explanation': 'In a French pronominal verb, the reflexive pronoun agrees with the subject: je me lève, tu te réveilles, Ana se douche, nous nous préparons. Me, te and se contract to m’, t’ and s’ before a vowel. The verb also changes with its subject. Se lever and se coucher take a grave accent in the je/tu/il/ils forms (je me lève, il se couche); nous nous levons keeps the stem without that accent. For clock time use à sept heures.',
      'model': {'I': 'Je me lève à sept heures.', 'you': 'Tu te réveilles tôt ?', 'we': 'Nous nous préparons pour le cours.', 'Ana': 'Ana se douche le matin.'},
      'caution': 'French nous nous préparons repeats nous because the first is the subject and the second is the reflexive pronoun. Negation surrounds the reflexive-pronoun-plus-verb group: je ne me lève pas tôt.'
    },
    'scene': 'Avant le cours, deux amis comparent leur heure de réveil et leur routine.',
    'readingTitle': 'Un matin ordinaire',
    'reading': ['Je me lève à sept heures.', 'Ana se douche le matin.', 'Nous nous préparons pour le cours.', 'Luis se couche à dix heures.', 'Tu te réveilles tôt ?', 'Oui, je me réveille avant sept heures.'],
    'speaking': 'Compare morning routines with a classmate. Ask whether they wake early, say when you get up, tell them when Ana showers and when Luis goes to bed, then agree when you both get ready for class. Use je me, tu te, il/elle se and nous nous.',
    'frWords': ['me / moi-même', 'te / toi-même', 'cours / salle de classe', 'la', 'les', 'pour / afin de', 'de', 'dix', 'Je me lève à sept heures.', 'Ana se douche le matin.', 'Nous nous préparons pour le cours.', 'Luis se couche à dix heures.', 'Tu te réveilles tôt ?', 'Oui, je me réveille avant sept heures.'],
    'wordMeta': {0: {'note': 'Me is the unstressed reflexive/object pronoun; moi-même is emphatic “myself.”'}, 1: {'note': 'Te is the unstressed reflexive/object pronoun; toi-même is emphatic “yourself.”'}, 2: {'note': 'Cours is a class session; salle de classe is a classroom.'}, 4: {'note': 'French les has no masculine/feminine plural distinction.'}, 5: {'note': 'Pour is common for purpose; afin de is more formal and precedes an infinitive.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete: Nous ___ préparons pour le cours.', 'answer': 'nous'},
      {'type': 'write', 'prompt': 'Write in French: I get up at seven.', 'answer': 'Je me lève à sept heures.'},
      {'type': 'listening', 'audioText': 'Ana se douche le matin.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: when does Ana shower?', 'answer': 'In the morning.'},
      {'type': 'comprehension', 'prompt': 'In Un matin ordinaire, when does Luis go to bed?', 'answer': 'At ten.'},
      {'type': 'recall', 'prompt': 'Complete the question: Tu ___ réveilles tôt ?', 'answer': 'te'},
    ],
  },
  17: {
    'title': 'Choisir ce livre ou celui-là',
    'objective': 'Désignez des objets proches ou plus éloignés avec ce, cet, cette, ces et les pronoms celui ou celle.',
    'foundationTie': 'Reuses classroom nouns from Foundation and Core 16; adds noun agreement and standalone demonstrative pronouns.',
    'focus': 'ce / cet / cette / ces + nom; celui / celle; -ci / -là for explicit contrast',
    'grammar': {
      'explanation': 'French demonstrative adjectives agree with the noun: ce livre, cet ordinateur, cette table, ces cahiers. Ce and cette can mean “this” or “that” without an inherent distance distinction; add -ci and -là after the noun to contrast nearby and farther items: ce livre-ci, ce livre-là. When the noun is omitted, use a pronoun: je veux ce cahier-ci, pas celui-là. Use celle-là for a feminine noun and ceux-là/celles-là for plural nouns.',
      'model': {'book': 'Ce livre est pour le cours.', 'bag': 'Ce sac à dos est petit.', 'plural': 'Ces cahiers-là sont à Ana.', 'choice': 'Je veux ce cahier-ci, pas celui-là.'},
      'caution': 'Spanish este/ese distinguishes distance within the adjective; French ce/cette/ces alone does not. Do not use ce as a standalone “that one”: choose celui-là or celle-là.'
    },
    'scene': 'Deux élèves comparent leurs fournitures et choisissent le bon cahier en classe.',
    'readingTitle': 'Comparer les fournitures',
    'reading': ['Ce livre est pour le cours.', 'Ce sac à dos est petit.', 'Ces cahiers-là sont à Ana.', 'Ces chaises-ci sont libres.', 'Cette table-là est près de la fenêtre.', 'Je veux ce cahier-ci, pas celui-là.'],
    'speaking': 'At a classroom table, identify which book is for class, describe the small backpack, point out Ana’s notebooks and the available chairs, then choose this notebook instead of that one. Use ce, cette, ces and celui-là; ask your partner to confirm the choice.',
    'frWords': ['table', 'sac à dos', 'cahier', 'livre', 'cours / salle de classe', 'est', 'se trouve / est', 'la', 'Ce livre est pour le cours.', 'Ce sac à dos est petit.', 'Ces cahiers-là sont à Ana.', 'Ces chaises-ci sont libres.', 'Cette table-là est près de la fenêtre.', 'Je veux ce cahier-ci, pas celui-là.'],
    'wordMeta': {4: {'note': 'Cours means class session; salle de classe means the room.'}, 5: {'note': 'Est is a form of être. French does not split ser/estar into two verbs.'}, 6: {'note': 'Se trouve expresses location; est is also natural. French has no ser/estar split.'}, 7: {'note': 'La is a feminine article or object pronoun; choose by context.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Choose the demonstrative: ___ table-là est près de la fenêtre.', 'answer': 'Cette'},
      {'type': 'write', 'prompt': 'Write in French: I want this notebook, not that one.', 'answer': 'Je veux ce cahier-ci, pas celui-là.'},
      {'type': 'listening', 'audioText': 'Ces cahiers-là sont à Ana.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: whose notebooks are those?', 'answer': 'Ana’s.'},
      {'type': 'comprehension', 'prompt': 'In Comparer les fournitures, which chairs are available?', 'answer': 'These chairs.'},
      {'type': 'recall', 'prompt': 'Complete: ___ livre est pour le cours.', 'answer': 'Ce'},
    ],
  },
  18: {
    'title': 'Trouver la salle de cours',
    'objective': 'Donnez un itinéraire simple dans un bâtiment avec au, près de, loin de, sous, devant et derrière.',
    'foundationTie': 'Reuses Core 7 location questions and Core 17 classroom objects; adds precise place relations.',
    'focus': 'au deuxième étage; près du café; loin de l’école; sous la table; devant / derrière',
    'grammar': {
      'explanation': 'French uses distinct prepositions for where something is: dans for inside, sur for on top, à for a general location, sous for under, devant for in front of and derrière for behind. Près de and loin de express distance. De + le contracts to du (près du café), and à + le contracts to au (au deuxième étage). Keep de before l’: loin de l’école.',
      'model': {'floor': 'La salle de cours est au deuxième étage.', 'near': 'La bibliothèque est près du café.', 'under': 'Le sac à dos est sous la table.', 'behind': 'Luis est derrière Ana.'},
      'caution': 'Spanish en covers several locations. In French choose à, dans or sur by meaning. “The classroom is on the second floor” is au deuxième étage, not sur le deuxième étage.'
    },
    'scene': 'À l’entrée d’un bâtiment scolaire, deux amis cherchent la salle de cours et un sac à dos.',
    'readingTitle': 'Chercher la salle',
    'reading': ['La salle de cours est au deuxième étage.', 'La bibliothèque est près du café.', 'Le magasin est loin de l’école.', 'Le sac à dos est sous la table.', 'Ana est devant la porte.', 'Luis est derrière Ana.'],
    'speaking': 'A visitor is looking for a classroom. Tell them it is on the second floor, locate the library near the café and the store far from the school, then help find a backpack under a table. Finish by identifying Ana at the door and Luis behind her. Ask the visitor to repeat the floor before they leave.',
    'frWords': ['table', 'sac à dos', 'cours / salle de cours', 'est / se trouve', 'le', 'la', 'dans / sur / à', 'de', 'La salle de cours est au deuxième étage.', 'La bibliothèque est près du café.', 'Le magasin est loin de l’école.', 'Le sac à dos est sous la table.', 'Ana est devant la porte.', 'Luis est derrière Ana.'],
    'wordMeta': {2: {'note': 'Cours is the class session; salle de cours is its physical room.'}, 3: {'note': 'French uses être for both identity and location; se trouver makes location explicit.'}, 6: {'note': 'Choose dans (inside), sur (on top) or à (general place) by context; these are not interchangeable.'}, 7: {'note': 'De contracts with le to du and with les to des.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete: La salle de cours est ___ deuxième étage.', 'answer': 'au'},
      {'type': 'write', 'prompt': 'Write in French: The backpack is under the table.', 'answer': 'Le sac à dos est sous la table.'},
      {'type': 'listening', 'audioText': 'La bibliothèque est près du café.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: what is near the café?', 'answer': 'The library.'},
      {'type': 'comprehension', 'prompt': 'In Chercher la salle, where is Ana?', 'answer': 'In front of the door.'},
      {'type': 'recall', 'prompt': 'Complete: Luis est ___ Ana.', 'answer': 'derrière'},
    ],
  },
}

draft = {
  'target': 'French', 'native': 'English', 'moduleId': 'french-basics', 'stage': 'core',
  'reviewed': False, 'state': 'authored-draft',
  'source': {'path': 'content/french-basics/source-english-core-16-18.json', 'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(), 'sourcePaths': [CORE, PRACTICE], 'sourceFileSha256': source['sourceSha256'], 'use': 'Exact English objectives, word meanings, reading meanings and progression; French grammar and examples authored separately'},
  'draftModel': 'Codex authored; independent Fable/Opus and human review pending',
  'sourceNotes': ['French reflexive verb forms, demonstratives and location prepositions need structures unlike the Spanish source.', 'Broad source glosses retain the exact English meaning with contextual French notes.'],
  'lessons': [],
}
for english in source['lessons']:
  n = english['n']; a = A[n]
  assert len(a['frWords']) == len(english['words']) == 14
  assert len(a['reading']) == len(english['reading']['native']) == 6
  words = [{'order': i + 1, 'fr': fr, 'en': original['en'], 'kind': original['kind'], **a['wordMeta'].get(i, {})} for i, (fr, original) in enumerate(zip(a['frWords'], english['words']))]
  dialogue = [f'{fr}|{en}' for fr, en in zip(a['reading'], english['reading']['native'])]
  draft['lessons'].append({'n': n, 'title': a['title'], 'sourceTitleEnglish': english['title'], 'sourceObjectiveEnglish': english['objective'], 'objective': a['objective'], 'foundationTie': a['foundationTie'], 'focus': a['focus'], 'grammar': a['grammar'], 'scene': a['scene'], 'dialogue': dialogue, 'speaking': a['speaking'], 'words': words, 'reading': {'title': a['readingTitle'], 'sourceTitleEnglish': english['reading']['title'], 'target': a['reading'], 'native': english['reading']['native']}, 'checks': a['checks'], 'locale': 'fr-FR'})
(OUT / 'core-16-18-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-16-18-draft.json')
