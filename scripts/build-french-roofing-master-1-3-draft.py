#!/usr/bin/env python3
"""Build private French Roofing Master 1–3 from exact English source anchors."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-1-3.json"
OUTPUT = CONTENT / "master-1-3-draft.json"
SOURCE_FILES = ["src/data/master-roofing-curriculum.ts", "public/lesson-content/es/master-roofing.json"]

AUTHOR = {
    1: {
        "titleFrench": "Expliquer le système de toiture à un nouvel ouvrier",
        "objectiveFrench": "Présenter les couches de la toiture dans l’ordre prévu et expliquer leur fonction à un nouvel ouvrier.",
        "grammarFocusFrench": "D’abord, ensuite et enfin pour la séquence; parce que et c’est pourquoi pour la cause.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe et votre partenaire est un nouvel ouvrier. Expliquez du platelage au faîtage la fonction des couches du système choisi; demandez-lui de reformuler et consultez le détail approuvé pour l’ordre réel.",
        "speakingFrenchOpening": "Commençons par le plan : peux-tu m’expliquer le rôle de chaque couche ?",
        "wordsFrench": ["le système de toiture", "le platelage du toit", "la sous-couche", "le larmier", "la bande de départ", "le bardeau d’asphalte", "la membrane d’étanchéité contre la glace et l’eau", "le solin", "la noue", "le faîtage", "le bardeau de faîtage", "l’évent de faîtage", "l’avant-toit", "la couche", "D’abord vient le platelage, puis la sous-couche.", "Chaque couche a son rôle.", "L’eau s’écoule vers le bas.", "C’est pourquoi nous commençons par le bas.", "Est-ce que je suis clair ?", "Pose-moi toutes les questions que tu veux.", "Si vous avez des questions, adressez-vous à moi."],
        "readingFrench": [
            "Aujourd’hui, Kevin arrive dans l’équipe et Rogelio lui explique le système de toiture avant de monter.",
            "Rogelio : « Chaque couche a son rôle, et elles fonctionnent ensemble. »",
            "Rogelio : « D’abord vient le platelage, puis la sous-couche. »",
            "Rogelio : « Le platelage forme la base; il doit être solide et sec. »",
            "Rogelio : « À l’avant-toit, nous posons le larmier pour diriger l’eau vers la gouttière plutôt que vers le bois. »",
            "Rogelio : « À l’avant-toit et dans la noue, nous posons aussi la membrane d’étanchéité, car l’eau y circule davantage. »",
            "Kevin : « Pourquoi ne commençons-nous pas en haut, au faîtage ? »",
            "Rogelio : « Parce que l’eau s’écoule vers le bas. »",
            "Rogelio : « C’est pourquoi nous commençons par le bas : la bande de départ, puis les bardeaux d’asphalte, rang après rang. »",
            "Rogelio : « Chaque rang recouvre celui du dessous, de sorte que l’eau passe par-dessus, et non par-dessous. »",
            "Rogelio : « Autour de la cheminée et contre les murs, nous posons des solins, car ces raccords demandent une attention particulière. »",
            "Rogelio : « Enfin, tout en haut, viennent l’évent de faîtage et les bardeaux de faîtage. »",
            "Rogelio : « Le grenier doit être ventilé; c’est pourquoi l’évent reste au faîtage. »",
            "Rogelio : « Est-ce que je suis clair ? »",
            "Kevin : « Oui : d’abord la base, puis la protection contre l’eau et enfin la ventilation. »",
            "Rogelio : « Exactement; si tu as des questions, pose-moi toutes celles que tu veux. »",
            "Rogelio : « Avec un client, dites plutôt : Si vous avez des questions, adressez-vous à moi. »"
        ],
        "verbsFrench": [["expliquer", "Rogelio lui explique le système de toiture avant de monter."], ["commencer", "C’est pourquoi nous commençons par le bas."], ["s’écouler", "L’eau s’écoule vers le bas."], ["recouvrir", "Chaque rang recouvre celui du dessous."], ["poser", "À l’avant-toit, nous posons le larmier."]],
        "practiceFrench": {"see": "Reliez chaque couche à sa fonction dans le système décrit.", "recall": "Retrouvez les marqueurs d’ordre utilisés par Rogelio.", "hear": "Écoutez l’explication du faîtage et nommez la couche citée.", "type": "Écrivez en français : Each layer has its job.", "say": "Expliquez oralement à un nouvel ouvrier la fonction de trois couches.", "write": "Rédigez une explication courte avec d’abord, ensuite et parce que."},
        "teachingNotesFrench": "Les connecteurs expliquent l’ordre et la cause. La séquence et le choix des composants dépendent du système, du climat, des plans et des instructions du fabricant; ce dialogue ne sert pas de méthode universelle de pose.",
        "reviewGapsEnglish": ["Qualified roof-system/product review is required for drip-edge, membrane, ridge-vent and ridge-cap sequence and purpose; the English passage makes broad installation claims.", "France/Québec regional review of roof-system terms, customer/crew register and climate-specific membrane vocabulary is open."],
    },
    2: {
        "titleFrench": "Expliquer le décalage des joints",
        "objectiveFrench": "Expliquer un motif de joints décalés selon le produit choisi avec la voix passive et des conditions en si.",
        "grammarFocusFrench": "Voix passive avec être et participe passé; si + présent pour une condition générale.",
        "speakingFrenchInstruction": "Vous formez un nouvel ouvrier. Montrez le motif de joints du produit choisi, expliquez le trajet possible de l’eau et demandez-lui de décrire le contrôle indiqué par le fabricant; évitez d’affirmer qu’un seul motif convient à tous les bardeaux.",
        "speakingFrenchOpening": "Regardons le motif du fabricant : pourquoi ces joints sont-ils décalés ?",
        "wordsFrench": ["le joint", "décaler", "le recouvrement", "le rang de bardeaux", "la languette", "la fente entre les languettes", "la fuite", "le trajet de l’eau", "l’humidité", "la ligne tracée au cordeau", "le motif", "la bande adhésive", "avec le temps", "le vent", "Si les joints s’alignent, l’eau peut s’infiltrer.", "Les joints sont décalés selon les instructions du fabricant.", "L’eau suit le chemin le plus facile.", "Ainsi, on peut ne voir la fuite que trop tard.", "Regarde, je vais te montrer.", "Puis-je vous expliquer pourquoi ?", "On ne fait pas cela ici."],
        "readingFrench": [
            "Kevin regarde le toit et demande pourquoi les joints ne forment pas une ligne droite.",
            "Rogelio : « Regarde, je vais te montrer avec deux bardeaux. »",
            "Rogelio : « Si les joints s’alignent, l’eau peut s’infiltrer. »",
            "Rogelio : « L’eau suit le chemin le plus facile, et un joint ouvert peut devenir ce chemin. »",
            "Rogelio : « C’est pourquoi les joints sont décalés selon le fabricant; on ne choisit pas le motif à l’œil. »",
            "Rogelio : « Si un rang recouvre le joint du dessous, l’eau s’écoule sur le bardeau et poursuit son chemin. »",
            "Rogelio : « Mais si les fentes se retrouvent l’une au-dessus de l’autre, l’eau peut descendre jusqu’à la sous-couche. »",
            "Rogelio : « Avec le temps, l’humidité peut atteindre le bois et une fuite peut apparaître dans la maison. »",
            "Rogelio : « Ainsi, on peut ne voir la fuite que trop tard. »",
            "Rogelio : « Le vent peut aussi soulever les languettes si la bande adhésive n’adhère pas bien. »",
            "Rogelio : « Voilà pourquoi on vérifie le motif à chaque rang et on trace une ligne au cordeau au besoin. »",
            "La propriétaire écoute depuis la cour et pose elle aussi une question.",
            "Rogelio : « Madame, puis-je vous expliquer pourquoi ? »",
            "Rogelio : « Si le recouvrement et les joints respectent le système choisi, la toiture peut durer; sinon, de l’eau peut s’infiltrer. »",
            "Rogelio : « Kevin, aligner les joints serait une erreur pour ce produit; on ne fait pas cela ici. »"
        ],
        "verbsFrench": [["décaler", "C’est pourquoi les joints sont décalés selon le fabricant."], ["s’aligner", "Si les joints s’alignent, l’eau peut s’infiltrer."], ["suivre", "L’eau suit le chemin le plus facile."], ["soulever", "Le vent peut soulever les languettes si la bande adhésive n’adhère pas bien."], ["vérifier", "On vérifie le motif à chaque rang."]],
        "practiceFrench": {"see": "Repérez les conditions exprimées avec si dans la démonstration.", "recall": "Retrouvez la phrase qui demande le motif du fabricant.", "hear": "Écoutez l’explication du trajet de l’eau et nommez la zone évoquée.", "type": "Écrivez en français : The joints are staggered according to the manufacturer.", "say": "Expliquez oralement à Kevin pourquoi il faut vérifier le motif du produit.", "write": "Rédigez deux phrases avec si pour décrire un contrôle et une conséquence possible."},
        "teachingNotesFrench": "Le français emploie ici la voix passive : les joints sont décalés. Le cours source simplifie le trajet de l’eau et la durée de vie d’une toiture; le motif, le recouvrement et les risques dépendent du produit et du détail approuvé.",
        "reviewGapsEnglish": ["Qualified roofing/product review is required for claims that aligned joints necessarily cause a leak, that one pattern prevents it, and that correct overlap yields many years of service.", "France/Québec terms for tabs, slots, sealant strip and chalk line require regional review."],
    },
    3: {
        "titleFrench": "Former un nouvel ouvrier au clouage",
        "objectiveFrench": "Corriger avec tact le clouage d’un nouvel ouvrier en utilisant des consignes claires et les détails du fabricant.",
        "grammarFocusFrench": "Impératif affirmatif et négatif avec pronom objet : cloue-le ici; ne l’enfonce pas trop.",
        "speakingFrenchInstruction": "Vous formez un nouvel ouvrier à la cloueuse. Demandez un arrêt et la vérification du modèle, du réglage et du motif approuvé avant une démonstration; corrigez sans humilier et ne proposez pas un réglage universel de pression ou une réparation improvisée.",
        "speakingFrenchOpening": "Avant d’utiliser la cloueuse, montrons la zone de clouage indiquée par ce fabricant.",
        "wordsFrench": ["la cloueuse", "la zone de clouage", "le motif de clouage", "le clou trop enfoncé", "le clou placé trop haut", "la tête du clou", "la pression d’air", "le compresseur", "la profondeur", "le tuyau d’air", "la gâchette", "à fleur", "le trou", "Cloue-le ici, dans la zone de clouage.", "Ne l’enfonce pas trop.", "Baisse la pression.", "Retire-le et mets-en un autre.", "Regarde bien la tête du clou.", "Ne t’inquiète pas, cela nous est tous arrivé.", "Vérifiez-le vous-même également, s’il vous plaît."],
        "readingFrench": [
            "Aujourd’hui, Kevin utilise la cloueuse pour la première fois et Rogelio reste près de lui.",
            "Rogelio : « Avant de commencer, vérifie le tuyau et le compresseur; ne garde pas le doigt sur la gâchette. »",
            "Rogelio : « Regarde cette ligne sur le bardeau : c’est la zone de clouage. »",
            "Rogelio : « Cloue-le ici, dans la zone de clouage, et suis le motif du fabricant. »",
            "Kevin fixe le premier bardeau, mais un clou se retrouve trop haut.",
            "Rogelio : « Ce clou trop haut retient mal le bardeau du dessous; retire-le et mets-en un autre. »",
            "Rogelio : « Et pour le trou, suis les instructions du produit afin d’assurer l’étanchéité; ne le laisse pas ouvert. »",
            "Ensuite Kevin pose un autre clou, mais la tête s’enfonce dans le bardeau.",
            "Rogelio : « Regarde bien la tête du clou; elle doit être à fleur, pas plus bas. »",
            "Rogelio : « Un clou trop enfoncé peut endommager le bardeau, que le vent risque alors de soulever. »",
            "Rogelio : « Baisse un peu la pression d’air et réessaie; ne l’enfonce pas trop. »",
            "Rogelio : « Si la profondeur change, préviens-moi et nous ajusterons ensemble. »",
            "Kevin rougit, mais Rogelio lui dit : « Ne t’inquiète pas, cela nous est tous arrivé. »",
            "Rogelio : « Et ne pointe la cloueuse vers personne, même pour plaisanter. »",
            "Plus tard, M. Ernesto arrive; il est nouveau dans l’équipe mais a beaucoup d’expérience ailleurs.",
            "Rogelio : « Monsieur Ernesto, ici nous clouons ainsi; vérifiez-le vous-même également, s’il vous plaît. »"
        ],
        "verbsFrench": [["clouer", "Cloue-le ici, dans la zone de clouage."], ["retirer", "Retire-le et mets-en un autre."], ["enfoncer", "Ne l’enfonce pas trop."], ["ajuster", "Préviens-moi et nous ajusterons ensemble."], ["pointer", "Ne la pointe vers personne."]],
        "practiceFrench": {"see": "Repérez la différence entre un clou trop haut et un clou trop enfoncé.", "recall": "Retrouvez la consigne négative avec le pronom objet.", "hear": "Écoutez la correction du clou et nommez la zone visée.", "type": "Écrivez en français : Don't sink it.", "say": "Corrigez oralement un nouvel ouvrier sans l’humilier, en demandant le détail du fabricant.", "write": "Rédigez une consigne positive et une consigne négative avec un pronom objet."},
        "teachingNotesFrench": "Dans cloue-le, le pronom suit l’impératif affirmatif; dans ne l’enfonce pas, il précède le verbe. Le réglage de pression, la correction d’un clou mal placé et l’étanchéité du trou dépendent de l’outil, du produit et des règles du chantier; le dialogue source n’est pas une procédure.",
        "reviewGapsEnglish": ["Qualified roofing/product and power-tool safety review is required for pressure adjustment, high-nail removal, hole sealing and the nail-gun demonstration before release.", "The English source assumes a particular fastener repair and nail-depth method; do not publish as a universal instruction. France/Québec nail-gun and shingle terms need regional review."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    draft = {
        "schema": 1,
        "moduleId": "roofing",
        "stage": "master",
        "target": "French",
        "native": "English",
        "state": "translation-draft",
        "reviewed": False,
        "sourceRevision": "7a2bef7428120af880a4340cc5ecf216a38f0f3d",
        "sourceFiles": SOURCE_FILES,
        "sourceFileSHA256": {path: hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in SOURCE_FILES},
        "englishSourceSubsetSHA256": hashlib.sha256(source_bytes).hexdigest(),
        "draftMethod": "manual source-aligned French draft; independent Fable/Opus and qualified human review pending",
        "lessons": [],
    }
    for original in source:
        n = original["n"]
        authored = AUTHOR[n]
        assert len(original["words"]) == len(authored["wordsFrench"]), n
        assert len(original["readingEnglish"]) == len(authored["readingFrench"]), n
        assert len(original["verbs"]) == len(authored["verbsFrench"]), n
        lesson = {k: original[k] for k in ("n", "titleEnglish", "objectiveEnglishSource", "focusEnglishSource", "lessonType", "block", "speakingEnglishSource", "grammarExamplesEnglish")}
        for field in ("titleFrench", "objectiveFrench", "grammarFocusFrench", "speakingFrenchInstruction", "speakingFrenchOpening", "teachingNotesFrench"):
            lesson[field] = authored[field]
        lesson["words"] = [{**word, "fr": french} for word, french in zip(original["words"], authored["wordsFrench"])]
        lesson["reading"] = {"titleFrench": authored["titleFrench"], "target": authored["readingFrench"], "native": original["readingEnglish"]}
        lesson["verbs"] = [{**verb, "infinitiveFrench": infinitive, "exampleFrench": example} for verb, (infinitive, example) in zip(original["verbs"], authored["verbsFrench"])]
        if n == 1:
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            lesson["reading"]["nativeDisplay"][10] = "Rogelio: Around the chimney and against the walls we put flashing, because those joints need special attention."
        if n == 2:
            lesson["words"][14]["enDisplay"] = "If the joints line up, water can get in."
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            for index, display in {
                2: "Rogelio: If the joints line up, water can get in.",
                3: "Rogelio: Water looks for the easiest path, and an open joint can become that path.",
                6: "Rogelio: But if the slots end up one on top of another, water may travel down to the underlayment.",
                7: "Rogelio: Over time, moisture may reach the wood and a leak may appear inside the house.",
                9: "Rogelio: The wind may also lift the tabs if the sealant strip doesn't stick well.",
                13: "Rogelio: If the overlap and joints suit the chosen system, the roof may last; otherwise, water may get in.",
                14: "Rogelio: Kevin, lining up the joints would be a mistake for this product; that isn't how we do it here.",
            }.items():
                lesson["reading"]["nativeDisplay"][index] = display
        if n == 3:
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            lesson["reading"]["nativeDisplay"][9] = "Rogelio: An overdriven nail can damage the shingle, and the wind may lift it."
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
