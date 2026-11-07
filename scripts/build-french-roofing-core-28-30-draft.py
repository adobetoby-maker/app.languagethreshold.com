#!/usr/bin/env python3
"""Build private French Roofing Core 28–30 from pinned English pairs."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-core-28-30.json"
OUTPUT = CONTENT / "core-28-30-draft.json"

AUTHOR = {
    28: {
        "titleFrench": "Nettoyer le chantier au sol",
        "objectiveFrench": "Répartir la vérification des gouttières et le nettoyage du sol avant le départ.",
        "speakingFrenchInstruction": "Attribuez la vérification finale des gouttières et le nettoyage au sol. Demandez que les clous, les débris et les zones accessibles soient contrôlés selon le plan de chantier avant le départ.",
        "speakingFrenchOpening": "Qui vérifie les gouttières et qui confirme le ramassage des clous au sol ?",
        "grammarFocusFrench": "Avant de + infinitif; quand pour demander une confirmation; comparatif plus… que dans le bilan de fin de journée.",
        "wordsFrench": ["la gouttière", "la benne à déchets", "le clou", "le nettoyage", "l’aimant de ramassage", "le balai", "les débris", "la cour", "les déchets", "la descente pluviale", "Vérifions les gouttières et nettoyons le chantier avant de partir.", "Prévenez-moi quand le ramassage magnétique des clous est terminé.", "Vérifiez qu’il n’y a ni clous ni débris dans les gouttières.", "Ramassez tous les clous autour de la maison.", "La benne à déchets est-elle pleine ?", "Laissez la cour plus propre que vous ne l’avez trouvée."],
        "readingFrench": [
            "La toiture est terminée, mais il reste le nettoyage.",
            "Le contremaître dit : « Vérifions les gouttières et nettoyons le chantier avant de partir. »",
            "Vérifiez qu’il n’y a ni clous ni débris dans les gouttières.",
            "Une gouttière pleine peut obstruer la descente pluviale.",
            "Ramassez tous les clous autour de la maison.",
            "Prévenez-moi quand vous aurez terminé de ramasser les clous avec l’aimant.",
            "La benne à déchets est-elle pleine ?",
            "Utilisez le balai dans la cour et mettez les déchets dans la benne.",
            "Laissez la cour plus propre que vous ne l’avez trouvée."
        ],
        "verbsFrench": [["vérifier", "Nous vérifions les gouttières avant de partir."], ["ramasser", "Nous ramassons tous les clous autour de la maison."], ["nettoyer", "Nous nettoyons le chantier avant de partir."], ["prévenir", "Si la benne est pleine, je préviens le contremaître."], ["laisser", "Nous laissons la cour plus propre que nous ne l’avons trouvée."]],
        "teachingNotesFrench": "La gouttière recueille l’eau du toit et la descente pluviale l’évacue. L’aimant aide à rechercher les clous ferreux; il ne prouve pas à lui seul que toutes les zones sont propres ou sûres.",
        "practiceFrench": {"see": "Repérez les tâches de nettoyage attribuées avant le départ.", "recall": "Retrouvez la demande de confirmation du ramassage des clous.", "hear": "Écoutez la question sur la benne, puis indiquez ce qui doit être vérifié.", "type": "Écrivez en français : Check the gutters for nails and debris.", "say": "Attribuez oralement la vérification des gouttières et le nettoyage au sol.", "write": "Rédigez un message de fin de journée demandant la confirmation du nettoyage."},
        "regionalNotesEnglish": ["Qualified site and waste-handling review is needed for nail sweep, gutter access, disposal and final-site acceptance.", "France/Québec terms for dumpster, downspout and magnetic sweep require regional trade review."],
    },
    29: {
        "titleFrench": "Signaler les points à terminer",
        "objectiveFrench": "Transmettre clairement les travaux restants et confirmer la première tâche du lendemain.",
        "speakingFrenchInstruction": "Dressez avec le chef d’équipe la liste des points ouverts, vérifiez la zone non terminée et demandez quelle tâche commencera demain; faites confirmer le rangement prévu.",
        "speakingFrenchOpening": "Quelles zones restent à terminer demain, et quelle sera la première tâche ?",
        "grammarFocusFrench": "Rester à + infinitif; futur simple pour annoncer demain; question avec quelles zones.",
        "wordsFrench": ["la liste des points à terminer", "inachevé", "demain", "le point en suspens", "terminé", "les matériaux restants", "la tâche", "aujourd’hui", "le chantier", "Quelles zones restent à terminer demain ?", "Rangez les matériaux restants dans un endroit sûr.", "Parcourons le toit ensemble avant de déclarer le chantier terminé.", "Ce point reste en suspens.", "Demain, la première tâche sera de terminer cette section.", "Ajoutez-le à la liste des points à terminer."],
        "readingFrench": [
            "C’est la fin de la journée et l’équipe range ses outils.",
            "Parcourons le toit ensemble avant de déclarer le chantier terminé.",
            "Le contremaître demande : « Quelles zones restent à terminer demain ? »",
            "Une section près de la cheminée n’est pas terminée.",
            "Ce point reste en suspens.",
            "Ajoutez-le à la liste des points à terminer.",
            "Demain, la première tâche sera de terminer cette section.",
            "Rangez les matériaux restants dans un endroit sûr.",
            "Grâce à cette liste, chacun sait ce qu’il devra faire demain."
        ],
        "verbsFrench": [["terminer", "Demain, nous terminerons la section près de la cheminée."], ["ajouter", "Nous ajoutons ce point en suspens à la liste."], ["ranger", "Nous rangeons les matériaux restants dans un endroit sûr."], ["parcourir", "Nous parcourons le toit avant de déclarer le chantier terminé."], ["rester", "Quelles zones restent à terminer demain ?"]],
        "teachingNotesFrench": "Une liste de points à terminer sert à transmettre des travaux ouverts; elle ne vaut pas réception du chantier. Précisez la zone, le responsable et la prochaine étape avant de déclarer le travail terminé.",
        "practiceFrench": {"see": "Repérez la section qui reste à terminer dans la scène.", "recall": "Retrouvez la question sur la première tâche de demain.", "hear": "Écoutez « point en suspens », puis indiquez ce qui reste ouvert.", "type": "Écrivez en français : Add it to the punch list.", "say": "Expliquez oralement au chef d’équipe ce qui reste à faire demain.", "write": "Rédigez deux points de la liste avec une tâche prévue pour demain."},
        "regionalNotesEnglish": ["Qualified roofing/site review is required before calling any work complete or deciding material storage, access and overnight protection.", "France/Québec terminology for punch list and closeout needs regional trade review."],
    },
    30: {
        "titleFrench": "Diriger une journée de toiture complète",
        "objectiveFrench": "Diriger en français un échange de chantier, de la réunion du matin à la clôture de la journée.",
        "objectiveEnglishDisplay": "Lead a complete roofing day in French",
        "speakingFrenchInstruction": "Jouez la réunion du matin, la dépose, les contrôles de pose, une décision météo et le bilan final. Demandez confirmation au chef d’équipe et appliquez les plans de sécurité et de couverture temporaire approuvés; ne supposez pas qu’une bâche peut être posée pendant un orage.",
        "speakingFrenchOpening": "Avant de commencer, passons en revue le plan de toiture, les rôles et les conditions météo.",
        "grammarFocusFrench": "D’abord, puis, quand et avant de pour ordonner les étapes; impératif de sécurité; futur proche pour le bilan.",
        "wordsFrench": ["la réunion d’équipe", "la dépose", "poser", "la sécurité", "la clôture du chantier", "le chef d’équipe", "la sous-couche", "le solin", "la bâche", "la liste des points à terminer", "Passons en revue le plan de toiture d’aujourd’hui avant de commencer.", "Attachez-vous avant de monter sur le toit.", "Arrêtez le travail et descendez si la météo change.", "Parcourons le toit ensemble avant de déclarer le chantier terminé.", "D’abord la dépose, puis la pose.", "Aujourd’hui, la sécurité passe avant tout."],
        "readingFrench": [
            "Le matin, le contremaître ouvre la réunion : « Passons en revue le plan de toiture d’aujourd’hui avant de commencer. »",
            "Aujourd’hui, la sécurité passe avant tout.",
            "Attachez-vous avant de monter sur le toit.",
            "D’abord la dépose, puis la pose.",
            "Quand le platelage est prêt, l’équipe pose la sous-couche et les solins; le chef d’équipe vérifie chaque étape.",
            "L’après-midi, une alerte d’orage arrive et le contremaître ordonne : « Arrêtez le travail et descendez si la météo change. »",
            "L’équipe recouvre la section non terminée d’une bâche, selon le plan approuvé et seulement quand les conditions permettent une intervention sûre.",
            "À la fin de la journée, le contremaître demande : « Parcourons le toit ensemble avant de déclarer le chantier terminé. »",
            "Tout ce qui reste à faire demeure sur la liste des points à terminer pour la clôture."
        ],
        "verbsFrench": [["s’attacher", "Nous attachons toujours le harnais avant de monter sur le toit."], ["vérifier", "Le chef d’équipe vérifie chaque étape de la pose."], ["arrêter", "Arrêtez le travail et descendez si la météo change."], ["recouvrir", "L’équipe recouvre la section non terminée d’une bâche, seulement quand le plan et les conditions le permettent."], ["parcourir", "Parcourons le toit ensemble avant de déclarer le chantier terminé."]],
        "teachingNotesFrench": "L’objectif source dit « in Spanish »; le cours cible le français, d’où l’adaptation affichée. Le récit source place une bâche après une alerte d’orage sans préciser quand les conditions permettent de revenir : la correction des deux langues et la validation du plan météo sont obligatoires avant publication. Le harnais seul ne démontre pas une protection complète contre les chutes.",
        "practiceFrench": {"see": "Repérez l’ordre réunion, dépose, pose, décision météo et bilan final.", "recall": "Retrouvez la phrase qui arrête le travail quand la météo change.", "hear": "Écoutez la consigne du matin et nommez la première vérification.", "type": "Écrivez en français : Let's review today's roof plan before we start.", "say": "Jouez le début d’une réunion puis annoncez l’arrêt lié à la météo.", "write": "Rédigez un court bilan des travaux terminés et des points encore ouverts."},
        "regionalNotesEnglish": ["The English source's Spanish-only objective and storm-to-tarp sequence require curriculum and qualified site-safety correction before release; the French display adapts both while preserving exact source fields.", "Qualified fall-protection, temporary-cover and product review plus France/Québec language review remain open."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    preceding = json.loads((CONTENT / "core-25-27-draft.json").read_text())
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
        if "objectiveEnglishDisplay" in authored:
            lesson["objectiveEnglishDisplay"] = authored["objectiveEnglishDisplay"]
        lesson["words"] = [{**word, "fr": french} for word, french in zip(original["words"], authored["wordsFrench"])]
        lesson["reading"] = {"titleFrench": authored["titleFrench"], "target": authored["readingFrench"], "native": original["readingEnglish"]}
        lesson["verbs"] = [{**verb, "infinitiveFrench": infinitive, "exampleFrench": example} for verb, (infinitive, example) in zip(original["verbs"], authored["verbsFrench"])]
        if n == 30:
            lesson["reading"]["sourceNative"] = original["readingEnglish"]
            lesson["reading"]["native"] = list(original["readingEnglish"])
            lesson["reading"]["native"][6] = "Once conditions allow safe work under the approved plan, the crew covers the unfinished section with a tarp."
            lesson["verbs"][3]["exampleEnglishDisplay"] = "The crew covers the unfinished section with a tarp only when the plan and conditions permit it."
        lesson["teachingNotesFrench"] = authored["teachingNotesFrench"]
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["regionalNotesEnglish"] = authored["regionalNotesEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
