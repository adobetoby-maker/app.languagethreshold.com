#!/usr/bin/env python3
"""Pin the English Spanish-101 source and author French Core 19–21 draft."""
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
for n in (19, 20, 21):
    lesson = core[n - 1]
    source['lessons'].append({
        'n': n, 'title': lesson['title'], 'objective': lesson['objective'],
        'focus': lesson['focus'], 'words': lesson['words'],
        'speaking': lesson['speaking'], 'reading': practice[str(n)]['reading'],
    })
source_path = OUT / 'source-english-core-19-21.json'
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

A = {
  19: {
    'title': 'Prévoir demain',
    'objective': 'Annoncez des projets proches avec aller au présent suivi d’un infinitif et posez une question sur le programme d’un ami.',
    'foundationTie': 'Builds on Core 12 plans and Core 10 time references; shifts from present plans to the near future.',
    'focus': 'je vais, tu vas, il/elle va, nous allons, ils/elles vont + infinitif',
    'grammar': {
      'explanation': 'The French near future uses a present form of aller followed directly by an infinitive: je vais étudier, Ana va acheter, nous allons manger. Do not insert à between aller and the infinitive. The form of aller changes with the subject; the second verb remains an infinitive. Demain places the plan tomorrow.',
      'model': {'I': 'Demain, je vais étudier l’espagnol.', 'Ana': 'Ana va acheter un livre.', 'we': 'Nous allons manger à la maison.', 'friends': 'Mes amis vont visiter le musée.'},
      'caution': 'Spanish ir a + infinitive has a linking a; French aller + infinitive does not. The source sentence explicitly says Spanish, so this draft retains l’espagnol as the subject of study rather than silently changing the English meaning.'
    },
    'scene': 'Deux amis organisent leur journée de demain et vérifient qui viendra à la bibliothèque.',
    'readingTitle': 'Le programme de demain',
    'reading': ['Demain, je vais étudier l’espagnol.', 'Ana va acheter un livre.', 'Nous allons manger à la maison.', 'Luis va appeler son frère.', 'Mes amis vont visiter le musée.', 'Tu vas venir à la bibliothèque ?'],
    'speaking': 'Plan tomorrow with a classmate. Say what you will study, ask whether they will come to the library, and compare Ana’s, Luis’s and your friends’ plans. Finish by confirming where you will eat. Use different present forms of aller followed directly by an infinitive.',
    'frWords': ['livre', 'le', 'la', 'un', 'dans / sur / à', 'amis', 'bibliothèque', 'frère', 'Demain, je vais étudier l’espagnol.', 'Ana va acheter un livre.', 'Nous allons manger à la maison.', 'Luis va appeler son frère.', 'Mes amis vont visiter le musée.', 'Tu vas venir à la bibliothèque ?'],
    'wordMeta': {2: {'note': 'La is a feminine article or object pronoun; choose by context.'}, 4: {'note': 'Choose dans (inside), sur (on top), or à (general location) by context; they are not interchangeable.'}, 8: {'note': 'The source studies Spanish; l’espagnol is retained for exact English meaning.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the near future: Nous ___ manger à la maison.', 'answer': 'allons'},
      {'type': 'write', 'prompt': 'Write in French: Luis is going to call his brother.', 'answer': 'Luis va appeler son frère.'},
      {'type': 'listening', 'audioText': 'Mes amis vont visiter le musée.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: what will the friends visit?', 'answer': 'The museum.'},
      {'type': 'comprehension', 'prompt': 'In Le programme de demain, where will we eat?', 'answer': 'At home.'},
      {'type': 'recall', 'prompt': 'Complete: Ana ___ acheter un livre.', 'answer': 'va'},
    ],
  },
  20: {
    'title': 'Ce qui se passe maintenant',
    'objective': 'Décrivez une action en cours avec être en train de + infinitif et reconnaissez le présent simple lorsque le contexte suffit.',
    'foundationTie': 'Reuses present-tense verbs from Core 1–3; adds an explicit way to emphasize an action underway now.',
    'focus': 'être en train de + infinitif; je suis, tu es, il/elle est, nous sommes, ils/elles sont',
    'grammar': {
      'explanation': 'French usually uses the simple present for both “I study” and “I am studying”; the context tells you whether it is happening now. To insist that an action is in progress, use être en train de + infinitive: je suis en train d’étudier, Ana est en train de parler, nous sommes en train d’écrire. De becomes d’ before a vowel. Only être changes with the subject; the activity verb stays an infinitive.',
      'model': {'I': 'Je suis en train d’étudier à la bibliothèque.', 'Ana': 'Ana est en train de parler avec Luis.', 'we': 'Nous sommes en train d’écrire un message.', 'students': 'Les élèves sont en train de manger.'},
      'caution': 'Unlike Spanish estar + gerund, French does not require a progressive form for every action happening now. “J’étudie à la bibliothèque” can also mean “I am studying in the library.” Use en train de here to teach the explicit contrast; avoid using it mechanically in every ordinary present-tense sentence.'
    },
    'scene': 'À la bibliothèque, une élève demande à ses amis ce que tout le monde fait en ce moment.',
    'readingTitle': 'À la bibliothèque en ce moment',
    'reading': ['Je suis en train d’étudier à la bibliothèque.', 'Ana est en train de parler avec Luis.', 'Nous sommes en train d’écrire un message.', 'La professeure est en train de lire un livre.', 'Les élèves sont en train de manger.', 'Tu es en train d’écouter la question ?'],
    'speaking': 'At the library, describe what you, Ana, the teacher and the students are doing right now. Ask your classmate whether they are listening to the question, and contrast one en train de sentence with a natural simple-present version.',
    'frWords': ['livre', 'est / se trouve', 'la', 'un', 'dans / sur / à', 'sont / se trouvent', 'les', 'élèves / étudiants', 'Je suis en train d’étudier à la bibliothèque.', 'Ana est en train de parler avec Luis.', 'Nous sommes en train d’écrire un message.', 'La professeure est en train de lire un livre.', 'Les élèves sont en train de manger.', 'Tu es en train d’écouter la question ?'],
    'wordMeta': {1: {'note': 'French être can express identity, condition, or location; se trouver emphasizes location.'}, 4: {'note': 'Choose dans, sur, or à by place meaning; these are not interchangeable.'}, 5: {'note': 'French être has no Spanish ser/estar split; se trouvent specifically signals location.'}, 7: {'note': 'Élèves is natural for school pupils; étudiants is typical for university students.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete: Nous ___ en train d’écrire un message.', 'answer': 'sommes'},
      {'type': 'write', 'prompt': 'Write in French: Ana is talking with Luis.', 'answer': 'Ana est en train de parler avec Luis.'},
      {'type': 'listening', 'audioText': 'La professeure est en train de lire un livre.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: what is the teacher reading?', 'answer': 'A book.'},
      {'type': 'comprehension', 'prompt': 'In À la bibliothèque en ce moment, what are the students doing?', 'answer': 'Eating.'},
      {'type': 'recall', 'prompt': 'Complete: Tu es en train ___ écouter la question ?', 'answer': 'd’'},
    ],
  },
  21: {
    'title': 'Savoir un fait, connaître une personne',
    'objective': 'Choisissez savoir pour un fait ou une compétence et connaître pour une personne, un lieu ou une chose familière.',
    'foundationTie': 'Reuses Core 18 place vocabulary and Core 20 classroom context; now distinguishes two meanings of “to know.”',
    'focus': 'savoir + fait/question/infinitif; connaître + personne/lieu',
    'grammar': {
      'explanation': 'Use savoir for knowledge of a fact, an answer, or how to do something: je sais où est la bibliothèque; Ana sait parler espagnol; Luis sait la réponse. Use connaître for familiarity with a person or place: je connais la professeure; nous ne connaissons pas cette ville. The present forms change: je sais, tu sais, il sait, nous savons; je connais, tu connais, il connaît, nous connaissons.',
      'model': {'fact': 'Je sais où est la bibliothèque.', 'ability': 'Ana sait parler espagnol.', 'person': 'Je connais la professeure.', 'place': 'Nous ne connaissons pas cette ville.'},
      'caution': 'French connaître does not take the Spanish personal a before a person: je connais la professeure. The source line says Ana speaks Spanish, so espagnol remains the language in that example.'
    },
    'scene': 'Une nouvelle élève découvre le quartier et demande qui connaît l’école, la professeure et le café.',
    'readingTitle': 'Connaître le quartier',
    'reading': ['Je sais où est la bibliothèque.', 'Ana sait parler espagnol.', 'Je connais la professeure.', 'Nous ne connaissons pas cette ville.', 'Luis sait la réponse.', 'Tu connais le café de la place ?'],
    'speaking': 'Welcome a new classmate. Tell them where the library is, say what language Ana knows how to speak, introduce the teacher you know, and ask whether they know the café in the square. Admit when you do not know the city or an answer; use savoir or connaître for each meaning.',
    'frWords': ['est / se trouve', 'le', 'la', 'professeure / enseignante', 'de', 'bibliothèque', 'non / ne… pas', 'à la', 'Je sais où est la bibliothèque.', 'Ana sait parler espagnol.', 'Je connais la professeure.', 'Nous ne connaissons pas cette ville.', 'Luis sait la réponse.', 'Tu connais le café de la place ?'],
    'wordMeta': {0: {'note': 'French être can express location; se trouver emphasizes it.'}, 3: {'note': 'Both feminine nouns mean female teacher; professeure is common in France and Canada.'}, 6: {'note': 'Non answers no; ne… pas negates a verb.'}, 7: {'note': 'À la can mean movement toward or location at a feminine noun; context decides.'}, 9: {'note': 'The source meaning is “speak Spanish”; espagnol is intentionally retained.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the fact: Je ___ où est la bibliothèque.', 'answer': 'sais'},
      {'type': 'write', 'prompt': 'Write in French: I know the teacher.', 'answer': 'Je connais la professeure.'},
      {'type': 'listening', 'audioText': 'Tu connais le café de la place ?', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: which place is being asked about?', 'answer': 'The café in the square.'},
      {'type': 'comprehension', 'prompt': 'In Connaître le quartier, who knows the answer?', 'answer': 'Luis.'},
      {'type': 'recall', 'prompt': 'Complete the place: Nous ne ___ pas cette ville.', 'answer': 'connaissons'},
    ],
  },
}

draft = {
    'target': 'French', 'native': 'English', 'moduleId': 'french-basics', 'stage': 'core',
    'reviewed': False, 'state': 'authored-draft',
    'source': {'path': 'content/french-basics/source-english-core-19-21.json',
               'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
               'sourcePaths': [CORE, PRACTICE], 'sourceFileSha256': source['sourceSha256'],
               'use': 'Exact English objectives, word meanings, reading meanings and progression; French grammar and examples authored separately'},
    'draftModel': 'Codex authored; independent Fable/Opus and human review pending',
    'sourceNotes': ['Future, progressive and know-verbs mirror the source concepts but use French forms.',
                    'Two English source sentences explicitly concern Spanish; the French examples preserve that meaning.',
                    'Broad source glosses use annotated French alternatives rather than asserting one universal equivalent.'],
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
(OUT / 'core-19-21-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-19-21-draft.json')
