from pathlib import Path
import json
root = Path('content/french-travel-lunch')
def load(name, n):
    path = root / name
    batch = json.loads(path.read_text())
    lesson = next(item for item in batch['lessons'] if item['n'] == n)
    return path, batch, lesson
def save(path, batch):
    path.write_text(json.dumps(batch, ensure_ascii=False, indent=2) + '\n')
def card(fr, en, kind='term'):
    return {'fr': fr, 'en': en, 'kind': kind}
def turn(speaker, fr, en):
    return {'speaker': speaker, 'fr': fr, 'en': en}

p,b,l = load('core-21-25-draft.json', 24)
l['scene'] = 'After one bite of a taco at a market food stall, Elena tells Maya her throat feels tight and she is having an allergic reaction to peanuts.'
l['focus'] = 'Use une réaction allergique, une allergie aux cacahuètes, le médicament and appelez le 112 to report exactly what happened and ask direct questions.'
l['cards'] = [
    card('une réaction allergique', 'an allergic reaction'),
    card('les secours', 'emergency services'),
    card('une bouchée', 'a bite of food'),
    card('des cacahuètes', 'peanuts'),
    card('la sauce macha', 'macha sauce'),
    card('la gorge', 'the throat'),
    card('un médicament', 'medicine'),
    card('un vendeur', 'a vendor'),
    card('Mon amie fait une réaction allergique.', 'My friend is having an allergic reaction.', 'phrase'),
    card('Appelez le 112, s’il vous plaît.', 'Call 112, please.', 'phrase'),
    card('Elle a mangé une bouchée de ce taco.', 'She ate one bite of this taco.', 'phrase'),
    card('La sauce contient des cacahuètes ?', 'Does the sauce contain peanuts?', 'phrase'),
    card('Elle a la gorge serrée.', 'Her throat feels tight.', 'phrase'),
    card('Dites aux secours ce qu’elle a mangé.', 'Tell emergency services what she ate.', 'phrase'),
    card('Tu as besoin de ton médicament ?', 'Do you need your medicine?', 'phrase'),
    card('Elle a mangé ce taco il y a cinq minutes.', 'She ate this taco five minutes ago.', 'phrase'),
    card('une ambulance', 'an ambulance'),
    card('un ambulancier', 'an ambulance worker'),
]
l['reader'] = [
    turn('Maya', 'Aidez-nous, s’il vous plaît ! Mon amie fait une réaction allergique.', 'Help us, please! My friend is having an allergic reaction.'),
    turn('Vendeur', 'Que s’est-il passé ?', 'What happened?'),
    turn('Maya', 'Elle a mangé une bouchée de ce taco. Elle a la gorge serrée.', 'She ate one bite of this taco. Her throat feels tight.'),
    turn('Maya', 'Tu as besoin de ton médicament ?', 'Do you need your medicine?'),
    turn('Elena', 'J’ai déjà utilisé mon médicament. Il était dans mon sac.', 'I have already used my medicine. It was in my bag.'),
    turn('Maya', 'Pouvez-vous appeler le 112, s’il vous plaît ?', 'Can you call 112, please?'),
    turn('Vendeur', 'J’appelle le 112 maintenant.', 'I am calling 112 now.'),
    turn('Maya', 'La sauce contient des cacahuètes ?', 'Does the sauce contain peanuts?'),
    turn('Vendeur', 'Oui. La sauce macha contient des cacahuètes.', 'Yes. The macha sauce contains peanuts.'),
    turn('Maya', 'Dites-leur qu’elle a mangé ce taco il y a cinq minutes.', 'Tell them she ate this taco five minutes ago.'),
    turn('Ambulancier', 'Quel médicament a-t-elle utilisé, et à quelle heure ?', 'Which medicine did she use, and at what time?'),
    turn('Maya', 'Elle a utilisé le médicament qu’elle portait dans son sac. Elle a mangé ce taco il y a cinq minutes.', 'She used the medicine she carried in her bag. She ate this taco five minutes ago.'),
]
l['speaking'] = {
    'role': 'Friend alerting a vendor', 'partnerRole': 'Street-food vendor and ambulance worker',
    'opening': 'Aidez-nous. Mon amie fait une réaction allergique.',
    'goal': 'Tell the vendor that Elena has a peanut allergy and a tight throat, ask about her medicine, ask someone to call 112, and tell the ambulance worker what she ate and which medicine she used.',
    'closure': 'Dites aux secours ce qu’elle a mangé et quel médicament elle a utilisé.',
    'wordBank': [c['fr'] for c in l['cards']],
}
l['modes']['recall']['cueEnglish'] = 'Recall the direct request to call 112.'
l['modes']['hear']['cueEnglish'] = 'Listen for what Elena ate.'
l['modes']['say']['cueEnglish'] = 'Tell the vendor Elena is having an allergic reaction.'
l['cards'].append(card('Elena a une allergie aux cacahuètes.', 'Elena has a peanut allergy.', 'phrase'))
l['reader'][2]['fr'] = 'Elena a une allergie aux cacahuètes. Elle a mangé une bouchée de ce taco. Elle a la gorge serrée.'
l['reader'][2]['en'] = 'Elena has a peanut allergy. She ate one bite of this taco. Her throat feels tight.'
l['speaking']['wordBank'] = [c['fr'] for c in l['cards']]
l['internalReviewNote'] = 'Source reconciliation: restored peanut allergy, tight throat, medicine question, ambulance exchange and emergency number. The fictional scene is in France, where 112 is the European emergency number. Qualified French and emergency-domain review remains required; source clinical terms are direct in learner text.'
save(p,b)

p,b,l = load('core-26-30-draft.json', 30)
l['objective'] = 'Host a full lunch for a child and a guest with a severe peanut allergy, decline an upsell, discuss a local custom, dispute a charge and say farewell in French.'
l['scene'] = 'Maya hosts a group of five, including a child, at a neighborhood lunch café; her friend has a severe peanut allergy.'
l['focus'] = 'Reuse the direct peanut-allergy and kitchen-check questions with table, price, bill and after-meal conversation language in one extended exchange.'
l['cards'] = [
    card('une table pour cinq', 'a table for five'),
    card('une chaise pour enfant', 'a child’s chair'),
    card('une allergie grave aux cacahuètes', 'a severe peanut allergy'),
    card('des cacahuètes', 'peanuts'),
    card('les ingrédients', 'the ingredients'),
    card('le menu du jour', 'the lunch special'),
    card('un supplément', 'an extra charge'),
    card('une erreur sur l’addition', 'an error on the bill'),
    card('Nous sommes cinq, avec un enfant.', 'There are five of us, with a child.', 'phrase'),
    card('Mon amie a une allergie grave aux cacahuètes.', 'My friend has a severe peanut allergy.', 'phrase'),
    card('Pouvez-vous vérifier les ingrédients avec la cuisine ?', 'Can you check the ingredients with the kitchen?', 'phrase'),
    card('Avez-vous une chaise pour enfant ?', 'Do you have a child’s chair?', 'phrase'),
    card('Non merci, seulement le menu du jour.', 'No thank you, just the lunch special.', 'phrase'),
    card('Pourquoi restez-vous à table après le repas ?', 'Why do you stay at the table after the meal?', 'phrase'),
    card('Ce supplément figure sur l’addition par erreur.', 'This extra charge is on the bill by mistake.', 'phrase'),
    card('Merci pour ce déjeuner. À bientôt.', 'Thank you for this lunch. See you soon.', 'phrase'),
    card('Ce plat contient-il des cacahuètes, ou est-il préparé près de cacahuètes ?', 'Does this dish contain peanuts, or is it prepared near peanuts?', 'phrase'),
]
l['reader'] = [
    turn('Maya', 'Bonjour. Nous sommes cinq, avec un enfant. Avez-vous une chaise pour enfant ?', 'Hello. There are five of us, with a child. Do you have a child’s chair?'),
    turn('Serveur', 'Bonjour. Oui, la voici. Cette table vous convient ?', 'Hello. Yes, here it is. Does this table suit you?'),
    turn('Maya', 'Oui, merci. Mon amie a une allergie grave aux cacahuètes. Pouvez-vous vérifier les ingrédients avec la cuisine ?', 'Yes, thank you. My friend has a severe peanut allergy. Can you check the ingredients with the kitchen?'),
    turn('Serveur', 'Je vérifie avec la cuisine.', 'I will check with the kitchen.'),
    turn('Serveur', 'La cuisine confirme que le menu du jour ne contient pas de cacahuètes.', 'The kitchen confirms that the lunch special does not contain peanuts.'),
    turn('Maya', 'Merci. Nous prenons le menu du jour pour tous.', 'Thank you. We will all have the lunch special.'),
    turn('Serveur', 'Souhaitez-vous ajouter un vin plus cher ?', 'Would you like to add a more expensive wine?'),
    turn('Maya', 'Non merci, seulement le menu du jour.', 'No thank you, just the lunch special.'),
    turn('Ami', 'On reste à table pour discuter après le repas ?', 'Shall we stay at the table to talk after the meal?'),
    turn('Maya', 'Oui. Nous pouvons parler du voyage, de la famille et de demain.', 'Yes. We can talk about the trip, family, and tomorrow.'),
    turn('Ami', 'Pourquoi restez-vous à table après le repas ?', 'Why do you stay at the table after the meal?'),
    turn('Maya', 'Pour prolonger la conversation, dans mon cas.', 'To continue the conversation, in my case.'),
    turn('Ami', 'J’aime cette idée. Et comment avez-vous découvert ce café ?', 'I like that idea. And how did you discover this café?'),
    turn('Maya', 'Un ami me l’a recommandé l’an dernier.', 'A friend recommended it to me last year.'),
    turn('Maya', 'Voici l’addition. Ce supplément y figure par erreur.', 'Here is the bill. This extra charge is on it by mistake.'),
    turn('Serveur', 'Vous avez raison. Je le retire.', 'You are right. I will remove it.'),
    turn('Maya', 'Merci pour ce déjeuner. À bientôt.', 'Thank you for this lunch. See you soon.'),
]
l['speaking'] = {
    'role': 'Host of a five-person lunch group', 'partnerRole': 'Server and local guest',
    'opening': 'Bonjour. Nous sommes cinq, avec un enfant.',
    'goal': 'Find a table and child’s chair, state the friend’s severe peanut allergy, ask the server to check ingredients with the kitchen, decline the expensive wine, talk after the meal, correct a mistaken bill charge and close warmly.',
    'closure': 'Merci pour ce déjeuner. À bientôt.',
    'wordBank': [c['fr'] for c in l['cards']],
}
l['modes']['see']['cueEnglish'] = 'Find the exact French term for a severe peanut allergy.'
l['modes']['recall']['cueEnglish'] = 'Recall the request to check the ingredients with the kitchen.'
l['modes']['hear']['cueEnglish'] = 'Listen for the polite refusal of the expensive wine.'
l['modes']['say']['cueEnglish'] = 'Ask why the group stays at the table after the meal.'
l['internalReviewNote'] = 'Source reconciliation: restored five guests, child’s chair, severe peanut allergy, kitchen ingredient check, lunch special, declined expensive wine and after-meal conversation. Qualified French and food-allergy review remains required; the fictional kitchen statement is a scene utterance, not a reviewed factual guarantee.'
save(p,b)

p,b,l = load('master-11-15-draft.json', 15)
l['scene'] = 'At a food-truck area, Maya notices a strong gas smell near a vendor’s gas cylinder, moves people away and calls 112.'
l['focus'] = 'Use éloignez-vous, ne fumez pas, ne touchez à aucun interrupteur and si + present with future to report the source scene directly.'
l['cards'][2] = card('une bouteille de gaz', 'a gas cylinder')
l['cards'][12] = card('Il y a une forte odeur de gaz près de votre bouteille.', 'There is a strong gas smell near your cylinder.', 'phrase')
l['cards'][15] = card('J’appelle le 112.', 'I am calling 112.', 'phrase')
l['cards'] = l['cards'][:18] + [
    card('le robinet de la bouteille de gaz', 'the gas-cylinder valve'),
    card('un interrupteur', 'a switch'),
    card('les pompiers', 'the firefighters'),
    card('le 112', '112'),
    card('Si c’est sans danger, fermez le robinet et éteignez la flamme ; ne touchez à aucun interrupteur.', 'If it is safe, close the valve and put out the flame; do not touch any switch.', 'phrase'),
]
l['reader'] = [
    turn('Maya', 'Monsieur, il y a une forte odeur de gaz près de votre bouteille.', 'Sir, there is a strong gas smell near your cylinder.'),
    turn('Vendeur', 'Je sens l’odeur aussi.', 'I smell it too.'),
    turn('Maya', 'Si c’est sans danger, fermez le robinet et éteignez la flamme ; ne touchez à aucun interrupteur.', 'If it is safe, close the valve and put out the flame; do not touch any switch.'),
    turn('Maya', 'Éloignez-vous du camion, s’il vous plaît ! Ne fumez pas et n’utilisez pas de briquet !', 'Move away from the truck, please! Do not smoke or use a lighter!'),
    turn('Vendeur', 'Je vais prévenir les autres personnes.', 'I will alert the other people.'),
    turn('Maya', 'J’appelle le 112.', 'I am calling 112.'),
    turn('Opératrice', 'Quelle est votre adresse exacte ?', 'What is your exact address?'),
    turn('Maya', 'Nous sommes près de l’entrée principale du parking, à côté des camions-restaurants de la place Victor.', 'We are near the main entrance to the parking lot, next to the food trucks at Place Victor.'),
    turn('Opératrice', 'Que se passe-t-il ?', 'What is happening?'),
    turn('Maya', 'Il y a une forte odeur de gaz près d’un camion. Si quelqu’un allume une flamme, il y aura un danger.', 'There is a strong gas smell near a truck. If someone lights a flame, there will be danger.'),
    turn('Opératrice', 'J’envoie les pompiers. Je note votre emplacement et les faits.', 'I am sending the firefighters. I am recording your location and the facts.'),
]
l['speaking'] = {
    'role': 'Visitor reporting a gas smell', 'partnerRole': 'Vendor and emergency operator',
    'opening': 'Il y a une forte odeur de gaz près de votre bouteille.',
    'goal': 'Alert the vendor, use the source imperative about the valve and switch, ask nearby people to move back and not smoke, then call 112 and report the exact fictional location to the operator.',
    'closure': 'Nous sommes près de l’entrée principale du parking.',
    'wordBank': [c['fr'] for c in l['cards']],
}
l['modes']['type']['cueEnglish'] = 'Type the French term for firefighters.'
l['modes']['type']['sourceCard'] = 21
l['modes']['write']['cueEnglish'] = 'Write a sentence saying you are calling 112.'
l['internalReviewNote'] = 'Source reconciliation restored gas-cylinder valve, no-switch imperative, firefighters and the emergency-call number. The scene is localized to France, where 112 is the European emergency number (French Interior Ministry). Qualified French and gas/emergency-domain review remains required; learner-facing text mirrors the source wording without added AI caution.'
save(p,b)

# Keep the English support gloss as precise as the French clinical term.
p,b,l = load('core-16-20-draft.json', 19)
l['reader'][5] = turn('Vendor', 'Le bouillon contient des crevettes, et la sauce contient aussi des crevettes séchées.', 'The stock contains shrimp, and the sauce also contains dried shrimp.')
l['reader'][6] = turn('Maya', 'Merci de m’avoir expliqué la préparation et l’utilisation de la même huile. Nous allons manger ailleurs.', 'Thank you for explaining the preparation and use of the same oil. We will eat elsewhere.')
l['cards'].append(card('La sauce contient aussi des crevettes séchées.', 'The sauce also contains dried shrimp.', 'phrase'))
l['speaking']['wordBank'] = [c['fr'] for c in l['cards']]
for entry in l['cards'] + l['reader']:
    if entry.get('fr') in {
        'Mon partenaire est gravement allergique aux coquillages et aux crustacés.',
        'Bonjour. Mon partenaire est gravement allergique aux coquillages et aux crustacés.',
    }:
        entry['en'] = entry['en'].replace('shellfish', 'mollusks and crustaceans')
    elif entry.get('fr') == 'Il réagit gravement aux coquillages et aux crustacés.':
        entry['en'] = 'He has a severe reaction to mollusks and crustaceans.'
l['modes']['see']['cueEnglish'] = 'Find the French term for a severe allergy.'
save(p,b)

p,b,l = load('master-16-20-draft.json', 20)
l['objective'] = 'Lead a group through a full lunch: explain the menu, choose a substitute, ask about a shellfish allergy, handle a near miss, verify the bill and write a brief review in French.'
l['reader'][6] = turn('Maya', 'Attendez, s’il vous plaît. Sam est allergique et ne peut pas manger ce plat. Pouvez-vous vérifier avec la cuisine avant qu’il n’y goûte et noter son allergie sur la commande ?', 'Wait, please. Sam is allergic and cannot eat this dish. Can you check with the kitchen before he tastes it and note his allergy on the order?')
l['cards'].append(card('Attendez, s’il vous plaît. Sam est allergique et ne peut pas manger ce plat.', 'Wait, please. Sam is allergic and cannot eat this dish.', 'phrase'))
l['speaking']['wordBank'] = [c['fr'] for c in l['cards']]
for entry in l['cards'] + l['reader']:
    if entry.get('fr') == 'une option sans crustacés ni mollusques':
        entry['en'] = 'an option without crustaceans or mollusks'
    elif entry.get('fr') == 'une allergie aux crustacés et aux mollusques':
        entry['en'] = 'an allergy to crustaceans and mollusks'
    elif entry.get('fr') == 'Sam a une allergie aux crustacés et aux mollusques.':
        entry['en'] = 'Sam has an allergy to crustaceans and mollusks.'
    elif 'Sam a une allergie aux crustacés et aux mollusques.' in entry.get('fr', ''):
        entry['en'] = entry['en'].replace('Sam has a shellfish allergy.', 'Sam has an allergy to crustaceans and mollusks.')
l['modes']['see']['cueEnglish'] = 'Find the French phrase for an allergy to crustaceans and mollusks.'
l['modes']['recall']['cueEnglish'] = 'Recall the question about shrimp, other crustaceans or mollusks.'
save(p,b)

# The Core plan pins only titles/objectives. Pin its passage/word source separately.
for path in sorted(root.glob('core-*-draft.json')):
    batch = json.loads(path.read_text())
    batch['sourceContent'] = {
        'path': 'public/lesson-content/es/travel-lunch.json',
        'sha256': '9c6104911c7c3fc2d8f0e1914edb5bd8e490f0d3961babfcece22238f995580d',
    }
    save(path, batch)
print('Corrected Core 24, Core 30 and Master 15; pinned Core passage source; review gates unchanged.')
