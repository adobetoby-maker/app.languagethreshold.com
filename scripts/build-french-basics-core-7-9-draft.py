#!/usr/bin/env python3
"""Build French Core 7–9 drafts against exact English Spanish 101 anchors."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/french-basics"
CORE = "src/data/spanish-basics-core.json"
PRACTICE = "src/data/spanish-basics-practice.json"
core = json.loads((ROOT / CORE).read_text())["lessons"]
practice = json.loads((ROOT / PRACTICE).read_text())["spanish-basics"]
source = {
    "sourceRevision": "bbff215ba632b828b8583ef0451ba5f3b9981e42",
    "target": "French", "native": "English",
    "sourcePaths": [CORE, PRACTICE],
    "sourceSha256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in (CORE, PRACTICE)},
    "lessons": []
}
for n in (7, 8, 9):
    lesson = core[n - 1]
    source["lessons"].append({"n": n, "title": lesson["title"], "objective": lesson["objective"], "focus": lesson["focus"], "words": lesson["words"], "speaking": lesson["speaking"], "reading": practice[str(n)]["reading"]})
source_path = OUT / "source-english-core-7-9.json"
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n")

authored = {
  7: {
    "title": "Aller et la contraction au",
    "objective": "Dites où vous allez avec aller au présent et choisissez au, à la, à l’ ou aux selon le lieu.",
    "foundationTie": "Reuses places, clock time, people and present-tense sentences from Foundation and Core 1–6.",
    "focus": "Aller in the present; à + le = au, à + les = aux",
    "grammar": {"explanation": "Aller is irregular: je vais, tu vas, il/elle va, nous allons, vous allez, ils/elles vont. Before a masculine singular place use au (à + le): au parc. Before a feminine singular place use à la: à la bibliothèque. Use à l’ before a vowel and aux (à + les) before a plural noun. Je vais au parc describes a current plan or movement; it is not the future proche unless another infinitive follows.", "model": {"je": "je vais au parc", "tu": "tu vas au parc", "il_elle": "elle va à la bibliothèque", "nous": "nous allons au café", "vous": "vous allez à l’école", "ils_elles": "ils vont aux magasins"}, "caution": "Au is a contraction of à + le, not a general word for every destination. À la bibliothèque stays two words."},
    "scene": "Après les cours, des amis comparent leurs trajets et proposent de se retrouver au parc.",
    "dialogue": ["Je vais au parc après les cours.|I am going to the park after class.", "Ana va à la bibliothèque.|Ana is going to the library.", "Nous allons au café à quatre heures.|We are going to the café at four.", "Luis va au magasin.|Luis is going to the store.", "Les amis vont au cinéma.|The friends are going to the cinema.", "Tu vas au parc avec nous ?|Are you going to the park with us?"],
    "speaking": "Role-play making plans after class. Ask a friend where they are going, say you are going to the park, and report where Ana, Luis and the group are going. Invite the friend to come with you and agree on four o’clock. Use at least four forms of aller and both au and à la.",
    "frWords": ["cours / salle de classe", "la", "les", "les", "nous", "amis", "de", "bibliothèque", "Je vais au parc après les cours.", "Ana va à la bibliothèque.", "Nous allons au café à quatre heures.", "Luis va au magasin.", "Les amis vont au cinéma.", "Tu vas au parc avec nous ?"],
    "wordMeta": {0: {"note": "Cours is a class session; salle de classe is the room."}, 2: {"note": "Les is the plural definite article; French object pronouns require a separate lesson."}, 3: {"note": "French les does not mark masculine versus feminine plural."}, 6: {"note": "De can mean of or from; destination in these sentences uses à."}},
    "readingTitle": "Après les cours", "reading": ["Je vais au parc après les cours.", "Ana va à la bibliothèque.", "Nous allons au café à quatre heures.", "Luis va au magasin.", "Les amis vont au cinéma.", "Tu vas au parc avec nous ?"],
    "checks": [
      {"type": "recall", "prompt": "Complete: Nous ___ au café à quatre heures.", "answer": "allons"},
      {"type": "write", "prompt": "Write in French: Ana is going to the library.", "answer": "Ana va à la bibliothèque."},
      {"type": "listening", "audioText": "Les amis vont au cinéma.", "locale": "fr-FR", "voiceStatus": "script-only; no recorded audio", "prompt": "Listen and answer in English: where are the friends going?", "answer": "To the cinema."},
      {"type": "comprehension", "prompt": "In Après les cours, when does the group go to the café?", "answer": "At four."},
      {"type": "recall", "prompt": "Choose au or à la: ___ bibliothèque", "answer": "à la"}
    ]
  },
  8: {
    "title": "Poser des questions : que et quel",
    "objective": "Demandez ce que quelqu’un étudie et choisissez entre des cours ou des livres avec que, quel et lequel en contexte.",
    "foundationTie": "Builds on familiar courses, books and present-tense study verbs; Core 7 provides the place and time context.",
    "focus": "Que/quoi for what; quel/quelle for which; lequel for which one",
    "grammar": {"explanation": "French does not map Spanish qué and cuál to one fixed pair. Use qu’est-ce que before a full clause: Qu’est-ce que tu étudies ? Use quel/quelle before a noun: Quel cours préfères-tu ? Quelle est ta matière préférée ? For ‘which one of these books,’ use lequel before de ces livres. Que signifie ce mot ? is a concise way to ask what a word means. In speech, est-ce que questions are common and do not require inversion.", "model": {"what_study": "Qu’est-ce que tu étudies ce semestre ?", "which_class": "Quel est ton cours préféré ?", "what_word": "Que signifie ce mot ?", "which_one": "Lequel de ces livres préfères-tu ?"}, "caution": "Quel agrees with the noun: quel cours, quelle matière, quels livres, quelles classes. Lequel can stand for a selected item; it is not interchangeable with quel before a noun."},
    "scene": "Deux étudiants choisissent des cours et cherchent le sens d’un mot dans un livre.",
    "dialogue": ["Qu’est-ce que tu étudies ce semestre ?|What are you studying this semester?", "J’étudie le français et la musique.|I study French and music.", "Quel est ton cours préféré ?|Which is your favorite class?", "Mon cours préféré est le français.|My favorite class is French.", "Que signifie ce mot ?|What does this word mean?", "Lequel de ces livres préfères-tu ?|Which of these books do you prefer?"],
    "speaking": "Role-play choosing classes with a fellow student. Ask what they study, which class is their favorite, and which of two books they prefer. Answer with French and music, then ask what a word means. Use qu’est-ce que, quel and lequel with their different sentence patterns.",
    "frWords": ["cours / salle de classe", "est", "et", "livres", "mon / ma", "de", "mot", "cette", "Qu’est-ce que tu étudies ce semestre ?", "J’étudie le français et la musique.", "Quel est ton cours préféré ?", "Mon cours préféré est le français.", "Que signifie ce mot ?", "Lequel de ces livres préfères-tu ?"],
    "wordMeta": {0: {"note": "Cours is the course or class session; salle de classe is the classroom."}, 4: {"note": "French possessive form follows the possessed noun's gender."}, 7: {"note": "Cette is feminine; ce is masculine before a consonant."}},
    "readingTitle": "Choisir un cours", "reading": ["Qu’est-ce que tu étudies ce semestre ?", "J’étudie le français et la musique.", "Quel est ton cours préféré ?", "Mon cours préféré est le français.", "Que signifie ce mot ?", "Lequel de ces livres préfères-tu ?"],
    "checks": [
      {"type": "recall", "prompt": "Complete: ___ est ton cours préféré ?", "answer": "Quel"},
      {"type": "write", "prompt": "Write in French: What are you studying this semester?", "answer": "Qu’est-ce que tu étudies ce semestre ?"},
      {"type": "listening", "audioText": "J’étudie le français et la musique.", "locale": "fr-FR", "voiceStatus": "script-only; no recorded audio", "prompt": "Listen and answer in English: what two subjects does the student study?", "answer": "French and music."},
      {"type": "comprehension", "prompt": "In Choisir un cours, what does the student ask about the books?", "answer": "Which of these books the other student prefers."},
      {"type": "recall", "prompt": "For 'which one of these books,' start with quel or lequel?", "answer": "Lequel"}
    ]
  },
  9: {
    "title": "Où, quand et pourquoi",
    "objective": "Posez trois questions distinctes sur le lieu, le moment et la raison, puis répondez avec à, à neuf heures et parce que.",
    "foundationTie": "Reuses locations and time from Core 7, the question forms from Core 8, and study/friend vocabulary from Foundation.",
    "focus": "Où, quand, pourquoi; répondre avec parce que",
    "grammar": {"explanation": "Où asks about location, quand about time, and pourquoi about reason. In everyday speech, place the question word at the beginning and use est-ce que when useful: Où est-ce que tu étudies ? Quand est-ce que le cours commence ? Pourquoi est-ce que tu étudies le français ? Answer a why-question with parce que, not with pourquoi. Hours use à: à neuf heures.", "model": {"where": "Où étudies-tu ? — J’étudie à la bibliothèque.", "when": "Quand commence le cours ? — À neuf heures.", "why": "Pourquoi étudies-tu le français ? — Parce que je veux parler avec mes amis."}, "caution": "À la bibliothèque identifies a place, while en can mean in in other contexts; do not use en for every English in/on/at. French parce que is two words."},
    "scene": "Deux amis organisent une séance de révision avant un cours du matin.",
    "dialogue": ["Où étudies-tu d’habitude ?|Where do you usually study?", "J’étudie à la bibliothèque.|I study in the library.", "Quand commence le cours ?|When does the class start?", "Le cours commence à neuf heures.|Class starts at nine.", "Pourquoi étudies-tu le français ?|Why do you study French?", "J’étudie le français parce que je veux parler avec mes amis.|I study French because I want to talk with my friends."],
    "speaking": "Role-play planning a study session. Ask your friend where they usually study, when class begins and why they study French. Answer with the library, nine o’clock and a reason involving friends. Swap roles and use où, quand, pourquoi and parce que naturally.",
    "frWords": ["cours / salle de classe", "la", "à / en / sur", "les", "amis", "bibliothèque", "par", "avec", "Où étudies-tu d’habitude ?", "J’étudie à la bibliothèque.", "Quand commence le cours ?", "Le cours commence à neuf heures.", "Pourquoi étudies-tu le français ?", "J’étudie le français parce que je veux parler avec mes amis."],
    "wordMeta": {0: {"note": "Cours is a class session; salle de classe is the room."}, 2: {"note": "Choose the French preposition by context; these are not interchangeable."}, 6: {"note": "Par can mean through or by. Because of is à cause de in many contexts; because is parce que."}},
    "readingTitle": "Organiser les révisions", "reading": ["Où étudies-tu d’habitude ?", "J’étudie à la bibliothèque.", "Quand commence le cours ?", "Le cours commence à neuf heures.", "Pourquoi étudies-tu le français ?", "J’étudie le français parce que je veux parler avec mes amis."],
    "checks": [
      {"type": "recall", "prompt": "Complete: ___ commence le cours ?", "answer": "Quand"},
      {"type": "write", "prompt": "Write in French: I study in the library.", "answer": "J’étudie à la bibliothèque."},
      {"type": "listening", "audioText": "Le cours commence à neuf heures.", "locale": "fr-FR", "voiceStatus": "script-only; no recorded audio", "prompt": "Listen and answer in English: when does class start?", "answer": "At nine."},
      {"type": "comprehension", "prompt": "In Organiser les révisions, why does the student study French?", "answer": "To talk with friends."},
      {"type": "recall", "prompt": "Answer 'Pourquoi ?' with a French because-clause beginning with ...", "answer": "parce que"}
    ]
  }
}

draft = {
    "target": "French", "native": "English", "moduleId": "french-basics", "stage": "core",
    "reviewed": False, "state": "authored-draft",
    "source": {"path": "content/french-basics/source-english-core-7-9.json", "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(), "sourcePaths": [CORE, PRACTICE], "sourceFileSha256": source["sourceSha256"], "use": "English objectives, word meanings, aligned reading meanings and progression; French grammar and examples authored separately"},
    "draftModel": "Codex authored; independent Fable/Opus and human review pending",
    "sourceNotes": ["French aller and question-word grammar follow the English source concepts but use French syntax and destinations.", "Some isolated source glosses are not one-to-one French equivalents; context notes mark the limits."],
    "lessons": []
}
for english in source["lessons"]:
    n = english["n"]
    author = authored[n]
    assert len(author["frWords"]) == len(english["words"]) == 14
    words = [{"order": i + 1, "fr": fr, "en": original["en"], "kind": original["kind"], **author["wordMeta"].get(i, {})} for i, (fr, original) in enumerate(zip(author["frWords"], english["words"]))]
    draft["lessons"].append({"n": n, "title": author["title"], "sourceTitleEnglish": english["title"], "sourceObjectiveEnglish": english["objective"], "objective": author["objective"], "foundationTie": author["foundationTie"], "focus": author["focus"], "grammar": author["grammar"], "scene": author["scene"], "dialogue": author["dialogue"], "speaking": author["speaking"], "words": words, "reading": {"title": author["readingTitle"], "sourceTitleEnglish": english["reading"]["title"], "target": author["reading"], "native": english["reading"]["native"]}, "checks": author["checks"], "locale": "fr-FR"})
(OUT / "core-7-9-draft.json").write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")
print(f"Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-7-9-draft.json")
