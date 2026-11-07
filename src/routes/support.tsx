import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/support" }],
    meta: [
      { title: "Language Threshold Support" },
      {
        name: "description",
        content: "Get help with accounts, billing, lessons or setting up a crew.",
      },
      { property: "og:title", content: "Language Threshold Support" },
      {
        property: "og:description",
        content: "Get help with accounts, billing, lessons or setting up a crew.",
      },
      { property: "og:url", content: "https://app.languagethreshold.com/support" },
      { name: "twitter:title", content: "Language Threshold Support" },
      {
        name: "twitter:description",
        content: "Get help with accounts, billing, lessons or setting up a crew.",
      },
    ],
  }),
  component: Support,
});
function Support() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to="/" className="underline">
          Back to Language Threshold
        </Link>
        <h1 className="text-3xl font-semibold">How can we help?</h1>
        <Link to="/feedback" className="block rounded-xl border border-border p-4 underline">
          Share product feedback or suggest an improvement →
        </Link>
        <p>
          Email{" "}
          <a href="mailto:support@languagethreshold.com" className="underline">
            support@languagethreshold.com
          </a>{" "}
          for help with your account, billing, lessons, or setting up a crew.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Set up a crew", "Help setting up a crew"],
            ["Account or sign-in", "Account help"],
            ["Billing or subscription", "Billing help"],
            ["Something is not working", "Technical support"],
          ].map(([label, subject]) => (
            <a
              key={subject}
              href={`mailto:support@languagethreshold.com?subject=${encodeURIComponent(subject)}`}
              className="rounded-xl border border-border p-4 hover:border-gold"
            >
              {label} →
            </a>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          These links open your email app. Include the email you use for Language Threshold and what
          you were trying to do. Please do not send passwords, payment card numbers, or patient
          information.
        </p>
        <p className="text-sm text-muted-foreground">
          If your email app does not open, copy support@languagethreshold.com into Gmail or another
          mail service.
        </p>
      </div>
    </main>
  );
}
