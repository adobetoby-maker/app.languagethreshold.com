#!/usr/bin/env python3
"""Build private French Roofing Master 19–20 from pinned English source."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-19-20.json"
OUTPUT = CONTENT / "master-19-20-draft.json"

AUTHOR = {
    19: {
        "titleFrench": "Faire la visite finale et expliquer les garanties",
        "objectiveFrench": "Présenter les travaux réalisés et orienter le propriétaire vers les documents de garantie, sans promettre une couverture ou un délai non vérifiés.",
        "grammarFocusFrench": "Conditionnel pour une possibilité; à condition que et sauf si pour les clauses dont le sens dépend du contrat.",
        "speakingFrenchInstruction": "Vous dirigez la visite finale avec le propriétaire. Montrez ce qui a été documenté, distinguez garantie du produit et garantie de pose, consultez les certificats pour les exclusions et expliquez comment signaler un problème. Ne garantissez ni couverture intégrale ni délai de traitement.",
        "speakingFrenchOpening": "Reprenons les travaux et les documents ensemble; je vérifierai les conditions exactes de chaque garantie.",
        "wordsFrench": ["la visite finale", "la facture finale", "la garantie du produit", "la garantie de pose", "le certificat", "l’enregistrement", "la couverture", "l’exclusion", "l’usure normale", "les dommages de tempête", "le défaut de pose", "la réclamation au titre de la garantie", "l’entretien", "la carte professionnelle", "La garantie pourrait couvrir une fuite imputable à la pose, selon le certificat.", "À condition que les conditions du certificat soient remplies.", "Sauf si une exclusion ou une autre cause s’applique.", "Si vous voyez une fuite, prévenez-nous rapidement.", "Voulez-vous que nous examinions les combles ensemble, si l’accès est sûr ?", "Voici ma carte.", "Avez-vous des questions avant de signer ?"],
        "readingFrench": [
            "Vendredi après-midi, Rogelio a fait la visite finale avec M. et Mme Novak.",
            "Ils ont d’abord fait le tour de la maison et examiné la gouttière, les descentes d’eau et le jardin.",
            "Rogelio : « Nous avons passé l’aimant deux fois; si vous trouvez un clou, prévenez-nous. »",
            "Rogelio : « La facture finale décrit le toit, la sous-couche et trois panneaux de support; vérifions ensemble les travaux effectivement réalisés. »",
            "Mme Novak : « Et s’il y a une fuite l’hiver prochain ? »",
            "Rogelio : « Il existe une garantie du produit et une garantie de pose; leurs conditions figurent dans leurs documents respectifs. »",
            "Rogelio : « Une fuite imputable à la pose pourrait relever de notre garantie, selon le certificat et après examen de la cause. »",
            "Rogelio : « La couverture et les exclusions doivent être lues dans le certificat; je ne peux pas promettre une couverture complète. »",
            "Rogelio : « Une antenne ou des panneaux solaires peuvent modifier les conditions; vérifions les clauses avant d’en tirer une conclusion. »",
            "Rogelio : « L’usure et les dégâts de tempête suivent les conditions du contrat et de l’assurance; la cause d’une fuite doit être établie. »",
            "Rogelio : « Je vérifierai qui doit enregistrer la garantie du produit et vous transmettrai la confirmation si cela s’applique. »",
            "Rogelio : « Voulez-vous que nous examinions les combles ensemble, si l’accès est sûr ? »",
            "Dans les zones accessibles, ils n’ont pas vu d’humidité; une vérification de la ventilation demanderait les mesures appropriées.",
            "Rogelio : « Si vous voyez une fuite, prévenez-nous rapidement; le délai et la procédure de réclamation sont indiqués dans vos documents. »",
            "Rogelio : « Pour l’entretien, suivez le plan applicable et demandez une inspection qualifiée après une tempête si nécessaire. »",
            "Rogelio : « Voici ma carte; avez-vous des questions avant de signer ? »"
        ],
        "verbsFrench": [["modifier", "Si le toit est modifié, vérifiez les conditions de la garantie."], ["traiter", "Une réclamation est traitée selon la procédure du certificat."], ["enregistrer", "Je vérifierai qui doit enregistrer la garantie du produit."], ["signer", "Avez-vous des questions avant de signer ?"], ["inclure", "La facture finale inclut les éléments réellement facturés."]],
        "practiceFrench": {"see": "Distinguez les deux garanties et les documents qui les définissent.", "recall": "Retrouvez la phrase qui demande d’examiner la cause d’une fuite.", "hear": "Écoutez couverture, exclusion et réclamation; associez chaque terme au document.", "type": "Écrivez en français : Do you have any questions before signing?", "say": "Présentez les documents sans promettre une couverture intégrale.", "write": "Rédigez une suite après visite qui oriente le client vers le certificat et le contact de réclamation."},
        "teachingNotesFrench": "Le conditionnel décrit une possibilité, non une promesse. Les clauses de garantie dépendent des certificats, du fabricant, du contrat de pose, du produit et de la juridiction. La source promet que toute fuite de pose est couverte, qu’une modification peut exclure toute couverture, qu’un sinistre va à l’assureur, qu’un enregistrement sera fait cette semaine, qu’une réclamation sera traitée en quelques jours et qu’un entretien bisannuel suffit; aucune de ces affirmations ne doit être enseignée comme règle générale.",
        "reviewGapsEnglish": ["Qualified roofing/product, insurer and consumer-contract review required for warranty scope, exclusions, maintenance, manufacturer registration, claim timeline and the final invoice; the source's promises need actual certificate and contract verification.", "Qualified site-safety and ventilation review required before attic access or declaring it dry/adequately ventilated; France/Québec legal and regional language review remains open."],
    },
    20: {
        "titleFrench": "Conduire une journée complète après une tempête",
        "objectiveFrench": "Intégrer briefing, constats, échanges avec l’expert et le client, arrêt météo et rapport de fin de journée, sans transformer le scénario en procédure approuvée.",
        "grammarFocusFrench": "Réemploi du passé composé, de l’imparfait, du conditionnel, de si + présent et du discours rapporté.",
        "speakingFrenchInstruction": "Vous dirigez une journée fictive de réparation après tempête. L’IA joue l’équipe, l’expert et le propriétaire. Présentez le plan de sécurité approuvé, distinguez constat et décision d’assurance, demandez une vérification qualifiée du support, réagissez au glissement, arrêtez le travail avant l’orage selon le plan et faites un rapport factuel. Ne promettez ni couverture, ni délai, ni bâchage dangereux.",
        "speakingFrenchOpening": "Bonjour à tous. Nous commençons par le briefing sécurité et les conditions de travail du jour.",
        "wordsFrench": ["le briefing sécurité", "toute l’équipe", "le plan du jour", "la priorité", "le toit endommagé", "la réparation d’urgence", "le rapport de l’expert", "le bois neuf", "le glissement", "la liste de vérification", "la météo instable", "le bilan de fin de journée", "le suivi", "la satisfaction du client", "La sécurité passe avant la vitesse.", "Vérifiez vos équipements selon le plan de protection contre les chutes.", "Nous avons trouvé du bois dégradé; le délai reste à évaluer.", "Kevin a glissé; nous arrêtons et vérifions sa sécurité.", "Si l’orage approche, tout le monde se replie selon le plan.", "Deux zones endommagées ont été traitées, selon le relevé.", "Monsieur, puis-je vous expliquer le plan envisagé ?", "Bon travail; demain, nous reprendrons si les conditions le permettent."],
        "readingFrench": [
            "À six heures, après la tempête nocturne, Rogelio a réuni l’équipe pour le briefing sécurité.",
            "Rogelio : « La sécurité passe avant la vitesse; vérifiez l’équipement et le plan de protection contre les chutes avant l’accès au toit. »",
            "Rogelio : « Le plan du jour prévoit d’évaluer le toit endommagé, de parler à l’expert et de vérifier les réparations possibles. »",
            "À huit heures trente, l’expert est arrivé; ils ont relevé des impacts dans deux zones d’essai, sans présumer du résultat de la réclamation.",
            "Le rapport de l’expert évoquait un remplacement du côté ouest et une réparation au nord, sous réserve de la décision applicable.",
            "Pendant la dépose, l’équipe a trouvé du bois dégradé près de la cheminée.",
            "Rogelio au propriétaire : « Puis-je vous expliquer le constat ? Une personne qualifiée doit évaluer le support et l’effet sur le délai. »",
            "Le propriétaire a examiné une proposition d’avenant; la réparation et l’autorisation devront être vérifiées avant les travaux.",
            "Vers treize heures, Kevin a glissé sur un bardeau humide; l’équipe a arrêté le travail et vérifié son état selon le protocole.",
            "Rogelio : « Kevin a glissé. Arrêtons et suivons le plan d’incident avant de reprendre. »",
            "Rogelio : « Nous devons examiner le système de protection avant toute conclusion sur ce qui a empêché la chute. »",
            "L’après-midi, la météo est redevenue instable; Rogelio a donné à la radio une consigne de repli selon le plan.",
            "Rogelio : « N’entreprenez une protection temporaire que si les conditions sont sûres et la méthode approuvée. »",
            "L’équipe a quitté la zone de travail; dix minutes plus tard, la pluie a commencé.",
            "Dans le rapport de fin de journée, Rogelio a distingué les zones traitées des réparations de support encore à confirmer.",
            "Il a aussi consigné le glissement sans blessure signalée et noté les travaux qui restaient ouverts.",
            "Puis il a envoyé au propriétaire un suivi factuel, car une communication claire fait partie du chantier.",
            "Rogelio à l’équipe : « Merci pour le travail; nous confirmerons demain la reprise selon les conditions. »"
        ],
        "verbsFrench": [["arrêter", "L’équipe a arrêté le travail après le glissement."], ["marcher sur", "Kevin a marché sur un bardeau humide."], ["réparer", "Deux zones endommagées ont été traitées selon le relevé."], ["accueillir", "L’équipe a accueilli l’expert à huit heures trente."], ["protéger", "Toute protection temporaire exige des conditions sûres et une méthode approuvée."]],
        "practiceFrench": {"see": "Repérez chaque interlocuteur et la décision qui lui revient.", "recall": "Reconstituez la chronologie sans transformer une hypothèse en constat.", "hear": "Écoutez les heures, les zones et l’ordre de repli.", "type": "Écrivez en français : Safety first, then speed.", "say": "Menez le briefing, le constat, le repli météo et le bilan sans promettre de résultat.", "write": "Rédigez un rapport fictif qui sépare observations, autorisations, incident et travaux ouverts."},
        "teachingNotesFrench": "Cette synthèse réutilise la grammaire du Master mais n’est pas une procédure de chantier. La source cumule plusieurs affirmations non vérifiées : comptage d’impacts, décision de l’assureur, ordre d’urgence, avenant signé, réparation du support, effet de la ligne de vie, bâchage avant orage, reprise le lendemain et satisfaction client. La version affichée demande les vérifications et autorisations compétentes.",
        "reviewGapsEnglish": ["Qualified roofing, fall-protection, weather, emergency-medical, structural, insurance and contract review required across the integrated scenario; the source's rescue, tarping, damage-scope and repair sequence must not be released as instructions.", "Qualified France/Québec register, unit and emergency routing review required; independent AI and human reviews remain open."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    previous = json.loads((CONTENT / "master-16-18-draft.json").read_text())
    draft = {k: v for k, v in previous.items() if k != "lessons"}
    draft["englishSourceSubsetSHA256"] = hashlib.sha256(source_bytes).hexdigest()
    draft["draftMethod"] = "manual source-aligned French draft; independent Fable/Opus and qualified human review pending"
    draft["lessons"] = []
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
        lesson["reading"] = {"titleFrench": authored["titleFrench"], "target": authored["readingFrench"], "native": original["readingEnglish"], "nativeDisplay": list(original["readingEnglish"])}
        lesson["verbs"] = [{**verb, "infinitiveFrench": infinitive, "exampleFrench": example} for verb, (infinitive, example) in zip(original["verbs"], authored["verbsFrench"])]
        replacements = {
            19: {
                3: "Rogelio: The final invoice describes the roof, underlayment and three deck sheets; let's verify the work actually completed.",
                5: "Rogelio: There is a product warranty and an installation warranty; each document states its own conditions.",
                6: "Rogelio: A leak caused by installation might fall under our warranty, depending on the certificate and an assessment of its cause.",
                7: "Rogelio: Read coverage and exclusions in the certificate; I cannot promise complete coverage.",
                8: "Rogelio: An antenna or solar panels can affect conditions; check the clauses before drawing a conclusion.",
                9: "Rogelio: Wear and storm damage follow the contract and insurance terms; the cause of a leak must be established.",
                10: "Rogelio: I'll check who must register the product warranty and send confirmation if applicable.",
                11: "Rogelio: Would you like us to examine the attic together if access is safe?",
                12: "In accessible areas they saw no moisture; checking ventilation properly would require appropriate measurements.",
                13: "Rogelio: If you see a leak, contact us promptly; your documents state the claim process and timing.",
                14: "Rogelio: For maintenance, follow the applicable plan and seek qualified inspection after a storm when needed.",
            },
            20: {
                1: "Rogelio: Safety before speed; check your equipment and fall-protection plan before roof access.",
                2: "Rogelio: Today's plan is to assess the damaged roof, speak with the adjuster and verify possible repairs.",
                3: "At 8:30 the adjuster arrived; they recorded hits in two test areas without presuming a claim outcome.",
                4: "The adjuster's report suggested west-side replacement and north-side repair, subject to the applicable decision.",
                6: "Rogelio to the owner: May I explain what we found? A qualified person must assess the deck and any schedule impact.",
                7: "The owner reviewed a proposed change order; the repair and authorization must be verified before work.",
                8: "At one, Kevin slipped on a wet shingle; the crew stopped and checked his condition under the site protocol.",
                9: "Rogelio: Kevin slipped. Stop and follow the incident plan before work resumes.",
                10: "Rogelio: We must examine the protective system before concluding what prevented a fall.",
                11: "In the afternoon unsettled weather returned; Rogelio gave a radio retreat command under the plan.",
                12: "Rogelio: Attempt temporary protection only if conditions are safe and the method approved.",
                14: "At the end-of-day report, Rogelio distinguished treated areas from deck repairs still to be confirmed.",
                15: "He also recorded the slip with no injury reported and noted work still open.",
                17: "Rogelio to the crew: Thanks for the work; we'll confirm tomorrow's restart under the conditions.",
            },
        }
        for index, display in replacements[n].items():
            lesson["reading"]["nativeDisplay"][index] = display
        if n == 19:
            lesson["words"][14]["enDisplay"] = "The warranty might cover a leak caused by installation, depending on the certificate."
            lesson["words"][15]["enDisplay"] = "If the certificate's conditions are met."
            lesson["words"][16]["enDisplay"] = "Unless an exclusion or another cause applies."
            lesson["words"][18]["enDisplay"] = "Would you like us to examine the attic together if access is safe?"
        if n == 20:
            for index, display in {
                15: "Check your equipment under the fall-protection plan.",
                16: "We found damaged wood; the schedule impact still needs assessment.",
                17: "Kevin slipped; stop and check his condition.",
                18: "If a storm approaches, everyone retreats under the plan.",
                19: "Two damaged sections were treated, according to the report.",
                21: "Good work, team; we'll resume tomorrow if conditions allow.",
            }.items():
                lesson["words"][index]["enDisplay"] = display
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
