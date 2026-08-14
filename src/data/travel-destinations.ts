import type { Language } from "@/state/app-state";

export interface DestinationPhrase {
  english: string;
  target: string;
  note: string;
}

export interface TravelDestination {
  id: string;
  country: string;
  flag: string;
  language: Extract<Language, "Spanish" | "Italian" | "Japanese">;
  regions: string;
  localLens: string;
  practicalNotes: string[];
  phrases: DestinationPhrase[];
}

export interface NextTripPlan {
  destinationId: string;
  departureDate: string | null;
}

const spanish = (
  id: string,
  country: string,
  flag: string,
  regions: string,
  localLens: string,
  practicalNotes: string[],
  phrases: DestinationPhrase[],
): TravelDestination => ({
  id,
  country,
  flag,
  language: "Spanish",
  regions,
  localLens,
  practicalNotes,
  phrases,
});

const italian = (
  id: string,
  country: string,
  flag: string,
  regions: string,
  localLens: string,
  practicalNotes: string[],
  phrases: DestinationPhrase[],
): TravelDestination => ({
  id,
  country,
  flag,
  language: "Italian",
  regions,
  localLens,
  practicalNotes,
  phrases,
});

export const TRAVEL_DESTINATIONS: TravelDestination[] = [
  spanish(
    "spain",
    "Spain",
    "🇪🇸",
    "Madrid · Barcelona · Andalusia · Basque Country · islands",
    "Spain Spanish uses vosotros, vale, móvil, billete, coche, and coger in ordinary conversation. Meal times often run later than visitors expect.",
    [
      "Ask whether café prices differ at the bar and at a table.",
      "For trains, learn estación, andén, billete, ida, and ida y vuelta.",
      "Regional languages are part of daily life; Spanish remains broadly useful, but local names may appear first.",
    ],
    [
      {
        english: "Could I have a coffee, please?",
        target: "¿Me pone un café, por favor?",
        note: "A natural request in Spain.",
      },
      {
        english: "What is the total, including everything?",
        target: "¿Cuánto es en total, con todo incluido?",
        note: "Useful before rentals and tours.",
      },
      {
        english: "Where is the train platform?",
        target: "¿Dónde está el andén del tren?",
        note: "Andén means platform.",
      },
      {
        english: "The meal was unforgettable.",
        target: "La comida fue inolvidable; se lo contaré a mis hijos.",
        note: "Warm, specific praise.",
      },
    ],
  ),
  spanish(
    "mexico",
    "Mexico",
    "🇲🇽",
    "Mexico City · Oaxaca · Yucatán · Jalisco · coasts",
    "Mexican Spanish commonly uses ustedes, celular, boleto, carro, and ¿mande? in polite repair. Food, transport, and vocabulary vary strongly by region.",
    [
      "Ask what a dish contains and how spicy it is instead of assuming.",
      "Confirm whether a quoted transport or tour price is per person or total.",
      "At markets, ask before photographing people or their work.",
    ],
    [
      {
        english: "Could you bring me water?",
        target: "¿Me regala agua, por favor?",
        note: "A polite Mexican request; it does not mean free.",
      },
      {
        english: "Is it spicy?",
        target: "¿Pica mucho?",
        note: "More natural than asking only if it has chile.",
      },
      {
        english: "How much is it altogether?",
        target: "¿Cuánto es en total?",
        note: "Confirm the complete price.",
      },
      {
        english: "Excuse me, could you say that again?",
        target: "Disculpe, ¿me lo puede repetir?",
        note: "Polite repair language.",
      },
    ],
  ),
  spanish(
    "guatemala",
    "Guatemala",
    "🇬🇹",
    "Guatemala City · Antigua · Lake Atitlán · Petén · highlands",
    "Spanish is widely used, alongside many living Mayan languages. Usted is a safe respectful default, and local place names may not follow Spanish spelling patterns.",
    [
      "Confirm shuttle pickup location, departure time, and whether stops are included.",
      "Carry small denominations and ask whether the seller has change.",
      "Treat Indigenous clothing, ceremonies, and markets with respect; ask before taking photos.",
    ],
    [
      {
        english: "Do you have change?",
        target: "¿Tiene sencillo?",
        note: "Sencillo commonly means small change.",
      },
      {
        english: "Where does the shuttle leave from?",
        target: "¿De dónde sale el transporte?",
        note: "Confirm the exact pickup point.",
      },
      {
        english: "May I take a photo?",
        target: "¿Le puedo tomar una foto?",
        note: "Ask the person first.",
      },
      {
        english: "Could you recommend a local dish?",
        target: "¿Me recomienda un plato de aquí?",
        note: "Invites a regional recommendation.",
      },
    ],
  ),
  spanish(
    "honduras",
    "Honduras",
    "🇭🇳",
    "Tegucigalpa · San Pedro Sula · Caribbean coast · Bay Islands · Copán",
    "Honduran Spanish uses ustedes and local terms such as rapidito for some shared transport. Speech and vocabulary vary between mainland regions and the Caribbean.",
    [
      "Confirm whether local transport is direct or shared, where it stops, and the fare before boarding.",
      "For island or dive travel, ask what equipment, park fees, instruction, and return transport are included.",
      "Use usted as a respectful default and ask before photographing people or private property.",
    ],
    [
      {
        english: "Is this bus going to…?",
        target: "¿Este bus va para…?",
        note: "Confirm the destination before boarding.",
      },
      {
        english: "How much is the fare?",
        target: "¿Cuánto cuesta el pasaje?",
        note: "Pasaje means fare or ticket.",
      },
      {
        english: "What does the excursion include?",
        target: "¿Qué incluye la excursión?",
        note: "Clarify the complete package.",
      },
      {
        english: "Could you show me on the map?",
        target: "¿Me lo puede mostrar en el mapa?",
        note: "Useful for route repair.",
      },
    ],
  ),
  spanish(
    "el-salvador",
    "El Salvador",
    "🇸🇻",
    "San Salvador · Ruta de las Flores · Pacific coast · eastern region",
    "Salvadoran Spanish may use vos in familiar conversation and usted for respectful service interactions. Pupusería, coaster, and bus conversations are especially practical for travelers.",
    [
      "Ask how a pupusa is filled and what curtido or salsa accompanies it.",
      "Confirm the route, stop, travel time, and payment before taking local transport.",
      "For surf or nature trips, ask about conditions, equipment, pickup, and realistic skill level.",
    ],
    [
      {
        english: "What is this pupusa filled with?",
        target: "¿De qué está rellena esta pupusa?",
        note: "A useful food question.",
      },
      {
        english: "Can you help me?",
        target: "¿Me podés ayudar?",
        note: "Everyday voseo in a familiar setting.",
      },
      {
        english: "Where should I get off?",
        target: "¿Dónde me tengo que bajar?",
        note: "Ask the driver or another passenger.",
      },
      {
        english: "How long does it take?",
        target: "¿Cuánto tiempo tarda?",
        note: "Confirm journey time.",
      },
    ],
  ),
  spanish(
    "nicaragua",
    "Nicaragua",
    "🇳🇮",
    "Managua · Granada · León · Pacific coast · Caribbean regions",
    "Nicaraguan Spanish commonly uses vos. Bus and address language can depend on landmarks, and Caribbean regions add distinct linguistic and cultural contexts.",
    [
      "Practice vos forms and landmark-based directions such as de donde fue or frente a.",
      "Confirm whether transport is express or makes frequent stops and where luggage is stored.",
      "Ask what a dish, drink, or tour includes rather than assuming from its name.",
    ],
    [
      {
        english: "Can you tell me where it is?",
        target: "¿Me podés decir dónde queda?",
        note: "Natural voseo plus location language.",
      },
      { english: "Is the bus direct?", target: "¿El bus es directo?", note: "Clarify the route." },
      {
        english: "Where do I get off?",
        target: "¿Dónde me bajo?",
        note: "A short practical transport question.",
      },
      {
        english: "What do you recommend here?",
        target: "¿Qué me recomendás de aquí?",
        note: "Voseo in a friendly interaction.",
      },
    ],
  ),
  spanish(
    "costa-rica",
    "Costa Rica",
    "🇨🇷",
    "San José · Central Valley · Guanacaste · Caribbean · southern zone",
    "Costa Rican Spanish is associated with pura vida, the demonym tico/tica, and frequent usted. Directions and transport names can be highly local.",
    [
      "Ask whether tax and service are already included before calculating a restaurant total.",
      "Confirm the terminal and bus company; multiple operators may serve similar routes.",
      "For nature tours, ask about difficulty, weather, footwear, and what is actually included.",
    ],
    [
      {
        english: "Everything’s good, thank you.",
        target: "Pura vida, muchas gracias.",
        note: "A flexible, friendly Costa Rican expression.",
      },
      {
        english: "Are tax and service included?",
        target: "¿El impuesto y el servicio están incluidos?",
        note: "Clarifies the restaurant total.",
      },
      {
        english: "Which bus goes to…?",
        target: "¿Cuál bus va para…?",
        note: "Useful at terminals and roadside stops.",
      },
      {
        english: "How difficult is the trail?",
        target: "¿Qué tan difícil es el sendero?",
        note: "Ask before a nature excursion.",
      },
    ],
  ),
  spanish(
    "panama",
    "Panama",
    "🇵🇦",
    "Panama City · Canal Zone · Caribbean · Chiriquí · Darién edge",
    "Panamanian speech can be fast and rhythmically reduced. Ustedes is standard; bus, taxi, and neighborhood language matters in the capital.",
    [
      "State the destination and ask the complete fare before a taxi ride.",
      "Confirm whether a tour includes transport, entrance, food, and return time.",
      "Ask which currency and payment method a business accepts rather than assuming.",
    ],
    [
      {
        english: "How much is the ride to…?",
        target: "¿Cuánto sale la carrera hasta…?",
        note: "Ask the taxi fare before leaving.",
      },
      {
        english: "Does the tour include transportation?",
        target: "¿El tour incluye el transporte?",
        note: "Clarify inclusions.",
      },
      {
        english: "Can I pay by card?",
        target: "¿Puedo pagar con tarjeta?",
        note: "Confirm before service.",
      },
      {
        english: "Could you speak a little more slowly?",
        target: "¿Puede hablar un poco más despacio?",
        note: "Useful listening repair.",
      },
    ],
  ),
  spanish(
    "cuba",
    "Cuba",
    "🇨🇺",
    "Havana · Viñales · central cities · eastern Cuba · beach regions",
    "Cuban Spanish can be fast and reduce consonants. Guagua means bus, and access, payment, connectivity, and transport arrangements can require more advance clarification than visitors expect.",
    [
      "Confirm accepted payment, the full price, and what is included before receiving a service.",
      "Ask whether a taxi is private or shared and agree on destination and fare before leaving.",
      "Download or write down essential addresses and booking details before relying on connectivity.",
    ],
    [
      {
        english: "Where is the bus stop?",
        target: "¿Dónde está la parada de la guagua?",
        note: "Guagua means bus in Cuba.",
      },
      {
        english: "Is the taxi shared?",
        target: "¿El taxi es compartido?",
        note: "Clarify the ride type.",
      },
      {
        english: "What payment methods do you accept?",
        target: "¿Qué formas de pago aceptan?",
        note: "Ask before committing.",
      },
      {
        english: "Could you write down the address?",
        target: "¿Me puede anotar la dirección?",
        note: "Useful without connectivity.",
      },
    ],
  ),
  spanish(
    "colombia",
    "Colombia",
    "🇨🇴",
    "Bogotá · Medellín · Caribbean coast · coffee region · southwest",
    "Colombian Spanish varies greatly by region. Usted can sound warm rather than distant, and ¿qué pena? often softens a request or interruption.",
    [
      "Ask whether transport prices are fixed, metered, app-based, or negotiated.",
      "Weather and altitude differ sharply; ask locals what conditions are like at the destination.",
      "In restaurants, clarify whether service is included and whether you want to add it.",
    ],
    [
      {
        english: "Excuse me, may I ask you something?",
        target: "Qué pena, ¿le puedo hacer una pregunta?",
        note: "A characteristically polite opener.",
      },
      {
        english: "How much does this cost?",
        target: "¿Cuánto vale esto?",
        note: "Vale is common for price.",
      },
      {
        english: "Could you bring me the menu?",
        target: "¿Me regala el menú, por favor?",
        note: "Polite request, not a request for a gift.",
      },
      {
        english: "Is the service charge included?",
        target: "¿El servicio está incluido?",
        note: "Clarify the bill.",
      },
    ],
  ),
  spanish(
    "venezuela",
    "Venezuela",
    "🇻🇪",
    "Caracas · Caribbean coast · Andes · plains · Guayana",
    "Venezuelan Spanish uses ustedes, carro, celular, and many regional expressions. Changing transport, payment, and service conditions make clarification especially important.",
    [
      "Ask which payment methods are accepted and confirm the complete amount at the time of purchase.",
      "Verify transport arrangements and current local conditions with reliable local and official sources.",
      "Use language practice for communication, not as a substitute for current security, entry, legal, or medical guidance.",
    ],
    [
      {
        english: "What payment methods do you accept?",
        target: "¿Qué métodos de pago aceptan?",
        note: "Confirm at the point of sale.",
      },
      {
        english: "How much is the total?",
        target: "¿Cuánto es en total?",
        note: "Ask for the complete amount.",
      },
      {
        english: "Is this service operating today?",
        target: "¿Este servicio está funcionando hoy?",
        note: "Confirm current availability.",
      },
      {
        english: "Could you recommend a reliable option?",
        target: "¿Me puede recomendar una opción confiable?",
        note: "Ask a trusted local source.",
      },
    ],
  ),
  spanish(
    "ecuador",
    "Ecuador",
    "🇪🇨",
    "Quito · Andes · coast · Amazon · Galápagos",
    "Ecuadorian Spanish varies across highlands and coast. Usted is a respectful default, and diminutives often soften everyday requests.",
    [
      "Ask about altitude, distance, sea conditions, or trail difficulty before excursions.",
      "Confirm whether an island or park price includes permits, guide, and transport.",
      "Have the address written down for taxis when pronunciation or street naming is uncertain.",
    ],
    [
      {
        english: "Where is this address?",
        target: "¿Dónde queda esta dirección?",
        note: "Quedar is natural for location.",
      },
      {
        english: "Do you have change?",
        target: "¿Tiene cambio, por favor?",
        note: "Useful for small purchases.",
      },
      {
        english: "What does the excursion include?",
        target: "¿Qué incluye la excursión?",
        note: "Ask before paying.",
      },
      {
        english: "I have a headache.",
        target: "Me duele la cabeza.",
        note: "A basic pharmacy or clinic phrase.",
      },
    ],
  ),
  spanish(
    "peru",
    "Peru",
    "🇵🇪",
    "Lima · Cusco · Sacred Valley · Arequipa · Amazon",
    "Peruvian Spanish includes strong regional differences and contact with Quechua and Aymara. Menú can mean a fixed lunch, not only the printed list.",
    [
      "Ask what a fixed lunch includes and whether drinks or service are extra.",
      "For altitude travel, ask about the pace and seek qualified care for concerning symptoms.",
      "Confirm train, shuttle, entrance, and guide components separately for complex trips.",
    ],
    [
      {
        english: "What does today’s set lunch include?",
        target: "¿Qué incluye el menú de hoy?",
        note: "Menú often means the fixed meal.",
      },
      {
        english: "How much is this?",
        target: "¿Cuánto está esto?",
        note: "A common price question.",
      },
      {
        english: "Could you recommend something typical?",
        target: "¿Me recomienda algo típico?",
        note: "Ask for a local choice.",
      },
      {
        english: "Where do I take the bus to…?",
        target: "¿Dónde tomo el bus para…?",
        note: "Confirm the departure point.",
      },
    ],
  ),
  spanish(
    "bolivia",
    "Bolivia",
    "🇧🇴",
    "La Paz · Sucre · Uyuni · Cochabamba · lowlands",
    "Spanish is used alongside Quechua, Aymara, Guaraní, and other languages. Transport names and routes are highly local; ask for the vehicle type and exact stop.",
    [
      "Ask whether a price includes guide, meals, lodging, park fees, and protective equipment.",
      "For high-altitude routes, explain symptoms clearly and seek real medical help when needed.",
      "Use usted and ask before photographing people, ceremonies, or market stalls.",
    ],
    [
      {
        english: "Where do I catch the minibus?",
        target: "¿Dónde tomo el minibús?",
        note: "Vehicle terms vary by city.",
      },
      {
        english: "Is the entrance fee included?",
        target: "¿Está incluida la entrada?",
        note: "Clarify tour pricing.",
      },
      {
        english: "Could you write the address down?",
        target: "¿Me puede anotar la dirección?",
        note: "Useful before a ride.",
      },
      {
        english: "May I take a photo here?",
        target: "¿Se puede tomar fotos aquí?",
        note: "Ask before photographing.",
      },
    ],
  ),
  spanish(
    "chile",
    "Chile",
    "🇨🇱",
    "Santiago · Atacama · central coast · lake district · Patagonia",
    "Chilean speech often reduces sounds and uses local vocabulary. Polite repair phrases are essential; metro, micro, colectivo, and bus may refer to different services.",
    [
      "Ask speakers to repeat or slow down without apologizing for learning.",
      "Confirm the type of transport, route number, stop, and payment method.",
      "For long-distance nature travel, ask about wind, closures, equipment, and return logistics.",
    ],
    [
      {
        english: "Sorry, could you say it more slowly?",
        target: "Disculpe, ¿lo puede decir más despacio?",
        note: "An important listening phrase in Chile.",
      },
      {
        english: "How much does it cost?",
        target: "¿Cuánto sale?",
        note: "Sale is common for price.",
      },
      {
        english: "Which bus goes downtown?",
        target: "¿Qué micro va al centro?",
        note: "Micro is common for a city bus.",
      },
      {
        english: "I need it right away.",
        target: "Lo necesito al tiro.",
        note: "Al tiro is a common Chilean expression.",
      },
    ],
  ),
  spanish(
    "argentina",
    "Argentina",
    "🇦🇷",
    "Buenos Aires · Mendoza · northwest · Córdoba · Patagonia",
    "Argentine Spanish commonly uses vos with its own verb forms, colectivo for city bus, subte in Buenos Aires, and celular for phone.",
    [
      "Practice vos forms such as podés, querés, tenés, and decime.",
      "Ask about exchange/payment options without relying on a quoted rate that may change.",
      "Meal times can be late; confirm kitchen hours and reservation expectations.",
    ],
    [
      { english: "Can you help me?", target: "¿Me podés ayudar?", note: "Everyday voseo." },
      {
        english: "How much does it cost?",
        target: "¿Cuánto sale?",
        note: "A natural price question.",
      },
      {
        english: "Where do I catch the bus?",
        target: "¿Dónde tomo el colectivo?",
        note: "Colectivo means city bus.",
      },
      {
        english: "Could you bring me the bill?",
        target: "¿Me traés la cuenta, por favor?",
        note: "Natural voseo in a restaurant.",
      },
    ],
  ),
  spanish(
    "uruguay",
    "Uruguay",
    "🇺🇾",
    "Montevideo · Colonia · Atlantic coast · interior",
    "Uruguayan Spanish shares voseo and much River Plate vocabulary with Argentina. Ómnibus is common for bus; ta can mean okay in casual speech.",
    [
      "Use voseo forms and listen for River Plate pronunciation.",
      "Ask whether a restaurant table has a cover charge and whether service is included.",
      "Confirm bus terminal, platform, and whether the ticket is changeable.",
    ],
    [
      {
        english: "Can you recommend a place?",
        target: "¿Me podés recomendar un lugar?",
        note: "Friendly voseo.",
      },
      {
        english: "Where does the bus leave from?",
        target: "¿De dónde sale el ómnibus?",
        note: "Ómnibus is common in Uruguay.",
      },
      {
        english: "Is the cover charge included?",
        target: "¿El cubierto está incluido?",
        note: "Clarify the restaurant bill.",
      },
      { english: "Okay, perfect.", target: "Ta, perfecto.", note: "Casual Uruguayan agreement." },
    ],
  ),
  spanish(
    "paraguay",
    "Paraguay",
    "🇵🇾",
    "Asunción · Central Department · Chaco · Encarnación",
    "Spanish and Guaraní are both central to daily life, and speakers may move between them. Respectfully asking for clarification is more useful than pretending to understand.",
    [
      "Expect place names and casual expressions from Guaraní even within Spanish conversation.",
      "Confirm long-distance departure points and travel time rather than assuming a single central terminal.",
      "Ask what a dish or drink contains when its name is unfamiliar.",
    ],
    [
      {
        english: "Hello, how are you?",
        target: "Mba'éichapa.",
        note: "A widely recognized Guaraní greeting.",
      },
      {
        english: "Could you explain what it is?",
        target: "¿Me puede explicar qué es?",
        note: "Useful for unfamiliar local words.",
      },
      {
        english: "How long does the trip take?",
        target: "¿Cuánto dura el viaje?",
        note: "Confirm before departure.",
      },
      {
        english: "Thank you very much.",
        target: "Muchas gracias.",
        note: "Reliable in Spanish conversation.",
      },
    ],
  ),
  spanish(
    "equatorial-guinea",
    "Equatorial Guinea",
    "🇬🇶",
    "Bioko · Río Muni · Malabo · Bata",
    "Spanish is an official and widely used language in Equatorial Guinea, within a multilingual society that also includes French, Portuguese, Fang, Bube, and other languages.",
    [
      "Use formal usted with officials and new service contacts unless invited to do otherwise.",
      "Confirm transport, permission, photography, payment, and access details explicitly.",
      "Do not assume that Spanish is every person's preferred language; ask politely when uncertain.",
    ],
    [
      {
        english: "Do you speak Spanish?",
        target: "¿Habla español?",
        note: "Ask rather than assume.",
      },
      {
        english: "Do I need permission to enter?",
        target: "¿Necesito permiso para entrar?",
        note: "Confirm access requirements.",
      },
      {
        english: "May I take a photograph?",
        target: "¿Puedo tomar una fotografía?",
        note: "Ask before photographing.",
      },
      {
        english: "Could you recommend safe transportation?",
        target: "¿Me puede recomendar un transporte confiable?",
        note: "Seek current local guidance.",
      },
    ],
  ),
  spanish(
    "dominican-republic",
    "Dominican Republic",
    "🇩🇴",
    "Santo Domingo · Santiago · north coast · east · southwest",
    "Dominican speech is fast and often reduces final sounds. Guagua means bus, concho can refer to shared local transport, and directions may use landmarks more than street numbers.",
    [
      "Confirm whether a ride is private, shared, per person, or for the whole vehicle.",
      "Use repetition and landmark questions to repair rapid directions.",
      "Ask whether beach, boat, food, equipment, and pickup are included in an excursion.",
    ],
    [
      {
        english: "Where do I catch the bus?",
        target: "¿Dónde cojo la guagua?",
        note: "Guagua means bus locally.",
      },
      {
        english: "Is the price per person?",
        target: "¿El precio es por persona?",
        note: "Important for rides and tours.",
      },
      {
        english: "What landmark is it near?",
        target: "¿Cerca de qué queda?",
        note: "Useful for local directions.",
      },
      {
        english: "Could you repeat that more slowly?",
        target: "¿Me lo repite más despacio, por favor?",
        note: "Essential listening repair.",
      },
    ],
  ),
  spanish(
    "puerto-rico",
    "Puerto Rico",
    "🇵🇷",
    "San Juan · central mountains · west · east and islands",
    "Puerto Rican Spanish uses guagua for bus and many English-influenced terms, while retaining rich local vocabulary. Speech can reduce final sounds.",
    [
      "Ask whether a beach or island transfer needs advance booking and where it departs.",
      "Confirm if card, cash, tip, tax, and service are handled separately.",
      "Learn both a local term and a broadly understood alternative when possible.",
    ],
    [
      {
        english: "Where is the bus stop?",
        target: "¿Dónde está la parada de la guagua?",
        note: "Guagua means bus locally.",
      },
      {
        english: "Do I need a reservation?",
        target: "¿Necesito una reservación?",
        note: "Reservación is common locally.",
      },
      {
        english: "Can you recommend a local place?",
        target: "¿Me recomienda un sitio de aquí?",
        note: "Ask beyond tourist listings.",
      },
      {
        english: "That was excellent.",
        target: "Eso estuvo brutal.",
        note: "Brutal can mean excellent in casual Puerto Rican speech.",
      },
    ],
  ),
  italian(
    "italy",
    "Italy",
    "🇮🇹",
    "Rome · Florence · Venice · Naples · Milan · islands",
    "Italy changes by region, but courteous standard Italian travels well. In Rome, learn to ask about ZTL restrictions, official taxi stands, café counter versus table service, and the complete Vespa rental price.",
    [
      "Before renting a Vespa, confirm the total with tax, deposit, insurance, helmet, fuel, mileage, and damage rules.",
      "Ask whether a café price is al banco or al tavolo; table service may be priced differently.",
      "Historic centers may restrict vehicles. Ask the rental desk where you may ride and park; do not treat the app as current legal or road guidance.",
      "For the Vatican and many churches, ask about clothing, security, and entry requirements before arriving.",
    ],
    [
      {
        english: "How much is it altogether, including tax and insurance?",
        target: "Quanto costa in tutto, tasse e assicurazione comprese?",
        note: "The key all-in rental question.",
      },
      {
        english: "I’d like to rent a Vespa for one day.",
        target: "Vorrei noleggiare una Vespa per un giorno.",
        note: "Start a rental conversation.",
      },
      {
        english: "I have a headache. Could you direct me to a pharmacy?",
        target: "Ho mal di testa. Può indicarmi una farmacia?",
        note: "Basic help-seeking, not medical advice.",
      },
      {
        english: "The meal was extraordinary; I’ll tell my children about it.",
        target: "Il pasto è stato straordinario; ne parlerò ai miei figli.",
        note: "A heartfelt compliment to the chef.",
      },
      {
        english: "My luggage is missing. I need socks and underwear.",
        target: "Il mio bagaglio è disperso. Mi servono calzini e biancheria intima.",
        note: "Practical replacement shopping.",
      },
    ],
  ),
  italian(
    "vatican-city",
    "Vatican City",
    "🇻🇦",
    "St. Peter’s Square · basilica · museums",
    "Italian is the practical visitor language around Vatican City. Expect security procedures, formal sacred spaces, queues, and distinct entrances for different sites.",
    [
      "Ask which line and entrance you need instead of assuming every queue leads to the same place.",
      "Confirm current clothing, bag, ticket, and security requirements with official staff.",
      "Use a quiet, respectful register inside sacred spaces and during services.",
    ],
    [
      {
        english: "Which line is for the museums?",
        target: "Qual è la fila per i Musei Vaticani?",
        note: "Distinguish the destination before waiting.",
      },
      {
        english: "Is this entrance for the basilica?",
        target: "Questo ingresso è per la basilica?",
        note: "Confirm the entrance.",
      },
      {
        english: "Is this clothing appropriate?",
        target: "Questo abbigliamento è adatto?",
        note: "Ask staff about dress requirements.",
      },
      {
        english: "Where is the security checkpoint?",
        target: "Dov'è il controllo di sicurezza?",
        note: "Useful on arrival.",
      },
    ],
  ),
  italian(
    "san-marino",
    "San Marino",
    "🇸🇲",
    "City of San Marino · Borgo Maggiore · surrounding castles",
    "Standard Italian is the visitor language. Steep streets, viewpoints, cross-border buses, and small-state institutions shape many practical interactions.",
    [
      "Ask where a bus stops on both the outward and return trip.",
      "Check walking difficulty and accessibility before choosing a hilltop route.",
      "Clarify whether a souvenir is decorative or an official document or stamp service.",
    ],
    [
      {
        english: "Where does the return bus leave from?",
        target: "Da dove parte l'autobus di ritorno?",
        note: "Confirm before exploring.",
      },
      {
        english: "Is the walk very steep?",
        target: "Il percorso a piedi è molto ripido?",
        note: "Useful in the historic center.",
      },
      {
        english: "What time is the last bus?",
        target: "A che ora parte l'ultimo autobus?",
        note: "Confirm locally on the day.",
      },
      {
        english: "Could you recommend a typical dish?",
        target: "Mi può consigliare un piatto tipico?",
        note: "Invite a local recommendation.",
      },
    ],
  ),
  italian(
    "switzerland-italian",
    "Switzerland — Italian-speaking regions",
    "🇨🇭",
    "Ticino · Italian-speaking Graubünden",
    "Italian is used in Ticino and parts of Graubünden within a multilingual Swiss setting. Prices, rail language, and institutional terms may differ from neighboring Italy.",
    [
      "Confirm the currency, total price, and payment method before purchasing.",
      "For rail travel, verify platform, connection, coach, and whether a reservation is needed.",
      "Listen for German or French place names alongside Italian versions.",
    ],
    [
      {
        english: "Which platform does the train leave from?",
        target: "Da quale binario parte il treno?",
        note: "Binario means platform/track.",
      },
      {
        english: "Is the price in Swiss francs?",
        target: "Il prezzo è in franchi svizzeri?",
        note: "Confirm the currency.",
      },
      {
        english: "Do I have to change trains?",
        target: "Devo cambiare treno?",
        note: "Clarify the connection.",
      },
      {
        english: "Could I have the receipt, please?",
        target: "Posso avere lo scontrino, per favore?",
        note: "Useful after payment.",
      },
    ],
  ),
  {
    id: "japan",
    country: "Japan",
    flag: "🇯🇵",
    language: "Japanese",
    regions: "Tokyo · Kansai · Hokkaido · Kyushu · Okinawa",
    localLens:
      "Polite Japanese, clear nonverbal attention, orderly queues, and context-sensitive service language matter. Regional words and food traditions vary, but basic です・ます speech is broadly useful.",
    practicalNotes: [
      "Use すみません to get attention, apologize lightly, or open a request.",
      "Confirm whether transport is local, rapid, express, or limited express and whether a separate ticket is required.",
      "Ask before changing ingredients; a dish that looks familiar may use fish stock or another unexpected ingredient.",
      "Do not rely on the app for current rail, disaster, medical, or legal instructions; confirm with local staff and official sources.",
    ],
    phrases: [
      {
        english: "Excuse me / may I ask?",
        target: "すみません。",
        note: "Sumimasen opens many polite interactions.",
      },
      {
        english: "How much is this?",
        target: "これはいくらですか。",
        note: "Kore wa ikura desu ka.",
      },
      {
        english: "One of these, please.",
        target: "これを一つお願いします。",
        note: "Kore o hitotsu onegaishimasu.",
      },
      {
        english: "Does this train stop at Kyoto?",
        target: "この電車は京都に止まりますか。",
        note: "Kono densha wa Kyōto ni tomarimasu ka.",
      },
      {
        english: "It was wonderful. I want to tell my family about it.",
        target: "本当にすばらしかったです。家族にも話したいです。",
        note: "Hontō ni subarashikatta desu. Kazoku ni mo hanashitai desu.",
      },
    ],
  },
];

const destinationById = new Map(
  TRAVEL_DESTINATIONS.map((destination) => [destination.id, destination]),
);

export function getTravelDestination(id: string | null | undefined): TravelDestination | null {
  return id ? (destinationById.get(id) ?? null) : null;
}

export function getTravelDestinations(language: Language): TravelDestination[] {
  return TRAVEL_DESTINATIONS.filter((destination) => destination.language === language);
}

export function isDestinationForLanguage(id: string, language: string): boolean {
  return destinationById.get(id)?.language === language;
}

export function destinationPromptContext(destination: TravelDestination): string {
  return [
    `Destination country: ${destination.country}. Regions represented: ${destination.regions}.`,
    `Local language lens: ${destination.localLens}`,
    `Country-specific practice notes: ${destination.practicalNotes.join(" ")}`,
    `Useful local phrasing: ${destination.phrases.map((phrase) => `${phrase.english} = ${phrase.target} (${phrase.note})`).join(" | ")}`,
    "Use this destination context only when it naturally fits the approved mission. Do not invent current prices, schedules, laws, entry rules, medical instructions, or emergency information; tell the learner to confirm changing facts locally.",
  ].join("\n");
}
