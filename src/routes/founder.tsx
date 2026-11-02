import { createFileRoute, Link } from "@tanstack/react-router";

// Mirrors language-threshold/src/pages/Founder.tsx; keep story text in sync with the marketing page.
const sansFont = { fontFamily: "inherit" };
const displayFont = { fontFamily: "var(--font-display, Georgia, serif)" };
const serifFont = displayFont;
export const Route = createFileRoute("/founder")({
  component: Founder,
  head: () => ({
    meta: [
      { title: "Why I built Language Threshold — Toby Anderton" },
      {
        name: "description",
        content:
          "The story behind Language Threshold — built by a linguist, missionary, and physician who believes language is medicine.",
      },
    ],
    links: [{ rel: "canonical", href: "https://languagethreshold.com/founder" }],
  }),
});

const CREDENTIALS = [
  {
    icon: "🏛️",
    label: "B.A. Linguistics",
    sub: "Undergrad degree, language structure & acquisition",
  },
  {
    icon: "🇯🇵",
    label: "Minor in Japanese",
    sub: "Academic study + 2-year immersion mission in Japan",
  },
  {
    icon: "🇪🇸",
    label: "12 Credits — Spanish",
    sub: "Required coursework + 1 year in the FLSR Spanish apartment",
  },
  { icon: "📜", label: "Latin & Greek", sub: "Classical language study, high school" },
  {
    icon: "🚪",
    label: "FLSR — BYU",
    sub: "Foreign Language Student Residence — where this app was conceived",
  },
  {
    icon: "🏥",
    label: "Orthopedic Surgeon",
    sub: "In practice since 2015; orthopedic residency 2010–2015",
  },
  { icon: "🌎", label: "Operation Walk", sub: "El Salvador 2025 — returning fall 2026" },
  {
    icon: "🏘️",
    label: "Bilingual Community",
    sub: "Practices in towns with ~30% Hispanic population",
  },
];

const TIMELINE = [
  {
    year: "1998",
    heading: "High School — Latin, Greek, and the Root of Everything",
    body: `I graduated in 1998 having spent years studying Latin and Greek. Not as a curiosity — as a genuine obsession. Classical languages are the skeleton underneath English, Spanish, and virtually all of medical terminology. Learning them taught me something that would shape everything that followed: language is a system of traceable, learnable patterns. Nothing is arbitrary if you look far enough back.`,
  },
  {
    year: "1999 – 2001",
    heading: "Mission in Japan — Full Immersion, Zero Shortcuts",
    body: `Two years serving an LDS mission in Japan. I arrived with almost no Japanese and had to build fluency entirely through immersion — living with native companions, teaching, reading kanji daily, navigating layers of social register that no textbook adequately prepares you for. It was the hardest and most formative linguistic experience of my life. I didn't just learn the language. I learned how acquisition actually works when the stakes are real and there's no English to fall back on.`,
  },
  {
    year: "2001 – 2006",
    heading: "The FLSR — A Door That Changed Everything",
    body: `At BYU I lived in the Foreign Language Student Residence. I moved into the Japanese apartment first — after two years in Japan I was already fluent, so it felt like home. Then the bug hit me. I wanted another language. I crossed into the Spanish apartment and stayed for a year.\n\nThe rule was simple and absolute: the moment you stepped through the threshold of the apartment, you spoke the language of that floor. No English. Not in the kitchen at midnight, not when you were exhausted, not when the word wasn't coming. We cooked together four nights a week. We went to church together in Spanish. We built friendships in a language I had barely started.\n\nWithin weeks — not months — I was functional in Spanish. Not because I'm gifted. Because the vocabulary I was learning had a home. I needed kitchen words to cook. I needed Sunday school vocabulary because I had to teach a lesson with three weeks of Spanish under my belt. I needed the language of community because I was living in one.\n\nThat's when I understood something that no linguistics textbook had explained as clearly: context-first learning works at a speed that classroom learning simply cannot match. And standing in that apartment, I started dreaming of a way to give that experience to someone who couldn't move into the FLSR — a nurse, a foreman, a missionary, an orthopedic surgeon going to El Salvador.\n\nThe threshold in the name is not a metaphor. It was a door.`,
  },
  {
    year: "2001 – 2006",
    heading: "BYU — The Science to Match the Experience",
    body: `The FLSR gave me the lived intuition. The linguistics degree gave me the framework to understand why it worked. Phonology, morphology, syntax, psycholinguistics, acquisition theory — with a minor in Japanese and 12 required credits of formal Spanish. I also spent time in nursing school before returning to linguistics, which gave me my first real look at clinical communication and how language barriers in healthcare aren't just inconvenient — in medicine, they cost outcomes. I graduated in 2006.`,
  },
  {
    year: "2006",
    heading: "Ciudad Obregón — Adobe Bricks and the Right Tool",
    body: `My first trip to México wasn't medical. It was construction. My father and I traveled to Ciudad Obregón on a service mission to help a native tribe outside the city build homes — making adobe bricks by hand in the desert heat.\n\nTwo years earlier, back in the US, my father and I had finished building an adobe brick press. With that press, two people could make 1,000 bricks in a day. In Ciudad Obregón, twenty people worked until their backs gave out and made 750.\n\nThe whole time I was there, I kept doing the math. How many more homes could we have built with the press? How many families could have been housed in the same two weeks? The tool existed. They just didn't have it. And so they struggled — not because they weren't working hard enough, but because no one had brought them the right tool.\n\nI left thinking about that for a long time. There is always a better way. But if you don't know it exists, you just struggle. The whole time.\n\nThat's what most language learners are doing. Working hard. Making 750 bricks a day by hand. Not because they're doing it wrong — because no one has handed them the press.`,
  },
  {
    year: "2006 – 2010",
    heading: "Medical School — SUNY",
    body: `I attended medical school at SUNY, where the linguistics background proved unexpectedly valuable. Diagnosis is pattern recognition. A physician reads a constellation of symptoms and maps them to a known framework — the same cognitive mechanism a fluent speaker uses to process a foreign sentence in real time. I kept seeing the same underlying structure in both disciplines: exposure to patterns, feedback, repetition, until recognition becomes automatic and effortless.`,
  },
  {
    year: "2010 – 2015",
    heading: "Orthopedic Residency",
    body: `Five years of orthopedic residency sharpened both the clinical and the communication sides of practice. Orthopedics puts you in the room with patients who are often frightened, in pain, and making decisions they don't fully understand — in a language that may not be their own. I watched that gap cost people outcomes. Clear communication in the patient's language isn't a courtesy; in orthopedics and surgery, it directly affects informed consent, compliance, and recovery.`,
  },
  {
    year: "2015 – Present",
    heading: "In Practice — and Building Something on the Side",
    body: `I've been in orthopedic practice since 2015. The neighboring towns where I work and live are 25–30% Hispanic. The need is visible and constant — in waiting rooms, in post-op instructions, in follow-up calls. Language Threshold grew out of that daily reality: a tool I wanted for myself and for every colleague, contractor, coach, or missionary who has ever stood across from someone and known that the language barrier was the only thing in the way.`,
  },
  {
    year: "2025",
    heading: "Operation Walk — El Salvador",
    body: `Last year I traveled to El Salvador with Operation Walk, a nonprofit that provides free orthopedic surgery to patients in underserved communities. The Spanish I'd built over decades — academic, immersive, clinical, conversational — came together in one room. And I still hit moments where I reached for a word or phrase and it wasn't there. That experience is directly reflected in the depth of the medical module in this platform. I'm going back again this fall.`,
  },
];

function Founder() {
  return (
    <main
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
      }}
    >
      <nav aria-label="Founder page" className="mx-auto max-w-4xl px-6 pt-8">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-base font-semibold text-gold-ink underline underline-offset-4"
        >
          ← Back to learning
        </Link>
      </nav>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-10 pb-16">
        <p className="text-sm font-semibold mb-5" style={{ ...sansFont, color: "var(--gold-ink)" }}>
          The Founder
        </p>
        <h1
          className="text-5xl md:text-6xl font-bold leading-tight mb-6"
          style={{ ...displayFont }}
        >
          Toby Anderton
        </h1>
        <p
          className="text-xl md:text-2xl max-w-2xl leading-relaxed"
          style={{ ...serifFont, color: "var(--muted-foreground)" }}
        >
          Orthopedic surgeon. Linguist. Missionary. Language Threshold exists because I have spent
          decades on both sides of the language gap — in classrooms, operating rooms, and mission
          fields.
        </p>
      </section>

      {/* Core Insight — center of gravity */}
      <section
        className="py-16"
        style={{
          backgroundColor: "rgba(201,168,76,0.06)",
          borderTop: "1px solid rgba(201,168,76,0.15)",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            className="mx-auto mb-8"
            aria-hidden="true"
          >
            <path
              d="M2 32V14C2 7.373 7.373 2 14 2C20.627 2 26 7.373 26 14V32"
              stroke="#C9A84C"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M2 32H26" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <blockquote
            className="text-2xl md:text-3xl leading-relaxed mb-8"
            style={{ ...serifFont, color: "var(--foreground)" }}
          >
            "Medicine and language are more alike than most people realize. Both are fundamentally
            about communication. And communication is fundamentally about{" "}
            <span style={{ color: "var(--gold-ink)" }}>pattern recognition.</span>"
          </blockquote>
          <p
            className="text-base md:text-lg leading-relaxed max-w-2xl mx-auto"
            style={{ ...sansFont, color: "var(--muted-foreground)" }}
          >
            A physician reads a set of symptoms and maps them to a known pattern — that's diagnosis.
            A fluent speaker hears a sentence and maps it to familiar structures — that's
            comprehension. The mechanism is the same. The training method should be too: give people
            the right patterns, in the right context, with enough repetition to make recognition
            automatic.
          </p>
        </div>
      </section>

      {/* FLSR Origin — where the name comes from */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            border: "1px solid rgba(201,168,76,0.25)",
            backgroundColor: "rgba(201,168,76,0.03)",
          }}
        >
          {/* Header bar */}
          <div
            className="px-8 pt-8 pb-6"
            style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}
          >
            <p
              className="text-sm font-semibold mb-3"
              style={{ ...sansFont, color: "var(--gold-ink)" }}
            >
              Where the name comes from
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-snug" style={{ ...displayFont }}>
              The FLSR — BYU's Foreign Language Student Residence
            </h2>
          </div>

          <div className="px-8 py-8 grid md:grid-cols-2 gap-8">
            {/* Left: the rule */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🚪</div>
                <p
                  className="text-sm font-semibold uppercase tracking-[0.15em]"
                  style={{ ...sansFont, color: "var(--gold-ink)" }}
                >
                  The Rule
                </p>
              </div>
              <p
                className="text-lg leading-relaxed mb-5"
                style={{ ...serifFont, color: "var(--foreground)" }}
              >
                "Cross the threshold of the apartment door — speak the language of the floor. No
                English. No exceptions."
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.8 }}
              >
                Japanese apartment first. Then the bug hit. A year in the Spanish apartment. Cooking
                together four nights a week. Church in Spanish. Sunday school lessons taught with
                three weeks of vocabulary.
              </p>
            </div>

            {/* Right: the discovery */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">💡</div>
                <p
                  className="text-sm font-semibold uppercase tracking-[0.15em]"
                  style={{ ...sansFont, color: "var(--gold-ink)" }}
                >
                  The Discovery
                </p>
              </div>
              <p
                className="text-sm leading-relaxed mb-5"
                style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.8 }}
              >
                Within weeks — not months — Spanish arrived. Not because it was easy. Because the
                vocabulary had a home. Kitchen words existed to cook. Church words existed to teach.
                The language wasn't studied. It was needed.
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.8 }}
              >
                Standing in that apartment, the idea formed: what if someone going to El Salvador
                could have this before they landed? What if a nurse could have the exam room
                vocabulary before the first shift? What if the threshold could go with you?
              </p>
            </div>
          </div>

          {/* Footer callout */}
          <div
            className="px-8 py-5"
            style={{
              borderTop: "1px solid rgba(201,168,76,0.12)",
              backgroundColor: "rgba(201,168,76,0.04)",
            }}
          >
            <p className="text-base text-center" style={{ ...serifFont, color: "var(--gold-ink)" }}>
              The threshold in the name is not a metaphor. It was a door.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <p
          className="text-sm font-semibold mb-12"
          style={{ ...sansFont, color: "var(--gold-ink)" }}
        >
          The Journey That Built This
        </p>
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 left-0 w-px hidden md:block"
            style={{ backgroundColor: "rgba(201,168,76,0.2)", marginLeft: 2 }}
          />
          <div className="space-y-16">
            {TIMELINE.map((item, i) => (
              <div key={i} className="md:pl-12 relative">
                {/* Timeline dot */}
                <div
                  className="hidden md:flex absolute left-0 top-1.5 w-[6px] h-[6px] rounded-full"
                  style={{ backgroundColor: "var(--primary)", transform: "translateX(-2px)" }}
                />
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ ...sansFont, color: "var(--gold-ink)" }}
                >
                  {item.year}
                </p>
                <h3 className="text-xl font-semibold mb-3" style={{ ...displayFont }}>
                  {item.heading}
                </h3>
                <p
                  className="whitespace-pre-line text-base leading-relaxed"
                  style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.8 }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <p className="text-sm font-semibold mb-8" style={{ ...sansFont, color: "var(--gold-ink)" }}>
          Credentials & Context
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CREDENTIALS.map((c, i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{ backgroundColor: "var(--card)", border: "1px solid rgba(201,168,76,0.12)" }}
            >
              <span className="text-2xl mb-3 block">{c.icon}</span>
              <p
                className="font-semibold text-sm mb-1"
                style={{ ...sansFont, color: "var(--foreground)" }}
              >
                {c.label}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ ...sansFont, color: "var(--muted-foreground)" }}
              >
                {c.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why I built it */}
      <section
        className="py-20"
        style={{ backgroundColor: "var(--card)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <p
            className="text-sm font-semibold mb-6"
            style={{ ...sansFont, color: "var(--gold-ink)" }}
          >
            Why I Built This
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-8 leading-snug"
            style={{ ...displayFont }}
          >
            The tools I needed didn't exist.
          </h2>
          <div
            className="space-y-5 text-base leading-relaxed"
            style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.85 }}
          >
            <p>
              Whether I was preparing for Japan, serving in El Salvador, or working alongside
              Hispanic patients and community members at home — I kept running into the same wall.
              Generic apps taught me vocabulary. Textbooks taught me grammar. But neither taught me
              how to <span>function</span> in the actual context I was about to enter.
            </p>
            <p>
              A medical professional going to a Spanish-speaking country doesn't need "how do you
              say apple." They need to ask about pain levels, medication history, and informed
              consent — with the confidence that comes from having rehearsed that exact conversation
              hundreds of times before it matters.
            </p>
            <p>
              Language Threshold is built around one principle:{" "}
              <strong style={{ color: "var(--foreground)" }}>domain-first acquisition.</strong>{" "}
              Learn the language of your field, in the context of your work, using the patterns
              you'll actually need. The breadth comes later. The depth that gets you functional
              comes first.
            </p>
            <p>
              In 2006 I helped build homes in México by making adobe bricks by hand. Twenty people.
              Backbreaking work. 750 bricks a day. Two years earlier my father and I had built a
              brick press that could produce 1,000 bricks with two people. The press wasn't there.
              So everyone struggled. I left thinking: the right tool makes everything easier. People
              don't fail at languages because they're lazy — they fail because no one has handed
              them the right tool for the context they're in.
            </p>
            <p>
              I'm building this as an ongoing project. Every trip to El Salvador, every conversation
              with a neighbor, every clinical case that crossed a language barrier — it all feeds
              back into the curriculum. This isn't a product I shipped and walked away from. It's a
              practice I'm still in.
            </p>
          </div>
        </div>
      </section>

      {/* The Adobe Brick Insight */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div
          className="grid md:grid-cols-2 gap-px rounded-3xl overflow-hidden"
          style={{
            border: "1px solid rgba(201,168,76,0.2)",
            backgroundColor: "rgba(201,168,76,0.15)",
          }}
        >
          {/* Left — the struggle */}
          <div className="p-8" style={{ backgroundColor: "var(--background)" }}>
            <p
              className="text-sm font-semibold mb-4"
              style={{ ...sansFont, color: "var(--muted-foreground)" }}
            >
              Ciudad Obregón, 2006
            </p>
            <div
              className="text-5xl font-black mb-2 tabular-nums"
              style={{ ...displayFont, color: "var(--muted-foreground)" }}
            >
              750
            </div>
            <p className="text-sm mb-5" style={{ ...sansFont, color: "var(--muted-foreground)" }}>
              bricks a day · 20 people · backbreaking work
            </p>
            <p
              className="whitespace-pre-line text-base leading-relaxed"
              style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.8 }}
            >
              A native tribe outside the city. Adobe bricks made by hand in the desert. Twenty
              people working as hard as people can work.
            </p>
          </div>

          {/* Right — the tool */}
          <div className="p-8" style={{ backgroundColor: "var(--background)" }}>
            <p
              className="text-sm font-semibold mb-4"
              style={{ ...sansFont, color: "var(--gold-ink)" }}
            >
              With the right tool
            </p>
            <div
              className="text-5xl font-black mb-2 tabular-nums"
              style={{ ...displayFont, color: "var(--gold-ink)" }}
            >
              1,000
            </div>
            <p className="text-sm mb-5" style={{ ...sansFont, color: "var(--muted-foreground)" }}>
              bricks a day · 2 people · a press my father and I built
            </p>
            <p
              className="whitespace-pre-line text-base leading-relaxed"
              style={{ ...sansFont, color: "var(--muted-foreground)", lineHeight: 1.8 }}
            >
              The press existed. We just hadn't brought it. The tool was the difference — not the
              effort.
            </p>
          </div>
        </div>

        {/* Takeaway */}
        <div
          className="mt-6 px-8 py-6 rounded-2xl text-center"
          style={{
            backgroundColor: "rgba(201,168,76,0.04)",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <p
            className="text-lg leading-relaxed"
            style={{ ...serifFont, color: "var(--foreground)" }}
          >
            "There is always a better way. But if you don't know it exists, you just struggle — the
            whole time. That's what most language learners are doing."
          </p>
          <p className="mt-3 text-sm" style={{ ...sansFont, color: "var(--muted-foreground)" }}>
            — Toby Anderton
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-snug" style={{ ...displayFont }}>
          Ready to cross the threshold?
        </h2>
        <p
          className="text-base mb-10 max-w-xl mx-auto leading-relaxed"
          style={{ ...sansFont, color: "var(--muted-foreground)" }}
        >
          Start with your field. Build fluency in the conversations that matter most in your work.
          Everything is free to explore — no account required.
        </p>
        <a
          href="/"
          className="inline-block px-10 py-4 rounded-full font-semibold text-base transition-opacity hover:opacity-90"
          style={{
            ...sansFont,
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Back to learning →
        </a>
        <p className="mt-5 text-xs" style={{ ...sansFont, color: "var(--muted-foreground)" }}>
          No signup. No credit card. Pick your area and begin.
        </p>
      </section>
    </main>
  );
}
