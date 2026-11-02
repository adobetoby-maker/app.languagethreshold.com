/** Owner-approved first-payment guarantee; support handles refund requests manually. */
export function RefundGuaranteeCallout() {
  return (
    <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4 text-left text-sm leading-relaxed text-foreground">
      <p className="font-semibold">7-day free trial. First-payment money-back guarantee.</p>
      <p className="mt-2">
        Cancel during your free trial to avoid the first subscription charge. If you continue and
        aren’t satisfied, request a full refund within 7 calendar days after your first paid
        subscription charge.
      </p>
      <p className="mt-2 text-muted-foreground">
        First-time direct individual and family subscriptions only. One guarantee refund per
        customer; renewals and team plans excluded.
      </p>
      <a
        href="/terms#money-back-guarantee"
        className="mt-2 inline-flex min-h-11 items-center font-semibold text-gold-ink underline underline-offset-4"
      >
        Read the guarantee terms
      </a>
    </div>
  );
}

export function RefundGuaranteeTerms() {
  return (
    <div id="money-back-guarantee" className="scroll-mt-8 space-y-3">
      <p>
        Cancel during your free trial to avoid the first subscription charge. If you continue and
        aren’t satisfied, request a full refund within 7 calendar days after your first paid
        subscription charge.
      </p>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          Available to first-time customers purchasing an individual or family subscription directly
          from Language Threshold. Covers the first monthly or annual subscription payment.
        </li>
        <li>
          Request your refund by emailing{" "}
          <a href="mailto:support@languagethreshold.com" className="text-gold-ink underline">
            support@languagethreshold.com
          </a>{" "}
          within 7 calendar days after that payment. Include your account email and receipt or
          transaction number. No proof of learning progress is required.
        </li>
        <li>
          Limited to one guarantee refund per customer. Creating additional accounts or using
          different email addresses or payment methods does not create additional eligibility.
        </li>
        <li>
          Renewals, repeat subscriptions, team or enterprise purchases, and separately purchased
          products are excluded from this promotional guarantee.
        </li>
        <li>
          Refunds return the amount actually paid for the eligible subscription, including
          applicable taxes, to the original payment method. Approved refunds cancel the subscription
          and end paid access. Bank processing times vary.
        </li>
        <li>
          We may decline duplicate requests, requests involving falsified purchase information, or
          attempts to obtain more than one refund for the same payment. Ordinary use of the service
          does not disqualify an otherwise eligible customer.
        </li>
        <li>
          This guarantees a refund under these terms, not a particular level of fluency, exam
          result, professional qualification, or employment outcome.
        </li>
        <li>
          Purchases through Apple, Google, or another reseller follow that seller’s refund process.
          This guarantee does not limit any refund or other rights required by applicable law.
        </li>
      </ul>
    </div>
  );
}
