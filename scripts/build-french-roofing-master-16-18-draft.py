#!/usr/bin/env python3
"""Build private French Roofing Master 16–18 from pinned English source."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-16-18.json"
OUTPUT = CONTENT / "master-16-18-draft.json"

AUTHOR = {
    16: {
        "titleFrench": "Accueillir un inspecteur sur le chantier",
        "objectiveFrench": "Accueillir un inspecteur avec courtoisie, expliquer les procédures observées et demander une précision écrite sur toute correction.",
        "grammarFocusFrench": "Registre formel; tournures impersonnelles avec on et passif en être + participe pour décrire une procédure sans prétendre à la conformité.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe et l’IA joue un inspecteur municipal. Présentez le dossier disponible, décrivez les fixations et les solins d’après le plan et la notice du produit, demandez ce qui doit être corrigé et confirmez la procédure locale de nouvelle inspection. Ne déclarez pas le travail approuvé.",
        "speakingFrenchOpening": "Bonjour, voici le dossier du chantier. Que souhaitez-vous examiner en premier ?",
        "wordsFrench": ["l’inspecteur municipal", "le permis de construire", "la fiche d’inspection", "le code du bâtiment", "le contrôle", "l’observation de l’inspecteur", "l’avis de correction", "la nouvelle inspection", "la méthode de fixation", "le nombre de clous", "la ventilation des combles", "la conformité", "l’exigence", "l’approbation", "Bonjour, voici le permis.", "Préférez-vous examiner le toit ou les photos, selon les règles d’accès ?", "Ici, la fixation suit la notice du produit et le plan approuvé.", "Chaque rang est vérifié avant de poursuivre.", "Pourriez-vous préciser par écrit ce qui doit être corrigé ?", "Nous organiserons la correction selon le plan et la procédure locale.", "Prévenez-moi si vous voyez arriver l’inspecteur."],
        "readingFrench": [
            "À onze heures, M. Wong, inspecteur municipal dans cette scène fictive, est arrivé pendant la pose des bardeaux du côté sud.",
            "Rogelio est descendu du toit pour l’accueillir : « Bonjour, voici le permis. »",
            "Le permis et la fiche d’inspection étaient disponibles dans le dossier du chantier; leur affichage dépend des règles locales.",
            "L’inspecteur : « Merci, je viens examiner les fixations et les solins. »",
            "Rogelio : « Préférez-vous examiner le toit ou les photos, selon les règles d’accès au chantier ? »",
            "L’inspecteur : « Je voudrais voir la pose; quelle méthode de fixation utilisez-vous ici ? »",
            "Rogelio : « La fixation suit la notice du produit et le plan approuvé; nous vérifierons avec vous le nombre de clous prévu pour ce système. »",
            "Rogelio : « Chaque rang est vérifié avant de poursuivre, et la méthode est consignée dans le rapport du jour. »",
            "L’inspecteur a ensuite examiné la ventilation des combles et le solin de cheminée.",
            "L’inspecteur : « J’ai une observation à consigner; je ne peux pas encore confirmer la conformité. »",
            "L’inspecteur : « Près du mur du garage, je constate un manque de solin à gradins sur deux rangs. »",
            "Rogelio : « Pourriez-vous préciser par écrit ce qui doit être corrigé et la référence applicable ? »",
            "L’inspecteur a noté son observation; la méthode exacte de correction sera vérifiée avec le plan, le produit et l’autorité locale.",
            "Rogelio : « Nous organiserons la correction puis demanderons une nouvelle inspection selon la procédure locale. »",
            "L’inspecteur : « L’approbation dépendra de la vérification ultérieure. »",
            "Plus tard, Rogelio a dit à Kevin : « Préviens-moi quand l’inspecteur arrive. »"
        ],
        "verbsFrench": [["respecter", "La méthode doit respecter les exigences applicables."], ["corriger", "Nous organiserons la correction selon le plan."], ["préciser", "Pourriez-vous préciser ce qui doit être corrigé ?"], ["consigner", "La méthode est consignée dans le rapport du jour."], ["devoir", "La méthode exacte doit être vérifiée avant la reprise."]],
        "practiceFrench": {"see": "Repérez la demande de permis, le constat et la demande de précision.", "recall": "Retrouvez la phrase qui évite de déclarer la conformité acquise.", "hear": "Écoutez la demande formelle de correction et de référence.", "type": "Écrivez en français : Could you tell me what needs to be corrected?", "say": "Accueillez l’inspecteur sans promettre l’approbation ni une correction immédiate.", "write": "Rédigez un compte rendu factuel de l’observation et de la prochaine vérification."},
        "teachingNotesFrench": "On, est vérifié et doit être corrigé décrivent une procédure, pas une approbation. La source affirme que le permis est affiché comme la ville l’exige, que le nombre de clous varie selon pente/vent et que chaque rang reçoit un solin; ces détails nécessitent vérification du code local, du système et de la notice. L’accès au toit de l’inspecteur suit le plan de sécurité.",
        "reviewGapsEnglish": ["Qualified local building-code/inspector, roofing-product and fall-safety review required for permit display, inspector roof access, fastening count, ventilation, step flashing, correction notice and re-inspection process.", "Qualified France/Québec regional terminology review needed; a fictional city approval cannot be generalized to another jurisdiction."],
    },
    17: {
        "titleFrench": "Rédiger le rapport quotidien et documenter une réparation",
        "objectiveFrench": "Rédiger un rapport lisible avec heures, travaux, matériaux, photos et points ouverts, en distinguant mesures vérifiées et valeurs d’exemple.",
        "grammarFocusFrench": "Registre écrit et connecteurs de rapport : de plus, également, par conséquent; accord du participe dans les formulations passives.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe et l’IA reçoit votre rapport de fin de journée. Donnez les heures, surfaces mesurées, réparation du support, matériaux et points ouverts, en vérifiant les chiffres et les autorisations. N’annoncez pas un horaire de lendemain non confirmé.",
        "speakingFrenchOpening": "Je vous transmets le rapport du jour; je vais d’abord confirmer les heures et les quantités.",
        "wordsFrench": ["le rapport quotidien", "le résumé", "l’adresse", "les heures travaillées", "le carré de toiture (unité américaine)", "la réparation du support", "le panneau remplacé", "les matériaux utilisés", "le rouleau de sous-couche", "les points ouverts", "les photos justificatives", "de plus", "également", "par conséquent", "Quatorze carrés ont été réalisés sur le côté est, selon le relevé.", "Trois panneaux du support dégradé ont été remplacés, selon le rapport.", "La membrane a également été posée dans la noue.", "La finition du faîtage ouest reste à faire.", "Les photos avant et après sont jointes.", "Je termine le rapport et reste disponible pour toute question.", "Envoie-moi les photos du contreplaqué, s’il te plaît."],
        "readingFrench": [
            "En fin de journée, Rogelio s’est assis dans la camionnette pour rédiger le rapport quotidien.",
            "Il a d’abord écrit à Kevin : « Envoie-moi les photos du contreplaqué, s’il te plaît. »",
            "Puis il a adopté un ton plus formel pour le rapport.",
            "Rapport quotidien du 14 octobre; adresse fictive : 418, rue Pine, maison Ortega.",
            "Heures déclarées : de 7 h à 15 h 30, avec une équipe de cinq personnes; à vérifier sur la feuille de temps.",
            "Résumé : selon le relevé, quatorze carrés ont été réalisés du côté est; de plus, la noue principale a été traitée.",
            "Pendant la dépose, l’équipe a constaté du bois dégradé près de la fenêtre de toit.",
            "Selon le dossier, trois panneaux ont été remplacés; la validité de l’avenant et de l’autorisation doit être vérifiée.",
            "La membrane a également été posée dans la noue et autour de la fenêtre de toit, selon le relevé.",
            "Les photos avant et après de chaque réparation sont jointes au dossier.",
            "Matériaux consignés : quinze paquets de bardeaux, trois rouleaux de sous-couche et trois panneaux de contreplaqué; contrôler les quantités.",
            "Points ouverts : la finition du faîtage ouest et le nettoyage de la gouttière restent à faire.",
            "De la pluie est prévue demain après-midi; l’horaire du lendemain reste à confirmer selon les conditions.",
            "Je termine le rapport et reste disponible pour toute question.",
            "Rogelio Mendoza, chef d’équipe.",
            "Avant l’envoi, Rogelio a relu le rapport et corrigé deux chiffres."
        ],
        "verbsFrench": [["réaliser", "Selon le relevé, quatorze carrés ont été réalisés du côté est."], ["remplacer", "Trois panneaux du support dégradé ont été remplacés."], ["joindre", "Les photos avant et après sont jointes."], ["envoyer", "Avant l’envoi, Rogelio a relu le rapport."], ["rester", "Le nettoyage de la gouttière reste à faire."]],
        "practiceFrench": {"see": "Repérez chiffres, photos et points ouverts.", "recall": "Rappelez les trois connecteurs de rapport.", "hear": "Écoutez les quantités puis indiquez celles qui doivent être confirmées.", "type": "Écrivez en français : Before and after photos are attached.", "say": "Présentez le rapport oral en séparant mesure, estimation et point à confirmer.", "write": "Rédigez un rapport de chantier fictif sans transformer les chiffres de l’exemple en factures réelles."},
        "teachingNotesFrench": "Les chiffres, l’adresse et le nom sont fictifs. Le carré de toiture est une unité américaine qui exige une explication et une conversion adaptée au marché. Les réparations du support, photos, avenants et quantités ne valent pas autorisation ni preuve de conformité. L’horaire de demain dépend de la météo et de l’approbation du responsable.",
        "reviewGapsEnglish": ["Qualified roofing/structural and contract review required for rotten-deck repair, signed change order, material quantities, square-unit conversion and proof/document retention.", "Qualified labor/privacy and regional-language review needed for hours, photos, address and report conventions; source's automatic 6:30 restart is not confirmed."],
    },
    18: {
        "titleFrench": "Messages et appels au client : modifier un rendez-vous",
        "objectiveFrench": "Prévenir d’un retard dû à la pluie, proposer un nouveau créneau et confirmer seulement après accord explicite du client.",
        "grammarFocusFrench": "Conditionnel de politesse : serait-il possible, pourrions-nous; conventions de message et d’appel.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe et l’IA joue un propriétaire qui rappelle après votre message. Présentez-vous, expliquez le retard, proposez un créneau sous réserve de météo et de disponibilité, vérifiez l’accord et résumez ce qui reste à confirmer, notamment la livraison des matériaux.",
        "speakingFrenchOpening": "Bonjour, Rogelio de Mendoza Roofing à l’appareil. Est-ce que je parle bien à M. Kim ?",
        "wordsFrench": ["le message texte", "l’appel téléphonique", "le message vocal", "le numéro de téléphone", "le retard dû à la pluie", "le changement de date", "la nouvelle date", "la disponibilité", "le rendez-vous", "l’heure d’arrivée", "la confirmation", "le désagrément", "l’entrée de garage", "le préavis", "Bonjour, Rogelio de Mendoza Roofing à l’appareil.", "Serait-il possible de commencer jeudi ?", "Nous pourrions arriver vers huit heures si cela vous convient.", "Dans l’attente de votre réponse.", "À qui ai-je le plaisir de parler ?", "Excusez-moi, la communication a été coupée.", "Je vous laisse mon numéro au cas où."],
        "readingFrench": [
            "Mardi, il a plu toute la journée; l’équipe n’a pas pu commencer chez Mme Kim.",
            "À dix-sept heures, Rogelio lui a envoyé un message texte.",
            "Message : « Bonjour, Rogelio de Mendoza Roofing à l’appareil. »",
            "Message : « À cause de la pluie, nous ne pourrons pas commencer demain; serait-il possible de reporter à jeudi ? »",
            "Message : « Nous pourrions arriver vers huit heures si cela vous convient; la livraison des matériaux reste à confirmer. »",
            "Message : « Nous sommes désolés du désagrément et attendons votre réponse. »",
            "Une heure plus tard, le téléphone a sonné; Rogelio ne connaissait pas le numéro.",
            "Rogelio : « Mendoza Roofing, bonjour; à qui ai-je le plaisir de parler ? »",
            "M. Kim : « Daniel Kim, son mari. J’ai vu le message, mais jeudi nous serons absents. »",
            "Rogelio : « Je comprends. Seriez-vous disponibles vendredi, sous réserve de la météo ? »",
            "M. Kim : « Vendredi pourrait convenir, mais je vous entends mal. »",
            "La communication a été coupée; Rogelio a rappelé et est tombé sur la messagerie vocale.",
            "Rogelio, sur la messagerie : « Excusez-moi, la communication a été coupée; vendredi vers huit heures est une proposition, à confirmer ensemble. »",
            "Rogelio : « Je vous laisse mon numéro et je vous enverrai le récapitulatif par message. »",
            "Le soir, Rogelio a écrit : « Je propose vendredi à 8 h; merci de confirmer. Je vous préviendrai si l’horaire ou la livraison change. »",
            "M. Kim a répondu : « Vendredi à huit heures me convient, si la météo le permet. »"
        ],
        "verbsFrench": [["sonner", "Une heure plus tard, le téléphone a sonné."], ["entendre", "Excusez-moi, je vous entends mal."], ["couper", "La communication a été coupée."], ["confirmer", "Merci de confirmer le changement de date."], ["répondre", "M. Kim a répondu au message."]],
        "practiceFrench": {"see": "Repérez proposition, réponse et confirmation.", "recall": "Retrouvez la demande explicite de confirmation.", "hear": "Écoutez jeudi, vendredi et huit heures; identifiez le créneau accepté.", "type": "Écrivez en français : Would it be possible to start on Thursday?", "say": "Rappelez le client et clarifiez un horaire sous réserve de météo.", "write": "Rédigez un message de suivi qui confirme l’accord sans promettre une livraison non vérifiée."},
        "teachingNotesFrench": "Serait-il possible et pourrions-nous proposent sans imposer. Le texte source affirme une livraison mercredi et laisse sur la messagerie un nouveau créneau comme décidé avant l’accord du client; la version affichée distingue proposition, réponse et confirmation. Coordonnées, accès à l’entrée et horaires réels demandent validation selon le contrat et la disponibilité.",
        "reviewGapsEnglish": ["Qualified consumer-contract and operations review required for rain-delay notice, material delivery into a driveway, schedule promises, voicemail consent/authority and who may confirm an appointment.", "Qualified France/Québec language review required for phone and text register and local date/time conventions; privacy review needed for customer contact details."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    previous = json.loads((CONTENT / "master-13-15-draft.json").read_text())
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
            16: {
                2: "The permit and inspection card were available in the job file; posting requirements depend on local rules.",
                4: "Rogelio: Would you rather examine the roof or the photos, under the site's access rules?",
                6: "Rogelio: Fastening follows the product instructions and approved plan; we'll verify the required nail count for this system with you.",
                9: "Inspector: I have an observation to record; I cannot confirm compliance yet.",
                12: "The inspector recorded an observation; the exact correction method will be checked against the plan, product and local authority.",
                13: "Rogelio: We'll arrange the correction and request re-inspection under the local process.",
                14: "Inspector: Approval depends on the later verification.",
            },
            17: {
                3: "Daily report for October 14; fictional address: 418 Pine Street, Ortega house.",
                4: "Reported hours: 7:00 a.m. to 3:30 p.m., crew of five; verify against the time sheet.",
                5: "Summary: according to the measurement, 14 squares were completed on the east side; the main valley was also treated.",
                7: "According to the file, three sheets were replaced; verify that the change order and authorization are valid.",
                9: "Before-and-after photos of each repair are attached to the file.",
                10: "Recorded materials: 15 bundles of shingles, three rolls of underlayment and three plywood sheets; check the quantities.",
                12: "Rain is expected tomorrow afternoon; tomorrow's schedule remains to be confirmed under the conditions.",
                13: "I have finished the report and remain available for questions.",
            },
            18: {
                4: "Message: We could arrive around eight if that works for you; material delivery remains to be confirmed.",
                9: "Rogelio: I understand. Would you be available Friday, weather permitting?",
                12: "Rogelio on voicemail: Sorry, the call dropped; Friday around eight is a proposal for us to confirm together.",
                14: "That night Rogelio wrote: I propose Friday at 8:00 a.m.; please confirm. I'll let you know if the time or delivery changes.",
                15: "Mr. Kim replied: Friday at eight works for me, weather permitting.",
            },
        }
        for index, display in replacements[n].items():
            lesson["reading"]["nativeDisplay"][index] = display
        if n == 16:
            lesson["words"][15]["enDisplay"] = "Would you rather examine the roof or photos, under the site's access rules?"
            lesson["words"][16]["enDisplay"] = "Fastening here follows the product instructions and approved plan."
            lesson["words"][19]["enDisplay"] = "We'll arrange the correction under the plan and local process."
        if n == 17:
            lesson["words"][14]["enDisplay"] = "According to the measurement, 14 squares were completed on the east side."
            lesson["words"][15]["enDisplay"] = "According to the report, three sheets of damaged deck were replaced."
            lesson["words"][19]["enDisplay"] = "I have finished the report and remain available for questions."
        if n == 18:
            lesson["words"][16]["enDisplay"] = "We could arrive around eight if that works for you."
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
