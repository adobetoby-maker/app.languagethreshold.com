#!/usr/bin/env python3
"""Pin Spanish 101 English source and author French Core 22–24 draft only."""
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
for n in (22, 23, 24):
    lesson = core[n - 1]
    source['lessons'].append({
        'n': n, 'title': lesson['title'], 'objective': lesson['objective'],
        'focus': lesson['focus'], 'words': lesson['words'],
        'speaking': lesson['speaking'], 'reading': practice[str(n)]['reading'],
    })
source_path = OUT / 'source-english-core-22-24.json'
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

A = {
  22: {
    'title': 'Comparer deux lieux',
    'objective': 'Comparez deux lieux d’étude avec plus, moins et aussi ; employez meilleur et mieux dans le bon contexte.',
    'foundationTie': 'Reuses Core 18 places, Core 20 classroom context and Core 21 descriptions; adds comparative choices.',
    'focus': 'plus/moins + adjectif + que; aussi + adjectif + que; meilleur pour + nom',
    'grammar': {
      'explanation': 'Place plus or moins before an adjective, then que before the second thing: la bibliothèque est plus calme que le café. For equality, use aussi + adjective + que: cette table est aussi grande que celle-là. Meilleur is the adjective for a better book or place; mieux is an adverb for doing something better. The adjective agrees with its noun: confortable stays the same in the feminine.',
      'model': {'more': 'La bibliothèque est plus calme que le café.', 'less': 'Le café est moins loin que l’école.', 'equal': 'Cette table est aussi grande que celle-là.', 'better': 'Mon livre est meilleur pour les débutants.'},
      'caution': 'The pinned English phrase “less far away” is retained as moins loin, although le café est plus proche is often more natural in conversation. The source objective is truncated (“Use más .”); the full French comparison sequence is inferred from the pinned examples and must be independently reviewed.'
    },
    'scene': 'Deux amis choisissent entre la bibliothèque et le café pour étudier.',
    'readingTitle': 'Deux endroits pour étudier',
    'reading': ['La bibliothèque est plus calme que le café.', 'Le café est moins loin que l’école.', 'Cette table est aussi grande que celle-là.', 'Mon livre est meilleur pour les débutants.', 'La chaise rouge est plus confortable.', 'Quel endroit est meilleur pour étudier ?'],
    'speaking': 'Compare the library and café with a classmate. Say which is quieter, which is less far from school, and which table is as big as another. Recommend a beginner’s book, then ask which place is better for studying and confirm your partner’s choice.',
    'frWords': ['table', 'livre', 'chaise', 'est', 'est / se trouve', 'le', 'la', 'pour / afin de', 'La bibliothèque est plus calme que le café.', 'Le café est moins loin que l’école.', 'Cette table est aussi grande que celle-là.', 'Mon livre est meilleur pour les débutants.', 'La chaise rouge est plus confortable.', 'Quel endroit est meilleur pour étudier ?'],
    'wordMeta': {3: {'note': 'French est covers identity, condition and location; there is no ser/estar distinction.'}, 4: {'note': 'Est can describe condition or location; se trouve highlights location.'}, 6: {'note': 'La can be an article or an object pronoun, depending on syntax.'}, 7: {'note': 'Pour + noun or infinitive is common; afin de + infinitive is more formal.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete: La bibliothèque est ___ calme que le café.', 'answer': 'plus'},
      {'type': 'write', 'prompt': 'Write in French: This table is as big as that one.', 'answer': 'Cette table est aussi grande que celle-là.'},
      {'type': 'listening', 'audioText': 'Le café est moins loin que l’école.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: what is less far from the school?', 'answer': 'The café.'},
      {'type': 'comprehension', 'prompt': 'Which book is better for beginners in the reading?', 'answer': 'My book.'},
      {'type': 'recall', 'prompt': 'Complete the equal comparison: aussi grande ___ celle-là.', 'answer': 'que'},
    ],
  },
  23: {
    'title': 'Remplacer ce qu’on cherche',
    'objective': 'Remplacez un objet déjà nommé par le, la, l’ ou les et placez ce pronom avant le verbe conjugué.',
    'foundationTie': 'Builds on Core 14 articles and Core 22 school objects; distinguishes an article from a direct-object pronoun.',
    'focus': 'le, la, l’, les before a conjugated verb; object gender and number',
    'grammar': {
      'explanation': 'French direct-object pronouns replace a person or thing receiving the action: le livre → je le trouve; le sac à dos → je l’ouvre; les cahiers → je les range. Put the pronoun before the conjugated verb. Le and la become l’ before a vowel or mute h: je l’ouvre, elle l’utilise. Les works for plural objects of any gender. The article follows a noun; the object pronoun replaces it.',
      'model': {'book': 'Je cherche le livre et je le trouve.', 'backpack': 'J’ai le sac à dos et je l’ouvre.', 'notebooks': 'J’achète les cahiers et je les range.', 'keys': 'J’ai besoin des clés, mais je ne les vois pas.'},
      'caution': 'French les is plural for both masculine and feminine; it does not preserve the Spanish los/las contrast. In “J’ai besoin des clés,” des is required after de; les later replaces clés. The final question uses l’ for an unspecified singular item; the English source does not identify its gender.'
    },
    'scene': 'Deux camarades rangent leurs affaires avant de partir en cours.',
    'readingTitle': 'Préparer le sac à dos',
    'reading': ['Je cherche le livre et je le trouve.', 'J’ai le sac à dos et je l’ouvre.', 'J’achète les cahiers et je les range.', 'J’ai besoin des clés, mais je ne les vois pas.', 'Ana a le crayon et elle l’utilise.', 'Tu l’as, toi ?'],
    'speaking': 'Pack a school bag with a classmate. Ask about the book, backpack, notebooks, keys and pencil. Name each object once, then replace it with le, la, l’ or les. Confirm whether your partner has the missing item.',
    'frWords': ['sac à dos', 'livre', 'le', 'la', 'et', 'j’ai', 'j’ai besoin de', 'les', 'Je cherche le livre et je le trouve.', 'J’ai le sac à dos et je l’ouvre.', 'J’achète les cahiers et je les range.', 'J’ai besoin des clés, mais je ne les vois pas.', 'Ana a le crayon et elle l’utilise.', 'Tu l’as, toi ?'],
    'wordMeta': {3: {'note': 'La can be a feminine article, a feminine direct-object pronoun, or “her” as an object; identify its role from context.'}, 6: {'note': 'J’ai besoin de means “I need”; the French construction includes de.'}, 7: {'note': 'Les is a plural article or direct-object pronoun for any gender; it can mean “them” in this lesson.'}, 13: {'note': 'The English source leaves “it” unspecified, so l’ has no recoverable gender here.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Replace le livre: Je ___ trouve.', 'answer': 'le'},
      {'type': 'write', 'prompt': 'Write in French: I have the backpack and open it.', 'answer': 'J’ai le sac à dos et je l’ouvre.'},
      {'type': 'listening', 'audioText': 'J’ai besoin des clés, mais je ne les vois pas.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: what does the speaker need?', 'answer': 'The keys.'},
      {'type': 'comprehension', 'prompt': 'What does Ana use in the reading?', 'answer': 'The pencil.'},
      {'type': 'recall', 'prompt': 'Replace les cahiers: Je ___ range.', 'answer': 'les'},
    ],
  },
  24: {
    'title': 'Dire à qui l’on donne',
    'objective': 'Dites à qui s’adresse une action avec me, te, lui, nous ou leur devant le verbe.',
    'foundationTie': 'Extends Core 23 object-pronoun placement to recipients, contrasting “what?” with “to whom?”.',
    'focus': 'me, te, lui, nous, leur as indirect-object pronouns; à + recipient',
    'grammar': {
      'explanation': 'An indirect-object pronoun can mark the recipient: je donne un livre à Ana → je lui donne un livre; Luis me prête un crayon; la professeure nous explique la question. Place the pronoun before the conjugated verb. Lui is singular for either a man or a woman, and leur is plural for any gender. In French, “je lui donne un livre à Ana” can occur in colloquial dislocation, but beginners should use either “je donne un livre à Ana” or “je lui donne un livre” to avoid a redundant recipient.',
      'model': {'Ana': 'Je donne un livre à Ana. Je lui donne un livre.', 'me': 'Luis me prête un crayon.', 'you': 'Je t’écris un message.', 'students': 'Nous donnons les cahiers aux élèves. Nous leur donnons les cahiers.'},
      'caution': 'The English source glosses “me / myself” and “you / yourself” are broad. Reflexive meaning belongs to separate uses; here me and te refer to recipients. Lui/leur differ from Spanish le/les; do not add the named recipient after the pronoun in formal beginner models.'
    },
    'scene': 'Des élèves partagent livres et cahiers avant un cours et vérifient qui reçoit quoi.',
    'readingTitle': 'Partager le matériel',
    'reading': ['Je donne un livre à Ana.', 'Luis me prête un crayon.', 'Je t’écris un message.', 'La professeure nous explique la question.', 'Nous donnons les cahiers aux élèves.', 'Tu peux me prêter ton livre ?'],
    'speaking': 'Share class materials. Tell a classmate that you give Ana a book, ask to borrow a pencil, write a message, explain who receives the notebooks, and request the classmate’s book. Repeat two exchanges with lui or leur replacing the named recipient and confirm who receives each item.',
    'frWords': ['me', 'te', 'livre', 'la', 'un', 'les', 'cahiers', 'élèves / étudiants', 'Je donne un livre à Ana.', 'Luis me prête un crayon.', 'Je t’écris un message.', 'La professeure nous explique la question.', 'Nous donnons les cahiers aux élèves.', 'Tu peux me prêter ton livre ?'],
    'wordMeta': {0: {'note': 'Me marks a recipient here; myself is a different reflexive use.'}, 1: {'note': 'Te marks a recipient here; yourself is a different reflexive use. It elides to t’ before a vowel.'}, 3: {'note': 'La can be an article or a direct-object pronoun depending on syntax; this lesson focuses on recipients.'}, 5: {'note': 'Les is a plural article or direct-object pronoun; the indirect plural recipient pronoun is leur.'}, 7: {'note': 'Élèves means pupils; étudiants is typical for university students.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Replace à Ana: Je ___ donne un livre.', 'answer': 'lui'},
      {'type': 'write', 'prompt': 'Write in French: Luis lends me a pencil.', 'answer': 'Luis me prête un crayon.'},
      {'type': 'listening', 'audioText': 'La professeure nous explique la question.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: to whom is the question explained?', 'answer': 'To us.'},
      {'type': 'comprehension', 'prompt': 'Who receives the notebooks in the reading?', 'answer': 'The students.'},
      {'type': 'recall', 'prompt': 'Replace aux élèves: Nous ___ donnons les cahiers.', 'answer': 'leur'},
    ],
  },
}

draft = {
    'target': 'French', 'native': 'English', 'moduleId': 'french-basics', 'stage': 'core',
    'reviewed': False, 'state': 'authored-draft',
    'source': {'path': 'content/french-basics/source-english-core-22-24.json',
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
(OUT / 'core-22-24-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-22-24-draft.json')
