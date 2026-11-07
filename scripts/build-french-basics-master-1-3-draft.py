#!/usr/bin/env python3
"""Pin Spanish 101 Master English source and author bounded French draft 1–3."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'content/french-basics'
COURSE = 'src/data/core60/es/master-spanish-basics.json'
PRACTICE = 'src/data/spanish-basics-practice.json'
course = json.loads((ROOT / COURSE).read_text())['lessons']
practice = json.loads((ROOT / PRACTICE).read_text())['master-spanish-basics']
source = {
    'sourceRevision': '50bb126bbc20ff052924e2c2738250dd32fbd9c4',
    'target': 'French', 'native': 'English', 'sourcePaths': [COURSE, PRACTICE],
    'sourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in (COURSE, PRACTICE)},
    'lessons': [],
}
for n in (1, 2, 3):
    lesson = course[n - 1]
    source['lessons'].append({
        'n': n, 'title': lesson['title'], 'objective': lesson['objective'],
        'focus': lesson['focus'], 'words': lesson['words'],
        'speaking': lesson['speaking'], 'reading': practice[str(n)]['reading'],
    })
source_path = OUT / 'source-english-master-1-3.json'
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + '\n')

A = {
  1: {
    'title': 'Présenter une camarade',
    'objective': 'Présentez une nouvelle camarade, reliez son origine à ses études et adaptez la formule de présentation au registre de l’échange.',
    'coreTie': 'Reuses Core 1 introductions and Core 11 origin; the source repeats beginner content rather than advancing Master grammar.',
    'focus': 'je suis / il est / nous sommes; s’appeler; tu vs vous in introductions',
    'grammar': {
      'explanation': 'French introductions use je suis for identity, venir de or être de for origin, and s’appeler for names: je m’appelle Ana, mon camarade s’appelle Diego. Tu is informal; vous is used with an unfamiliar adult or in a formal setting. Bonjour and enchanté(e) can make a first meeting more polite. French vowels a, e, i, o, u do not follow the Spanish pronunciation rule in the pinned source objective; practise French vowel contrasts separately.',
      'model': {'introduce': 'Bonjour, je suis Elena.', 'origin': 'Je viens du Pérou et j’étudie la musique.', 'classmate': 'Mon camarade s’appelle Diego.', 'formal question': 'Comment vous appelez-vous ?'},
      'caution': 'The English source teaches Spanish vowel sounds and repeats beginner introductions under Master. This French draft preserves the English sentence meanings, teaches French forms, and flags the stage-placement problem; it does not claim advanced Master progression. “Spanish students” is interpreted as students of Spanish, not students from Spain.'
    },
    'scene': 'Elena accueille une nouvelle camarade dans un cours d’espagnol et présente Diego à Ana.',
    'readingTitle': 'Une nouvelle camarade',
    'reading': ['Bonjour, je suis Elena.', 'Je viens du Pérou et j’étudie la musique.', 'Mon camarade s’appelle Diego.', 'Il vient du Chili.', 'Nous sommes étudiants en espagnol.', 'Comment tu t’appelles ?', 'Bonjour !', 'Je m’appelle Ana.', 'Je suis étudiante.', 'Comment tu t’appelles ?', 'Je m’appelle Luis.', 'Enchantée de faire ta connaissance, Luis.'],
    'speaking': 'Introduce Elena and Diego to a new classmate, including their origins and Elena’s music studies. Ask the classmate’s name informally, then repeat one greeting with vous for a formal meeting. Clarify that the group studies Spanish; close with a suitable nice-to-meet-you phrase.',
    'frWords': ['étudiant / étudiante', 'bonjour', 'bonjour', 'enchanté(e) de faire votre connaissance', 'je m’appelle', 'tu appelles', 'je suis', 'me / moi-même', 'te / toi-même', 'comment', 'est', 'et', 'Bonjour, je suis Elena.', 'Je viens du Pérou et j’étudie la musique.', 'Mon camarade s’appelle Diego.', 'Il vient du Chili.', 'Nous sommes étudiants en espagnol.', 'Comment tu t’appelles ?', 'Bonjour !', 'Je m’appelle Ana.'],
    'wordMeta': {0: {'note': 'Étudiant is masculine; étudiante feminine.'}, 2: {'note': 'French bonjour covers both hello and good morning; the two English cards collapse to one natural French greeting.'}, 3: {'note': 'The written ending of enchanté/enchantée agrees with the speaker; the formal phrase uses votre.'}, 5: {'note': 'The English source “you call” is a bare gloss; French tu appelles needs an object, e.g. tu appelles Ana.'}, 7: {'note': 'Me is a clitic; moi-même is the emphatic/reflexive “myself”, not an interchangeable object.'}, 8: {'note': 'Te is a clitic; toi-même is emphatic/reflexive “yourself”.'}, 10: {'note': 'French est does not distinguish Spanish ser and estar.'}, 16: {'note': '“Spanish students” means students of Spanish in this classroom context, not nationality.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the introduction: Je m’___ Ana.', 'answer': 'appelle'},
      {'type': 'write', 'prompt': 'Write in French: My classmate’s name is Diego.', 'answer': 'Mon camarade s’appelle Diego.'},
      {'type': 'listening', 'audioText': 'Je viens du Pérou et j’étudie la musique.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: where is Elena from?', 'answer': 'Peru.'},
      {'type': 'comprehension', 'prompt': 'Who is from Chile in the reading?', 'answer': 'Diego.'},
      {'type': 'recall', 'prompt': 'Choose the informal question: Comment tu t’___ ?', 'answer': 'appelles'},
    ],
  },
  2: {
    'title': 'Préparer le premier cours',
    'objective': 'Décrivez le matériel nécessaire au cours, localisez-le précisément et distinguez genre grammatical, article et pronom.',
    'coreTie': 'Reuses Foundation classroom objects and Core 18 locations; source is beginner-level despite Master placement.',
    'focus': 'un/une, le/la/l’; il y a; sur, près de, dans; accord de bleu',
    'grammar': {
      'explanation': 'A French noun has grammatical gender: un livre, une table. The article agrees with the noun, not the owner of the object. Use il y a for there is/are, sur for on a surface, dans for inside a bag, and près de for near. Adjectives may agree in gender: un livre bleu, une sacoche bleue. La can also be a direct-object pronoun before a verb, but here it is mostly an article.',
      'model': {'need': 'J’ai besoin d’un sac à dos pour le cours.', 'surface': 'Le cahier est sur la table.', 'near': 'La chaise est près de la porte.', 'inside': 'Je mets le livre dans le sac à dos.'},
      'caution': 'The source repeats Foundation gender and classroom-object content rather than introducing Master-level structures. French sac à dos is masculine, unlike the Spanish mochila. English “class / classroom” spans cours and salle de classe; the card gives both with context.'
    },
    'scene': 'Avant de sortir, deux camarades vérifient le matériel sur la table et dans leur sac.',
    'readingTitle': 'Avant de partir',
    'reading': ['J’ai besoin d’un sac à dos pour le cours.', 'Le cahier est sur la table.', 'La chaise est près de la porte.', 'J’ai un livre bleu.', 'Je mets le livre dans le sac à dos.', 'Maintenant, j’ai tout ce qu’il faut pour étudier.', 'Il y a une table dans la salle de classe.', 'Le livre est sur la table.', 'J’ai un cahier et un sac à dos.', 'Le sac à dos est bleu.', 'J’ai besoin d’une chaise.', 'La chaise est ici.'],
    'speaking': 'Pack for the first class. Tell a classmate what you need and where the notebook, chair, book and backpack are. Ask them to locate one item, correct a mistaken location with sur/dans/près de, then confirm that you have everything needed.',
    'frWords': ['table', 'sac à dos', 'cahier', 'livre', 'chaise', 'cours / salle de classe', 'est', 'est / se trouve', 'il y a', 'le', 'la', 'un', 'J’ai besoin d’un sac à dos pour le cours.', 'Le cahier est sur la table.', 'La chaise est près de la porte.', 'J’ai un livre bleu.', 'Je mets le livre dans le sac à dos.', 'Maintenant, j’ai tout ce qu’il faut pour étudier.', 'Il y a une table dans la salle de classe.', 'Le livre est sur la table.'],
    'wordMeta': {1: {'note': 'Sac à dos is masculine in French.'}, 5: {'note': 'Cours is a class/session; salle de classe is the room. The source gloss covers both.'}, 6: {'note': 'French est covers identity, condition and location; there is no ser/estar split.'}, 7: {'note': 'Se trouve explicitly locates something; est also works.'}, 8: {'note': 'Il y a works for singular and plural “there is/are”.'}, 10: {'note': 'La can be a feminine article or an object pronoun.'}, 11: {'note': 'Un is a masculine article; une is feminine.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the location: Le cahier est ___ la table.', 'answer': 'sur'},
      {'type': 'write', 'prompt': 'Write in French: I put the book in the backpack.', 'answer': 'Je mets le livre dans le sac à dos.'},
      {'type': 'listening', 'audioText': 'La chaise est près de la porte.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: where is the chair?', 'answer': 'Near the door.'},
      {'type': 'comprehension', 'prompt': 'What color is the book in the reading?', 'answer': 'Blue.'},
      {'type': 'recall', 'prompt': 'Complete the existence statement: Il ___ a une table.', 'answer': 'y'},
    ],
  },
  3: {
    'title': 'Préparer le matériel du groupe',
    'objective': 'Comptez et répartissez le matériel du groupe en accordant articles, noms et adjectifs au pluriel.',
    'coreTie': 'Reuses Core 14 plural forms and Core 24 recipients; source is a beginner inventory rather than a Master-level task.',
    'focus': 'un/une → des; le/la → les; plural -s, -x and irregular forms; il y a',
    'grammar': {
      'explanation': 'French plural articles become les or des: le livre → les livres, une chaise → des chaises. Most nouns add written -s; many -eau nouns take -x (un tableau → des tableaux), and some plurals are irregular. The final consonant is often silent, but an article may link to the noun in speech. Use il y a with either singular or plural. For a group, distinguish what is on the table from what is still needed.',
      'model': {'group': 'Il y a quatre étudiants dans le groupe.', 'need': 'Il nous faut quatre livres.', 'shortage': 'Il n’y a que deux livres sur la table.', 'bags': 'Les sacs à dos sont sous les chaises.'},
      'caution': 'The pinned Spanish objective says add -s after a vowel and -es after a consonant, which is not a French plural rule. This French draft teaches French spelling instead. The source repeats Foundation plural/inventory content under Master; curriculum progression needs redesign before release.'
    },
    'scene': 'Quatre camarades comptent livres, cahiers et crayons avant de commencer le cours.',
    'readingTitle': 'Quatre camarades',
    'reading': ['Il y a quatre étudiants dans le groupe.', 'Il nous faut quatre livres.', 'Il n’y a que deux livres sur la table.', 'Ana apporte deux cahiers.', 'Les sacs à dos sont sous les chaises.', 'Les crayons sont près des cahiers.', 'J’ai deux livres.', 'Les livres sont pour le cours.', 'Il y a trois cahiers sur la table.', 'Les chaises sont ici.', 'Il nous faut deux crayons.', 'Les crayons sont dans le sac à dos.'],
    'speaking': 'Prepare materials for four classmates. Count the books, notebooks and pencils; identify what is on the table, under the chairs and inside the backpack. Tell your partner what is missing, ask them to bring it, and confirm each plural quantity.',
    'frWords': ['table', 'sac à dos', 'cours / salle de classe', 'il y a', 'le', 'la', 'ici', 'dans / sur / à', 'j’ai', 'sont', 'sont / se trouvent', 'les', 'Il y a quatre étudiants dans le groupe.', 'Il nous faut quatre livres.', 'Il n’y a que deux livres sur la table.', 'Ana apporte deux cahiers.', 'Les sacs à dos sont sous les chaises.', 'Les crayons sont près des cahiers.', 'J’ai deux livres.', 'Les livres sont pour le cours.'],
    'wordMeta': {1: {'note': 'Sac à dos is masculine; its plural is sacs à dos.'}, 2: {'note': 'Cours is a class/session; salle de classe is the room.'}, 3: {'note': 'Il y a works for singular and plural.'}, 5: {'note': 'La is a feminine article or object pronoun by context.'}, 7: {'note': 'Choose dans, sur or à by place meaning; the source English gloss is broad.'}, 9: {'note': 'French sont covers identity, condition and location; there is no ser/estar split.'}, 10: {'note': 'Se trouvent highlights location; sont can also locate objects.'}, 11: {'note': 'Les is plural regardless of gender; it may also be an object pronoun.'}},
    'checks': [
      {'type': 'recall', 'prompt': 'Complete the shortage: Il n’y a que deux ___ sur la table.', 'answer': 'livres'},
      {'type': 'write', 'prompt': 'Write in French: The backpacks are under the chairs.', 'answer': 'Les sacs à dos sont sous les chaises.'},
      {'type': 'listening', 'audioText': 'Ana apporte deux cahiers.', 'locale': 'fr-FR', 'voiceStatus': 'script-only; no recorded audio', 'prompt': 'Listen: how many notebooks does Ana bring?', 'answer': 'Two.'},
      {'type': 'comprehension', 'prompt': 'How many students are in the group?', 'answer': 'Four.'},
      {'type': 'recall', 'prompt': 'Complete the plural article: ___ livres sont pour le cours.', 'answer': 'Les'},
    ],
  },
}

draft = {
    'target': 'French', 'native': 'English', 'moduleId': 'french-basics', 'stage': 'master',
    'reviewed': False, 'state': 'authored-draft',
    'source': {'path': 'content/french-basics/source-english-master-1-3.json',
               'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
               'sourcePaths': [COURSE, PRACTICE], 'sourceFileSha256': source['sourceSha256'],
               'use': 'Exact English objectives, word meanings, reading meanings and progression; French grammar and examples authored separately'},
    'draftModel': 'Codex authored; independent Fable/Opus and human review pending',
    'sourceNotes': ['Pinned Spanish Master 1–3 source repeats beginner content; stage progression needs redesign.',
                    'Spanish vowel/personal morphology rules do not transfer to French; French-native explanations are authored separately.',
                    'Broad English source glosses receive contextual notes rather than false universal equivalents.'],
    'lessons': [],
}
for english in source['lessons']:
    n = english['n']; a = A[n]
    assert len(a['frWords']) == len(english['words']) == 20
    assert len(a['reading']) == len(english['reading']['native']) == 12
    words = [{'order': i + 1, 'fr': fr, 'en': original['en'], 'kind': original['kind'],
              **a['wordMeta'].get(i, {})} for i, (fr, original) in enumerate(zip(a['frWords'], english['words']))]
    dialogue = [f'{fr}|{en}' for fr, en in zip(a['reading'], english['reading']['native'])]
    draft['lessons'].append({'n': n, 'title': a['title'], 'sourceTitleEnglish': english['title'],
                             'sourceObjectiveEnglish': english['objective'], 'objective': a['objective'],
                             'coreTie': a['coreTie'], 'focus': a['focus'], 'grammar': a['grammar'],
                             'scene': a['scene'], 'dialogue': dialogue, 'speaking': a['speaking'], 'words': words,
                             'reading': {'title': a['readingTitle'], 'sourceTitleEnglish': english['reading']['title'],
                                         'target': a['reading'], 'native': english['reading']['native']},
                             'checks': a['checks'], 'locale': 'fr-FR'})
(OUT / 'master-1-3-draft.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {source_path.relative_to(ROOT)} and content/french-basics/master-1-3-draft.json')
