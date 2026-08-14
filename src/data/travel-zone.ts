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
        "Breakfast threshold",
        "complete arrival, ordering, clarification, conversation, compliment, and payment without English",
        "Navigate an entire breakfast service from the doorway to a warm farewell.",
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
        "Lunch threshold",
        "complete a casual lunch from choosing a place through a memorable farewell",
        "Navigate a full lunch, including questions, an adjustment, conversation, praise, and payment.",
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
        "Dinner threshold",
        "navigate a special evening from reservation through a meaningful goodbye",
        "Complete an entire celebratory dinner with recommendations, conversation, one repair, praise, and payment.",
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
        "Shopping threshold",
        "replace essentials, compare options, try items, pay, and retain return information",
        "Complete a lost-luggage shopping run efficiently and politely.",
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
        "Daily-life threshold",
        "complete laundry, repair, communication, appointment, and neighborhood errands",
        "Handle a full practical errand day as a temporary local.",
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
        "Market threshold",
        "browse, ask, taste, compare, negotiate appropriately, buy, and say goodbye",
        "Complete a full market visit with food and one meaningful gift.",
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
        "Lodging threshold",
        "book, arrive, solve a room issue, use services, pay, and check out",
        "Navigate a complete stay from reservation through final receipt.",
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
        "Taxi threshold",
        "find, verify, direct, adjust, converse, pay, and exit safely",
        "Complete an airport-to-hotel taxi trip without English.",
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
        "Transit threshold",
        "plan, buy, validate, board, transfer, recover, and arrive",
        "Complete an intercity trip plus local transit to the lodging.",
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
        "Rental threshold",
        "compare, contract, inspect, operate, park, return, and settle the final price",
        "Complete a Rome Vespa rental from first price question to deposit release.",
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
        "Mechanic threshold",
        "describe, diagnose conversationally, estimate, authorize, update, and document",
        "Manage a breakdown from first symptom through return to the road.",
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
        "Guide threshold",
        "research, book, find, participate, question, adapt, and close",
        "Complete a full guided experience from inquiry to thoughtful farewell.",
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
        "Airport threshold",
        "check in, navigate disruption, file a luggage claim, and secure essentials",
        "Manage a difficult arrival with cancellation and a missing bag.",
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
        "Health threshold",
        "describe symptoms, choose an appropriate service, clarify instructions, and document costs",
        "Navigate a traveler health problem without using the roleplay as medical advice.",
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
        "Social threshold",
        "meet, connect, invite, plan, respect boundaries, and close naturally",
        "Navigate a complete new social connection from hello to a respectful goodbye.",
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
        "Recovery threshold",
        "report, document, replace essentials, resolve bookings, and continue safely",
        "Manage a difficult travel day from first loss through a stable plan.",
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
