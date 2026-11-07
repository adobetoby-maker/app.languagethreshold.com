export const buyerFaq = [
  {
    question: "Has the medical content been clinically reviewed?",
    answer:
      "The medical lessons are language practice material. A completed independent clinical review of the full library has not been established. Use your organization’s clinical guidance and qualified language support for patient care.",
  },
  {
    question: "Can I use this instead of a qualified interpreter?",
    answer:
      "Use it to rehearse everyday work conversations and build understanding alongside qualified interpreters. It does not qualify you to interpret or replace the language support required by your organization.",
  },
  {
    question: "How long until I can hold a basic work conversation?",
    answer:
      "Start with one situation you need, such as an intake or a morning brief, and practice it in short sessions. Your starting level, listening comprehension and practice time affect progress. We do not promise a fixed time to fluency or readiness for unsupervised clinical communication.",
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
      "Nurses, foremen and other learners who want to practice conversations for their work. It is language practice, not interpreter certification, clinical training or a guarantee of fluency.",
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
