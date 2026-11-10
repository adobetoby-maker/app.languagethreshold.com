#!/usr/bin/env python3
"""Apply bounded source-fidelity corrections to private French Master drafts."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "content/french-travel-breakfast"


def change(name, number, words, lines, speaking):
    path = ROOT / name
    draft = json.loads(path.read_text())
    lesson = next(item for item in draft["lessons"] if item["n"] == number)
    for index, (english, french) in words.items():
        lesson["words"][index]["en"] = english
        lesson["words"][index]["fr"] = french
    for index, (english, french) in lines.items():
        lesson["passage"]["english"][index] = english
        lesson["passage"]["french"][index] = french
    lesson["speakingFrench"] = speaking
    assert draft["reviewed"] is False and lesson["reviewed"] is False
    path.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")


def main():
    change(
        "master-4-6-draft.json", 4,
        {13: ("the epinephrine auto-injector", "l’auto-injecteur d’épinéphrine")},
        {
            16: (
                "Elif decides not to eat buffet food and checks that her epinephrine auto-injector is in her bag.",
                "Elif décide de ne rien manger au buffet et vérifie que son auto-injecteur d’épinéphrine est dans son sac.",
            ),
            17: (
                "Sam explains to Rémi that if Elif has an allergic reaction, they will follow her doctor’s instructions for the auto-injector and call an ambulance.",
                "Sam explique à Rémi que si Elif a une réaction allergique, ils suivront les consignes de son médecin pour l’auto-injecteur et appelleront une ambulance.",
            ),
        },
        "Avant de choisir, vérifions la date du tableau et l’étiquette actuelle. Elif a son auto-injecteur d’épinéphrine. Pourriez-vous nous expliquer les ingrédients et la préparation ?",
    )
    change(
        "master-7-9-draft.json", 8,
        {
            3: ("the anaphylaxis", "l’anaphylaxie"),
            13: ("the antihistamine", "l’antihistaminique"),
        },
        {
            13: (
                "Kenji remembers that he had anaphylaxis after eating nougat last year.",
                "Kenji se souvient qu’il a eu une anaphylaxie après avoir mangé du nougat l’année dernière.",
            ),
            14: (
                "He carries his antihistamine and his epinephrine auto-injector, as his doctor instructed him.",
                "Il a avec lui son antihistaminique et son auto-injecteur d’adrénaline, comme son médecin le lui a indiqué.",
            ),
            15: (
                "Kenji decides not to order food from this counter; Ana knows the doctor’s instructions: if symptoms appear, use the auto-injector and call 112.",
                "Kenji décide de ne pas commander de nourriture à ce comptoir ; Ana connaît les consignes du médecin : si des symptômes apparaissent, utiliser l’auto-injecteur et appeler le 112.",
            ),
        },
        "Merci de votre gentillesse, mais n’enlevez pas seulement les amandes. Kenji a déjà eu une anaphylaxie. Avez-vous une étiquette avec les ingrédients ? Sinon, nous ne commanderons pas.",
    )


if __name__ == "__main__":
    main()
