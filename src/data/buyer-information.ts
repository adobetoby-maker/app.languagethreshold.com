export const buyerFaq = [
  {
    question: "What is Language Threshold designed for?",
    answer:
      "The daily conversations that make work easier: understanding a patient’s question, explaining the next step, giving directions, or checking that a teammate understood. Practice the language you need for the work you already do.",
  },
  {
    question: "Will this prepare me for an interpreter certification test?",
    answer:
      "It can help you build vocabulary, listening and speaking skills. It is not currently designed to prepare you to pass an interpreter certification test. It is designed around the conversations team members handle in daily work.",
  },
  {
    question: "How long until I can hold a basic work conversation?",
    answer:
      "Start with one situation you need, such as an intake or a morning brief, and practice it in short sessions. Listen, repeat and rehearse your responses. How quickly you progress depends on your starting level and how often you practice.",
  },
  {
    question: "What can I practice?",
    answer:
      "Choose role-specific lessons, listen and read in both languages, then rehearse with the AI speaking partner or Field Prep. Repeat the conversations you need before trying them at work.",
  },
  {
    question: "How does the five-seat team plan work?",
    answer:
      "Team plans start at $99/month for five learner seats. A team lead can invite learners, assign focus modules and follow activity. Sign in to set up or join a team; contact support for help with your crew’s seat needs.",
  },
  {
    question: "What happens after the free trial?",
    answer:
      "The trial lasts 7 days. Your chosen subscription price starts after the trial. Cancel during the trial to avoid the first charge. Checkout shows your billing period and renewal terms.",
  },
  {
    question: "Can I try lessons without paying?",
    answer:
      "Yes. Missionary Spanish has full access and is always free. Individual and Family subscriptions add paid library access; compare the current plans on the pricing page.",
  },
  {
    question: "Who is this for?",
    answer:
      "Nurses, foremen and other team members who face language barriers during their workday. Choose the conversations that fit your role and practice them before your next shift.",
  },
];

type Story = { name: string; role: string; situation: string; quote: string; photo: string };
type Signal = { label: string; url: string; date: string };
type Usage = { count: number; label: string; asOf: string };
// Publish only with verified source data and consent. Never substitute example users or counts.
export const publicProof: { stories: Story[]; signals: Signal[]; usage: Usage | null } = {
  stories: [],
  signals: [],
  usage: null,
};
export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: buyerFaq.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

// Supply owner-approved assets here; null keeps incomplete evidence off the public site.
export const founderEvidence: { photo: string | null; profileUrl: string | null } = {
  photo: "/images/toby-anderton.webp",
  profileUrl: "https://tobyandertonmd.com",
};
export const productCapture: { src: string; alt: string; width: number; height: number } | null =
  null;
