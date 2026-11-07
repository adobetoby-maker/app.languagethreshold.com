#!/usr/bin/env python3
"""Build private French Roofing Core 25–27 from pinned English pairs."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-core-25-27.json"
OUTPUT = CONTENT / "core-25-27-draft.json"

AUTHOR = {
    25: {
        "titleFrench": "Écarter l’équipe des débris qui tombent",
        "objectiveFrench": "Avertir l’équipe au sol et faire dégager la zone d’exclusion avant la reprise de la dépose.",
        "speakingFrenchInstruction": "Avant de reprendre la dépose, demandez l’arrêt et la confirmation que la zone d’exclusion approuvée est dégagée. Prévenez l’équipe au sol, puis demandez une réponse explicite.",
        "speakingFrenchOpening": "On suspend la dépose : l’équipe au sol a-t-elle quitté la zone d’exclusion ?",
        "grammarFocusFrench": "Impératif négatif pour interdire l’accès; avant de + infinitif; jusqu’à ce que pour attendre la confirmation.",
        "wordsFrench": ["l’équipe au sol", "les débris", "la zone d’exclusion", "le casque de chantier", "le ruban de signalisation", "le danger", "la goulotte à débris", "le cône de signalisation", "la dépose", "Tenez l’équipe au sol à l’écart des débris qui tombent.", "Éloignez-vous de la maison.", "Ne restez pas sous la zone de travail.", "Attendez que je confirme que la zone est dégagée.", "Installez le ruban de signalisation.", "Attention en bas ! Des débris vont tomber !"],
        "readingFrench": [
            "Avant de poursuivre la dépose, le contremaître parle à l’équipe au sol.",
            "Des débris peuvent tomber du toit et blesser une personne en bas.",
            "Installez le ruban de signalisation autour de la zone d’exclusion.",
            "Éloignez-vous de la maison.",
            "Ne restez pas sous la zone de travail, même avec un casque de chantier.",
            "Tenez l’équipe au sol à l’écart des débris qui tombent.",
            "Si vous utilisez la goulotte à débris, prévenez d’abord les personnes en bas : « Attention ! Des débris vont tomber ! »",
            "Attendez que je confirme que la zone est dégagée."
        ],
        "verbsFrench": [["installer", "Nous installons le ruban de signalisation autour de la zone d’exclusion."], ["s’éloigner", "Tout le monde s’éloigne de la maison avant la dépose."], ["attendre", "Nous attendons que le contremaître confirme que la zone est dégagée."], ["prévenir", "Si nous utilisons la goulotte à débris, nous prévenons d’abord les personnes en bas."], ["tomber", "Attention en bas ! Des débris vont tomber !"]],
        "teachingNotesFrench": "Une zone d’exclusion ne se définit pas par le seul ruban; ses limites, son contrôle et le mode d’évacuation des débris relèvent du plan du chantier. Le casque ne permet pas de rester sous les travaux.",
        "practiceFrench": {"see": "Repérez dans la scène qui doit quitter la zone d’exclusion.", "recall": "Retrouvez l’interdiction de rester sous la zone de travail.", "hear": "Écoutez l’alerte sur les débris, puis indiquez qui doit répondre.", "type": "Écrivez en français : Do not stand under the work.", "say": "Annoncez à voix haute l’arrêt de la dépose et demandez confirmation à l’équipe au sol.", "write": "Rédigez deux phrases pour faire dégager la zone et attendre une réponse."},
        "regionalNotesEnglish": ["Qualified falling-object and exclusion-zone safety review is required before release; warning tape, a hard hat and a shouted warning are not sufficient controls by themselves.", "France/Québec terminology for tear-off, debris chute and exclusion area requires regional roofing review."],
    },
    26: {
        "titleFrench": "Documenter une réparation du platelage",
        "objectiveFrench": "Décrire la partie réparée du platelage et demander des photos et mesures avant de la recouvrir.",
        "speakingFrenchInstruction": "Demandez de montrer la zone abîmée, de mesurer la réparation et de prendre les photos requises avant de la recouvrir. Faites confirmer la procédure d’inspection du chantier.",
        "speakingFrenchOpening": "Pouvez-vous me montrer la zone réparée et la photo prise avant de la recouvrir ?",
        "grammarFocusFrench": "Avant de + infinitif; question avec quelle taille; passé composé pour les étapes déjà réalisées.",
        "wordsFrench": ["la photo de la réparation", "le platelage du toit", "la zone recouverte", "la réparation", "le contreplaqué", "la photo", "la zone endommagée", "le panneau de support", "la mesure", "Prenez une photo de la zone réparée avant de la recouvrir.", "Montrez-moi la zone endommagée.", "Prenez une photo avant et après la réparation.", "Ne la recouvrez pas avant ma vérification.", "Quelle est la taille de la partie réparée ?"],
        "readingFrench": [
            "Pendant la dépose, l’équipe a trouvé une zone endommagée sur le platelage du toit.",
            "Le contremaître dit : « Montrez-moi la zone endommagée. »",
            "Prenez une photo avant et après la réparation.",
            "Les ouvriers remplacent le contreplaqué endommagé.",
            "Le contremaître demande : « Quelle est la taille de la partie réparée ? »",
            "Un ouvrier mesure la partie réparée et communique la mesure.",
            "Prenez une photo de la zone réparée avant de la recouvrir.",
            "Ne la recouvrez pas avant ma vérification.",
            "La photo de la réparation documente ce qui restera sous la couverture."
        ],
        "verbsFrench": [["prendre", "Les ouvriers prennent une photo avant et après la réparation."], ["montrer", "Un ouvrier montre la zone endommagée au contremaître."], ["remplacer", "Les ouvriers remplacent le contreplaqué endommagé."], ["mesurer", "Un ouvrier mesure la partie réparée et communique la mesure."], ["vérifier", "Le contremaître vérifie la partie réparée avant de la recouvrir."]],
        "teachingNotesFrench": "Le platelage est le support de toiture; une photo documente l’état visible, mais ne prouve pas à elle seule la conformité de la réparation. La méthode, les mesures et l’autorisation de recouvrir suivent le plan approuvé.",
        "practiceFrench": {"see": "Repérez l’ordre des photos, de la mesure et de la vérification.", "recall": "Retrouvez la demande de montrer la zone endommagée.", "hear": "Écoutez la question sur la taille, puis relevez la mesure demandée.", "type": "Écrivez en français : Take a photo before and after the repair.", "say": "Demandez oralement une photo de la réparation avant de la recouvrir.", "write": "Rédigez une demande de mesure et une consigne de vérification avant recouvrement."},
        "regionalNotesEnglish": ["Qualified roofing/structural review is required for deck-repair method, inspection and authorization to cover; photographs alone are documentation, not acceptance.", "France/Québec terminology for roof deck, sheathing and plywood needs regional technical review."],
    },
    27: {
        "titleFrench": "Vérifier les évents et les solins",
        "objectiveFrench": "Passer en revue les traversées de toiture avec le chef d’équipe et demander ce qui a été vérifié.",
        "speakingFrenchInstruction": "Parcourez chaque traversée avec le chef d’équipe. Demandez ce qui a été inspecté et photographié, puis faites confirmer le détail approuvé pour les solins et les fixations exposées.",
        "speakingFrenchOpening": "Pour chaque traversée de toiture, qu’avez-vous déjà vérifié et photographié ?",
        "grammarFocusFrench": "Question au passé composé avec qu’avez-vous; si + présent pour décrire une fissure possible.",
        "wordsFrench": ["l’évent", "le manchon d’étanchéité du tuyau", "le solin", "la traversée de toiture", "le produit d’étanchéité", "la fissure", "la fuite", "le puits de lumière", "la cheminée", "Vérifiez le solin autour de cet évent.", "Prenez une photo du solin autour de chaque traversée.", "Parcourez chaque traversée avec moi.", "Le manchon du tuyau est-il fissuré ?", "Qu’avez-vous déjà vérifié ?", "Réalisez l’étanchéité des clous exposés."],
        "readingFrench": [
            "Avant de terminer, le contremaître veut vérifier tous les éléments qui traversent le toit.",
            "Parcourons chaque traversée de toiture ensemble.",
            "Il demande au chef d’équipe : « Qu’avez-vous déjà vérifié ? »",
            "Vérifiez le solin autour de cet évent.",
            "Le manchon d’étanchéité du tuyau est-il fissuré ?",
            "S’il y a une fissure, l’eau peut provoquer une fuite.",
            "Prenez une photo du solin autour de chaque traversée.",
            "Réalisez l’étanchéité des clous exposés."
        ],
        "verbsFrench": [["vérifier", "Vérifiez le solin autour de cet évent."], ["réaliser l’étanchéité", "Réalisez l’étanchéité des clous exposés."], ["prendre", "Prenez une photo du solin autour de chaque traversée."], ["parcourir", "Nous parcourons chaque traversée ensemble."], ["demander", "Le contremaître demande au chef d’équipe ce qu’il a vérifié."]],
        "teachingNotesFrench": "Une traversée de toiture est un élément qui passe à travers la couverture. Le solin, le manchon et le traitement des fixations dépendent du système choisi; la phrase source sur les clous exposés n’est pas une méthode universelle.",
        "practiceFrench": {"see": "Repérez dans la scène les éléments à inspecter autour de chaque traversée.", "recall": "Retrouvez la question sur le manchon fissuré.", "hear": "Écoutez la demande de photo, puis indiquez la zone visée.", "type": "Écrivez en français : What have you already checked?", "say": "Demandez à voix haute au chef d’équipe ce qu’il a inspecté.", "write": "Rédigez deux questions pour vérifier le solin et demander une photo."},
        "regionalNotesEnglish": ["Qualified roofing/product review is required for penetration details, pipe boots, exposed fasteners and the source's 'Seal the exposed nails' instruction before release.", "France/Québec terms for vent, pipe boot, flashing and skylight require regional technical review."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    preceding = json.loads((CONTENT / "core-22-24-draft.json").read_text())
    draft = {k: v for k, v in preceding.items() if k != "lessons"}
    draft["englishSourceSubsetSHA256"] = hashlib.sha256(source_bytes).hexdigest()
    draft["draftMethod"] = "manual source-aligned French draft; independent Fable/Opus and qualified human review pending"
    draft["lessons"] = []
    for original in source:
        n = original["n"]
        authored = AUTHOR[n]
        assert len(original["words"]) == len(authored["wordsFrench"]), n
        assert len(original["readingEnglish"]) == len(authored["readingFrench"]), n
        assert len(original["verbs"]) == len(authored["verbsFrench"]), n
        lesson = {k: original[k] for k in ("n", "titleEnglish", "objectiveEnglishSource", "speakingEnglishSource")}
        for field in ("titleFrench", "objectiveFrench", "speakingFrenchInstruction", "speakingFrenchOpening", "grammarFocusFrench"):
            lesson[field] = authored[field]
        lesson["words"] = [{**word, "fr": french} for word, french in zip(original["words"], authored["wordsFrench"])]
        lesson["reading"] = {"titleFrench": authored["titleFrench"], "target": authored["readingFrench"], "native": original["readingEnglish"]}
        lesson["verbs"] = [{**verb, "infinitiveFrench": infinitive, "exampleFrench": example} for verb, (infinitive, example) in zip(original["verbs"], authored["verbsFrench"])]
        lesson["teachingNotesFrench"] = authored["teachingNotesFrench"]
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["regionalNotesEnglish"] = authored["regionalNotesEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
