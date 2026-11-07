#!/usr/bin/env python3
"""Build the private French Roofing Core 22–24 draft from pinned English pairs."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-core-22-24.json"
OUTPUT = CONTENT / "core-22-24-draft.json"

AUTHOR = {
    22: {
        "titleFrench": "Vérifier l’ancrage et la ligne de vie",
        "objectiveFrench": "Signaler un doute sur l’ancrage ou la ligne de vie et demander une vérification avant la reprise.",
        "speakingFrenchInstruction": "Interrompez l’accès et signalez le doute. Demandez à la personne compétente de vérifier l’installation, le matériel, la distance libre de chute et le plan de sauvetage du chantier avant toute reprise.",
        "speakingFrenchOpening": "On arrête le travail : qui peut vérifier cet ancrage et cette ligne de vie ?",
        "grammarFocusFrench": "Question avec qui/ où; avant de + infinitif; si + présent pour une condition non vérifiée.",
        "wordsFrench": ["l’ancrage", "la ligne de vie", "la distance libre de chute", "le harnais", "la longe", "la personne compétente", "l’inspection", "la corde", "arrêter le travail", "Utilisez l’ancrage approuvé; n’improvisez pas.", "Arrêtez le travail. Cet ancrage semble dangereux.", "Où est la personne compétente ?", "Vérifiez que la ligne de vie n’est pas endommagée.", "Faites confirmer l’installation de l’ancrage avant de reprendre."],
        "readingFrench": [
            "Pendant le travail sur le toit, un ouvrier remarque un problème avec la ligne de vie.",
            "Il s’arrête et prévient le contremaître.",
            "Le contremaître dit : « Arrêtez le travail. Cet ancrage semble dangereux. »",
            "Il demande : « Où est la personne compétente ? »",
            "Vérifiez que la ligne de vie n’est pas endommagée.",
            "La personne compétente inspecte le système et confirme la distance libre de chute requise.",
            "Faites confirmer l’installation de l’ancrage avant de reprendre.",
            "Un harnais ne protège pas si l’ancrage ou la longe fait défaut."
        ],
        "verbsFrench": [
            ["arrêter", "Arrêtez le travail. Cet ancrage semble dangereux."],
            ["vérifier", "Vérifiez que la ligne de vie n’est pas endommagée."],
            ["confirmer", "La personne compétente confirme la distance libre de chute requise."],
            ["prévenir", "L’ouvrier s’arrête et prévient le contremaître."],
            ["faire défaut", "Un harnais ne protège pas si l’ancrage ou la longe fait défaut."]
        ],
        "teachingNotesFrench": "Une ligne de vie, une longe et un ancrage forment un système à vérifier ensemble. La distance libre de chute se calcule selon l’installation réelle; cette lecture ne donne ni cote ni procédure de sécurité.",
        "practiceFrench": {"see": "Repérez dans le dialogue qui arrête le travail et qui vérifie le système.", "recall": "Retrouvez la phrase qui demande où est la personne compétente.", "hear": "Écoutez « ligne de vie », puis indiquez l’objet signalé.", "type": "Écrivez en français : Confirm the anchor setup before we continue.", "say": "Dites à voix haute une demande de vérification avant la reprise.", "write": "Rédigez deux phrases pour signaler le doute et demander la vérification du système."},
        "regionalNotesEnglish": ["Qualified fall-protection review is required for anchorage, lifeline setup, clearance, rescue, and the exact English safety source before release.", "France/Québec terms for competent person, lifeline and fall clearance need qualified regional review."],
    },
    23: {
        "titleFrench": "Appui et changement de météo",
        "objectiveFrench": "Avertir l’équipe d’une surface glissante et demander l’arrêt et la descente selon le plan météo du chantier.",
        "speakingFrenchInstruction": "Signalez la rosée et la perte d’adhérence. Si un orage approche, faites arrêter le travail et appliquer le plan d’évacuation du chantier; demandez une confirmation de chaque membre de l’équipe.",
        "speakingFrenchOpening": "La toiture est glissante et l’orage approche : on arrête le travail, tout le monde a compris ?",
        "grammarFocusFrench": "Impératif de sécurité; si + présent; parce que pour expliquer un risque observable.",
        "wordsFrench": ["la rosée", "l’appui", "la foudre", "glissant", "mouillé", "la pluie", "le vent", "l’orage", "les bottes", "Attention à votre appui : la rosée rend le toit glissant.", "Ne travaillez pas sur le toit quand il y a de la foudre.", "Arrêtez le travail et descendez si la météo change.", "Le toit est mouillé. Faites attention.", "Un orage arrive. Descendez maintenant.", "Portez des bottes offrant une bonne adhérence."],
        "readingFrench": [
            "Il est six heures trente du matin et il y a encore de la rosée sur le toit.",
            "Le contremaître prévient l’équipe : « Le toit est mouillé. Faites attention. »",
            "Cherchez un appui stable, car la rosée rend le toit glissant.",
            "Portez des bottes offrant une bonne adhérence.",
            "Plus tard, le vent se lève et des nuages sombres apparaissent dans le ciel.",
            "Ne travaillez pas sur le toit quand il y a de la foudre.",
            "Le contremaître crie : « Un orage arrive. Descendez maintenant. »",
            "Arrêtez le travail et descendez si la météo change."
        ],
        "verbsFrench": [
            ["descendre", "Un orage arrive. Descendez maintenant."],
            ["arrêter", "Arrêtez le travail et descendez si la météo change."],
            ["porter", "Portez des bottes offrant une bonne adhérence."],
            ["chercher", "Nous cherchons un appui stable parce que la rosée rend le toit glissant."],
            ["changer", "Descendez si la météo change."]
        ],
        "teachingNotesFrench": "La rosée, le vent et l’orage changent les conditions du chantier. Le dialogue sert à pratiquer l’alerte et l’arrêt; le seuil de reprise et l’évacuation suivent le plan météo approuvé.",
        "practiceFrench": {"see": "Repérez les signes de changement de météo dans la scène.", "recall": "Retrouvez l’avertissement sur la rosée et l’appui.", "hear": "Écoutez « l’orage approche », puis choisissez l’alerte correspondante.", "type": "Écrivez en français : Stop work and come down if the weather changes.", "say": "Avertissez oralement l’équipe de l’orage qui approche.", "write": "Rédigez une consigne d’arrêt et une demande de confirmation de l’équipe."},
        "regionalNotesEnglish": ["Qualified site-safety review is required for slippery roofs, lightning, stop-work triggers and descent/evacuation procedures.", "Boot grip and any time or weather threshold in the English scene are not a universal safety clearance."],
    },
    24: {
        "titleFrench": "Chaleur et pauses d’eau",
        "objectiveFrench": "Demander comment va un collègue, reconnaître un malaise possible et appliquer le plan chaleur du chantier.",
        "speakingFrenchInstruction": "Demandez à un collègue comment il se sent. S’il a des vertiges ou semble malade, arrêtez l’activité, faites appliquer le plan chaleur du chantier et demandez l’aide prévue par ce plan; ne posez pas de diagnostic.",
        "speakingFrenchOpening": "Vous n’avez pas l’air bien : comment vous sentez-vous ? On arrête et on suit le plan chaleur.",
        "grammarFocusFrench": "Se sentir + adjectif; avoir des vertiges; impératif et condition si pour demander de l’aide.",
        "wordsFrench": ["la pause pour boire de l’eau", "la chaleur", "l’ombre", "l’eau", "étourdi", "l’épuisement dû à la chaleur", "le repos", "l’hydratation", "la crème solaire", "Prenez une pause pour boire de l’eau toutes les heures.", "Comment vous sentez-vous ?", "Avez-vous des vertiges ?", "Allez à l’ombre et reposez-vous.", "Buvez de l’eau maintenant.", "Dites-moi si vous vous sentez mal."],
        "readingFrench": [
            "Il fait très chaud et le soleil tape sur le toit.",
            "Le contremaître dit : « Prenez une pause pour boire de l’eau toutes les heures. »",
            "Mais Raúl n’a pas l’air bien, alors le contremaître s’approche.",
            "Il lui demande : « Comment vous sentez-vous ? »",
            "« Avez-vous des vertiges ? »",
            "Raúl répond que oui, un peu.",
            "Le contremaître lui dit : « Allez à l’ombre et reposez-vous. Buvez de l’eau maintenant. »",
            "« Dites-moi si vous vous sentez mal, et nous suivrons le plan chaleur du chantier. »",
            "S’hydrater et se reposer à l’ombre aident à prévenir l’épuisement dû à la chaleur."
        ],
        "verbsFrench": [
            ["boire", "Raúl boit de l’eau toutes les heures."],
            ["se reposer", "Raúl se repose à l’ombre parce qu’il a des vertiges."],
            ["se sentir", "Comment vous sentez-vous, Raúl ?"],
            ["prévenir", "Raúl prévient le contremaître s’il se sent mal."],
            ["aller", "Raúl va à l’ombre pour se reposer."]
        ],
        "teachingNotesFrench": "Avoir des vertiges décrit un symptôme; cela ne permet pas de diagnostiquer un épuisement dû à la chaleur. Les pauses, l’aide et les mesures d’urgence suivent le plan chaleur et les responsables du chantier.",
        "practiceFrench": {"see": "Repérez la question posée à Raúl et sa réponse dans la scène.", "recall": "Retrouvez la phrase qui demande si Raúl a des vertiges.", "hear": "Écoutez « Comment vous sentez-vous ? », puis indiquez qui répond.", "type": "Écrivez en français : Tell me if you feel sick.", "say": "Demandez à voix haute comment se sent un collègue.", "write": "Rédigez deux phrases pour arrêter l’activité et demander de suivre le plan chaleur."},
        "regionalNotesEnglish": ["Qualified heat-illness/occupational-health review is required for symptom response, hydration schedule and emergency escalation before release.", "The English source's hourly water break is a fictional scene, not a universal prevention interval; sunscreen does not replace the site heat plan."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    preceding = json.loads((CONTENT / "core-19-21-draft.json").read_text())
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
