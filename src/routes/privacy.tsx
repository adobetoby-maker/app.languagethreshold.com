import { createFileRoute } from "@tanstack/react-router";
import { LEGAL_CONTACT, LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Language Threshold" },
      {
        name: "description",
        content:
          "What Language Threshold collects, why, which services process it, and how to ask for your data to be deleted.",
      },
    ],
  }),
});

function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Language Threshold (“we”, “us”) runs app.languagethreshold.com, a language-learning app for
        people who use a second language at work. This policy explains what we collect, why, and
        the choices you have.
      </p>

      <LegalSection heading="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account details:</strong> your email address and a
            password (stored by our account provider, never readable by us), or the basic profile
            Google shares if you sign in with Google.
          </li>
          <li>
            <strong className="text-foreground">Learning progress:</strong> your chosen languages and
            modules, lessons and steps you open, lessons you mark mastered, plan dates, review
            results, words you save, notes, and your written and handwritten answers.
          </li>
          <li>
            <strong className="text-foreground">Speaking practice:</strong> in speaking practice your
            browser or phone turns your voice into text; we do not upload that audio. The recognized
            text is sent to our AI provider to produce the practice partner’s reply. Speaking
            practice asks you to confirm you are at least 13.
          </li>
          <li>
            <strong className="text-foreground">Exams:</strong> if you take a module exam, your
            answers, handwriting and any spoken responses you record are stored privately with your
            account.
          </li>
          <li>
            <strong className="text-foreground">Team membership:</strong> if you join a team (for
            example, your employer’s crew), the team’s admins can see your lesson activity, your
            Core 60 progress, and your exam enrollment and results for that team.
          </li>
          <li>
            <strong className="text-foreground">Payments:</strong> paid plans are handled by Stripe.
            We receive your plan and payment status, not your card number.
          </li>
          <li>
            <strong className="text-foreground">Email preferences:</strong> whether you have
            unsubscribed from promotional email, and referral codes you use.
          </li>
          <li>
            <strong className="text-foreground">Device and usage data:</strong> page views measured
            by Vercel Analytics and Google Analytics (with IP anonymization; both are turned off on
            private exam pages), error reports to Sentry without personal details, and
            push-notification subscriptions if you turn reminders on.
          </li>
        </ul>
        <p>
          The app also saves your progress in your browser’s storage so it works offline and loads
          quickly. “Start over on this device” clears that copy without deleting your account.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          To run the app and sync your progress across devices; to give AI feedback, tutoring and
          speaking practice; to show team admins their team’s progress; to bill paid plans; to send
          account and password emails and, if you have not opted out, occasional product emails; to
          keep the service secure; and to improve lessons. We do not sell your personal information
          and we do not show ads.
        </p>
      </LegalSection>

      <LegalSection heading="Services that process your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase: accounts, database and private file storage.</li>
          <li>Vercel: hosting and privacy-focused page analytics.</li>
          <li>
            Anthropic: AI tutoring, feedback and practice replies, including handwriting images you
            submit for reading.
          </li>
          <li>
            Google: Google sign-in (if you use it), Google Analytics, text-to-speech for practice
            partner lines, and web fonts.
          </li>
          <li>ElevenLabs: spoken audio for some languages.</li>
          <li>Stripe: payments and billing.</li>
          <li>Resend: account and product emails.</li>
          <li>Sentry: error reports.</li>
        </ul>
        <p>
          These providers process data for us to deliver the service. Some links in the app go to
          Amazon; as an Amazon Associate we earn from qualifying purchases.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          Language Threshold is built for adults and teens. Speaking practice requires confirming
          you are at least 13. A parent who sets up a child profile on a Family plan is responsible
          for that profile and can ask us to delete it at any time.
        </p>
      </LegalSection>

      <LegalSection heading="Keeping and deleting your data">
        <p>
          We keep your data while your account is open. To delete your account and the data stored
          with it, email{" "}
          <a className="text-gold underline" href={`mailto:${LEGAL_CONTACT}`}>
            {LEGAL_CONTACT}
          </a>{" "}
          from the address on your account and we will confirm when it is done. You can unsubscribe
          from product emails with the link in any of them, and cancel a subscription from your
          account page.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Your data is sent over encrypted connections, private files are stored with access
          controls, and team data is only visible to that team’s admins. No system is perfectly
          secure, so please use a strong password.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We will update this page when our practices change and change the date at the top. If a
          change is significant, we will tell signed-in users in the app or by email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
