#!/usr/bin/env python3
"""Build private French Roofing Master 13–15 from pinned English source."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "source-english-master-13-15.json"
OUTPUT = CONTENT / "master-13-15-draft.json"

AUTHOR = {
    13: {
        "titleFrench": "Signaler une chute avec une chronologie précise",
        "objectiveFrench": "Réagir à une chute selon le protocole d’urgence, puis rapporter les faits observés dans l’ordre, au téléphone et par écrit.",
        "grammarFocusFrench": "Passé composé et imparfait pour le récit; à, pendant que, puis et vers pour distinguer heure certaine et heure estimée.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe et votre responsable appelle après la chute. Indiquez d’abord que les secours locaux ont été contactés selon le protocole, puis rapportez uniquement les faits observés et les heures certaines ou estimées. Ne posez pas de diagnostic et ne concluez pas à une cause avant l’enquête.",
        "speakingFrenchOpening": "Je vous informe qu’un collègue a chuté. Les secours ont été appelés selon le protocole du chantier.",
        "wordsFrench": ["la chute", "le rapport d’incident", "les premiers secours", "la ligne de vie", "l’ancrage de toiture", "le harnais", "la longe", "les lieux de l’incident", "la personne blessée", "les secouristes", "la cheville", "l’échelle coulissante", "le bord du toit", "l’heure exacte", "Vers dix heures quinze, Julio se trouvait près du bord du toit.", "Pendant qu’il descendait, son pied a glissé.", "Appelez les secours locaux tout de suite.", "Évitez de le déplacer, sauf danger immédiat ou consigne des secours.", "Reste calme, les secours arrivent.", "À quelle heure exactement est-ce arrivé ?", "Je vous informe qu’un accident s’est produit."],
        "readingFrench": [
            "Mardi, vers dix heures quinze, Julio se trouvait au bord du toit près de l’échelle coulissante.",
            "Pendant qu’il descendait, son pied a glissé; il est tombé d’environ huit pieds sur l’herbe.",
            "La source indique que sa longe n’était pas reliée à la ligne de vie pendant le passage vers l’échelle; la cause reste à déterminer.",
            "Rogelio s’est approché et a demandé d’appeler immédiatement les secours locaux selon le protocole du chantier.",
            "Julio était conscient et disait avoir très mal à la cheville.",
            "Rogelio : « Reste calme; les secours arrivent. »",
            "Rogelio a demandé à l’équipe d’éviter de déplacer Julio, sauf danger immédiat ou consigne des secours.",
            "Kevin, formé aux premiers secours, a suivi sa formation; Marcos a empêché l’accès aux lieux.",
            "Les secouristes sont arrivés vers dix heures trente et ont transporté Julio à l’hôpital.",
            "Ensuite, Rogelio a appelé son responsable : « Je vous informe qu’un accident s’est produit; Julio a chuté et les secours l’ont pris en charge. »",
            "Le responsable : « À quelle heure exactement est-ce arrivé ? »",
            "Rogelio : « Je ne connais pas l’heure exacte; je l’estime entre dix heures quinze et dix heures vingt. »",
            "Cet après-midi-là, Rogelio a rédigé un rapport d’incident : heure estimée, vers 10 h 15.",
            "Description : Julio passait du toit vers l’échelle quand il a perdu l’équilibre et chuté.",
            "Observation à vérifier : la connexion de la longe au système de protection pendant ce passage; ne pas attribuer de cause avant l’enquête.",
            "Suite prévue : conserver les faits, suivre l’enquête et revoir avec une personne qualifiée la méthode approuvée de passage du toit à l’échelle."
        ],
        "verbsFrench": [["descendre", "Julio se trouvait au bord du toit et descendait vers l’échelle."], ["glisser", "Pendant qu’il descendait, son pied a glissé."], ["perdre", "Il a perdu l’équilibre et est tombé."], ["crier", "Rogelio s’est approché et a crié pour demander de l’aide."], ["rédiger", "Cet après-midi-là, Rogelio a rédigé le rapport d’incident."]],
        "practiceFrench": {"see": "Repérez les faits observés, les heures estimées et les points à vérifier.", "recall": "Remettez les événements dans l’ordre sans inventer une cause.", "hear": "Écoutez dix heures quinze et dix heures trente; distinguez estimation et constat.", "type": "Écrivez en français : What time exactly did it happen?", "say": "Signalez la chute à votre responsable sans diagnostiquer ni blâmer.", "write": "Rédigez une chronologie factuelle avec les sources de chaque heure."},
        "teachingNotesFrench": "Le récit distingue constat, estimation et hypothèse. Le texte source affirme une cause probable liée à la longe et une méthode de passage; la version affichée réserve ces conclusions à l’enquête et au spécialiste. Les secours, les premiers soins, les déplacements et l’accès aux lieux suivent le protocole local.",
        "reviewGapsEnglish": ["Qualified emergency-medical, occupational safety and fall-protection review required for response to a fall, moving an injured person, first aid, site control, transfer from roof to ladder and causal conclusions.", "US 911 is exact source provenance only; qualified locale-specific review must establish emergency routing for France/Québec. Incident-reporting obligations and terminology need legal/workplace review."],
    },
    14: {
        "titleFrench": "Discuter d’un quasi-accident sans blâmer",
        "objectiveFrench": "Décrire ce qui a failli se produire, écouter les témoins et convenir d’une prévention adaptée au chantier.",
        "grammarFocusFrench": "Faillir + infinitif, presque, aurait pu + infinitif et conditionnel passé pour évoquer une possibilité sans la présenter comme un fait.",
        "speakingFrenchInstruction": "Vous dirigez l’équipe après la chute d’un paquet de bardeaux près d’un passant. Vérifiez la sécurité des personnes, décrivez le quasi-accident sans dramatiser ni promettre l’absence de sanction, demandez ce qui a été observé et confiez la prévention à une personne qualifiée.",
        "speakingFrenchOpening": "Est-ce que tout le monde va bien ? Décrivons les faits avant de décider de la suite.",
        "wordsFrench": ["le quasi-accident", "le paquet de bardeaux", "la pile", "le support de toit", "la planche d’arrêt", "la pente", "la zone dangereuse", "le trottoir", "le passant", "le panneau d’avertissement", "la leçon", "la blessure", "la cause", "la prévention", "Le paquet a failli lui tomber dessus.", "Un accident grave a presque eu lieu.", "Cela aurait pu blesser quelqu’un gravement.", "Si quelqu’un s’était trouvé dessous, il aurait pu être blessé.", "Que pouvons-nous changer pour éviter que cela se reproduise ?", "Merci de l’avoir signalé; cela aide tout le monde.", "Est-ce que tu vas bien ?", "Je suis désolé de cette frayeur, monsieur."],
        "readingFrench": [
            "Au milieu de la matinée, un paquet de bardeaux a glissé sur la pente et est tombé du toit.",
            "Il a atterri sur le trottoir, à deux pas d’un voisin qui promenait son chien.",
            "Personne n’a été blessé, mais l’équipe s’est tue.",
            "Rogelio est descendu d’abord pour parler au passant.",
            "Rogelio : « Je suis désolé de cette frayeur, monsieur; allez-vous bien ? »",
            "Puis il est revenu vers l’équipe; Kevin était pâle.",
            "Rogelio : « Est-ce que tu vas bien ? »",
            "Rogelio : « Le paquet a failli tomber sur le passant; un accident grave a presque eu lieu. »",
            "Rogelio : « Le poids d’un paquet dépend du produit; cette chute aurait pu blesser quelqu’un gravement. »",
            "Rogelio : « Si quelqu’un s’était trouvé dessous, il aurait pu être blessé. »",
            "Rogelio : « Signalons ce quasi-accident et cherchons les faits sans blâmer; la suite suivra la procédure de l’entreprise. »",
            "Kevin : « J’avais laissé la pile sans dispositif de retenue parce que je pensais revenir tout de suite. »",
            "Rogelio : « Merci de l’avoir signalé; cela aide tout le monde. »",
            "Rogelio : « Arrêtons la manutention jusqu’à ce qu’une personne qualifiée vérifie le stockage et la protection des passants. »",
            "Rogelio : « Que pouvons-nous changer pour éviter que cela se reproduise ? »",
            "Marcos a proposé de délimiter la zone au sol et de vérifier la signalisation selon le plan de circulation du chantier.",
            "Cet après-midi-là, Rogelio a consigné les faits et les mesures proposées dans le registre de prévention."
        ],
        "verbsFrench": [["peser", "Le poids d’un paquet dépend du produit."], ["heurter", "Le paquet a failli heurter le passant."], ["proposer", "Marcos propose de délimiter la zone."], ["comprendre", "Nous voulons comprendre les faits et les causes."], ["promener", "Un voisin promenait son chien."]],
        "practiceFrench": {"see": "Repérez l’événement réel et ce qui aurait pu arriver.", "recall": "Retrouvez la question qui demande un changement préventif.", "hear": "Écoutez a failli et aurait pu; classez fait et possibilité.", "type": "Écrivez en français : It nearly fell on his head.", "say": "Menez une discussion factuelle sur le quasi-accident, sans promettre de sanction ou d’impunité.", "write": "Rédigez un signalement bref et une demande de vérification qualifiée."},
        "teachingNotesFrench": "Faillir et presque expriment un événement évité; aurait pu décrit un risque hypothétique. Le texte source donne un poids de paquet et une solution technique de support/planche comme s’ils étaient universels; la version affichée demande de vérifier le produit, la méthode de stockage et le plan de circulation. Une discussion sans blâme ne garantit pas l’absence de procédure disciplinaire.",
        "reviewGapsEnglish": ["Qualified roofing/material-handling and public-protection review required for shingle-bundle weight, roof-jack/toe-board storage, fall zone and sidewalk controls; cones/signs alone may not protect pedestrians.", "Qualified incident-investigation, HR and local legal review required before promising that nobody is punished; France/Québec terminology and register require qualified review."],
    },
    15: {
        "titleFrench": "Décider l’arrêt des travaux avant l’orage",
        "objectiveFrench": "Donner à la radio des consignes courtes d’arrêt et de repli, puis annoncer la protection temporaire seulement si le plan et les conditions la permettent.",
        "grammarFocusFrench": "Si + présent suivi du présent ou du futur; impératifs radio courts et confirmation de réception.",
        "speakingFrenchInstruction": "Vous êtes chef d’équipe à la radio. Signalez l’évolution météo, ordonnez l’arrêt et le repli en priorité, demandez un accusé de réception. N’ordonnez pas de bâcher pendant un danger de foudre ou de vent; toute protection temporaire suit le plan approuvé et une évaluation des conditions.",
        "speakingFrenchOpening": "Attention, équipe : l’orage approche. Arrêtez le travail et confirmez que vous m’avez reçu.",
        "wordsFrench": ["le radar", "la cellule orageuse", "la radio", "la bâche", "les tasseaux", "la rafale", "l’averse", "la partie ouverte", "le sol", "l’alerte", "les clous à rondelle plastique", "le ciel", "les matériaux non fixés", "la camionnette", "S’il commence à pleuvoir, nous descendons.", "S’il tonne, personne ne reste sur le toit.", "S’il tonne, tout le monde descend immédiatement.", "Protégez la partie ouverte seulement si le plan et les conditions le permettent.", "Bien reçu, je descends.", "Vous me recevez ?", "Je confirme l’arrêt des travaux à cause de la météo."],
        "readingFrench": [
            "Vers treize heures trente, Rogelio a consulté le radar et vu une cellule orageuse à environ vingt miles.",
            "Le ciel était encore dégagé, mais le vent commençait à changer.",
            "Rogelio à la radio : « Attention, équipe, alerte météo; Marcos, vous me recevez ? »",
            "Marcos : « Bien reçu, je vous entends. »",
            "Rogelio : « La trajectoire peut changer; n’attendons pas une heure d’arrivée supposée. »",
            "Rogelio : « Arrêtons le travail et suivons le plan météo du chantier dès maintenant. »",
            "Rogelio : « Kevin et Julio, cessez les travaux sur la partie ouverte et préparez le repli sûr. »",
            "Rogelio : « Toute bâche et sa fixation attendront une évaluation sûre des conditions et la méthode approuvée. »",
            "Rogelio : « Marcos, ne déplace les matériaux non fixés que si tu peux le faire sans risque; sinon, replie-toi. »",
            "Rogelio : « Le radar signale de la foudre; si vous entendez le tonnerre, descendez immédiatement selon le plan. »",
            "Vers treize heures cinquante, l’équipe a entendu le premier coup de tonnerre.",
            "Rogelio à la radio : « Tonnerre confirmé : tout le monde descend maintenant. Accusez réception. »",
            "Julio : « Bien reçu, je descends; je confirmerai l’état de la protection une fois en sécurité. »",
            "Rogelio : « Éloignez-vous des échelles et rejoignez le lieu de refuge prévu par le plan. »",
            "À quatorze heures, une forte averse et des rafales ont commencé.",
            "Depuis un lieu sûr, Rogelio a appelé la propriétaire : « Nous avons arrêté les travaux à cause de la météo; je confirmerai l’état de la toiture après inspection sûre. »",
            "Rogelio : « La reprise et l’horaire dépendront des conditions et de l’autorisation prévue; je vous tiendrai informée. »"
        ],
        "verbsFrench": [["rester", "S’il tonne, personne ne reste sur le toit."], ["rassembler", "Rassemblez les matériaux seulement si cela peut se faire sans risque."], ["faire tomber", "Une rafale peut faire tomber un objet."], ["revenir", "Nous reviendrons quand les conditions et le plan permettront la reprise."], ["attendre", "N’attendons pas la pluie pour suivre le plan météo."]],
        "practiceFrench": {"see": "Repérez l’alerte, l’arrêt et le repli avant la pluie.", "recall": "Retrouvez la demande d’accusé de réception à la radio.", "hear": "Écoutez les consignes brèves et l’heure estimée.", "type": "Écrivez en français : If it thunders, everyone down now.", "say": "Donnez une alerte radio et ordonnez le repli sans demander de bâcher sous la foudre.", "write": "Rédigez un message au propriétaire sans promettre l’état du toit ni une heure de reprise."},
        "teachingNotesFrench": "Si + présent peut introduire une condition, mais la décision météo réelle suit le plan du chantier. Le texte source ordonne un bâchage et une fixation détaillée avant l’arrivée présumée d’un orage, puis affirme que la toiture est couverte et promet un retour à sept heures. Ces éléments ne sont ni universels ni vérifiés; la version affichée priorise l’arrêt, le refuge prévu et la vérification ultérieure.",
        "reviewGapsEnglish": ["Qualified lightning/weather and roofing site-safety review required for stop-work trigger, safe descent, refuge, radar interpretation, temporary tarping, fastening and material handling; the source's ridge-down batten/cap-nail sequence must not be taught as universal.", "Qualified regional/employer and homeowner-contract review required before asserting roof coverage or a next-day 7 a.m. restart."],
    },
}


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    previous = json.loads((CONTENT / "master-10-12-draft.json").read_text())
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
            13: {
                2: "The source says the lanyard was not connected during the ladder transfer; the cause remains to be investigated.",
                3: "Rogelio approached and asked someone to call local emergency services immediately under the site protocol.",
                6: "Rogelio asked the crew to avoid moving Julio unless there was immediate danger or responders instructed otherwise.",
                7: "Kevin, trained in first aid, followed his training; Marcos controlled access to the scene.",
                14: "Observation to verify: the lanyard's connection to the protective system during the transfer; do not assign cause before investigation.",
                15: "Next step: preserve the facts, follow the investigation and have a qualified person review the approved roof-to-ladder transfer method.",
            },
            14: {
                8: "Rogelio: A bundle's weight depends on the product; the fall could have seriously injured someone.",
                9: "Rogelio: If someone had been below, they could have been injured.",
                10: "Rogelio: Report this near-miss and seek the facts without blame; next steps follow company procedure.",
                13: "Rogelio: Stop handling the material until a qualified person checks storage and pedestrian protection.",
                15: "Marcos proposed marking the ground zone and checking signs under the site's traffic plan.",
            },
            15: {
                4: "Rogelio: The storm path can change; don't rely on a guessed arrival time.",
                5: "Rogelio: Stop work and follow the site's weather plan now.",
                6: "Rogelio: Kevin and Julio, stop work on the open section and prepare for a safe retreat.",
                7: "Rogelio: Any tarp and fastening must await a safe conditions assessment and an approved method.",
                8: "Rogelio: Marcos, move loose material only if you can do so safely; otherwise retreat.",
                9: "Rogelio: Radar shows lightning; if you hear thunder, come down immediately under the plan.",
                12: "Julio: Copy, heading down; I'll confirm the protection's condition once safe.",
                13: "Rogelio: Stay clear of ladders and go to the refuge named in the plan.",
                15: "From a safe place Rogelio called the homeowner: We stopped for weather; I'll confirm the roof's condition after a safe inspection.",
                16: "Rogelio: The restart and time depend on conditions and the planned authorization; I'll keep you informed.",
            },
        }
        for index, display in replacements[n].items():
            lesson["reading"]["nativeDisplay"][index] = display
        if n == 13:
            lesson["words"][16]["enDisplay"] = "Call local emergency services right now."
            lesson["words"][17]["enDisplay"] = "Avoid moving him unless there is immediate danger or responders instruct you."
        if n == 14:
            lesson["words"][16]["enDisplay"] = "It could have seriously injured someone."
            lesson["words"][17]["enDisplay"] = "If someone had been below, they could have been injured."
        if n == 15:
            lesson["words"][17]["enDisplay"] = "Protect the open section only if the plan and conditions allow safe work."
        lesson["practiceModesFrench"] = authored["practiceFrench"]
        lesson["reviewGapsEnglish"] = authored["reviewGapsEnglish"]
        lesson["reviewed"] = False
        draft["lessons"].append(lesson)
    OUTPUT.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
