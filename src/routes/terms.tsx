import { createFileRoute } from "@tanstack/react-router";
import { LEGAL_CONTACT, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/terms")({
  component: TermsOfService,
  head: () => ({
    meta: [
      { title: "Terms of Service — Language Threshold" },
      {
        name: "description",
        content:
          "The terms for using Language Threshold: accounts, plans and cancellation, teams, AI-generated content and job-site safety.",
      },
    ],
  }),
});

function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply when you use app.languagethreshold.com (“Language Threshold”, “the app”).
        By creating an account or using the app, you agree to them.
      </p>

      <LegalSection heading="Your account">
        <p>
          Give accurate information and keep your password private; you are responsible for
          activity on your account. You must be at least 13 to use Language Threshold on your own. A
          parent or guardian who creates a child profile on a Family plan agrees to these terms for
          that child.
        </p>
      </LegalSection>

      <LegalSection heading="Free access, plans and cancellation">
        <p>
          Some lessons, including each module’s Foundation, are free with an account. We may offer
          free access to groups (such as a pilot crew) for a period we tell them about. Paid plans
          start with a 7-day free trial, renew automatically and are billed by Stripe. You can
          cancel at any time from your account page; you keep access until the end of the period
          you paid for, and we do not give partial refunds. If we change prices, we will tell you
          before your next renewal.
        </p>
      </LegalSection>

      <LegalSection heading="Teams">
        <p>
          A team owner manages seats and invitations and pays for the team plan. Team admins can see
          each member’s lesson activity, Core 60 progress and exam results for that team. If you
          leave a team, its admins no longer see your new activity.
        </p>
      </LegalSection>

      <LegalSection heading="Learning content and AI">
        <p>
          Lessons, translations, feedback and practice conversations are partly written or produced
          by AI and may contain mistakes. Language Threshold is language practice. It is not
          professional, medical, legal or safety training and it is not a certification or a job
          qualification.
        </p>
        <p>
          On a job site, always follow your employer’s safety rules, the manufacturer’s instructions
          for the products you install, and the safety regulations that apply to your work.
          Measurements, nail patterns and other specifications in lessons are examples for language
          practice; confirm the real ones for each job.
        </p>
      </LegalSection>

      <LegalSection heading="Using the app fairly">
        <p>
          Don’t misuse the app: no attempts to break or overload it, access other people’s accounts
          or data, scrape or resell its content, or use it to harass anyone or create unlawful
          content. We may suspend accounts that do.
        </p>
      </LegalSection>

      <LegalSection heading="Your content and ours">
        <p>
          You keep ownership of what you write, record or upload. You give us permission to store
          and process it to run the app for you and your team. The app, its lessons and its design
          belong to Language Threshold; you may use them for your own learning and your team’s
          training.
        </p>
      </LegalSection>

      <LegalSection heading="Other services">
        <p>
          The app relies on outside services (listed in our{" "}
          <a className="text-gold underline" href="/privacy">
            Privacy Policy
          </a>
          ) and links to others, such as Amazon. Those services have their own terms. As an Amazon
          Associate we earn from qualifying purchases.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty and limits on liability">
        <p>
          The app is provided “as is”, without warranties of any kind, to the fullest extent the law
          allows. Language Threshold is not liable for indirect or consequential losses, or for
          losses caused by relying on lesson content in place of professional or safety guidance.
          Our total liability for any claim is limited to the amount you paid us in the 12 months
          before it.
        </p>
      </LegalSection>

      <LegalSection heading="Ending use">
        <p>
          You can stop using the app and ask us to delete your account at any time by emailing{" "}
          <a className="text-gold underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>
          . We may end or suspend access if these terms are broken or if we stop offering the
          service, and will try to give notice where we can.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p>
          We may update these terms and will change the date at the top. Continuing to use the app
          after an update means you accept the new terms; for significant changes we will tell
          signed-in users in the app or by email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
