# First-payment refund guarantee

Owner-approved policy published October 31, 2026. The customer-facing copy is in `src/components/legal/RefundGuarantee.tsx`, displayed under eligible individual/family pricing CTAs and in `/terms#money-back-guarantee`.

Requests are handled manually through support@languagethreshold.com. Check the first paid charge, request timestamp, direct individual/family purchase, and prior guarantee refunds. Do not require learning-progress evidence or refuse ordinary product use. Refund the full eligible payment including applicable taxes to its original payment method; avoid duplicate reimbursement of a payment already refunded or reversed.

An approved refund must also cancel the associated subscription immediately and end paid access. A Stripe refund alone does not cancel a subscription: the existing `charge.refunded` webhook records the refund in the ledger, while the subscription cancellation event updates entitlement. Verify both actions before telling the customer the request is complete. This change adds policy copy; it does not introduce automatic refunds or automatic cancellation on refund.

Renewals, repeat subscriptions, team/enterprise plans and separately purchased items are outside this promotional guarantee. Purchases through resellers follow the reseller's process. Required legal rights remain unaffected. Keep records of requests and decisions so the one-refund limit can be applied consistently.
