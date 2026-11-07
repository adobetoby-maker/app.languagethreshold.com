#!/usr/bin/env python3
"""Build private French Roofing Master 10–12 with pinned English provenance."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-10-12.json"
OUTPUT = CONTENT / "master-10-12-draft.json"

AUTHOR = {
    10: {
        "titleFrench": "Régler un désaccord entre deux membres de l’équipe",
        "objectiveFrench": "Écouter les deux versions d’un conflit, rapporter les propos de chacun et répartir clairement les responsabilités.",
        "grammarFocusFrench": "Discours rapporté avec il a dit que; imparfait pour la situation de fond.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe. Écoutez séparément Julio et Marcos, reformulez leurs propos sans désigner un coupable, puis convenez des responsabilités et d’une vérification de la protection temporaire conforme au plan du chantier.",
        "speakingFrenchOpening": "Je vais écouter chacun à son tour. Marcos, explique-moi ce que tu as constaté.",
        "wordsFrench": ["la bâche mal fixée", "la dispute", "le malentendu", "la version des faits", "la faute", "le quart de travail", "la tâche", "le respect", "l’accord", "la règle", "le témoin", "la plainte", "l’attache", "la personne responsable", "Il a dit que la bâche ne relevait pas de lui.", "Il m’a expliqué qu’il faisait déjà sombre.", "Un à la fois, s’il vous plaît.", "D’accord, raconte-moi ta version.", "Calmons-nous tous les deux.", "Ici, nous cherchons une solution plutôt qu’un coupable.", "Avec tout le respect que je vous dois, les faits étaient différents."],
        "readingFrench": [
            "Lundi matin, un coin du grenier de la maison Martínez était humide.",
            "La veille au soir, il pleuvait fort et la bâche mal fixée s’était soulevée dans le vent.",
            "Quand Rogelio est arrivé, Julio et Marcos se disputaient vivement près du camion.",
            "Rogelio : « Calmons-nous tous les deux; un à la fois, s’il vous plaît. »",
            "Rogelio : « Marcos, d’accord, raconte-moi ta version. »",
            "Marcos a dit que la bâche ne relevait pas de lui parce qu’il travaillait au garage ce jour-là.",
            "Puis Julio a dit qu’il faisait déjà sombre, qu’il n’y avait pas d’attaches dans le camion et qu’il avait posé des pierres sur le bord.",
            "Rogelio a écouté les deux sans les interrompre, puis il a parlé à Kevin, qui avait été témoin.",
            "Kevin a dit qu’en fin de journée tout le monde était fatigué et que personne n’avait vérifié la bâche.",
            "Plus tard, Rogelio a appelé son responsable : « Julio m’a expliqué qu’il faisait déjà sombre; Marcos a dit que ce n’était pas sa tâche. »",
            "Le responsable : « Qui était chargé de vérifier la bâche ? »",
            "Rogelio : « Avec tout le respect que je vous dois, la responsabilité n’était pas clairement attribuée. »",
            "Rogelio a réuni l’équipe : « Nous cherchons une solution, pas un coupable; une accusation ne répare rien. »",
            "Rogelio : « Désormais, désignons une personne qui vérifie les attaches selon le plan et m’envoie une photo avant le départ. »",
            "Rogelio : « Julio, demain tu vérifies le côté nord; Marcos, tu vérifies le côté sud, si l’accès est sûr. »",
            "Finalement, les deux ont trouvé un accord et les plaintes ont cessé."
        ],
        "verbsFrench": [["dire", "Kevin dit que personne n’a vérifié la bâche."], ["écouter", "Rogelio a écouté les deux sans les interrompre."], ["interrompre", "Un à la fois; ne m’interrompez pas, s’il vous plaît."], ["réunir", "Rogelio a réuni l’équipe."], ["attribuer", "Rogelio attribue une zone du toit à chacun, selon le plan."]],
        "practiceFrench": {"see": "Repérez les deux versions et la tâche non attribuée.", "recall": "Rapportez ce que Marcos et Julio ont dit avec il a dit que.", "hear": "Écoutez les propos de chaque membre et identifiez le témoin.", "type": "Écrivez en français : He said the tarp wasn't his job.", "say": "Arbitrez sans blâmer; attribuez une vérification selon le plan.", "write": "Rédigez une consigne qui identifie le responsable sans improviser une méthode de fixation."},
        "teachingNotesFrench": "L’imparfait décrit la pluie et le conflit en cours; le passé composé rapporte les paroles et les décisions. La fixation d’une bâche, son contrôle et l’accès au toit doivent suivre le plan de sécurité du chantier, et non une règle inventée pendant le dialogue.",
        "reviewGapsEnglish": ["Qualified roofing/site-safety review required for tarp tie-down method, photo verification, access and assignment of responsibility; rocks on a tarp are depicted as a failed improvisation, not endorsed.", "Qualified HR/local-language review required for conflict-resolution register and duties."],
    },
    11: {
        "titleFrench": "Soutenir l’équipe pendant une semaine de forte chaleur",
        "objectiveFrench": "Reconnaître la fatigue de l’équipe, expliquer le plan de prévention de la chaleur et demander de signaler tout symptôme sans promettre un délai.",
        "grammarFocusFrench": "Futur simple pour annoncer un plan sous réserve des conditions; impératif pour demander de signaler un symptôme.",
        "speakingFrenchInstruction": "Vous dirigez une équipe fatiguée pendant une vague de chaleur. Reconnaissez l’effort, expliquez que les horaires et pauses suivent le plan chaleur du site, assurez l’accès à l’eau et à l’ombre, et demandez de signaler immédiatement tout malaise. Ne garantissez pas la date de fin.",
        "speakingFrenchOpening": "Je sais que la semaine a été difficile. Parlons du plan chaleur avant de monter.",
        "wordsFrench": ["la vague de chaleur", "l’épuisement dû à la chaleur", "le coup de chaleur", "l’hydratation", "la pause pour boire de l’eau", "l’ombre", "les électrolytes", "la glacière", "les étourdissements", "la date limite", "la journée de travail", "l’horaire", "l’effort", "le petit matin", "Je sais que la semaine a été difficile.", "Nous prévoyons de commencer à six heures et d’arrêter à deux heures, selon le plan.", "Il y aura de l’eau fraîche dans la glacière toute la journée.", "Personne ne travaillera sans les pauses prévues.", "Si vous avez des étourdissements, prévenez-moi tout de suite.", "Nous visons la date prévue, mais la sécurité passe avant le délai.", "Courage, l’équipe !", "Vous pouvez compter sur nous pour suivre le plan."],
        "readingFrench": [
            "Les prévisions annonçaient une vague de chaleur pour la semaine, avec plus de cent degrés Fahrenheit l’après-midi.",
            "L’entreprise visait une échéance : terminer le toit de l’école d’ici vendredi.",
            "Mercredi, au petit matin, Rogelio a réuni l’équipe avant la montée sur le toit.",
            "Rogelio : « Je sais que la semaine a été difficile et qu’il reste trois jours. »",
            "Rogelio : « Voici le plan : nous adapterons l’horaire selon le plan chaleur du chantier. »",
            "Rogelio : « Nous prévoyons de commencer à six heures et d’arrêter à deux heures, si les conditions le permettent. »",
            "Rogelio : « Il y aura de l’eau fraîche dans la glacière toute la journée, ainsi que des électrolytes. »",
            "Rogelio : « Nous prendrons les pauses prévues à l’ombre; personne ne les sautera pour rattraper le temps. »",
            "Rogelio : « Boire de l’eau n’est pas facultatif, même si nous sommes en retard. »",
            "Rogelio : « Kevin, si tu as des étourdissements ou te sens mal, préviens-moi tout de suite. »",
            "Rogelio : « Des étourdissements, un mal de tête ou des nausées peuvent signaler un problème lié à la chaleur. »",
            "Rogelio : « Le coup de chaleur est une urgence ; nous arrêterons le travail et appellerons les secours locaux. »",
            "Rogelio : « Nous visons vendredi, mais nous ne sacrifierons pas la sécurité pour tenir ce délai. »",
            "Rogelio : « Vendredi, si tout se passe bien, nous partagerons des tacos après le travail. »",
            "Rogelio : « Courage, l’équipe ! »",
            "Plus tard, Rogelio a dit au responsable : « Nous suivrons le plan; je confirmerai l’avancement vendredi. »"
        ],
        "verbsFrench": [["arrêter", "Nous arrêterons selon le plan et les conditions."], ["prévenir", "Si tu te sens mal, préviens-moi tout de suite."], ["avoir des étourdissements", "Si tu as des étourdissements, préviens-moi et va à l’ombre avec de l’aide."], ["faire", "Il fait très chaud et nous suivons le plan de pauses."], ["appeler", "En cas d’urgence, nous appellerons les secours locaux selon le protocole du site."]],
        "practiceFrench": {"see": "Repérez les engagements, les conditions et les symptômes à signaler.", "recall": "Retrouvez la phrase qui demande de signaler immédiatement un malaise.", "hear": "Écoutez l’horaire envisagé et le rappel des pauses.", "type": "Écrivez en français : If you get dizzy, tell me right away.", "say": "Annoncez le plan chaleur sans garantir l’heure ni la date de fin.", "write": "Rédigez un message d’équipe qui renvoie au protocole chaleur et d’urgence local."},
        "teachingNotesFrench": "Le futur simple exprime les engagements de Rogelio : nous adapterons, nous prendrons, nous appellerons. L’épuisement dû à la chaleur signifie heat exhaustion; le coup de chaleur signifie heatstroke. Le protocole d’urgence du chantier figure dans le dialogue.",
        "reviewGapsEnglish": ["Qualified occupational heat-safety and medical review required for symptom language, heat exhaustion/stroke distinction, hydration, electrolytes, break frequency, work hours and emergency response. US 911 in source must not be generalized to France/Québec without locale-specific routing.", "Qualified labor/supervisor review required for scheduling and Friday commitment; neither draft nor source constitutes a safe work plan."],
    },
    12: {
        "titleFrench": "Adapter son registre : collègue, propriétaire, responsable, inspecteur",
        "objectiveFrench": "Expliquer une même découverte à quatre interlocuteurs avec un ton adapté, sans présumer du tutoiement ni d’une approbation de l’inspecteur.",
        "grammarFocusFrench": "Tu et vous selon la relation; conditionnel de politesse : je voudrais, pourriez-vous.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe et l’IA joue successivement un collègue, une propriétaire, votre responsable et un inspecteur. Annoncez une zone de bois dégradé avec le registre approprié, demandez la préférence de la personne pour tu ou vous si nécessaire et demandez une vérification avant recouvrement selon la procédure applicable.",
        "speakingFrenchOpening": "J’ai repéré une zone de bois dégradé; je vais adapter mon explication à chaque personne.",
        "wordsFrench": ["vouvoyer quelqu’un", "tutoyer quelqu’un", "le titre de civilité", "le ton", "la courtoisie", "le message", "monsieur / madame", "le titre respectueux devant un prénom", "le responsable", "le degré de formalité", "l’impolitesse", "le surnom", "la demande", "l’argot", "Regarde, nous avons trouvé du bois dégradé.", "Excusez-moi de vous déranger, madame.", "Je voudrais vous signaler ce que nous avons trouvé.", "Pourriez-vous me permettre de vous montrer la zone ?", "Je vous informe que nous avons trouvé un problème.", "Je souhaiterais que vous l’examiniez.", "Préférez-vous que je vous tutoie ou que je vous vouvoie ?", "Vous pouvez me tutoyer, aucun problème."],
        "readingFrench": [
            "Kevin veut savoir comment parler à chaque personne sur le chantier; Rogelio lui donne un exemple.",
            "Rogelio : « Le message reste le même : nous avons trouvé du bois dégradé; le ton change selon la personne. »",
            "Rogelio : « Avec les collègues proches, on peut se tutoyer, mais il faut respecter la préférence de chacun. »",
            "Rogelio : « À un collègue qui accepte le tutoiement, je dirais : Regarde, nous avons trouvé du bois dégradé; viens voir. »",
            "Rogelio : « Avec la propriétaire, je commence par vous et par madame, sauf si elle préfère autre chose. »",
            "Rogelio : « Je dirais : Excusez-moi de vous déranger, madame; je voudrais vous signaler ce que nous avons trouvé. »",
            "Rogelio : « Puis je demanderais : Pourriez-vous me permettre de vous montrer la zone ? »",
            "Rogelio : « Avec mon responsable, je reste courtois et je vais droit au but. »",
            "Rogelio : « Je vous informe que nous avons trouvé une zone de bois dégradé; je vous envoie les photos. »",
            "Rogelio : « Avec l’inspecteur, j’évite l’argot et je présente les constats clairement. »",
            "Rogelio : « Je souhaiterais que vous l’examiniez avant le recouvrement, selon la procédure prévue. »",
            "Rogelio : « Je voudrais, je souhaiterais et pourriez-vous atténuent une demande. »",
            "Kevin : « Et si un membre de l’équipe est plus âgé, comme Ernesto ? »",
            "Rogelio : « Demande-lui poliment : Préférez-vous que je vous tutoie ou que je vous vouvoie ? »",
            "Rogelio : « Il peut répondre : Vous pouvez me tutoyer, aucun problème. »",
            "Rogelio : « En cas de doute, commence par vous et adapte-toi à la préférence de la personne. »"
        ],
        "verbsFrench": [["parler", "Préférez-vous que je vous tutoie ou que je vous vouvoie ?"], ["vouloir", "Kevin veut savoir comment s’adresser à chacun."], ["permettre", "Pourriez-vous me permettre de vous montrer la zone ?"], ["montrer", "Rogelio montre les photos au responsable."], ["changer", "Le message reste le même, mais le ton change selon la personne."]],
        "practiceFrench": {"see": "Comparez quatre formulations d’un même constat.", "recall": "Retrouvez la question sur la préférence pour tu ou vous.", "hear": "Écoutez les demandes polies et le message direct au responsable.", "type": "Écrivez en français : I'd like to mention something we found.", "say": "Annoncez la découverte à quatre interlocuteurs avec le bon registre.", "write": "Rédigez un message à l’inspecteur qui demande une vérification sans présumer de son autorité."},
        "teachingNotesFrench": "En français, le choix entre tu et vous dépend de la relation et de la préférence exprimée, pas seulement de l’âge ou de la fonction. Je voudrais et pourriez-vous marquent la politesse. La découverte de bois dégradé exige une vérification technique selon les procédures locales; la scène n’accorde aucune approbation réglementaire.",
        "reviewGapsEnglish": ["Qualified roofing/structural and local-code review required for rotten-deck inspection, whether covering must pause and who has authority to approve work.", "Qualified France/Québec language and workplace-register review required for tu/vous, civilities and the source's doña/usted-specific examples; source claim that nobody is offended by formal address is not universal."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    previous = json.loads((CONTENT / "master-7-9-draft.json").read_text())
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
        if n == 10:
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            lesson["reading"]["nativeDisplay"][13] = "Rogelio: From today, designate someone to check the tarp tie-downs under the site plan and send me a photo before leaving."
            lesson["reading"]["nativeDisplay"][14] = "Rogelio: Julio, tomorrow check the north side and Marcos the south side, if access is safe."
        if n == 11:
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            replacements = {
                4: "Rogelio: Here's the plan: we'll adapt the schedule under the site's heat plan.",
                5: "Rogelio: We plan to start at six and stop at two, if conditions allow.",
                7: "Rogelio: We'll take the planned breaks in the shade, and nobody will skip them to catch up.",
                10: "Rogelio: Dizziness, headache or nausea can signal a heat-related problem.",
                11: "Rogelio: Heatstroke is an emergency; we will stop work and call local emergency services.",
                12: "Rogelio: We aim for Friday, but we won't sacrifice safety for the deadline.",
                15: "Later, Rogelio told the boss: We'll follow the plan; I'll confirm progress on Friday.",
            }
            for index, display in replacements.items():
                lesson["reading"]["nativeDisplay"][index] = display
            for index, display in {
                15: "We plan to start at six and stop at two, under the site plan.",
                17: "Nobody will work without the planned breaks.",
                19: "We aim to finish on time, but safety comes before the deadline.",
                21: "Count on us to follow the plan.",
            }.items():
                lesson["words"][index]["enDisplay"] = display
        if n == 12:
            lesson["reading"]["nativeDisplay"] = list(original["readingEnglish"])
            for index, display in {
                2: "Rogelio: With close colleagues we may use informal address, but we respect each person's preference.",
                3: "Rogelio: To a colleague who accepts informal address, I say: Look, we found rotten wood; come see.",
                4: "Rogelio: With the homeowner I start formally and use a respectful title unless she prefers otherwise.",
                7: "Rogelio: With the company manager I remain courteous but get to the point.",
                10: "Rogelio: I would like you to examine it before we cover it, according to the applicable procedure.",
                11: "Rogelio: I'd like to, I wish to and could you are phrases that soften a request.",
                13: "Rogelio: Then ask politely: Do you prefer that I address you informally or formally?",
                14: "Rogelio: He may say: You can address me informally, no problem.",
                15: "Rogelio: If you're unsure, start formally and adapt to the person's preference.",
            }.items():
                lesson["reading"]["nativeDisplay"][index] = display
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
