#!/usr/bin/env python3
"""Build private French Roofing Master 4–6 from exact English source anchors."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-4-6.json"
OUTPUT = CONTENT / "master-4-6-draft.json"
SOURCE_FILES = ["src/data/master-roofing-curriculum.ts", "public/lesson-content/es/master-roofing.json"]

AUTHOR = {
    4: {
        "titleFrench": "Lire la fiche du fabricant avant la pose des solins",
        "objectiveFrench": "Repérer les exigences d’une fiche du fabricant et en expliquer les étapes à l’équipe avant la pose.",
        "grammarFocusFrench": "Avant de et après + infinitif passé; il faut + infinitif pour exprimer une obligation du document.",
        "speakingFrenchInstruction": "Vous dirigez une équipe prête à poser des solins selon ses habitudes. Demandez la fiche réelle du produit, lisez les exigences qui s’appliquent, faites confirmer le recouvrement et les fixations indiqués, puis demandez à l’équipe de reformuler avant la pose.",
        "speakingFrenchOpening": "Avant de poser le solin, ouvrons la fiche du produit : que prévoit-elle pour ce raccord ?",
        "wordsFrench": ["la fiche technique", "les instructions du fabricant", "le solin à gradins", "le manchon d’étanchéité du tuyau", "la fixation", "la spécification", "le recouvrement minimal", "le produit d’étanchéité", "le mur latéral", "le revêtement mural", "l’avertissement", "l’étape d’une procédure", "l’habitude", "la cheminée", "Avant de poser, il faut lire la fiche.", "C’est la fiche qui prévaut, pas l’habitude.", "Que dit la fiche sur le recouvrement ?", "Ne le faites pas de mémoire.", "C’est ce que demande le fabricant.", "Au fait, l’avez-vous déjà lue ?", "Pourriez-vous me laisser un instant, s’il vous plaît ?"],
        "readingFrench": [
            "Avant de poser le solin à gradins contre le mur latéral, Rogelio sort la fiche technique de la boîte.",
            "Rogelio : « Avant de poser, il faut lire la fiche, même si nous faisons ce travail depuis des années. »",
            "Rogelio : « C’est la fiche qui prévaut, pas l’habitude. »",
            "Rogelio lit à voix haute la première étape des instructions du fabricant.",
            "Première étape : avant de poser le solin, placez la sous-couche sur le platelage et faites-la remonter le long du mur selon la spécification.",
            "Deuxième étape : posez un solin à gradins par rang, avec le recouvrement minimal indiqué sur cette fiche.",
            "Troisième étape : fixez chaque pièce seulement au platelage, jamais au mur, avec la fixation spécifiée.",
            "Quatrième étape : après la pose, le revêtement mural doit recouvrir le solin; n’utilisez pas de mastic à sa place.",
            "Avertissement : si ces étapes ne sont pas suivies, le produit peut présenter une défaillance et le fabricant peut refuser de couvrir les dommages.",
            "Kevin : « Au fait, avez-vous déjà tout lu ? »",
            "Rogelio : « Oui, et tu dois le lire aussi; ne travaille pas de mémoire. »",
            "Rogelio : « Après chaque étape, vérifie que le matériau dans le camion correspond à celui de la fiche. »",
            "Rogelio : « Que dit la fiche sur le recouvrement ? »",
            "Kevin : « Elle indique son recouvrement minimal; la cheminée et le manchon du tuyau ont une autre rubrique. »",
            "La propriétaire demande quand ils commenceront, et Rogelio répond : « Pourriez-vous me laisser un instant, s’il vous plaît ? »",
            "Rogelio : « C’est ce que demande le fabricant; nous suivons sa fiche. »"
        ],
        "verbsFrench": [["lire", "Rogelio lit à voix haute la première étape des instructions du fabricant."], ["poser", "Avant de poser, il faut lire la fiche."], ["placer", "Rogelio place un solin à gradins à chaque rang."], ["fixer", "Fixez chaque pièce seulement au platelage."], ["suivre", "Si ces étapes ne sont pas suivies, le produit peut présenter une défaillance."]],
        "practiceFrench": {"see": "Repérez dans la fiche l’ordre, le recouvrement et les fixations indiqués.", "recall": "Retrouvez la phrase qui oppose la fiche à l’habitude.", "hear": "Écoutez la question sur le recouvrement et nommez la rubrique recherchée.", "type": "Écrivez en français : Before installing, you have to read the sheet.", "say": "Demandez oralement à l’équipe de reformuler une exigence de la fiche réelle.", "write": "Rédigez deux questions à vérifier avant et après la pose des solins."},
        "teachingNotesFrench": "Avant de + infinitif décrit une étape préalable; il faut signale une obligation. Les étapes 1–4 sont une fiche fictive du cours source, non les instructions d’un produit réel. Le recouvrement, la fixation, la garantie et le traitement du mur doivent être vérifiés sur le produit et le plan approuvé.",
        "reviewGapsEnglish": ["Qualified roofing/product review is required for all sample flashing steps, especially fasten-only-to-deck, underlayment rise, siding coverage, sealant substitution and the warranty claim.", "The fictional sheet must not be represented as an actual manufacturer specification; France/Québec terms for step flashing, pipe boot and siding require regional review."],
    },
    5: {
        "titleFrench": "Platelage abîmé : expliquer un avenant au propriétaire",
        "objectiveFrench": "Décrire un dommage découvert sous la couverture, proposer une évaluation de réparation et demander l’autorisation écrite prévue au contrat.",
        "grammarFocusFrench": "Imparfait pour l’état constaté, passé composé pour la découverte; conditionnel pour une proposition non approuvée.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe et votre partenaire joue le propriétaire. Décrivez ce qui a été constaté, montrez les photos, demandez une évaluation compétente de la structure et expliquez le coût et le délai proposés; vérifiez les conditions du contrat avant toute autorisation de travaux supplémentaires.",
        "speakingFrenchOpening": "Monsieur Ramírez, nous avons découvert du bois abîmé; puis-je vous montrer les photos et l’évaluation proposée ?",
        "wordsFrench": ["le platelage mou ou pourri", "le bois pourri", "l’avenant au contrat", "le devis", "le coût supplémentaire", "la feuille de contreplaqué", "la signature", "le contrat", "l’autorisation", "la photo des dommages", "la dépose", "le chevron", "le jour supplémentaire", "le propriétaire", "Quand nous avons retiré les bardeaux, nous avons trouvé du bois pourri.", "Le platelage était mou dans cette section.", "Je recommanderais de remplacer trois panneaux.", "Cela coûterait plus cher et prendrait un jour de plus.", "Puis-je vous montrer les photos ?", "J’ai besoin de votre signature sur l’avenant.", "Venez voir ceci."],
        "readingFrench": [
            "À neuf heures du matin, l’équipe a terminé la dépose du côté nord.",
            "Kevin avançait prudemment quand il a senti le platelage s’affaisser.",
            "Kevin : « Venez voir ceci. »",
            "Rogelio a examiné la zone avec un pied-de-biche : le bois était noir et humide, et un chevron était taché.",
            "Rogelio a photographié les dommages et marqué le bord avec de la peinture.",
            "Puis il est descendu parler au propriétaire, M. Ramírez.",
            "Rogelio : « Monsieur Ramírez, quand nous avons retiré les bardeaux, nous avons trouvé du bois pourri. »",
            "Rogelio : « Le platelage était mou ici, près de la cheminée; on aurait dit que l’eau s’infiltrait depuis des années. »",
            "Rogelio : « Puis-je vous montrer les photos ? »",
            "M. Ramírez : « Oui, s’il vous plaît. Ce n’était pas dans le devis ? »",
            "Rogelio : « Non, car personne ne pouvait le voir avant la dépose; c’est pour cela qu’il faut un avenant. »",
            "Rogelio : « Je recommanderais de remplacer trois panneaux de contreplaqué et de faire vérifier le chevron. »",
            "Rogelio : « Cela coûterait plus cher et prendrait un jour de plus; le coût supplémentaire est écrit ici, comme le prévoit le contrat. »",
            "Rogelio : « Nous ne pouvons pas recouvrir du bois pourri, car les nouvelles fixations risqueraient de mal tenir. »",
            "M. Ramírez : « D’accord, faites-le. »",
            "Rogelio : « Merci; j’ai besoin de votre signature sur l’avenant, car sans votre autorisation nous ne pouvons pas commencer la réparation. »"
        ],
        "verbsFrench": [["trouver", "Rogelio trouve du bois pourri près de la cheminée."], ["retirer", "Quand nous avons retiré les bardeaux, nous avons trouvé du bois pourri."], ["être", "Le platelage était mou dans cette section."], ["coûter", "Cela coûterait plus cher et prendrait un jour de plus."], ["recommander", "Je recommanderais de remplacer trois panneaux de contreplaqué."]],
        "practiceFrench": {"see": "Repérez ce qui a été constaté et ce qui reste une proposition.", "recall": "Retrouvez la demande de montrer les photos au propriétaire.", "hear": "Écoutez le coût et le délai proposés et dites s’ils sont confirmés.", "type": "Écrivez en français : The deck was soft in this section.", "say": "Expliquez oralement la découverte sans diagnostiquer la structure.", "write": "Rédigez une courte description du dommage et une demande d’évaluation ou d’autorisation."},
        "teachingNotesFrench": "L’imparfait décrit l’état du platelage; le passé composé situe la découverte. Le conditionnel indique une proposition, non une réparation validée. Le nombre de panneaux, l’état du chevron, le coût, le délai et la forme d’autorisation dépendent d’une évaluation compétente, du contrat et des règles locales.",
        "reviewGapsEnglish": ["Qualified structural/roofing review is required before diagnosing rafter condition, prescribing three plywood sheets or asserting nail-holding capacity from this scene.", "Qualified contract/consumer review is needed for change-order authorization, cost and signature claims; France/Québec legal and trade terms need regional review."],
    },
    6: {
        "titleFrench": "Livraison incomplète et produit de remplacement",
        "objectiveFrench": "Confirmer une rupture de stock, comparer une solution proposée avec le produit prévu et transmettre un plan conditionnel.",
        "grammarFocusFrench": "Futur simple et futur proche pour le calendrier; aussi… que et plus… que pour comparer sans supposer l’équivalence.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe et votre partenaire joue le fournisseur. Vérifiez ce qui manque, la date de livraison et la fiche du substitut; comparez seulement les caractéristiques documentées, puis demandez l’accord requis du client et du contrat avant de changer de produit.",
        "speakingFrenchOpening": "Quelle partie de la commande manque, et pouvez-vous envoyer la fiche du produit proposé ?",
        "wordsFrench": ["le fournisseur", "la commande", "la livraison", "le produit de remplacement", "la palette", "l’entrepôt", "en stock", "le retard", "la marque", "le bardeau architectural", "le bardeau à trois pattes", "la couleur", "la facture", "le prix", "La commande n’arrivera pas au complet.", "Quand arrivera le reste ?", "Nous allons utiliser une autre marque.", "Il est tout aussi durable, mais plus lourd.", "Cette couleur se rapproche davantage de l’originale.", "Je vais vous envoyer la photo de la couleur.", "Pouvez-vous me donner un coup de main ?"],
        "readingFrench": [
            "À sept heures, le fournisseur a appelé Rogelio avec une mauvaise nouvelle.",
            "Le fournisseur : « Désolé, la commande n’arrivera pas au complet, car cette couleur n’est pas en stock. »",
            "Rogelio : « Quand arrivera le reste ? »",
            "Le fournisseur : « L’usine annonce une arrivée à l’entrepôt jeudi, mais ce n’est pas certain. »",
            "Rogelio : « Ce serait quatre jours de retard, et le client souhaite finir plus tôt. »",
            "Le fournisseur : « J’ai le même type de bardeau architectural d’une autre marque, au même prix. »",
            "Le fournisseur : « Il est tout aussi durable, mais plus lourd, et sa couleur est très proche. »",
            "Rogelio : « Un bardeau architectural d’une autre marque pourrait convenir, mais je n’accepterai pas un bardeau à trois pattes : le contrat prévoit un bardeau architectural. »",
            "Rogelio : « Envoyez-moi la fiche technique; avant de décider, je parlerai au client. »",
            "Ensuite Rogelio a appelé la propriétaire, Mme Díaz.",
            "Rogelio : « Madame, le fournisseur propose un produit de remplacement dont la couleur se rapproche davantage de l’originale. »",
            "Rogelio : « Je vais vous envoyer la photo de la couleur; si vous l’approuvez, la livraison pourrait avoir lieu tôt demain. »",
            "Mme Díaz a accepté le changement par message, et Rogelio a demandé une nouvelle facture.",
            "Puis il a rassemblé l’équipe près du camion.",
            "Rogelio : « Nous allons utiliser une autre marque, et deux palettes arriveront demain. »",
            "Rogelio : « Aujourd’hui, nous terminerons la sous-couche et le larmier; demain, nous commencerons les bardeaux. »",
            "Rogelio : « Kevin, peux-tu me donner un coup de main avec ces rouleaux ? »"
        ],
        "verbsFrench": [["arriver", "La commande n’arrivera pas au complet."], ["envoyer", "Je vais vous envoyer la photo de la couleur."], ["utiliser", "Nous allons utiliser une autre marque."], ["approuver", "Si vous l’approuvez, la livraison pourrait avoir lieu tôt demain."], ["terminer", "Aujourd’hui, nous terminerons la sous-couche et le larmier."]],
        "practiceFrench": {"see": "Repérez les dates certaines et les dates encore annoncées comme incertaines.", "recall": "Retrouvez la demande de fiche technique avant la décision.", "hear": "Écoutez la comparaison du substitut et relevez les caractéristiques prétendues.", "type": "Écrivez en français : When will the rest arrive?", "say": "Demandez au fournisseur de documenter la compatibilité sans affirmer l’équivalence.", "write": "Rédigez un plan conditionnel au client avec la date, la fiche et l’accord requis."},
        "teachingNotesFrench": "Aussi… que établit une comparaison, mais ne prouve pas l’équivalence technique. La durabilité annoncée, le poids, la compatibilité, le prix et la couleur doivent être vérifiés sur les fiches et le contrat. Une approbation par texto peut ne pas suffire à modifier le contrat; faites confirmer la procédure applicable.",
        "reviewGapsEnglish": ["Qualified roofing/product review is required for unverified 'just as durable' and substitute-compatibility claims, weights, sequencing and early-delivery promises.", "Qualified contract/consumer review is required for text-message approval as a change authorization; France/Québec product and contract terminology need regional review."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    previous = json.loads((CONTENT / "master-1-3-draft.json").read_text())
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
        lesson["reading"] = {"titleFrench": authored["titleFrench"], "target": authored["readingFrench"], "native": original["readingEnglish"]}
        lesson["verbs"] = [{**verb, "infinitiveFrench": infinitive, "exampleFrench": example} for verb, (infinitive, example) in zip(original["verbs"], authored["verbsFrench"])]
        if n == 6:
            lesson["words"][17]["fr"] = "Le fournisseur affirme qu’il est tout aussi durable, mais plus lourd."
            lesson["words"][17]["enDisplay"] = "The supplier claims it's just as durable, but heavier."
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            lesson["reading"]["nativeDisplay"][7] = "Rogelio: Another brand's architectural shingle might work, but I won't accept three-tab shingle; the contract says architectural."
            lesson["reading"]["nativeDisplay"][11] = "Rogelio: I'll send you the color photo, and if you approve it, delivery might be early tomorrow."
            lesson["words"][17]["noteEnglish"] = "Unverified durability claim from the fictional supplier; qualified product comparison required before release."
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
