#!/usr/bin/env python3
"""Build private French Roofing Master 7–9 from exact English source anchors."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-7-9.json"
OUTPUT = CONTENT / "master-7-9-draft.json"

AUTHOR = {
    7: {
        "titleFrench": "Constater des dommages de grêle avec un expert d’assurance",
        "objectiveFrench": "Décrire une tempête, relever des impacts et des mesures, puis clarifier la portée proposée avec l’expert.",
        "grammarFocusFrench": "Passé composé pour raconter les faits; nombres, unités et demande de répétition pour confirmer les mesures.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe et votre partenaire est l’expert d’assurance. Décrivez les constats et les mesures, demandez-lui de répéter les chiffres et faites préciser par écrit la portée proposée; ne présentez pas le carré d’essai comme une règle de couverture universelle.",
        "speakingFrenchOpening": "Reprenons les mesures ensemble : combien d’impacts comptez-vous sur ce versant ?",
        "wordsFrench": ["l’expert d’assurance", "la compagnie d’assurance", "la grêle", "l’impact", "le carré d’essai", "la réclamation", "l’orage", "le granule", "la bosse", "la gouttière", "le versant du toit", "la portée des travaux", "le cercle à la craie", "le pied carré", "L’orage est passé mardi soir.", "Nous avons compté douze impacts dans ce carré.", "Ici, le bardeau a perdu des granules.", "Marquez chaque impact à la craie.", "Combien d’impacts comptez-vous ?", "Pouvez-vous répéter plus lentement ?", "Êtes-vous d’accord avec la portée des travaux ?"],
        "readingFrench": [
            "L’orage est passé mardi soir et la grêle est tombée pendant environ quinze minutes.",
            "Jeudi, l’expert de la compagnie d’assurance est arrivé à dix heures pour examiner la réclamation de la famille Ortiz.",
            "Rogelio et Kevin sont montés avec lui, munis du mètre ruban et de la craie.",
            "Ils ont d’abord examiné la gouttière et trouvé des bosses sur tout le côté ouest.",
            "Sur le versant ouest, ils ont marqué un carré d’essai de dix pieds sur dix.",
            "Rogelio : « Kevin, marque chaque impact à la craie, s’il te plaît. »",
            "Kevin a tracé un cercle de craie autour de chaque impact.",
            "Rogelio : « Nous avons compté douze impacts dans ce carré; ici, le bardeau a perdu des granules. »",
            "L’expert : « Combien d’impacts comptez-vous du côté nord ? »",
            "Rogelio : « Du côté nord, nous n’en avons compté que trois, car le vent venait de l’ouest. »",
            "L’expert a parlé vite et donné plusieurs mesures en pieds carrés.",
            "Rogelio : « Pardon, pouvez-vous répéter plus lentement ? »",
            "L’expert : « Bien sûr : le côté ouest mesure mille deux cents pieds carrés et le côté nord, huit cents. »",
            "L’expert : « Selon la compagnie d’assurance, le côté ouest sera remplacé entièrement et le côté nord sera réparé. »",
            "Rogelio : « Êtes-vous d’accord avec la portée des travaux, y compris la gouttière ? »",
            "L’expert : « Oui, je vais le noter dans le rapport; la compagnie enverra une copie au propriétaire. »"
        ],
        "verbsFrench": [["passer", "L’orage est passé mardi soir."], ["tomber", "La grêle est tombée pendant environ quinze minutes."], ["compter", "Nous avons compté douze impacts dans ce carré."], ["marquer", "Ils ont marqué un carré d’essai de dix pieds sur dix."], ["mesurer", "Le côté ouest mesure mille deux cents pieds carrés."]],
        "practiceFrench": {"see": "Repérez dans le rapport oral les impacts et surfaces mesurés.", "recall": "Retrouvez la demande de répétition des chiffres.", "hear": "Écoutez douze, trois, mille deux cents et huit cents; associez-les aux zones citées.", "type": "Écrivez en français : How many hits do you count?", "say": "Décrivez oralement les constats sans promettre une décision de l’assureur.", "write": "Rédigez un résumé des mesures et une demande de confirmation écrite de la portée."},
        "teachingNotesFrench": "Le passé composé situe la tempête et les constats. Les nombres et unités du récit sont fictifs; le carré d’essai, les critères de dommage et la portée d’assurance varient selon le contrat, le produit et l’expert. Distinguez un constat d’une décision de couverture.",
        "reviewGapsEnglish": ["Qualified roofing/insurance review is required for hail-hit counting, the 10-by-10-foot test square, damage attribution, replacement-versus-repair and promised claim scope.", "Roof access with an adjuster and unit conversion require site-safety and France/Québec regional review; no insurer approval is established by this fictional dialogue."],
    },
    8: {
        "titleFrench": "Refuser une demande dangereuse du propriétaire",
        "objectiveFrench": "Refuser poliment et fermement une demande dangereuse, puis proposer une suite conforme au plan de sécurité.",
        "grammarFocusFrench": "Négation et conditionnel pour refuser avec tact : je ne recommande pas de; ce ne serait pas possible; nous pourrions.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe et le propriétaire veut accélérer le chantier malgré l’orage et supprimer une couche prévue au système. Refusez, expliquez le risque, arrêtez l’accès et indiquez que toute protection temporaire doit attendre des conditions sûres et suivre le plan approuvé.",
        "speakingFrenchOpening": "Je comprends l’urgence, mais nous devons arrêter le travail et suivre le plan météo du chantier.",
        "wordsFrench": ["la foudre", "le tonnerre", "l’orage", "la décharge due à la foudre", "la surface mouillée", "le raccourci", "le risque", "la règle de sécurité", "la responsabilité", "l’économie", "la garantie du fabricant", "la solution de rechange", "l’urgence", "la décision", "Je ne recommande pas de travailler quand il y a de la foudre.", "Nous ne pouvons pas omettre la sous-couche prévue.", "Je comprends votre urgence, mais je ne peux pas le faire.", "Malheureusement, nous ne pouvons pas faire cela.", "Nous pourrions protéger le toit avec une bâche quand le plan et les conditions le permettent.", "Ne montez pas avant mon autorisation.", "Ne prenez pas de risques pour qui que ce soit."],
        "readingFrench": [
            "Il était quatorze heures et on entendait le tonnerre au loin, vers l’ouest.",
            "Mme Flores est sortie de la maison à la hâte pour parler à Rogelio.",
            "Mme Flores : « Mes enfants arrivent samedi; je voudrais que vous continuiez même s’il pleut. »",
            "Mme Flores : « Et pour économiser, posez les bardeaux sans la sous-couche. »",
            "Rogelio : « Je comprends votre urgence, mais je ne peux pas le faire. »",
            "Rogelio : « Avec la foudre, le toit présente un danger; je ne recommande pas de travailler pendant l’orage ni sur une surface mouillée. »",
            "Rogelio : « La foudre peut tuer, et je n’accepterai pas ce risque. »",
            "Rogelio : « Quant à la sous-couche, malheureusement, nous ne pouvons pas l’omettre. »",
            "Rogelio : « Nous ne pouvons pas supprimer la sous-couche prévue; vérifions les exigences du système et de la garantie. »",
            "Rogelio : « Ce raccourci semble économique aujourd’hui, mais pourrait entraîner une fuite et des coûts plus élevés. »",
            "Rogelio : « Une protection temporaire par bâche pourrait être envisagée seulement quand les conditions sont sûres et selon le plan approuvé. »",
            "Rogelio : « Nous pourrions alors terminer vendredi si la météo et les contrôles le permettent, sans le promettre. »",
            "Mme Flores y a réfléchi un moment et a accepté la solution de rechange.",
            "Rogelio dit à l’équipe : « Ne montez pas avant mon autorisation et ne laissez pas d’outils métalliques sur le toit. »",
            "Rogelio : « J’assume cette décision et la responsabilité de la communiquer. »",
            "Rogelio : « Kevin, ne prends de risques pour personne; la règle de sécurité vaut pour tous. »"
        ],
        "verbsFrench": [["travailler", "Je ne recommande pas de travailler quand il y a de la foudre."], ["monter", "Ne montez pas avant mon autorisation."], ["laisser", "Ne laissez pas d’outils métalliques sur le toit."], ["omettre", "Ici, nous n’omettons pas la sous-couche prévue."], ["pouvoir", "Nous pourrions protéger le toit avec une bâche quand le plan et les conditions le permettent."]],
        "practiceFrench": {"see": "Repérez la demande dangereuse et le refus formulé avec tact.", "recall": "Retrouvez la phrase qui interdit la montée sur le toit.", "hear": "Écoutez le refus et indiquez la solution de rechange conditionnelle.", "type": "Écrivez en français : I understand your hurry, but I can't do it.", "say": "Refusez oralement une reprise pendant l’orage et proposez de consulter le plan.", "write": "Rédigez une réponse courte au propriétaire qui ne promet ni bâchage immédiat ni date certaine."},
        "teachingNotesFrench": "Le conditionnel permet de proposer sans garantir. La source anglaise affirme une exigence de garantie et prévoit le bâchage dès la fin de l’orage, puis promet une date; ces points exigent un contrôle du produit, du contrat, des conditions météo et du plan du chantier avant publication. La sécurité ne dépend pas de l’impatience du client.",
        "reviewGapsEnglish": ["Qualified site-safety review is required for lightning stop-work, reentry timing, metal tools and temporary tarping; the English storm-to-tarp and Friday promises are unsafe/unsupported as universal instructions.", "Qualified roofing/product and consumer-contract review is required for the underlayment-warranty claim and date promise; France/Québec regional language review remains open."],
    },
    9: {
        "titleFrench": "Donner un retour privé sur un rang mal aligné",
        "objectiveFrench": "Parler en privé d’un rang de bardeaux mal aligné, demander ce qui s’est passé et convenir d’une correction selon le produit.",
        "grammarFocusFrench": "Je voudrais que + subjonctif pour une demande; il vaut mieux + infinitif pour une recommandation prudente.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe. Parlez en privé au collègue, demandez ce qu’il a remarqué, indiquez l’écart observé et demandez de vérifier la méthode et le motif du fabricant avant toute reprise; évitez de fixer une mesure ou une dépose universelle.",
        "speakingFrenchOpening": "Julio, pouvons-nous regarder ce rang ensemble, en privé ? Je voudrais comprendre ce qui s’est passé.",
        "wordsFrench": ["le rang de bardeaux mal aligné", "le pureau visible", "l’irrégularité", "la mesure", "le mètre ruban", "l’erreur", "la correction", "le retour d’information", "en privé", "la qualité", "l’alignement", "la confiance", "le rythme", "l’ouvrier", "Je voudrais que tu regardes ce rang avec moi.", "Ce n’est pas pour te gronder.", "Que s’est-il passé ici, à ton avis ?", "Il vaut mieux corriger cela maintenant.", "Je te demande de mesurer tous les trois rangs.", "Je préférerais que tu me demandes d’abord.", "Je vous demande de vérifier le pureau visible."],
        "readingFrench": [
            "L’après-midi, Rogelio a remarqué qu’un rang mal aligné montait vers la gauche du côté où travaillait Julio.",
            "Julio travaillait vite, mais le pureau visible changeait d’un bardeau à l’autre.",
            "Rogelio n’a rien dit devant l’équipe et l’a appelé à l’écart.",
            "Rogelio : « Julio, je voudrais que tu regardes ce rang avec moi, en privé. »",
            "Rogelio : « Ce n’est pas pour te gronder; ton rythme est bon et j’ai confiance en toi. »",
            "Rogelio : « Que s’est-il passé ici, à ton avis ? »",
            "Julio : « Je crois que je n’ai pas mesuré depuis la dernière ligne et que j’ai travaillé à l’œil. »",
            "Rogelio : « Cela arrive, mais cette irrégularité est visible depuis la rue. »",
            "Rogelio : « Il vaut mieux corriger cela maintenant, avant que le rang ne monte davantage. »",
            "Rogelio : « Je te demande de mesurer tous les trois rangs avec le mètre et de marquer la mesure sur le bardeau. »",
            "Rogelio : « Si tu n’es pas sûr de l’alignement, je préférerais que tu me demandes d’abord. »",
            "Julio : « D’accord, je vais déposer ces quatre rangs et les reposer. »",
            "Rogelio : « Merci; corriger fait partie du travail, et la qualité concerne toute l’équipe. »",
            "Plus tard, le responsable de l’entreprise, M. Soto, est arrivé et a vu les bardeaux au sol.",
            "Rogelio : « Monsieur Soto, je vous demande de vérifier le pureau avec moi; nous corrigeons déjà un rang. »",
            "Pour Rogelio, un retour utile est clair, donné en privé et accompagné d’une solution comprise par l’ouvrier."
        ],
        "verbsFrench": [["regarder", "Je voudrais que tu regardes ce rang avec moi."], ["corriger", "Il vaut mieux corriger cela maintenant."], ["demander", "Je te demande de mesurer tous les trois rangs."], ["poser une question", "Si tu n’es pas sûr, pose-moi d’abord une question."], ["préférer", "Je préférerais que tu me demandes d’abord."]],
        "practiceFrench": {"see": "Repérez l’observation, la question et la correction proposée.", "recall": "Retrouvez la phrase qui précise que le retour n’est pas une réprimande.", "hear": "Écoutez la demande de mesure et indiquez qu’elle doit être vérifiée avec le produit.", "type": "Écrivez en français : What happened here, in your view?", "say": "Donnez en privé un retour précis et respectueux sans imposer une réparation non vérifiée.", "write": "Rédigez une observation, une question et une prochaine vérification."},
        "teachingNotesFrench": "Je voudrais que appelle le subjonctif; il vaut mieux + infinitif exprime une recommandation. Le contrôle tous les trois rangs et la dépose de quatre rangs viennent de la scène source; ils ne constituent pas une règle de produit ou une méthode de reprise validée.",
        "reviewGapsEnglish": ["Qualified roofing/product review is required for the every-three-course measurement, four-course removal, exposure tolerance and correction method before release.", "Qualified French regional review is needed for pureau and crew-feedback register; the Spanish subjunctive source focus is adapted to French syntax, not copied as a rule."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    previous = json.loads((CONTENT / "master-4-6-draft.json").read_text())
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
        if n == 8:
            lesson["words"][18]["enDisplay"] = "What we could do is cover the roof with a tarp when the plan and conditions allow safe work."
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            for index, display in {
                5: "Rogelio: With lightning, the roof presents a hazard, and I don't recommend working during the storm or on a wet surface.",
                8: "Rogelio: We cannot skip the planned underlayment; let's check this system's and warranty's requirements.",
                9: "Rogelio: That shortcut looks like savings today, but it could cause a leak and higher costs later.",
                10: "Rogelio: Temporary tarping could be considered only when conditions are safe and under the approved plan.",
                11: "Rogelio: We might then finish on Friday if weather and checks allow, but I can't promise that date.",
                14: "Rogelio: I own the decision and the responsibility to communicate it.",
            }.items():
                lesson["reading"]["nativeDisplay"][index] = display
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
