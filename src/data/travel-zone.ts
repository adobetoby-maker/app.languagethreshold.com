import type { ModuleCurriculum } from "./curriculum.ts";
import type { Lesson } from "./curriculum-helpers.ts";
import { pt, r, sp } from "./curriculum-helpers.ts";
import type { AppModule } from "./modules.ts";

type TravelLessonSpec = readonly [title: string, objective: string, roleplay: string];

interface TravelZoneSpec {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  partners: string;
  vocab: string[];
  lessons: TravelLessonSpec[];
}

const lesson = (title: string, objective: string, roleplay: string): TravelLessonSpec => [
  title,
  objective,
  roleplay,
];

// These modules deliberately overlap at real-world seams. A traveler needs to
// ask about price in a cafe, market, taxi, hotel, and rental office—not master
// the phrase once in an abstract list and hope it transfers everywhere.
const TRAVEL_ZONE_SPECS: TravelZoneSpec[] = [
  {
    id: "travel-breakfast",
    name: "Breakfast & Cafés",
    emoji: "☕",
    blurb:
      "Coffee, pastries, eggs, hotel breakfast, dietary needs, morning small talk, and paying at a café.",
    partners: "a barista, breakfast server, hotel host, or fellow café guest",
    vocab: ["coffee", "pastry", "eggs", "breakfast included", "counter", "table", "bill", "tip"],
    lessons: [
      lesson(
        "Enter a busy café",
        "greet staff, learn whether to order at the counter, and find a place",
        "Walk into a crowded Roman café and work out how ordering and seating operate.",
      ),
      lesson(
        "Order local coffee",
        "ask about coffee styles, size, milk, temperature, and where to drink it",
        "Order a local coffee without assuming the names or customs are the same as at home.",
      ),
      lesson(
        "Choose pastries and bread",
        "ask what is fresh, filled, sweet, savory, or typical",
        "Ask the server to explain three pastries and recommend one made that morning.",
      ),
      lesson(
        "Order eggs and a full breakfast",
        "request eggs, sides, toast, fruit, and cooking preferences",
        "Build a complete hot breakfast order and confirm what is included.",
      ),
      lesson(
        "Use hotel breakfast",
        "ask whether breakfast is included, the hours, room number, and buffet rules",
        "Arrive at a hotel breakfast and resolve uncertainty about access and seating.",
      ),
      lesson(
        "Explain a breakfast restriction",
        "state an allergy or dietary need and confirm ingredients without seeking medical advice",
        "Ask whether a breakfast item contains nuts, dairy, gluten, meat, or another ingredient.",
      ),
      lesson(
        "Ask what locals eat",
        "ask for a typical regional breakfast and understand a cultural explanation",
        "Tell the server you want the breakfast locals actually choose, not a tourist substitute.",
      ),
      lesson(
        "Order for another person",
        "order several drinks and foods accurately and confirm who gets each item",
        "Order breakfast for a family or group with different preferences.",
      ),
      lesson(
        "Request takeaway",
        "ask for food or coffee to go, packaging, napkins, and utensils",
        "Convert part of a seated order into takeaway because your train leaves soon.",
      ),
      lesson(
        "Fix the wrong order",
        "politely identify a missing or incorrect item and request the right one",
        "You received the wrong coffee and one pastry is missing; resolve both without sounding hostile.",
      ),
      lesson(
        "Make morning small talk",
        "exchange greetings and talk briefly about the day, weather, and plans",
        "Chat naturally with a barista or nearby customer while waiting.",
      ),
      lesson(
        "Ask for the bill",
        "request the bill, understand cover or service charges, and choose a payment method",
        "Pay for breakfast, clarify one unfamiliar charge, and request a receipt.",
      ),
      lesson(
        "Compliment breakfast",
        "give a specific, natural compliment and thank the staff warmly",
        "Tell the cook why the pastry or coffee was memorable rather than only saying it was good.",
      ),
      lesson(
        "Handle a rushed morning",
        "explain time pressure, ask what is fastest, and confirm preparation time",
        "You have twelve minutes before a tour; ask for a realistic fast option.",
      ),
      lesson(
        "Breakfast midpoint review",
        "combine entering, ordering, a restriction, a correction, small talk, and payment from lessons 1–14 in one ordinary morning",
        "Handle a routine café breakfast from greeting to payment, including one small mix-up, without English.",
      ),
      lesson(
        "Bring children to breakfast",
        "ask for a high chair, child portions, milder options, and space for a stroller",
        "Arrive with two young children and a stroller and arrange a table, a high chair, and kid-sized food.",
      ),
      lesson(
        "Request an accessible table",
        "ask about step-free entry, table height, restroom access, and room for a wheelchair or crutches",
        "Your companion uses a wheelchair; find out whether the café can seat you comfortably before you sit down.",
      ),
      lesson(
        "Check for cross-contact at the counter",
        "ask how food is handled, whether tongs, toasters, or milk jugs are shared, and decide what to order",
        "Your friend has a serious nut allergy; ask how pastries are stored and handled before ordering anything for them.",
      ),
      lesson(
        "Understand counter and table prices",
        "ask why standing and sitting prices differ and choose where to drink your coffee",
        "You notice the table price is higher than the counter price; ask how pricing works and decide where to sit.",
      ),
      lesson(
        "Dispute an included-breakfast charge",
        "show what your booking promised, question the charge calmly, and agree on a corrected bill",
        "Your hotel bills you for breakfast your booking says is included; resolve it calmly with the front desk.",
      ),
      lesson(
        "Disagree politely about a table",
        "state a seating preference, explain your reason, and accept or propose a compromise",
        "A server asks your group to move to a smaller table for a reservation; explain why you'd like to stay and reach a compromise.",
      ),
      lesson(
        "Follow café etiquette",
        "learn local habits about milky coffee, sugar, lingering, and paying first",
        "Ask a barista which café habits mark someone as a tourist and how long it is fine to stay at a table.",
      ),
      lesson(
        "Find an early-opening bakery",
        "ask a local for a specific recommendation, opening hours, and walking directions",
        "Ask the hotel host where to find the best bakery open before 7 a.m. and how to walk there.",
      ),
      lesson(
        "Get help in a café emergency",
        "alert staff, ask someone to call emergency services, give the location, and describe what you saw",
        "A guest at the next table collapses; alert the staff, ask for emergency help, and describe what happened.",
      ),
      lesson(
        "Handle a hot-drink spill",
        "ask for cold water, a first-aid kit, and napkins, and accept or decline an apology and offer",
        "A server spills hot coffee on your arm; ask for cold water and a first-aid kit, and respond graciously to the apology.",
      ),
      lesson(
        "Work through a long breakfast",
        "ask whether staying is welcome, about Wi-Fi and outlets, and when to order again",
        "You need to work for two hours; ask whether that's acceptable, where to sit, and when to order a second round.",
      ),
      lesson(
        "Arrange an early-departure breakfast",
        "ask for a packed breakfast or early service before official hours and confirm pickup",
        "Your 5:30 a.m. airport transfer leaves before breakfast opens; ask the hotel for a packed breakfast or an early option.",
      ),
      lesson(
        "Talk with a regular over coffee",
        "sustain a longer conversation about the neighborhood, work, and travel with follow-up questions",
        "A retired regular asks where you're from; keep the conversation going for several turns, ask follow-ups, and close politely.",
      ),
      lesson(
        "Settle who pays for the group",
        "offer to pay, respond when others insist, and follow local custom on treating",
        "Your new friends insist on paying for breakfast; negotiate politely, accept or decline, and agree how to settle.",
      ),
      lesson(
        "Breakfast threshold",
        "handle a complete breakfast with children or special needs, a complication, a seating or charge disagreement, local customs, and a warm farewell without English",
        "Navigate a busy breakfast with a mixed group—an allergy, a wrong charge, a seating dispute, and a long chat with a local—from the doorway to a warm goodbye.",
      ),
    ],
  },
  {
    id: "travel-lunch",
    name: "Lunch & Casual Dining",
    emoji: "🥪",
    blurb:
      "Trattorias, lunch menus, street food, sandwiches, daily specials, quick meals, invitations, and genuine praise.",
    partners: "a lunch server, counter worker, chef, local diner, or invited companion",
    vocab: [
      "lunch",
      "daily special",
      "sandwich",
      "street food",
      "table",
      "ingredients",
      "bill",
      "split",
    ],
    lessons: [
      lesson(
        "Choose a lunch place",
        "ask about wait time, seating, local style, and whether a place is touristy",
        "Ask a local which nearby lunch spot they genuinely use and why.",
      ),
      lesson(
        "Understand the lunch menu",
        "ask about courses, set menus, portions, and what is available today",
        "Have a server explain the fixed-price lunch and what choices it includes.",
      ),
      lesson(
        "Order street food",
        "identify fillings, sauces, spice, portion, and whether to eat there or walk",
        "Order a regional street-food specialty from a busy counter.",
      ),
      lesson(
        "Build a sandwich",
        "choose bread, filling, cheese, vegetables, condiments, and preparation",
        "Order a made-to-order sandwich and change one ingredient politely.",
      ),
      lesson(
        "Ask about the daily special",
        "understand ingredients, preparation, availability, and price",
        "Ask what the cook made today and whether it is a good choice for a quick lunch.",
      ),
      lesson(
        "Order pasta, rice, or soup",
        "compare options and ask about portion, sauce, and local tradition",
        "Choose between two regional lunch dishes after asking meaningful questions.",
      ),
      lesson(
        "Share dishes",
        "ask for plates, divide food, and check whether sharing is customary",
        "Order several dishes for the table and explain how the group wants to share.",
      ),
      lesson(
        "Manage lunch dietary needs",
        "ask about ingredients and simple modifications without demanding an unsafe guarantee",
        "Find a workable lunch for a vegetarian or someone avoiding a stated ingredient.",
      ),
      lesson(
        "Ask for water, bread, and condiments",
        "request table basics and understand whether they carry a charge",
        "Clarify whether water and bread are complimentary before accepting them.",
      ),
      lesson(
        "Order a fast lunch",
        "state a time limit, ask what can arrive quickly, and decide",
        "You have twenty minutes before museum entry; negotiate a realistic lunch plan.",
      ),
      lesson(
        "Correct a lunch problem",
        "report cold food, a missing item, or a long delay respectfully",
        "One meal never arrived and the others are finished; ask for a fair solution.",
      ),
      lesson(
        "Split or combine the bill",
        "ask to split by person or item and handle cash and card",
        "Four travelers need two separate card payments and one cash payment.",
      ),
      lesson(
        "Praise the chef sincerely",
        "describe what made a dish exceptional and ask staff to pass on thanks",
        "Tell the chef the meal was extraordinary and explain the flavor or memory it created.",
      ),
      lesson(
        "Invite someone to lunch",
        "make a low-pressure invitation, agree on time and place, and accept either answer",
        "Invite a local acquaintance to lunch and choose a place together.",
      ),
      lesson(
        "Lunch midpoint review",
        "combine choosing a place, ordering, a dietary question, a correction, and splitting the bill from lessons 1–14",
        "Run an ordinary weekday lunch with a friend from finding a table to splitting the bill, fixing one small problem along the way.",
      ),
      lesson(
        "Order at a workers' canteen",
        "follow a tray line, choose set courses, pay first, and find a seat",
        "At a workers' canteen, follow the line, choose a first and second course, and pay at the register before sitting.",
      ),
      lesson(
        "Bring a child to lunch",
        "ask about children's portions, plain dishes, high chairs, and sharing an adult plate",
        "Your picky six-year-old will only eat plain pasta; ask the kitchen what they can prepare and how it will be priced.",
      ),
      lesson(
        "Call ahead about access",
        "ask about step-free entry, restrooms, quiet tables, and space for mobility aids",
        "Call a lunch spot to ask whether it has step-free access and a table that fits a wheelchair.",
      ),
      lesson(
        "Navigate a severe allergy",
        "explain severity, ask about shared fryers, stocks, and sauces, and decide whether to eat elsewhere",
        "Explain that your partner reacts severely to shellfish, ask about the fryer and stock, and politely decide whether to stay.",
      ),
      lesson(
        "Dispute a cover or service charge",
        "question an unexpected cover, bread, or service charge and agree on a resolution",
        "Your bill includes bread you declined and a service charge not on the menu; question it calmly and settle the total.",
      ),
      lesson(
        "Hold your choice against an upsell",
        "politely insist on your order, explain your budget, and decline a pricier suggestion",
        "The server keeps steering you toward the most expensive fish; hold your choice politely and explain your budget.",
      ),
      lesson(
        "Learn local lunch customs",
        "ask when locals eat, how long lunch lasts, coffee after meals, and afternoon closures",
        "Ask a local why restaurants close at 3 p.m. and what counts as normal at a weekday lunch.",
      ),
      lesson(
        "Build a picnic at a deli",
        "order sliced foods by quantity, ask for packing and utensils, and ask where picnics are allowed",
        "Put together a picnic for four at a deli counter and ask where you're allowed to eat it in the park.",
      ),
      lesson(
        "Respond to an allergic reaction",
        "alert staff, ask someone to call emergency services, and say what was eaten",
        "Your friend starts reacting after a bite of street food; alert the vendor, ask for emergency help, and say what was eaten.",
      ),
      lesson(
        "Recover a forgotten bag",
        "call the restaurant, describe the bag and table, and arrange to collect it",
        "You left your shopping bag under the table; call the restaurant, describe it, and arrange to pick it up.",
      ),
      lesson(
        "Host a business lunch",
        "guide ordering for a guest, keep a professional conversation going, and settle the bill discreetly",
        "Take a local supplier to lunch, help them order, keep the conversation going, and pay without fuss.",
      ),
      lesson(
        "Order lunch by phone for pickup",
        "order clearly, spell a name, and confirm pickup time and total",
        "Phone a takeaway shop, order lunch for four, spell your name, and confirm the pickup time and total.",
      ),
      lesson(
        "Share a table with strangers",
        "ask to join a communal table, chat about the food, and respect others' space",
        "At a crowded market hall, ask to join strangers at a shared table and chat about what they ordered.",
      ),
      lesson(
        "Leave after a long delay",
        "explain that you must go, pay for what you had, and part without a scene",
        "After 40 minutes without your main course, explain you must leave, pay for your drinks, and part courteously.",
      ),
      lesson(
        "Lunch threshold",
        "complete a casual lunch with a special need, a declined upsell, a charge dispute, a local custom, and an extended conversation without English",
        "Host a long lunch for a mixed group—one child, one severe allergy, a contested charge—from finding a table to a memorable farewell.",
      ),
    ],
  },
  {
    id: "travel-dinner",
    name: "Dinner & Special Meals",
    emoji: "🍷",
    blurb:
      "Reservations, aperitivo, courses, wine, chef recommendations, celebrations, problems, and unforgettable compliments.",
    partners: "a host, dinner server, sommelier, chef, or dining companion",
    vocab: ["reservation", "aperitif", "course", "wine", "special", "dessert", "service", "chef"],
    lessons: [
      lesson(
        "Reserve a dinner table",
        "book a date, time, party size, seating preference, and occasion",
        "Call for a dinner reservation and ask for an outdoor table without assuming it is available.",
      ),
      lesson(
        "Arrive and speak with the host",
        "give the reservation name, handle a wait, and discuss seating",
        "Arrive early, confirm the booking, and decide whether to wait at the bar.",
      ),
      lesson(
        "Order aperitivo",
        "ask about drinks, nonalcoholic choices, and included snacks",
        "Join the local pre-dinner custom and ask how it works.",
      ),
      lesson(
        "Understand courses",
        "ask about course order, portion size, sharing, and pacing",
        "Plan a multi-course dinner without ordering far too much food.",
      ),
      lesson(
        "Ask for a wine recommendation",
        "describe taste and budget and pair wine with the meal",
        "Ask for a local bottle within a clear price range and understand the recommendation.",
      ),
      lesson(
        "Choose the chef's specialties",
        "ask what the kitchen does best, what is seasonal, and what sold out",
        "Tell the server you want the dish that best represents the region tonight.",
      ),
      lesson(
        "Order seafood or meat",
        "ask about preparation, doneness, bones, sides, and price by weight",
        "Order a fish priced by weight and confirm the estimated total before agreeing.",
      ),
      lesson(
        "Handle allergies at dinner",
        "state a restriction, ask about cross-contact realistically, and choose an alternative",
        "Work with the server to find a safer option without treating the AI as medical advice.",
      ),
      lesson(
        "Control the meal's pace",
        "ask to slow down, speed up, hold a course, or take a break",
        "The next course arrived too quickly; ask the server to pause service.",
      ),
      lesson(
        "Celebrate an occasion",
        "explain a birthday, anniversary, reunion, or personal milestone",
        "Arrange a small surprise and confirm what the restaurant can provide.",
      ),
      lesson(
        "Send back a dish respectfully",
        "describe a concrete problem and request correction or replacement",
        "A dish is undercooked or not what was ordered; resolve it without insulting the kitchen.",
      ),
      lesson(
        "Order dessert and digestif",
        "ask about sweets, cheese, coffee, and local after-dinner drinks",
        "Choose a shared dessert and ask what locals drink afterward.",
      ),
      lesson(
        "Give a once-in-a-lifetime compliment",
        "express deep gratitude with a specific emotional memory",
        "Tell the chef: this experience was amazing, and I will tell my children about this meal.",
      ),
      lesson(
        "Pay and understand service",
        "request the bill, check charges, ask about tipping, and pay",
        "Clarify cover and service charges, then leave an appropriate compliment and tip.",
      ),
      lesson(
        "Dinner midpoint review",
        "combine reservation, arrival, ordering courses, an allergy question, and paying from lessons 1–14 in one ordinary evening",
        "Get through an ordinary dinner reservation from the host stand to the bill, with one small change along the way.",
      ),
      lesson(
        "Fix a lost reservation",
        "show your confirmation, ask what the restaurant can offer, and accept or decline an alternative",
        "The host can't find your anniversary booking; show your confirmation and negotiate a solution.",
      ),
      lesson(
        "Ask about the dress code",
        "learn what diners wear, whether jackets are required, and what smart casual means locally",
        "Call the restaurant to ask whether shorts are acceptable and what diners usually wear.",
      ),
      lesson(
        "Bring children to dinner",
        "ask about early seatings, a children's menu, and what the kitchen can adapt",
        "Ask whether a 7 p.m. table works with two tired children and what the kitchen can make for them.",
      ),
      lesson(
        "Request accessible, quiet seating",
        "ask for a step-free route, nearby restroom, good lighting, and a quieter table",
        "Your parent has limited mobility and hearing; request an accessible, quiet table and explain why.",
      ),
      lesson(
        "Order a tasting menu",
        "ask about the number of courses, duration, pairings, substitutions, and price",
        "Ask the server to walk you through the tasting menu and request one substitution.",
      ),
      lesson(
        "Decline an expensive bottle",
        "refuse a recommendation gracefully and find a better-priced bottle or glass",
        "The sommelier recommends a bottle far over your budget; decline gracefully and find a better-priced option.",
      ),
      lesson(
        "Challenge an inflated bill",
        "identify an item you never ordered or an unannounced fee and dispute it calmly",
        "Your bill lists a second bottle you never ordered and an unannounced service fee; dispute both calmly.",
      ),
      lesson(
        "Ask where locals celebrate",
        "get a recommendation by cuisine, price, booking needs, and what to order",
        "Ask your concierge where locals book for a celebration and what to order there.",
      ),
      lesson(
        "Help a guest who feels unwell",
        "ask staff for water, a quiet place, and emergency help if needed",
        "Your dinner companion suddenly feels faint; ask staff for water, a quiet spot, and emergency help if needed.",
      ),
      lesson(
        "Navigate a holiday set menu",
        "ask what a fixed holiday menu includes, its price, and whether a lighter option exists",
        "On a public holiday the restaurant serves only a fixed menu; ask what it includes and negotiate a lighter option.",
      ),
      lesson(
        "Give a toast at a group dinner",
        "offer a short toast, respond to others' toasts, and keep a group conversation going",
        "At a reunion dinner, give a short toast and respond warmly when others toast you.",
      ),
      lesson(
        "Be a guest at a home dinner",
        "ask what gift to bring, how to arrive, and what table manners are expected",
        "Ask a local friend what to bring to dinner at their parents' home and how to behave at the table.",
      ),
      lesson(
        "Settle a large group bill",
        "split unevenly, separate drinks, add a shared tip, and combine cash and cards",
        "Divide the bill for eight people who ordered very differently, without anyone feeling cheated.",
      ),
      lesson(
        "Get a safe ride home",
        "ask staff to call a licensed taxi, where to wait, and the expected price",
        "It's late and you don't know the area; ask the restaurant to call a reliable taxi and tell you where to wait.",
      ),
      lesson(
        "Dinner threshold",
        "navigate a special evening with a booking problem, a special need, a declined upsell, a disputed charge, a toast, and a safe ride home without English",
        "Host a celebration dinner from a missing reservation through toasts and a contested bill to a safe ride back to your lodging.",
      ),
    ],
  },
  {
    id: "travel-shopping-essentials",
    name: "Shopping & Essentials",
    emoji: "🛍️",
    blurb:
      "Clothes, socks, underwear, shoes, toiletries, electronics, sizes, fitting rooms, tax-free shopping, returns, and lost-luggage replacement.",
    partners:
      "a clothing clerk, pharmacy cashier, electronics seller, department-store worker, or customer-service agent",
    vocab: [
      "size",
      "socks",
      "underwear",
      "fitting room",
      "toiletries",
      "charger",
      "receipt",
      "return",
    ],
    lessons: [
      lesson(
        "Find socks and underwear",
        "ask where basics are, describe type, material, size, and quantity",
        "Your luggage is missing; buy comfortable socks and underwear for three days.",
      ),
      lesson(
        "Explain clothing size",
        "give approximate size, understand local sizing, and ask to compare",
        "Translate your usual size into the local system with a clerk's help.",
      ),
      lesson(
        "Use the fitting room",
        "ask to try items, request another size, and give items back",
        "Try on trousers and a shirt and ask for better-fitting alternatives.",
      ),
      lesson(
        "Choose weather-appropriate clothing",
        "ask for layers, rain gear, heat, cold, or walking comfort",
        "Buy one practical item for tomorrow's unexpected weather.",
      ),
      lesson(
        "Buy shoes for walking",
        "discuss shoe size, width, comfort, support, and break-in",
        "Your shoes are causing blisters; find an affordable walking replacement.",
      ),
      lesson(
        "Buy toiletries",
        "find toothpaste, deodorant, shaving, hair, skin, and travel-size products",
        "Replace a toiletry bag after the airline loses it.",
      ),
      lesson(
        "Buy a charger or adapter",
        "identify device, plug type, voltage, cable, and return policy",
        "Ask for the correct phone charger and confirm it will work locally.",
      ),
      lesson(
        "Compare quality and price",
        "ask about materials, durability, brand, alternatives, and sale price",
        "Compare a cheap emergency item with one that will last beyond the trip.",
      ),
      lesson(
        "Ask about a sale",
        "understand discount signs, final sale, multiple-item offers, and exclusions",
        "Clarify whether the displayed discount applies to your size and color.",
      ),
      lesson(
        "Pay with cash or card",
        "ask about accepted payment, contactless, currency conversion, and receipt",
        "Decline an unclear conversion choice and request the receipt.",
      ),
      lesson(
        "Request tax-free paperwork",
        "ask about eligibility, minimum purchase, passport details, and validation",
        "Complete a tax-free purchase using only necessary fictional details.",
      ),
      lesson(
        "Return or exchange an item",
        "explain the problem, show proof of purchase, and understand store policy",
        "Exchange an unworn item for another size after losing the paper receipt.",
      ),
      lesson(
        "Build an emergency outfit",
        "prioritize complete clothing for one day within a budget",
        "Buy underwear, socks, shirt, trousers, and sleepwear after luggage loss.",
      ),
      lesson(
        "Ask a clerk for honest help",
        "describe use, preferences, budget, and what you do not need",
        "Ask the clerk to help you avoid paying tourist prices for a basic item.",
      ),
      lesson(
        "Shopping midpoint review",
        "combine finding basics, sizing, trying, comparing, and paying from lessons 1–14 in one ordinary shopping trip",
        "Buy a day's worth of clothing basics, try one item, and pay, without English.",
      ),
      lesson(
        "Shop for children's clothes",
        "use age and height to find children's sizes and ask about room to grow and durable fabric",
        "Your child's luggage is lost; buy clothes for a seven-year-old using age, height, and a photo on your phone.",
      ),
      lesson(
        "Find easy-wear and mobility items",
        "ask for easy-closure shoes, compression socks, or a folding cane and about the store's elevator",
        "Find easy-closure shoes and a folding cane for an older relative and ask whether the store has an elevator.",
      ),
      lesson(
        "Check products for sensitive skin",
        "ask about fragrance-free, latex-free, or nickel-free options and read ingredient labels without seeking medical advice",
        "Find a fragrance-free sunscreen and soap for someone with very sensitive skin by reading labels with the clerk.",
      ),
      lesson(
        "Refuse a pushy sales pitch",
        "decline extended warranties, memberships, and extras politely and keep your choice",
        "The clerk pushes an extended warranty and a loyalty card with your adapter; decline both politely.",
      ),
      lesson(
        "Challenge a wrong price at the register",
        "point out a shelf-price mismatch, an unapplied sale, or a double scan and get the right total",
        "The register charges full price for a sale item and scans the socks twice; point it out and get the right total.",
      ),
      lesson(
        "Return an item without a receipt",
        "ask about card lookup, exchange, or store credit and accept policy or request a manager",
        "You lost the receipt for a jacket that doesn't fit; ask what options exist and negotiate an exchange.",
      ),
      lesson(
        "Learn local shopping customs",
        "ask about opening hours, Sunday closures, bag fees, greeting staff, and touching merchandise",
        "Ask a shop assistant why everything closes on Sunday afternoon and what visitors should know about shopping here.",
      ),
      lesson(
        "Find a specialist shop",
        "ask where to buy outdoor gear, large sizes, or specific items and get directions",
        "Ask a department-store clerk where to buy proper hiking boots in your size nearby.",
      ),
      lesson(
        "Handle an exit alarm",
        "stay calm, show your receipt, and resolve a security stop respectfully",
        "The exit alarm sounds as you leave; stay calm, show your receipt, and resolve it with security.",
      ),
      lesson(
        "Report a lost child in a store",
        "describe the child, where you last saw them, and ask staff to make an announcement and watch exits",
        "Your child wanders off in a busy department store; describe them to staff and ask for an announcement and an exit check.",
      ),
      lesson(
        "Get an item from another branch",
        "ask about stock elsewhere, transfer time, holding the item, or delivery to your lodging",
        "Your size is sold out; ask whether another branch has it, how long a transfer takes, and whether they can hold it.",
      ),
      lesson(
        "Request quick alterations",
        "ask for hemming or sleeve changes, the price, and whether it can be ready before you leave",
        "Ask the store to hem new trousers by tomorrow afternoon and confirm the price and pickup.",
      ),
      lesson(
        "Buy a replacement phone",
        "compare models, check compatibility and unlocking, and ask about setup and price in a longer conversation",
        "Your phone broke; discuss two models, compatibility, and setup with a clerk before choosing one.",
      ),
      lesson(
        "Recover from a declined card",
        "try another payment, ask them to hold items, and find a nearby ATM",
        "Your card is declined at checkout; ask the clerk to hold the items while you find an ATM and come back.",
      ),
      lesson(
        "Shopping threshold",
        "replace essentials for a family with special needs, resolve a price or return dispute, decline pressure, handle a payment problem, and keep return information without English",
        "Rebuild a lost suitcase's worth of clothing for you and a child, settling one price dispute and one declined card along the way.",
      ),
    ],
  },
  {
    id: "travel-daily-life-services",
    name: "Daily Life & Personal Services",
    emoji: "🧺",
    blurb:
      "Laundry, haircuts, repairs, post offices, printing, phone service, coworking, appointments, restrooms, local events, and short-stay household needs.",
    partners:
      "a laundromat attendant, barber, tailor, postal clerk, phone-shop worker, coworking host, or neighborhood resident",
    vocab: [
      "laundry",
      "haircut",
      "repair",
      "post office",
      "print",
      "SIM",
      "appointment",
      "neighborhood",
    ],
    lessons: [
      lesson(
        "Use a laundromat",
        "ask about machines, detergent, temperature, payment, drying, and timing",
        "Wash socks, underwear, and everyday clothes without damaging them.",
      ),
      lesson(
        "Use hotel or drop-off laundry",
        "ask price per item or weight, turnaround, pressing, and pickup",
        "Choose between same-day service and a cheaper next-day option.",
      ),
      lesson(
        "Get a haircut",
        "describe length, shape, clippers, scissors, styling, and what not to change",
        "Show and explain the haircut you want, then correct one misunderstanding before cutting.",
      ),
      lesson(
        "Use a salon or grooming service",
        "book a service, discuss preferences, sensitivities, price, and duration",
        "Arrange a simple personal-care appointment and confirm the total cost.",
      ),
      lesson(
        "Repair clothing or shoes",
        "describe a tear, broken zipper, loose sole, size adjustment, urgency, and price",
        "Ask a tailor or cobbler to make a travel item usable by tomorrow.",
      ),
      lesson(
        "Mail a postcard or package",
        "choose service, declare contents generally, ask delivery time, tracking, and customs",
        "Send gifts home and retain a tracking receipt.",
      ),
      lesson(
        "Print, copy, or scan",
        "ask for file transfer, page size, color, copies, price, and privacy",
        "Print a travel document from your phone without exposing unrelated files.",
      ),
      lesson(
        "Buy a SIM or eSIM",
        "compare data, calls, validity, activation, hotspot, and total price",
        "Choose a two-week plan and test service before leaving the shop.",
      ),
      lesson(
        "Find a public restroom",
        "ask location, fee, code, customer rule, accessibility, and closing time",
        "Find and access a restroom in a station or café.",
      ),
      lesson(
        "Book a local appointment",
        "request availability, explain the service, give a safe contact method, and confirm",
        "Make a same-week appointment for a routine personal service.",
      ),
      lesson(
        "Use a coworking space",
        "ask about day passes, Wi-Fi, calls, quiet rooms, hours, and payment",
        "Find a place for a two-hour remote meeting.",
      ),
      lesson(
        "Solve a short-stay household need",
        "ask a host about keys, trash, heating, appliances, supplies, and neighbors",
        "Report a missing key or appliance problem in a rented apartment.",
      ),
      lesson(
        "Ask about local events",
        "learn what is happening, ticket needs, timing, dress, audience, and transport",
        "Ask a resident what community event is worth attending this week.",
      ),
      lesson(
        "Talk with a neighbor",
        "introduce yourself, discuss noise, shared space, deliveries, and local routines",
        "Resolve a considerate short-stay issue with a neighbor.",
      ),
      lesson(
        "Daily-life midpoint review",
        "combine laundry, a repair, a postal errand, and a neighborhood conversation from lessons 1–14 in one ordinary day",
        "Complete three ordinary errands in one afternoon—laundry, a shoe repair, and mailing a postcard—without English.",
      ),
      lesson(
        "Recover laundry gone wrong",
        "describe a missing, shrunk, or dyed item and ask what the service will do about it",
        "Your drop-off laundry comes back with a shirt missing and a sweater shrunk; describe both and ask how they'll fix it.",
      ),
      lesson(
        "Disagree with a haircut result",
        "explain politely what differs from your request, ask for a fix, and discuss the price",
        "The barber cut much shorter than you asked; explain politely and ask what can still be corrected.",
      ),
      lesson(
        "Find a trusted babysitter",
        "ask how locals find vetted childcare, rates, hours, and what the sitter needs to know",
        "Ask your host how to find a vetted babysitter for one evening and what locals usually pay.",
      ),
      lesson(
        "Rent mobility equipment",
        "rent a wheelchair, shower chair, or walker and ask about delivery, deposit, and adjustments",
        "Rent a wheelchair for a week for a relative; ask about delivery, the deposit, and adjusting it.",
      ),
      lesson(
        "Question a service price",
        "compare the quoted price with the charge, question added extras, and agree on a fair total",
        "The salon charges far more than quoted for treatments you didn't request; question the extras and agree on a fair total.",
      ),
      lesson(
        "Collect a package held at customs",
        "understand the notice, fees, required documents, and where to pick it up",
        "A package sent to you is held for customs fees; ask what documents and payment are needed to collect it.",
      ),
      lesson(
        "Learn trash and recycling rules",
        "ask how waste is sorted, which days bins go out, and what happens if you get it wrong",
        "Ask your neighbor how trash sorting works and which day each bin goes out.",
      ),
      lesson(
        "Ask for a reliable handyman or cleaner",
        "get a recommendation, ask how to check reliability, and learn what a fair price is",
        "Ask your host to recommend a trustworthy cleaner or handyman and what a fair price looks like.",
      ),
      lesson(
        "Report a gas smell or water leak",
        "leave safely, call the emergency number or host, and describe the problem and location",
        "You smell gas in your rental apartment; get out safely, call for help, and explain exactly where you are.",
      ),
      lesson(
        "Get locked out",
        "call the host, then a locksmith, prove you are staying there, and agree on a price before work starts",
        "You're locked out of your apartment at night; call the host and then a locksmith, and agree on a price first.",
      ),
      lesson(
        "Join a gym or class for a short stay",
        "ask about trial or short passes, class schedules, rules, and what to bring",
        "Ask a gym about a two-week pass, the class schedule, and what you need to bring.",
      ),
      lesson(
        "Respond to a neighbor's complaint",
        "apologize, explain, and agree on how to avoid the problem in future",
        "A neighbor knocks to complain that your late return was loud; apologize, explain, and agree how to avoid it.",
      ),
      lesson(
        "Chat through a long appointment",
        "keep a relaxed conversation going about the city, sport, and your trip during a service",
        "During a twenty-minute haircut, keep a relaxed conversation going about the neighborhood, sport, and your travels.",
      ),
      lesson(
        "Top up credit at a kiosk",
        "top up phone or transit credit, pay at a kiosk, and confirm it worked",
        "Your prepaid data runs out; top it up at a newsstand kiosk and confirm the credit arrived.",
      ),
      lesson(
        "Daily-life threshold",
        "complete errands, resolve a service dispute, handle a household emergency or lockout, follow local rules, and sustain neighborhood conversations without English",
        "Live like a resident for a day: fix a laundry loss, handle a lockout, follow the trash rules, and chat with a neighbor.",
      ),
    ],
  },
  {
    id: "travel-markets-souvenirs",
    name: "Markets & Souvenirs",
    emoji: "🏺",
    blurb:
      "Food markets, artisan goods, quantities, tasting, bargaining, authenticity, gifts, fragile shipping, and respectful conversation with makers.",
    partners: "a market vendor, food seller, artisan, antique dealer, or shipping clerk",
    vocab: ["market", "artisan", "handmade", "price", "weight", "taste", "authentic", "ship"],
    lessons: [
      lesson(
        "Enter a local market",
        "ask about sections, hours, payment, and market customs",
        "Ask a vendor how the market works before buying anything.",
      ),
      lesson(
        "Buy fruit, cheese, or food",
        "request weight, quantity, ripeness, freshness, and packaging",
        "Buy picnic ingredients in exact quantities.",
      ),
      lesson(
        "Ask to taste",
        "request a sample, compare flavors, and decline politely",
        "Taste two local products and explain which one you prefer.",
      ),
      lesson(
        "Understand price by weight",
        "clarify unit price, estimated total, and minimum quantity",
        "Avoid a surprise by confirming the price of a product sold by weight.",
      ),
      lesson(
        "Discuss handmade goods",
        "ask who made an item, how, where, and from what material",
        "Learn the story behind a ceramic or textile before deciding.",
      ),
      lesson(
        "Check authenticity",
        "ask whether an item is local, handmade, vintage, or a reproduction",
        "Distinguish a genuine local craft from a mass-produced souvenir.",
      ),
      lesson(
        "Bargain respectfully",
        "learn whether bargaining is appropriate and make a fair counteroffer",
        "Negotiate only after asking whether the price is fixed.",
      ),
      lesson(
        "Ask for a quantity discount",
        "combine items and propose a clear total price",
        "Buy several gifts from one vendor and ask for a modest bundle price.",
      ),
      lesson(
        "Choose gifts for family",
        "describe recipients, interests, age, budget, and luggage limits",
        "Ask a vendor to suggest meaningful gifts for children and adults.",
      ),
      lesson(
        "Pack a fragile purchase",
        "request wrapping, carry-on advice, and breakage precautions",
        "Prepare a delicate ceramic item for the flight home.",
      ),
      lesson(
        "Ship a purchase home",
        "discuss address, customs description, tracking, insurance, and delivery time",
        "Ship an item using fictional contact details and retain tracking.",
      ),
      lesson(
        "Resolve a market misunderstanding",
        "clarify quantity, price, change, or an accidental commitment",
        "You thought the quoted price was total, but it was per item; repair the misunderstanding.",
      ),
      lesson(
        "Compliment the maker",
        "praise specific workmanship and ask about tradition without exoticizing",
        "Tell an artisan exactly what you admire about their work.",
      ),
      lesson(
        "Decline persistent selling",
        "say no clearly, end the interaction, and leave without escalation",
        "A seller keeps pressing after you decline; close firmly and respectfully.",
      ),
      lesson(
        "Market midpoint review",
        "combine browsing, tasting, weighing, asking about origin, and paying from lessons 1–14 in one ordinary market visit",
        "Buy lunch ingredients and one small gift at a morning market, from the first greeting to goodbye.",
      ),
      lesson(
        "Visit a market with children",
        "keep children close, ask about kid-friendly samples, restrooms, and stroller routes",
        "Navigate a crowded market with a stroller and two children, asking where to go and what they can taste.",
      ),
      lesson(
        "Plan an accessible market visit",
        "ask about step-free entrances, quieter hours, seating, and accessible restrooms",
        "Ask a stallholder when the market is least crowded and which entrance avoids steps.",
      ),
      lesson(
        "Check allergens in prepared foods",
        "ask about nuts, sesame, gluten, and sauces and read handwritten labels",
        "Ask a pastry stall what each item contains for a friend with a sesame allergy.",
      ),
      lesson(
        "Pay without the right change",
        "work out a solution when you only have a large note or the vendor takes no cards",
        "You only have a large note and the vendor has no change; find a solution without losing the purchase.",
      ),
      lesson(
        "Question a tourist price",
        "politely ask why your price differs from the posted or local price and decide whether to buy",
        "You see a local charged half of what you were quoted; ask about it respectfully and decide whether to buy.",
      ),
      lesson(
        "Point out a flaw",
        "identify a crack, bruise, or defect and ask for a replacement or a discount",
        "The ceramic bowl you chose has a hairline crack; point it out and ask for another or a discount.",
      ),
      lesson(
        "Learn market etiquette",
        "ask whether you may choose your own produce, photograph stalls, or skip the line",
        "Ask a vendor whether you may pick your own tomatoes and photograph the stall.",
      ),
      lesson(
        "Ask which stall is best",
        "get a local recommendation for a specialty and learn how to judge quality",
        "Ask a local shopper which stall sells the best olive oil and how to tell quality.",
      ),
      lesson(
        "Respond to a pickpocketing",
        "alert nearby vendors, ask for security or police, and describe what happened",
        "Someone bumps you and your phone is gone; alert nearby vendors, ask for security or police, and describe what happened.",
      ),
      lesson(
        "Pack food for the journey home",
        "ask how to pack cheese or cured meat for travel and where to check what customs allows",
        "Ask the cheesemonger how to pack cheese for a long trip home and where to check what customs permits.",
      ),
      lesson(
        "Commission a custom item",
        "agree on design, price, deposit, and pickup time for a made-to-order piece",
        "Ask a leatherworker to make a belt with your initials and agree on price, deposit, and pickup before you leave.",
      ),
      lesson(
        "Talk cooking with a vendor",
        "learn how to prepare an unfamiliar ingredient and keep the conversation going with follow-ups",
        "Ask a vegetable seller how to cook an unfamiliar seasonal vegetable, and keep asking follow-up questions.",
      ),
      lesson(
        "Exchange a purchase the next day",
        "explain a change of mind or wrong size and negotiate an exchange without a receipt",
        "Return to a stall the next day to exchange a scarf for a different color, with no receipt.",
      ),
      lesson(
        "Shop as the market closes",
        "ask about end-of-day prices, leftover produce, and closing time",
        "Arrive as the market closes and ask about end-of-day prices for bread and produce.",
      ),
      lesson(
        "Market threshold",
        "browse with special needs in mind, ask for recommendations, resolve a quality or price dispute, follow market etiquette, and handle a problem without English",
        "Spend a full morning at a market with a mixed group, finishing with a commissioned gift, one resolved dispute, and warm goodbyes.",
      ),
    ],
  },
  {
    id: "travel-hotels-lodging",
    name: "Hotels & Lodging",
    emoji: "🛎️",
    blurb:
      "Bookings, check-in, room details, luggage storage, housekeeping, laundry, repairs, recommendations, billing, and checkout.",
    partners:
      "a hotel receptionist, host, concierge, housekeeper, maintenance worker, or booking agent",
    vocab: [
      "booking",
      "check-in",
      "room",
      "key",
      "luggage storage",
      "laundry",
      "repair",
      "checkout",
    ],
    lessons: [
      lesson(
        "Book a room directly",
        "ask about dates, room types, total price, cancellation, and taxes",
        "Compare a direct hotel quote with an online price.",
      ),
      lesson(
        "Check in",
        "give the booking name, show required documents, and confirm stay details",
        "Complete check-in while asking only necessary privacy questions.",
      ),
      lesson(
        "Choose a room",
        "ask about bed, floor, view, quiet, stairs, elevator, and accessibility",
        "Request a quiet room and understand the available compromise.",
      ),
      lesson(
        "Store luggage",
        "ask to leave bags before check-in or after checkout and get a claim tag",
        "Store luggage safely for several hours.",
      ),
      lesson(
        "Ask about hotel services",
        "confirm breakfast, Wi-Fi, gym, pool, reception hours, and transport",
        "Learn which services are included and which cost extra.",
      ),
      lesson(
        "Report noise",
        "describe source, timing, severity, and desired resolution",
        "A neighboring room is loud late at night; ask the desk to help.",
      ),
      lesson(
        "Report heat, air, or plumbing trouble",
        "describe a room problem and arrange inspection or repair",
        "The air conditioning and shower are not working correctly.",
      ),
      lesson(
        "Request towels and supplies",
        "ask housekeeping for missing linens, soap, bedding, or other basics",
        "Request only the items missing from the room.",
      ),
      lesson(
        "Use laundry service",
        "ask about self-service, hotel laundry, price, timing, and delicate items",
        "Get clothes cleaned before an early departure.",
      ),
      lesson(
        "Communicate with housekeeping",
        "ask when service occurs, decline it, or request a later visit",
        "Coordinate room cleaning around a remote meeting or nap.",
      ),
      lesson(
        "Ask a concierge",
        "request a restaurant, pharmacy, taxi, or neighborhood recommendation with criteria",
        "Ask for a non-touristy dinner within walking distance and a stated budget.",
      ),
      lesson(
        "Change or extend the stay",
        "ask about another night, room move, price, and availability",
        "Extend by one night without losing the current room if possible.",
      ),
      lesson(
        "Request late checkout",
        "ask about time, availability, fee, and luggage alternatives",
        "Negotiate a practical plan for a late flight.",
      ),
      lesson(
        "Correct the hotel bill",
        "identify an unfamiliar minibar, tax, fee, or duplicate charge",
        "Review the folio and dispute one concrete error calmly.",
      ),
      lesson(
        "Lodging midpoint review",
        "combine checking in, choosing a room, requesting supplies, and asking for a recommendation from lessons 1–14 in one ordinary stay",
        "Check in, settle into your room, ask for extra towels, and get a dinner tip, without English.",
      ),
      lesson(
        "Arrive at an overbooked hotel",
        "ask for a comparable room nearby, free transport, and written confirmation",
        "The hotel says it's overbooked; ask for a comparable room nearby, free transport, and written confirmation.",
      ),
      lesson(
        "Verify an accessible room",
        "confirm roll-in shower, grab bars, door width, and elevator access before accepting a room",
        "Confirm that the accessible room really has a roll-in shower, grab bars, and a wide enough door before you accept it.",
      ),
      lesson(
        "Stay with a baby or children",
        "ask for a cot, an extra bed, connecting rooms, and a quiet location",
        "Ask for a cot, an extra bed, and a room away from the elevator for a family with a baby.",
      ),
      lesson(
        "Insist on the room you booked",
        "politely compare the booking with the room and propose fair alternatives",
        "Your paid sea-view room faces a parking lot; politely insist on what you booked or a fair alternative.",
      ),
      lesson(
        "Dispute a deposit or damage fee",
        "review a damage claim or unreleased hold and dispute it calmly with evidence",
        "Checkout claims a stained towel and keeps part of your deposit; review the charge and dispute it calmly.",
      ),
      lesson(
        "Understand city tax and registration",
        "ask why tourist tax is charged, how to pay it, and why identity documents are copied",
        "Ask why you must pay a city tax in cash and why the desk needs to copy your passport.",
      ),
      lesson(
        "Ask for a safe evening route",
        "ask which streets to use at night and where to find late food",
        "Ask the night receptionist for a safe walking route to a late-night restaurant.",
      ),
      lesson(
        "Respond to a fire alarm",
        "follow staff instructions, find the exit and assembly point, and report someone missing",
        "The fire alarm sounds at 3 a.m.; follow instructions, find the assembly point, and report a family member you cannot find.",
      ),
      lesson(
        "Report a lock or safe failure",
        "explain that your door will not lock or the safe is jammed and request urgent help",
        "Your door won't lock and the safe is jammed with your passport inside; get both fixed urgently.",
      ),
      lesson(
        "Report bedbugs or a dirty room",
        "show evidence, request a different room, and ask how your belongings will be handled",
        "You find signs of bedbugs; show the evidence, request a different room, and ask about your clothes.",
      ),
      lesson(
        "Get into a vacation rental",
        "use a key box or code, contact the host, and describe the entrance when something fails",
        "Your rental host's key-box code doesn't work; call them, describe the door, and get in.",
      ),
      lesson(
        "Arrange a special-occasion surprise",
        "request flowers, a cake, a quiet floor, or a room note and ask for discretion",
        "Arrange a birthday surprise for your partner with the front desk—flowers, a late cake, and discretion.",
      ),
      lesson(
        "Chat with the night receptionist",
        "keep a longer conversation going about the city, their work, and favorite places",
        "Unable to sleep, you chat with the night receptionist about the city's history and their favorite places.",
      ),
      lesson(
        "Leave early and negotiate a refund",
        "explain why you must leave, ask about the cancellation policy, and negotiate a partial refund",
        "A family emergency means leaving two nights early; ask about the policy and negotiate a partial refund.",
      ),
      lesson(
        "Lodging threshold",
        "book, arrive, handle an overbooking or room dispute, meet special needs, respond to a safety problem, settle charges, and check out without English",
        "Manage an entire stay from an overbooked arrival through a broken lock and a disputed deposit to a warm farewell at checkout.",
      ),
    ],
  },
  {
    id: "travel-taxi-rideshare",
    name: "Taxis & Rideshare",
    emoji: "🚕",
    blurb:
      "Taxi ranks, licensed cars, meters, fares, routes, traffic, luggage, stops, safety, payment, receipts, and driver conversation.",
    partners: "a taxi driver, rideshare driver, dispatcher, hotel doorman, or taxi-rank attendant",
    vocab: ["taxi rank", "licensed", "meter", "fare", "route", "traffic", "stop", "receipt"],
    lessons: [
      lesson(
        "Find a legitimate taxi",
        "ask where the official rank is and identify licensed service",
        "Avoid an unofficial airport solicitation and locate the proper rank.",
      ),
      lesson(
        "Confirm driver and passenger",
        "verify name, plate, destination, and pickup point",
        "Confirm the rideshare safely before getting in.",
      ),
      lesson(
        "Give a destination",
        "state address, landmark, entrance, and pronunciation clearly",
        "Direct the driver to a hard-to-find lodging entrance.",
      ),
      lesson(
        "Ask about meter or fixed price",
        "confirm fare method, supplements, estimate, and airport rate",
        "Clarify the price before leaving the taxi rank.",
      ),
      lesson(
        "Discuss the route",
        "ask about fastest, simplest, scenic, toll, or low-traffic options",
        "Choose between a faster toll route and a slower city route.",
      ),
      lesson(
        "Handle traffic and timing",
        "ask about delay, estimated arrival, and alternatives",
        "You may miss a train; ask what is realistically possible.",
      ),
      lesson(
        "Add a stop",
        "request a brief stop, explain purpose, and ask how it affects fare",
        "Pick up another traveler without confusing the final destination.",
      ),
      lesson(
        "Manage luggage",
        "describe bags, request trunk help, and confirm nothing is left",
        "Load several bags and check the trunk at arrival.",
      ),
      lesson(
        "Ask the driver to wait",
        "request waiting time, price, location, and how to reconnect",
        "Ask the driver to wait during a quick errand and agree on terms.",
      ),
      lesson(
        "Correct a wrong turn",
        "clarify destination without accusation and use a landmark",
        "The route appears wrong; ask the driver to confirm where you are going.",
      ),
      lesson(
        "Set a safety boundary",
        "ask to slow down, stop, or let you out in a safe place",
        "The driving feels unsafe; communicate clearly and end the ride if needed.",
      ),
      lesson(
        "Make driver small talk",
        "talk about neighborhood, traffic, work, and local recommendations",
        "Have a friendly but privacy-conscious conversation.",
      ),
      lesson(
        "Pay the fare",
        "use cash, card, app, or contactless and confirm change",
        "Pay after clarifying an added luggage or night supplement.",
      ),
      lesson(
        "Request a receipt and thank the driver",
        "ask for documentation, tip appropriately, and close warmly",
        "Get a receipt for travel expenses and give a specific thank-you.",
      ),
      lesson(
        "Taxi midpoint review",
        "combine finding, confirming, directing, and paying for a ride from lessons 1–14 in one ordinary trip",
        "Take an ordinary taxi from the station to your hotel, confirming the price and paying, without English.",
      ),
      lesson(
        "Dispute an inflated fare",
        "refer to the official rate, question extra fees calmly, and ask for a receipt",
        "The driver demands double the posted airport rate; refer to the official fare calmly and ask for a receipt.",
      ),
      lesson(
        "Ride with young children",
        "ask about car seats or boosters, stroller space, and seat belts",
        "Book a ride for two small children and ask whether the car will have proper car seats.",
      ),
      lesson(
        "Book an accessible vehicle",
        "request a ramp or accessible van and explain how much boarding help you need",
        "Request a wheelchair-accessible taxi and explain how much help you need getting in.",
      ),
      lesson(
        "Ride with a service animal",
        "explain the animal's role calmly and ask for the ride or a referral",
        "A driver hesitates at your service dog; explain calmly and ask for the ride or another option.",
      ),
      lesson(
        "Negotiate the drop-off point",
        "ask for a closer, legal place to stop when a restricted zone blocks the entrance",
        "The driver wants to leave you a long walk from the hotel because of a restricted zone; negotiate a closer, legal spot.",
      ),
      lesson(
        "Use a shared taxi",
        "ask how the route works, where to sit, when to signal your stop, and how the fare is split",
        "At a shared-taxi stand, ask how the route works, where to sit, and how the fare is divided.",
      ),
      lesson(
        "Pre-book an early pickup",
        "schedule a pickup by phone and confirm time, address, price, and driver contact",
        "Book a 4 a.m. airport pickup by phone and confirm the time, address, price, and how the driver will reach you.",
      ),
      lesson(
        "Recover an item left in a taxi",
        "call the company or use the app, give trip details, and arrange the item's return",
        "You left your phone in a taxi; call the dispatcher, give the trip details, and arrange its return.",
      ),
      lesson(
        "Handle a minor collision",
        "check that everyone is unhurt, ask for police if needed, and collect the driver's details",
        "Your taxi is rear-ended; check everyone is okay, ask for police if needed, and get the driver's details.",
      ),
      lesson(
        "Get to an emergency entrance fast",
        "tell the driver it is urgent and give the hospital and entrance clearly",
        "Your companion is in severe pain; ask the driver to take you directly to the nearest hospital emergency entrance.",
      ),
      lesson(
        "Pay when the card reader fails",
        "agree on cash, an app transfer, or an ATM stop when payment fails",
        "The card reader stops working at the end of the ride; agree on another way to pay.",
      ),
      lesson(
        "Hire a driver for half a day",
        "agree in advance on an hourly rate, stops, waiting, and meals",
        "Negotiate a four-hour hire with a driver to visit three villages, agreeing on the price and stops first.",
      ),
      lesson(
        "Talk on a long transfer",
        "keep a friendly conversation going and steer away gently from a topic you'd rather avoid",
        "On a 90-minute ride to the coast, keep a conversation going and change the subject gracefully when needed.",
      ),
      lesson(
        "Report a driver concern",
        "describe unsafe driving or rude behavior to the company with time, plate, and route",
        "After a frightening ride, report the driver's behavior to the taxi company with the time, plate, and route.",
      ),
      lesson(
        "Taxi threshold",
        "find, book, and complete rides with special needs, a fare or drop-off dispute, a lost item or accident, and a long conversation, then pay and exit safely without English",
        "Handle a full day of rides from a 4 a.m. airport pickup through a fare dispute and a lost phone to a safe arrival.",
      ),
    ],
  },
  {
    id: "travel-trains-transit",
    name: "Trains, Buses & Transit",
    emoji: "🚆",
    blurb:
      "Tickets, platforms, validation, classes, transfers, delays, luggage, night service, accessibility, cancellations, and missed stops.",
    partners: "a ticket agent, conductor, station worker, bus driver, or fellow passenger",
    vocab: ["ticket", "platform", "validate", "transfer", "delay", "seat", "luggage", "strike"],
    lessons: [
      lesson(
        "Choose the right ticket",
        "ask about destination, departure, flexibility, class, and return",
        "Compare a fast train with a cheaper regional option.",
      ),
      lesson(
        "Use a ticket machine",
        "ask for help with language, route, passenger type, and payment",
        "Complete a machine purchase with one unclear screen.",
      ),
      lesson(
        "Validate or activate a ticket",
        "ask whether, where, and when validation is required",
        "Prevent a fine by confirming how a paper or mobile ticket becomes valid.",
      ),
      lesson(
        "Find the platform",
        "ask about track, departure board, changes, and walking time",
        "Locate a platform after a last-minute track change.",
      ),
      lesson(
        "Find the correct car and seat",
        "understand coach, carriage, class, reservation, and direction",
        "Board the right section and resolve someone sitting in your seat.",
      ),
      lesson(
        "Manage luggage",
        "ask where bags go, what is permitted, and how to keep them nearby",
        "Place a large suitcase without blocking the aisle.",
      ),
      lesson(
        "Make a connection",
        "confirm transfer station, platform, time, and whether one ticket covers both legs",
        "Navigate a tight train-to-bus connection.",
      ),
      lesson(
        "Handle a delay",
        "ask for cause, estimate, updates, and missed-connection protection",
        "A delay threatens the final connection; learn your options.",
      ),
      lesson(
        "Handle cancellation or strike",
        "ask what is running, rebook, request refund, and find alternatives",
        "Transit is disrupted by a strike; build a new route.",
      ),
      lesson(
        "Use city buses",
        "ask about stop, fare, boarding door, signal, and final service",
        "Take a local bus to a neighborhood outside the center.",
      ),
      lesson(
        "Transfer on the metro",
        "ask about lines, direction, exits, and ticket validity",
        "Make two metro transfers and choose the correct station exit.",
      ),
      lesson(
        "Ask about night service",
        "learn the last departure, night route, safety, and backup options",
        "Plan how to return after a late dinner.",
      ),
      lesson(
        "Request accessibility help",
        "ask about elevators, step-free routes, assistance, and boarding",
        "Find an accessible route through an unfamiliar station.",
      ),
      lesson(
        "Recover from a missed stop",
        "tell staff what happened and find the safest correction",
        "You passed your stop; ask whether to continue or reverse.",
      ),
      lesson(
        "Transit midpoint review",
        "combine buying, validating, finding the platform, and boarding from lessons 1–14 in one ordinary journey",
        "Buy a ticket, find your train, and take your seat for an ordinary trip, without English.",
      ),
      lesson(
        "Face a ticket inspector's fine",
        "explain a validation mistake politely, ask about options, and handle the fine",
        "An inspector says your ticket wasn't validated; explain politely, ask about your options, and handle the fine.",
      ),
      lesson(
        "Resolve a double-booked seat",
        "compare tickets with another passenger and ask the conductor to sort it out politely",
        "A passenger says you're in their seat but your ticket shows the same number; resolve it with the conductor.",
      ),
      lesson(
        "Travel with children on transit",
        "ask about child fares, stroller space, family areas, and staying together",
        "Ask about child fares and where to put a stroller on a crowded regional train.",
      ),
      lesson(
        "Bring a bicycle or bulky gear",
        "ask whether bikes or sports gear are allowed, where they go, and about reservations or fees",
        "Ask whether you can take a bicycle on the regional train and where to put it.",
      ),
      lesson(
        "Fix a double fare charge",
        "explain that a gate or reader charged you twice and ask how to reverse it",
        "The contactless gate charged you twice; ask station staff how to get one charge reversed.",
      ),
      lesson(
        "Learn transit etiquette",
        "ask about quiet cars, standing sides, giving up seats, eating, and phone calls",
        "Ask a fellow passenger about quiet-car rules and whether eating on board is acceptable.",
      ),
      lesson(
        "Ask for the best route",
        "compare fastest, cheapest, and most scenic options with a station agent",
        "Ask a station agent whether the bus or the slow train is better for reaching a hill town, and why.",
      ),
      lesson(
        "Report harassment on board",
        "move away, find staff, and describe the person and what happened",
        "A passenger keeps bothering you; move seats, find the conductor, and describe what happened.",
      ),
      lesson(
        "Get help for a sick passenger",
        "use the alarm, tell staff the car number, and describe what you saw",
        "A passenger collapses in your carriage; press the alarm, tell staff the car number, and describe what you saw.",
      ),
      lesson(
        "Recover a bag left on a train",
        "contact lost property with train number, car, seat, and a description",
        "Your backpack is still on the departed train; contact lost property with the train number, car, and description.",
      ),
      lesson(
        "Choose a multi-day pass",
        "compare passes by zones, validity, ID needs, and value",
        "Compare a three-day city pass and a regional pass at the ticket office and choose the better value.",
      ),
      lesson(
        "Ride an overnight sleeper",
        "find your berth, ask about locking the compartment, bedding, and a wake-up call",
        "Board an overnight train, find your berth, ask about locking the compartment, and arrange a wake-up call.",
      ),
      lesson(
        "Talk with a fellow passenger",
        "sustain a long conversation about destinations, work, and travel on a long ride",
        "On a four-hour journey, keep a conversation going with the passenger opposite you about where you're both heading.",
      ),
      lesson(
        "Use a replacement bus",
        "find the replacement stop, confirm ticket validity, and ask about timing",
        "Your line is closed for works; find the replacement bus stop and confirm your ticket is valid on it.",
      ),
      lesson(
        "Transit threshold",
        "plan, buy, and complete a multi-leg journey with special needs, a ticket or seat dispute, a disruption, an emergency, and a long conversation without English",
        "Cross the region by rail and bus with a family, handling a fine, a seat mix-up, a replacement bus, and a long chat on board.",
      ),
    ],
  },
  {
    id: "travel-scooter-car-rental",
    name: "Vespa, Scooter & Car Rental",
    emoji: "🛵",
    blurb:
      "Real rental prices, deposits, licenses, insurance, helmets, damage checks, fuel, restricted zones, parking, breakdowns, and returns.",
    partners:
      "a Vespa or scooter rental clerk, car-rental agent, parking attendant, or roadside dispatcher",
    vocab: [
      "daily rate",
      "deposit",
      "license",
      "insurance",
      "helmet",
      "damage",
      "fuel",
      "restricted zone",
    ],
    lessons: [
      lesson(
        "Compare Vespa rental prices",
        "ask for hourly, daily, multi-day, tax, and total prices",
        "In Rome, compare the real all-in price of renting a Vespa for one day versus three.",
      ),
      lesson(
        "Understand the deposit",
        "ask amount, payment method, hold duration, and release conditions",
        "Clarify exactly what will be blocked on the card and when it returns.",
      ),
      lesson(
        "Confirm license and age rules",
        "ask which license, international permit, age, and experience are required",
        "Check eligibility before providing fictional booking details.",
      ),
      lesson(
        "Compare insurance",
        "ask about liability, theft, damage, deductible, exclusions, and roadside help",
        "Choose coverage after having the clerk explain what is not covered.",
      ),
      lesson(
        "Get helmets and safety gear",
        "request correct sizes, passenger gear, locks, and reflective equipment",
        "Fit two helmets and replace one that does not feel secure.",
      ),
      lesson(
        "Learn scooter controls",
        "ask for start, stand, lights, indicators, brakes, storage, and lock",
        "Have the clerk demonstrate the scooter before leaving.",
      ),
      lesson(
        "Document existing damage",
        "name scratches, dents, mirrors, tires, fuel level, and photos",
        "Walk around the vehicle and add overlooked damage to the contract.",
      ),
      lesson(
        "Ask about fuel or charging",
        "identify fuel type, tank policy, charging, range, and nearby station",
        "Confirm how and where the vehicle must be refueled.",
      ),
      lesson(
        "Understand parking",
        "ask where scooters or cars may park, payment, towing, and overnight rules",
        "Find legal parking near a central attraction.",
      ),
      lesson(
        "Understand restricted zones",
        "ask about ZTL, congestion zones, cameras, permits, and fines",
        "Plan a Rome route that avoids restricted traffic zones.",
      ),
      lesson(
        "Plan tolls and roads",
        "ask about tolls, motorway rules, local roads, and passenger restrictions",
        "Choose a safe day-trip route appropriate for the rented vehicle.",
      ),
      lesson(
        "Extend or change the rental",
        "ask about extra hours, another day, vehicle swap, and price",
        "Extend the Vespa rental without creating a late-return penalty.",
      ),
      lesson(
        "Report a breakdown or accident",
        "state location, condition, injuries, damage, and need for assistance",
        "The scooter will not start; contact roadside service and follow safe instructions.",
      ),
      lesson(
        "Return and dispute damage",
        "review fuel, time, inspection, deposit, receipt, and a disputed scratch",
        "Return the vehicle and use departure photos to challenge an incorrect charge.",
      ),
      lesson(
        "Rental midpoint review",
        "combine comparing prices, signing, inspecting, and learning controls from lessons 1–14 in one ordinary pickup",
        "Rent a scooter for the day from the first price check to riding away, without English.",
      ),
      lesson(
        "Refuse unwanted add-ons",
        "ask what is mandatory and decline extra insurance, GPS, or upgrades politely",
        "The agent pushes premium insurance and a GPS; ask what's required and decline the rest.",
      ),
      lesson(
        "Rent with child seats",
        "reserve the right seats for each child's age, check them, and ask for help installing them",
        "Reserve two child seats, check they're the right type, and ask the agent to help install them.",
      ),
      lesson(
        "Rent an adapted vehicle",
        "ask about automatic transmission, hand controls, and using a disabled parking badge",
        "Ask whether the agency offers an automatic car with hand controls and how your disabled parking badge works here.",
      ),
      lesson(
        "Handle a missing reservation",
        "show your booking and insist politely on an equivalent vehicle at the same price",
        "The agency has no car of the class you booked; insist politely on an equivalent at the same price.",
      ),
      lesson(
        "Dispute fuel or cleaning fees",
        "show receipts and photos to challenge a refueling or cleaning charge",
        "You returned the car full, but you're charged a refueling fee and a cleaning fee; dispute both with your receipts.",
      ),
      lesson(
        "Understand a traffic ticket",
        "ask what a ticket means, how to pay it, and what fee the agency adds",
        "You find a parking ticket on the scooter; ask the agency what it means, how to pay, and what fee they add.",
      ),
      lesson(
        "Learn local driving customs",
        "ask about roundabout priority, horn use, lane splitting, and speed cameras",
        "Ask the rental agent what visitors usually misunderstand about driving and parking in the city.",
      ),
      lesson(
        "Return after closing time",
        "ask how the key drop works and how damage and fuel will be checked later",
        "Your flight means returning the car after closing; ask how the key drop works and how damage will be checked.",
      ),
      lesson(
        "Get stopped by the police",
        "show your license and rental papers and understand what the officers are checking",
        "Police wave you over at a checkpoint; show your license and rental papers and understand what they're checking.",
      ),
      lesson(
        "Lose the vehicle key",
        "call the agency, explain where the vehicle is, and ask about a spare and the fee",
        "You've lost the scooter key at the beach; call the agency, explain where the scooter is, and ask about a spare.",
      ),
      lesson(
        "Add a second driver",
        "ask about documents, fees, and insurance coverage for another driver",
        "Add your partner as a second driver halfway through the rental and confirm their insurance coverage.",
      ),
      lesson(
        "Take a rental on a ferry",
        "ask whether ferries or borders are allowed and what extra cover or documents are needed",
        "Ask whether you may take the rental car on a ferry to an island and what extra cover is needed.",
      ),
      lesson(
        "Talk roads with the owner",
        "keep a long conversation going about routes, road conditions, weather, and favorite rides",
        "Before setting off, have a long conversation with the rental owner about the region's roads, weather, and best rides.",
      ),
      lesson(
        "Rent from a private owner",
        "ask about papers, insurance, and a written agreement before accepting an informal rental",
        "A guesthouse owner offers his own scooter; ask about papers, insurance, and a written agreement before accepting.",
      ),
      lesson(
        "Rental threshold",
        "compare, contract, and operate a rental with special needs, decline add-ons, handle a police stop or lost key, dispute charges, and return it without English",
        "Run an entire week's rental from a missing reservation through a police check, a lost key, and a disputed fuel charge.",
      ),
    ],
  },
  {
    id: "travel-roadside-mechanics",
    name: "Roadside Help & Mechanics",
    emoji: "🔧",
    blurb:
      "Strange noises, warning lights, flat tires, batteries, overheating, scooter trouble, towing, estimates, authorization, timing, and receipts.",
    partners:
      "an auto mechanic, scooter mechanic, roadside dispatcher, tow operator, or rental-company agent",
    vocab: [
      "noise",
      "warning light",
      "flat tire",
      "battery",
      "overheating",
      "tow",
      "estimate",
      "repair",
    ],
    lessons: [
      lesson(
        "Describe a strange noise",
        "say when, where, speed, motion, and sound without diagnosing",
        "Explain a new grinding or rattling noise to a mechanic.",
      ),
      lesson(
        "Explain a warning light",
        "identify color, symbol, timing, and vehicle behavior",
        "Report a dashboard light and ask whether the vehicle should be driven.",
      ),
      lesson(
        "Handle a flat tire",
        "state location, tire condition, spare availability, and safety",
        "Call roadside help for a flat on an unfamiliar road.",
      ),
      lesson(
        "Handle a dead battery",
        "describe symptoms and ask about jump, replacement, or pickup",
        "The rental car will not start in a hotel garage.",
      ),
      lesson(
        "Report overheating",
        "describe temperature, steam, smell, and where the vehicle stopped",
        "Contact help after safely stopping an overheating vehicle.",
      ),
      lesson(
        "Report brake trouble",
        "describe softness, noise, pulling, vibration, or warning light",
        "Tell the rental company the brakes feel unsafe and request replacement transport.",
      ),
      lesson(
        "Fix a scooter that will not start",
        "describe ignition, stand, key, fuel, battery, and recent use",
        "Work through basic non-technical checks with the rental clerk.",
      ),
      lesson(
        "Request a tow",
        "give safe location, vehicle description, destination, and passenger count",
        "Arrange towing from a rural road using landmarks.",
      ),
      lesson(
        "Ask for a diagnostic estimate",
        "separate inspection fee, labor, parts, tax, and maximum authorization",
        "Ask what diagnosis costs before agreeing to repairs.",
      ),
      lesson(
        "Authorize or decline work",
        "approve exact repairs, cap spending, or request time to contact the rental company",
        "Approve one necessary repair but decline unrelated maintenance.",
      ),
      lesson(
        "Ask about repair time",
        "learn parts availability, start time, finish estimate, and transport alternatives",
        "Decide whether to wait, rent another vehicle, or change plans.",
      ),
      lesson(
        "Understand parts choices",
        "compare original, aftermarket, used, availability, warranty, and price",
        "Ask for the safest practical option without claiming technical expertise.",
      ),
      lesson(
        "Call the rental company",
        "report the problem, get authorization, and avoid paying twice",
        "Coordinate mechanic and rental agent before work begins.",
      ),
      lesson(
        "Collect proof and receipt",
        "request itemized work, old parts if appropriate, warranty, and payment record",
        "Pay for an authorized repair and gather documents for reimbursement.",
      ),
      lesson(
        "Mechanic midpoint review",
        "combine describing a symptom, asking for an estimate, and authorizing work from lessons 1–14 in one ordinary repair",
        "Get a simple repair done from describing the noise to paying the receipt, without English.",
      ),
      lesson(
        "Stay safe on the shoulder",
        "use hazard lights, a warning triangle, and a vest, move passengers away, and give your exact location",
        "Your car stalls on a highway shoulder at night; get everyone safe and call for help with your exact location.",
      ),
      lesson(
        "Break down with children aboard",
        "tell the dispatcher about children and ask how they will ride and where you can wait",
        "Tell the tow dispatcher you have two young children and ask how they'll ride and where you can wait.",
      ),
      lesson(
        "Arrange transport for a wheelchair user",
        "request a tow and onward transport that can carry a passenger and a wheelchair",
        "Your passenger uses a wheelchair; arrange a tow and onward transport that can carry both.",
      ),
      lesson(
        "Question an extra repair",
        "ask why each recommended repair is needed and decline what is not urgent",
        "The mechanic also recommends new brakes and filters; ask why each is needed and decline what isn't urgent.",
      ),
      lesson(
        "Dispute a bill above the estimate",
        "compare the bill with the approved estimate line by line and dispute unapproved work",
        "The bill is twice the estimate you approved; go through each line and dispute the unapproved work.",
      ),
      lesson(
        "Handle a wrong-fuel mistake",
        "stop before starting the engine and explain the mistake to roadside assistance",
        "You put diesel in a petrol car; don't start it, and explain the problem to roadside assistance.",
      ),
      lesson(
        "Learn how local garages work",
        "ask about hours, lunch closures, appointments, and how locals pay",
        "Ask a mechanic when shops close for lunch and on weekends and how locals usually pay.",
      ),
      lesson(
        "Find an honest garage",
        "ask a local for a trustworthy repair shop and directions",
        "Ask a gas-station attendant which nearby garage is honest and how to get there.",
      ),
      lesson(
        "Break down far from town",
        "flag down help and describe your location using road markers and landmarks",
        "Your scooter dies on a mountain road with no signal; flag down a driver and explain where you are using road markers.",
      ),
      lesson(
        "Exchange details after a collision",
        "share insurance and contact details, take photos, and complete an accident form together without assigning blame",
        "After a minor collision, exchange details with the other driver and fill out the accident report together.",
      ),
      lesson(
        "Find lodging during a repair",
        "ask about nearby places to stay, transport, and when the vehicle will be ready",
        "The part won't arrive until tomorrow; ask the mechanic about a nearby place to stay and how to get there.",
      ),
      lesson(
        "Get help for keys locked inside",
        "explain urgently that the keys are locked inside and ask for the fastest safe help",
        "You've locked the keys inside the car with the engine running; call for help and explain urgently.",
      ),
      lesson(
        "Understand what failed",
        "keep asking follow-up questions until you can explain the fault and prevention yourself",
        "Have the mechanic explain what failed and why, asking questions until you could explain it to the rental company.",
      ),
      lesson(
        "Book a pre-trip check",
        "ask for tires, fluids, and lights to be checked and get a price before a long drive",
        "Before a long mountain drive, ask a garage to check tires, fluids, and lights and quote the price.",
      ),
      lesson(
        "Mechanic threshold",
        "stay safe, describe, estimate, authorize, dispute unapproved work, coordinate special needs and the rental company, and document everything without English",
        "Handle a breakdown from a dark roadside through an inflated bill and a night near the garage to a fully documented repair.",
      ),
    ],
  },
  {
    id: "travel-guides-attractions",
    name: "Guides, Tours & Attractions",
    emoji: "🏛️",
    blurb:
      "Tour booking, meeting points, tickets, history, cultural questions, food tours, day trips, accessibility, changes, tipping, and meaningful thanks.",
    partners: "a tour guide, museum worker, ticket seller, activity operator, or local expert",
    vocab: [
      "guided tour",
      "ticket",
      "meeting point",
      "duration",
      "history",
      "photo",
      "day trip",
      "tip",
    ],
    lessons: [
      lesson(
        "Choose a tour",
        "compare private, group, walking, bus, food, language, and price",
        "Ask which Rome tour best fits history interests and limited walking.",
      ),
      lesson(
        "Book with a guide",
        "confirm date, start, duration, group size, language, and total",
        "Book a small-group tour and repeat every key detail.",
      ),
      lesson(
        "Find the meeting point",
        "ask for landmark, entrance, guide identification, and arrival time",
        "Locate a guide near a crowded historic site.",
      ),
      lesson(
        "Understand ticket inclusion",
        "ask about entry, skip-the-line claims, reservations, extras, and exclusions",
        "Clarify whether attraction tickets are actually included.",
      ),
      lesson(
        "Ask historical questions",
        "ask when, who, why, change over time, and evidence",
        "Ask a guide thoughtful follow-up questions about a monument.",
      ),
      lesson(
        "Ask about local customs",
        "ask what residents do, what is respectful, and what visitors misunderstand",
        "Learn one custom relevant to the neighborhood you are visiting.",
      ),
      lesson(
        "Ask photography rules",
        "confirm flash, video, tripods, people, sacred places, and posting",
        "Ask before photographing inside a cultural or religious site.",
      ),
      lesson(
        "Request accessibility support",
        "discuss stairs, distance, seating, pace, toilets, and alternatives",
        "Adapt a walking tour for a traveler with limited mobility.",
      ),
      lesson(
        "Join a food tour",
        "ask ingredients, regional origin, tasting order, and dietary needs",
        "Participate actively in a market and food tasting tour.",
      ),
      lesson(
        "Plan a day trip",
        "ask transport, pickup, travel time, meals, clothing, and return",
        "Compare a guided day trip with independent travel.",
      ),
      lesson(
        "Change or cancel",
        "ask about weather, minimum group, rescheduling, refund, and credit",
        "A storm affects the activity; negotiate a clear alternative.",
      ),
      lesson(
        "Handle a disappointing tour",
        "describe a mismatch, missing inclusion, or unsafe issue and request resolution",
        "The advertised language or entry was not provided.",
      ),
      lesson(
        "Connect with the guide",
        "share interests, ask personal-but-not-intrusive questions, and respond",
        "Have a genuine cultural exchange after the formal tour.",
      ),
      lesson(
        "Thank and review the guide",
        "give specific praise, ask how to tip, and describe a fair review",
        "Tell the guide exactly what story changed how you saw the city.",
      ),
      lesson(
        "Guide midpoint review",
        "combine booking, meeting the guide, asking questions, and following site rules from lessons 1–14 in one ordinary tour",
        "Take an ordinary walking tour from the meeting point to the final stop, asking at least three questions.",
      ),
      lesson(
        "Tour with children",
        "ask a guide to adapt pace, breaks, family tickets, and activities for children",
        "Ask a guide to adapt a museum tour for a bored eight-year-old and a toddler.",
      ),
      lesson(
        "Ask for sensory accessibility",
        "ask about tactile exhibits, captions, audio description, and sign-language tours",
        "Ask whether the museum offers tactile exhibits or a sign-language tour for your companion.",
      ),
      lesson(
        "Dress for a sacred site",
        "ask what clothing, shoes, and behavior are expected and where to get a cover",
        "You're stopped at a church door for bare shoulders; ask what is required and where to get a cover.",
      ),
      lesson(
        "Rejoin a lost tour group",
        "call the guide, describe where you are, and agree on where to meet",
        "You've lost your tour group in a crowded square; call the guide and agree where to rejoin.",
      ),
      lesson(
        "Claim a refund for a closed site",
        "explain that a paid attraction was closed and ask for a refund or alternative",
        "The site you paid to visit is unexpectedly closed; ask the tour company for a refund or an alternative.",
      ),
      lesson(
        "Disagree with a guide's claim",
        "raise a factual doubt politely and discuss the evidence respectfully",
        "The guide states a date you believe is wrong; raise it politely and discuss the evidence.",
      ),
      lesson(
        "Find a place tourists skip",
        "ask for a lesser-known site, the best time to go, and how to get there",
        "Ask your guide which nearby place locals love that tourists usually skip, and how to get there.",
      ),
      lesson(
        "Get help for someone unwell",
        "alert the guide, find shade and water, and ask for medical help if needed",
        "A group member becomes dizzy in the midday heat; alert the guide, find shade and water, and ask for medical help.",
      ),
      lesson(
        "Refuse a fake guide",
        "decline an unofficial offer firmly and find real staff when payment is demanded",
        "A friendly stranger offers an official-sounding tour and then demands payment; decline firmly and find real staff.",
      ),
      lesson(
        "Ask about conservation rules",
        "learn where drones, swimming, climbing, and touching are allowed and why",
        "Ask a park ranger where drones, swimming, and climbing are allowed and why.",
      ),
      lesson(
        "Discuss the city today",
        "sustain a longer conversation about current life, change, and tourism's effect on residents",
        "Over a coffee break, talk with your guide at length about how tourism has changed the city.",
      ),
      lesson(
        "Join a group excursion",
        "introduce yourself to fellow travelers, share plans, and coordinate free time",
        "On a minibus day trip, introduce yourself to fellow travelers and agree on plans for the free hour.",
      ),
      lesson(
        "Rent an audio guide",
        "ask about the deposit, language options, how to use it, and help when it fails",
        "Rent an audio guide, ask about the deposit and languages, and get help when it stops working.",
      ),
      lesson(
        "Attend a festival or night event",
        "ask where to stand, what to bring, crowd safety, and how to get back",
        "Ask how to attend tonight's festival procession: where to stand, what to bring, and how to get back.",
      ),
      lesson(
        "Guide threshold",
        "research, book, and complete tours with special needs, a refund or scam, a respectful disagreement, site customs, and a long conversation without English",
        "Lead your group through a full sightseeing day from a sacred-site dress check through a lost member and a refund to a festival night.",
      ),
    ],
  },
  {
    id: "travel-airport-luggage",
    name: "Airports & Lost Luggage",
    emoji: "🧳",
    blurb:
      "Check-in, baggage rules, security, gates, delays, missed connections, rebooking, lost or damaged bags, claims, delivery, and emergency purchases.",
    partners:
      "an airline agent, airport worker, security officer, baggage representative, or customs officer",
    vocab: ["check-in", "carry-on", "security", "gate", "delay", "connection", "claim", "delivery"],
    lessons: [
      lesson(
        "Check in for a flight",
        "confirm identity, destination, seat, documents, and boarding pass",
        "Check in while resolving a name or seat question.",
      ),
      lesson(
        "Understand baggage allowance",
        "ask weight, size, carry-on, personal item, fee, and transfer",
        "Repack or pay after one bag exceeds the limit.",
      ),
      lesson(
        "Navigate security",
        "ask about liquids, electronics, shoes, medication, and a bag check",
        "Understand a security instruction and ask for repetition politely.",
      ),
      lesson(
        "Find the gate",
        "ask about terminal, train, walking time, boarding group, and changes",
        "Reach a changed gate in another terminal.",
      ),
      lesson(
        "Handle a delay",
        "ask status, cause, estimate, updates, food, and connection risk",
        "Get actionable information after a long delay.",
      ),
      lesson(
        "Handle a missed connection",
        "explain the inbound delay, ask rebooking, lodging, meal, and baggage status",
        "Miss the last connection and arrange the next safe itinerary.",
      ),
      lesson(
        "Rebook a canceled flight",
        "compare same-day, next-day, alternate airport, standby, and refund",
        "Choose among imperfect rebooking options.",
      ),
      lesson(
        "Report lost luggage",
        "give flight, tag, bag description, route, and contact method",
        "Your bag never appeared after arrival in Rome.",
      ),
      lesson(
        "Describe the bag",
        "describe size, color, material, wheels, brand, marks, and contents generally",
        "Distinguish your black suitcase from many similar bags.",
      ),
      lesson(
        "Explain urgent contents",
        "state that medication, mobility items, clothing, or work items are missing without oversharing",
        "Explain why delayed luggage creates an immediate essentials need.",
      ),
      lesson(
        "Get a claim number",
        "record reference, contact channel, tracking site, and next update",
        "Leave the desk with a verifiable claim and written instructions.",
      ),
      lesson(
        "Arrange delivery",
        "give fictional lodging details, access hours, phone, and alternative pickup",
        "Coordinate bag delivery with a hotel reception.",
      ),
      lesson(
        "Buy replacement essentials",
        "ask what the airline reimburses, limits, receipts, and eligible basics",
        "Confirm coverage before buying socks, underwear, toiletries, and a shirt.",
      ),
      lesson(
        "Report damaged luggage",
        "show damage, distinguish old from new, and request inspection or claim",
        "Document a broken wheel and cracked shell before leaving the airport.",
      ),
      lesson(
        "Airport midpoint review",
        "combine check-in, bag drop, security, and finding the gate from lessons 1–14 in one ordinary departure",
        "Get from the curb to your gate for an ordinary flight, without English.",
      ),
      lesson(
        "Fly with an infant or children",
        "ask about gate-checking a stroller, baby food at security, and family boarding",
        "Ask about gate-checking a stroller, bringing baby milk through security, and family boarding.",
      ),
      lesson(
        "Request wheelchair assistance",
        "request help to the gate and confirm how the traveler will be met on arrival",
        "Request wheelchair assistance to the gate for a parent and confirm how they'll be met on arrival.",
      ),
      lesson(
        "Screen medication and devices",
        "declare medicines or medical devices at security and ask how they will be screened",
        "Explain at security that you carry insulin pens and a CPAP machine and ask how they'll be screened.",
      ),
      lesson(
        "Handle an overweight bag",
        "ask about the fee, repack, and question a scale that seems wrong",
        "Your bag is two kilos over; ask about the fee, try repacking, and question a scale that seems wrong.",
      ),
      lesson(
        "Respond to an overbooked flight",
        "ask what compensation is offered for volunteers and get the terms in writing",
        "The gate agent asks for volunteers; ask what compensation is offered and get the terms in writing.",
      ),
      lesson(
        "Ask to sit together",
        "politely request seats together with a child or companion from the agent or another passenger",
        "You and your child have been seated apart; politely ask the agent and then a passenger to help you sit together.",
      ),
      lesson(
        "Clear customs on arrival",
        "ask which line to join and whether you must declare food or goods",
        "Ask an officer which line to join and whether you must declare the cheese in your bag.",
      ),
      lesson(
        "Get into the city at night",
        "compare train, bus, and taxi options, cost, and time at the information desk",
        "Ask the information desk for the cheapest and fastest ways into the city at midnight.",
      ),
      lesson(
        "Alert the crew to an emergency",
        "alert cabin crew immediately and describe what happened to a passenger",
        "The passenger beside you becomes unresponsive; alert the crew immediately and describe what happened.",
      ),
      lesson(
        "Lose your passport after security",
        "retrace steps with staff, ask about lost property, and learn what to do before boarding closes",
        "You can't find your passport after security; ask staff for lost property and what to do before boarding closes.",
      ),
      lesson(
        "Spend a long layover",
        "ask about leaving the airport, transit rules, bag storage, and how much time to allow",
        "With a nine-hour layover, ask whether you may leave the airport, where to store bags, and how long to allow.",
      ),
      lesson(
        "Arrive as boarding closes",
        "ask calmly whether you can still board and what happens if you cannot",
        "You reach the gate as the door closes; ask calmly whether you can still board and what happens if not.",
      ),
      lesson(
        "Talk with your seatmate",
        "sustain a friendly long-haul conversation and exchange a recommendation",
        "On a long flight, keep a friendly conversation going with your seatmate and swap one recommendation.",
      ),
      lesson(
        "Request a refund for a paid extra",
        "explain that a paid seat, meal, or service was not provided and ask for a refund",
        "Your paid extra-legroom seat was changed to a regular one; ask the airline desk to refund the fee.",
      ),
      lesson(
        "Airport threshold",
        "travel from check-in to arrival with special needs, a baggage or seating dispute, an overbooking or emergency, and customs, then secure a lost-luggage claim without English",
        "Get a family through a full travel day—an overweight bag, split seating, an overbooked flight, customs, and a missing suitcase.",
      ),
    ],
  },
  {
    id: "travel-pharmacy-health",
    name: "Pharmacy & Traveler Health",
    emoji: "💊",
    blurb:
      "Headaches, colds, stomach trouble, allergies, blisters, sunburn, labels, clinics, insurance, dental needs, and emergency communication—language practice, not medical advice.",
    partners:
      "a pharmacist, clinic receptionist, travel-insurance agent, dentist, optician, or emergency dispatcher",
    vocab: ["headache", "pain", "allergy", "pharmacy", "label", "clinic", "insurance", "emergency"],
    lessons: [
      lesson(
        "Describe a headache",
        "state location, severity, onset, duration, other symptoms, and known allergies",
        "Tell a pharmacist you have a headache and ask what type of professional help is appropriate.",
      ),
      lesson(
        "Describe cold symptoms",
        "explain cough, throat, congestion, fever, duration, and existing medicines",
        "Ask a pharmacist to explain available nonprescription options and labels.",
      ),
      lesson(
        "Describe stomach trouble",
        "state nausea, diarrhea, pain, food timing, hydration, and warning signs",
        "Ask where to seek care without asking the AI to diagnose you.",
      ),
      lesson(
        "Report an allergy",
        "name the trigger, reaction, severity, medication, and emergency need",
        "Communicate a possible allergic reaction and escalate real danger.",
      ),
      lesson(
        "Treat a blister or minor wound",
        "ask for bandages, antiseptic, padding, and label clarification",
        "Buy supplies for a walking blister and understand the package.",
      ),
      lesson(
        "Explain sunburn or heat trouble",
        "describe exposure, skin, dizziness, hydration, and need for care",
        "Ask a pharmacy or clinic where to get appropriate help.",
      ),
      lesson(
        "Ask for a familiar medicine",
        "use generic purpose or ingredient, not only a home-country brand",
        "Ask whether an equivalent product exists and have the pharmacist explain it.",
      ),
      lesson(
        "Understand a label",
        "ask how to read timing, quantity, warnings, storage, and when to seek professional help",
        "Have a pharmacist clarify the printed label rather than inventing a dose.",
      ),
      lesson(
        "Find a clinic",
        "ask about walk-in, appointment, hours, language support, cost, and documents",
        "Arrange evaluation for symptoms that are not improving.",
      ),
      lesson(
        "Use travel insurance",
        "give policy information safely, ask coverage, authorization, network, and receipts",
        "Call insurance before a non-emergency clinic visit.",
      ),
      lesson(
        "Handle a dental problem",
        "describe tooth pain, breakage, swelling, timing, and urgency",
        "Request a dental appointment while traveling.",
      ),
      lesson(
        "Replace glasses or contacts",
        "ask for optician, prescription requirements, solution, and temporary options",
        "Replace lost contact-lens supplies or damaged glasses.",
      ),
      lesson(
        "Buy personal health products",
        "ask discreetly for menstrual, contraception, testing, or hygiene products",
        "Find a personal health item using respectful, non-graphic language.",
      ),
      lesson(
        "Call for urgent help",
        "state exact location, danger, consciousness, breathing, and language needs",
        "End practice and contact real local emergency services for an actual emergency.",
      ),
      lesson(
        "Health midpoint review",
        "combine describing symptoms, naming allergies, and understanding a label from lessons 1–14 in one ordinary pharmacy visit",
        "Describe a mild cold at a pharmacy, mention your allergies, and confirm how to take what you buy, without English.",
      ),
      lesson(
        "Get care for a sick child",
        "give a child's age, weight, symptoms, and timing and ask which service sees children, without seeking a diagnosis",
        "Your four-year-old has a fever at night; ask the pharmacist which service sees children and what details they need.",
      ),
      lesson(
        "Replace a daily medication",
        "explain what you take by ingredient and ask what is needed to get a local equivalent legally",
        "You've run out of a daily medication; ask the pharmacist what is needed to get a local equivalent legally.",
      ),
      lesson(
        "Request clinic accessibility",
        "ask about step-free access, interpreters, hearing support, and longer appointments",
        "Call a clinic to ask about step-free access and whether an interpreter can join your appointment.",
      ),
      lesson(
        "Mention a long-term condition",
        "state a chronic condition and current medicines briefly and accurately without oversharing",
        "Tell a walk-in clinic nurse about your asthma and current inhaler before they examine your cough.",
      ),
      lesson(
        "Question a medical bill",
        "ask for an itemized estimate, payment terms, and the documents your insurer needs",
        "The clinic asks for a large upfront payment; ask for an itemized estimate and the documents your insurer needs.",
      ),
      lesson(
        "Decline an unwanted product",
        "politely refuse an expensive or unneeded product and ask for the simple option you need",
        "The pharmacist recommends an expensive combination product; politely ask for the simple generic you came for.",
      ),
      lesson(
        "Find the on-duty pharmacy",
        "learn how night and holiday pharmacy rotations work and what is sold over the counter",
        "Ask why the pharmacy is closed and how to find the on-duty night pharmacy.",
      ),
      lesson(
        "Ask for a doctor recommendation",
        "ask for a reliable doctor who can see you soon, the cost, and how to book",
        "Ask your hotel to recommend a reliable doctor who can see you today and what it will cost.",
      ),
      lesson(
        "Check in at emergency triage",
        "explain why you came, give your details, and ask about the wait",
        "At hospital triage, explain why you came, give your details, and ask how long the wait will be.",
      ),
      lesson(
        "Report a bite or sting",
        "describe a bite or sting, when it happened, and the reaction, and ask where to get care",
        "You were stung by a jellyfish at the beach; describe it to the lifeguard and ask where to get care.",
      ),
      lesson(
        "Follow up after a visit",
        "confirm the follow-up date, how to get results, and which warning signs mean return",
        "After a clinic visit, confirm the follow-up date, how to get test results, and when you should come back.",
      ),
      lesson(
        "Talk travel health with a pharmacist",
        "hold a longer conversation about jet lag, motion sickness, and sleep with follow-up questions, without seeking a diagnosis",
        "Have a longer conversation with a pharmacist about managing jet lag and motion sickness on your trip.",
      ),
      lesson(
        "Arrange a vaccination or travel test",
        "ask about required vaccines or tests, appointments, certificates, and price",
        "Ask a travel clinic about a required vaccination certificate, appointment times, and price.",
      ),
      lesson(
        "Support a companion at an appointment",
        "help explain a companion's symptoms with their permission and respect their privacy",
        "Accompany a friend to the doctor, help explain their symptoms with their permission, and respect their privacy.",
      ),
      lesson(
        "Health threshold",
        "describe symptoms for yourself or others, choose the right service, manage special needs and costs, handle an urgent visit, and follow instructions without English",
        "Manage a hard health week abroad: a child's fever, a triage visit, a disputed bill, and a pharmacy follow-up.",
      ),
    ],
  },
  {
    id: "travel-social-dating",
    name: "Social Life, Invitations & Dating",
    emoji: "💬",
    blurb:
      "Meeting locals, conversation, coffee or dinner invitations, plans, compliments, consent, nightlife, rejection, cultural expectations, and staying in touch.",
    partners:
      "a local acquaintance, fellow traveler, potential date, new friend, or romantic partner",
    vocab: ["meet", "invite", "coffee", "dinner", "phone number", "consent", "plans", "goodbye"],
    lessons: [
      lesson(
        "Start a natural conversation",
        "open with context, introduce yourself, and ask a non-intrusive question",
        "Meet someone at a café, tour, class, or public event.",
      ),
      lesson(
        "Ask about local life",
        "talk about neighborhood, work, interests, food, and daily routines",
        "Move beyond tourist questions into a genuine exchange.",
      ),
      lesson(
        "Invite someone for coffee",
        "express interest, suggest a public place and time, and accept either answer",
        "Ask a person you just met whether they would like coffee later.",
      ),
      lesson(
        "Ask someone to dinner",
        "make a clear, low-pressure invitation and discuss restaurant, time, and transport",
        "Invite a woman or man you met in Rome to dinner respectfully.",
      ),
      lesson(
        "Exchange contact details",
        "offer a number or social handle, confirm spelling, and respect privacy",
        "Exchange contact information only after mutual interest.",
      ),
      lesson(
        "Explain your travel situation",
        "say where you are staying generally, how long, companions, and plans without oversharing",
        "Explain that you are visiting briefly and set honest expectations.",
      ),
      lesson(
        "Give a respectful compliment",
        "compliment style, conversation, humor, or character without objectifying",
        "Tell someone what you enjoyed about meeting them.",
      ),
      lesson(
        "Discuss relationship status",
        "ask or answer about being single, partnered, dating, or unavailable",
        "Clarify status before treating an outing as a date.",
      ),
      lesson(
        "Communicate consent and boundaries",
        "ask, check comfort, state limits, and respond immediately to uncertainty or no",
        "Navigate affection without pressure or assumptions.",
      ),
      lesson(
        "Accept or decline gracefully",
        "say yes, no, not now, or friends only without manipulation",
        "Respond maturely when the other person declines.",
      ),
      lesson(
        "Plan the evening",
        "agree on place, time, dress, transport, payment expectations, and return",
        "Make a complete dinner plan that both people understand.",
      ),
      lesson(
        "Ask about dating customs",
        "learn local expectations without stereotyping or demanding one correct rule",
        "Ask a trusted local about invitations, punctuality, and paying.",
      ),
      lesson(
        "Navigate nightlife safely",
        "stay with companions, watch belongings, arrange transport, and state a boundary",
        "Leave a venue safely when the situation no longer feels comfortable.",
      ),
      lesson(
        "Say goodbye and stay in touch",
        "express gratitude, discuss realistic future contact, and avoid false promises",
        "Close a meaningful evening warmly and honestly.",
      ),
      lesson(
        "Social midpoint review",
        "combine starting a conversation, inviting, exchanging contacts, and closing from lessons 1–14 in one ordinary meeting",
        "Meet someone at a language café, chat, swap contacts, and say goodbye naturally, without English.",
      ),
      lesson(
        "Join a group of new friends",
        "introduce yourself to a group and follow a fast conversation with several speakers",
        "A new friend brings you to meet their group; introduce yourself and keep up with a fast group conversation.",
      ),
      lesson(
        "Disagree kindly",
        "share a different opinion without offense and keep the mood warm",
        "Your date passionately defends an opinion you don't share; disagree kindly and keep the evening warm.",
      ),
      lesson(
        "Talk about family and children",
        "describe your family, ask about theirs, and avoid prying",
        "Answer questions about your family and children and ask about theirs without prying.",
      ),
      lesson(
        "Suggest accessible plans",
        "explain a mobility, hearing, or dietary need and suggest a venue that fits",
        "Explain that you use a cane and suggest a date spot without steep stairs or long walks.",
      ),
      lesson(
        "Navigate who pays",
        "respond to an offer to pay in a way that respects local custom and your own comfort",
        "Your date insists on paying for everything; respond in a way that respects local custom and your comfort.",
      ),
      lesson(
        "Meet someone's family",
        "greet relatives correctly, bring a small gift, and answer their questions",
        "You're invited to a family lunch; greet everyone correctly, bring a small gift, and answer their questions.",
      ),
      lesson(
        "Ask where people meet",
        "ask a local where travelers and residents actually meet, from language exchanges to clubs",
        "Ask a host where travelers and locals actually meet—language exchanges, clubs, or events.",
      ),
      lesson(
        "Leave an uncomfortable date",
        "say clearly that you are leaving and ask staff for help getting a ride",
        "Your date becomes pushy and won't accept no; say clearly that you're leaving and ask the staff for help getting a taxi.",
      ),
      lesson(
        "Help a friend in trouble at night",
        "get help from staff, keep your friend safe, and call for medical help if needed",
        "Your friend can barely stand after a night out; get help from staff, keep them safe, and call for medical help if needed.",
      ),
      lesson(
        "Spot a romance or money scam",
        "decline requests for money clearly and protect your personal details",
        "Someone you met two days ago asks to borrow money for an emergency; decline clearly and protect your details.",
      ),
      lesson(
        "Have a deep conversation",
        "talk about hopes, work, and values over an evening with real follow-up questions",
        "Over a long dinner, talk about your hopes, work, and what matters to you, asking real follow-up questions.",
      ),
      lesson(
        "Repair a misunderstanding",
        "explain what you meant, apologize sincerely, and restore the moment",
        "A joke you made landed badly; explain what you meant, apologize sincerely, and repair the moment.",
      ),
      lesson(
        "Flirt with humor and respect",
        "keep a playful conversation going and notice and respect a change of subject",
        "Keep a light, flirtatious conversation going with humor, and respect it when the other person changes the subject.",
      ),
      lesson(
        "Plan a second date",
        "propose a longer activity, agree on logistics, and check comfort along the way",
        "Propose a day trip together for a second date and agree on plans, transport, and a comfortable way to end the day.",
      ),
      lesson(
        "Social threshold",
        "meet, connect, disagree respectfully, navigate customs and payment, handle an unsafe moment, and sustain a deep conversation while respecting boundaries without English",
        "Spend a full evening with someone new and their friends, from a group introduction through a misunderstanding to a safe ride home.",
      ),
    ],
  },
  {
    id: "travel-problems-services",
    name: "Problems, Services & Recovery",
    emoji: "🆘",
    blurb:
      "Lost phones, wallets and passports, police and embassy reports, blocked cards, scams, SIMs, laundry, restrooms, booking disputes, theft, and rebuilding the trip.",
    partners:
      "a police clerk, embassy worker, bank agent, phone-shop worker, laundromat attendant, booking agent, or public-service employee",
    vocab: [
      "lost",
      "stolen",
      "passport",
      "police report",
      "embassy",
      "blocked card",
      "SIM",
      "laundry",
    ],
    lessons: [
      lesson(
        "Report a lost phone",
        "state when, where, description, tracking status, and safe contact method",
        "Ask a venue and police desk about a missing phone using fictional details.",
      ),
      lesson(
        "Report a lost wallet",
        "list documents generally, cards, cash, location, and immediate needs",
        "Explain the loss and ask how to obtain a report.",
      ),
      lesson(
        "Replace a passport",
        "contact the embassy, explain loss or theft, and ask required steps and timing",
        "Arrange emergency passport help before a scheduled flight.",
      ),
      lesson(
        "Make a police report",
        "describe facts, time, place, items, witnesses, and report number without legal speculation",
        "Report theft and request a written case or report reference.",
      ),
      lesson(
        "Handle a blocked card",
        "call the bank, verify safely, explain travel, and ask about alternatives",
        "Restore card use without saying real credentials aloud.",
      ),
      lesson(
        "Handle an ATM problem",
        "report retained card, failed cash, duplicate charge, location, and operator",
        "Contact the bank and ATM operator after a malfunction.",
      ),
      lesson(
        "Respond to a suspected scam",
        "end pressure, request written terms, refuse payment, and seek legitimate help",
        "Leave a high-pressure tourist transaction safely.",
      ),
      lesson(
        "Buy a SIM or data plan",
        "compare data, calls, duration, activation, hotspot, and total price",
        "Buy short-term phone service and test it before leaving.",
      ),
      lesson(
        "Use a laundromat",
        "ask about machines, detergent, temperature, payment, drying, and closing time",
        "Wash essential clothes after luggage loss.",
      ),
      lesson(
        "Find a public restroom",
        "ask location, access code, customer rule, fee, and accessibility",
        "Find a restroom quickly and understand how entry works.",
      ),
      lesson(
        "Resolve a booking dispute",
        "state confirmation, promised terms, current problem, and reasonable remedy",
        "A hotel or activity cannot find a prepaid reservation.",
      ),
      lesson(
        "Cancel after a major disruption",
        "ask about refund, credit, documentation, deadline, and escalation",
        "Cancel plans after illness or transport cancellation.",
      ),
      lesson(
        "Ask someone to slow down",
        "state limited understanding, request repetition, simpler words, writing, or translation",
        "Recover a high-stress service interaction when speech is too fast.",
      ),
      lesson(
        "Rebuild the trip after theft",
        "prioritize safety, communication, documents, money, lodging, and transport",
        "Create a practical recovery plan with local services.",
      ),
      lesson(
        "Recovery midpoint review",
        "combine reporting a loss, calling the bank, and asking someone to slow down from lessons 1–14 in one ordinary problem",
        "Report a lost wallet at a police desk and block your card by phone, asking for repetition when needed, without English.",
      ),
      lesson(
        "Report a missing companion",
        "give a description, the last-known place, and contact details to staff and police",
        "Your friend hasn't returned to the hostel and won't answer; report it to staff and police with a description and last-known place.",
      ),
      lesson(
        "Request accommodations at an office",
        "ask about step-free access, interpreters, or written communication at an embassy or police station",
        "Ask the embassy whether its office is step-free and whether you can communicate in writing because of hearing loss.",
      ),
      lesson(
        "Replace a child's documents",
        "ask what both parents, photos, and forms are required for a child's emergency document",
        "Your child's passport is stolen; ask the consulate what both parents must provide for an emergency document.",
      ),
      lesson(
        "Challenge a fine you think is wrong",
        "ask for the reason in writing and how to appeal without arguing",
        "You receive a fine you believe is a mistake; ask the officer for the reason in writing and how to appeal.",
      ),
      lesson(
        "Report fraudulent charges",
        "identify each unrecognized charge with the bank and ask about freezing the card and reversals",
        "You see three charges you didn't make; call your bank, identify each one, and ask about reversing them.",
      ),
      lesson(
        "Receive money from home",
        "ask what ID is needed, fees, limits, and pickup times at a money-transfer office",
        "Ask a money-transfer office what you need to collect funds sent from home and what it costs.",
      ),
      lesson(
        "Navigate an official office",
        "understand queue numbers, stamps, office hours, and missing documents",
        "Ask the clerk how the queue-number system works and which stamps your form still needs.",
      ),
      lesson(
        "Ask where to get help",
        "learn which office handles a scam, a theft, or a consumer complaint",
        "Ask a tourist information officer where to go after a scam: police, consulate, or a consumer office.",
      ),
      lesson(
        "Respond to a disaster alert",
        "ask where to go, what to bring, and how to stay informed during an emergency alert",
        "An emergency alert warns of flooding; ask your host and local staff where to go and what to bring.",
      ),
      lesson(
        "Get around a protest or closure",
        "ask where it is safe to wait, which areas to avoid, and how to reroute",
        "A large demonstration blocks your route; ask a shopkeeper where it's safe to wait and how to get around it.",
      ),
      lesson(
        "Talk through an insurance claim",
        "explain a loss in a long call, answer questions, and confirm documents and next steps",
        "Spend a long phone call with your travel insurer explaining a theft and confirming the next steps.",
      ),
      lesson(
        "Certify a translated document",
        "ask about sworn translation, certification, price, and pickup time",
        "Ask a notary office to certify a translated police report and confirm the price and pickup time.",
      ),
      lesson(
        "Give a statement as a witness",
        "describe what you saw factually and agree on how officials can contact you",
        "You saw a bag snatched; tell the police what you witnessed and agree how they can contact you.",
      ),
      lesson(
        "Calm a heated service dispute",
        "de-escalate, ask for a supervisor, and keep a record of the exchange",
        "A clerk refuses to help and the line grows angry; calmly ask for a supervisor and keep a record of the exchange.",
      ),
      lesson(
        "Recovery threshold",
        "report, document, replace essentials for yourself and others, dispute charges or fines, follow official procedures, and continue safely without English",
        "Manage a chaotic travel day from a theft and fraudulent charges through a consulate visit and an insurer call to a stable plan.",
      ),
    ],
  },
];

function buildLessons(spec: TravelZoneSpec): Lesson[] {
  return spec.lessons.map(([title, objective, roleplay], index) => ({
    n: index + 1,
    title,
    readingTemplate: "seed-{lang}-travel-hotel",
    objective,
    steps: [
      r(`Read the traveler passage. Notice language that helps you ${objective.toLowerCase()}.`, 5),
      pt(
        `Build three versions: a direct request, a polite request, and a clarification for this goal: ${objective}`,
        6,
      ),
      sp(`Roleplay: ${roleplay}`, 9),
    ],
  }));
}

export const TRAVEL_ZONE_MODULES: AppModule[] = TRAVEL_ZONE_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  emoji: spec.emoji,
  category: "Travel",
  blurb: spec.blurb,
  priceCents: 999,
  aiPersona: `You are ${spec.partners} in the target country. Stay in character, use natural local phrasing, answer practical questions precisely, and never invent a price or policy when the learner asks you to clarify one.`,
  userRole: "Independent international traveler",
  challengePrompts: spec.lessons.slice(0, 8).map(([, , roleplay]) => roleplay),
  vocabFocus: spec.vocab,
}));

export const TRAVEL_ZONE_CURRICULA: Record<string, ModuleCurriculum> = Object.fromEntries(
  TRAVEL_ZONE_SPECS.map((spec) => [
    spec.id,
    {
      moduleId: spec.id,
      headline: spec.name,
      threshold: `By Lesson ${spec.lessons.length}, you can navigate ${spec.name.toLowerCase()} interactions abroad without switching to your native language.`,
      lessons: buildLessons(spec),
    },
  ]),
);

export const TRAVEL_ZONE_READING_PATTERNS: Record<string, string[]> = Object.fromEntries(
  TRAVEL_ZONE_SPECS.map((spec) => [spec.id, ["seed-{lang}-travel-hotel"]]),
);

export const TRAVEL_ZONE_MODULE_IDS = TRAVEL_ZONE_SPECS.map((spec) => spec.id);
