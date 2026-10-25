# Owner email CRM

The owner **Email & contacts** tab stores contacts, expertise/notes, follow-up status/date,
unsent email drafts and an extensible catalog of existing ad links. It is independent of
the support intake queue. Customer delivery still uses **Users → Customer email and referrals**.

## Preparing a review packet

1. Add a contact, or import a local JSON catalog. Confirm the actual email yourself.
2. Select existing ads. Open each original and check intended recipient access; this feature
   does not change Drive permissions or fetch/copy attachments. Internal campaign setup,
   budgets and folders cannot be added as ad items.
3. Write a cover note, or open the AI assistant. Only its explicitly entered brief goes to the
   existing Anthropic provider. Private contact fields and ad URLs are not automatically sent.
   AI output remains editable and must be reviewed for claims and accuracy.
4. Optionally include an existing active customer referral link. Choose the actual referral owner from existing links; attribution remains with that customer.
   The reviewer does not need an app account. No rewards are introduced.
5. Save the unsent draft and preview the complete email. Private notes/expertise are excluded.
   For external reviewers, confirming recipient/message/access enables downloading an unsent
   `.eml` file. Opening it does not send; deliberate review/send happens in the owner's mail client.
   For linked customers, confirming review enables saving the assembled packet to the existing
   customer email drafts. Sending there retains account validation, consent, suppression, footer,
   cooldown and one-attempt checks. CRM has no send action or email transport.

Follow-up dates do not schedule outreach. Navigation or closing a contact discards unsaved edits;
save drafts first. Refresh retains current edits for the same authenticated resource. Account or
lifecycle changes still clear private state. Cancel AI generation to retain handwritten text.
Uncertain customer draft saves disable another attempt until the owner checks customer history.

## Storage and rollout

`20261025141031_owner_email_crm.sql` is additive: three new server-only RLS tables with no browser
policies or browser grants. Existing tables/data are not changed. API handlers authenticate a
current session, require the platform owner role, bound same-origin input and use private/no-store
responses. Actor-owned draft reads exclude other owners' message drafts. Contacts/catalog are
shared between verified platform owners. No credentials, broader access, jobs or automations are added.

Apply the migration only after approval. Deploying main automatically releases production, so a
local feature commit is not deployment approval. Coordinate with any separately prepared support
integration before merging; do not deploy an older base that omits live support functionality.
The existing `ANTHROPIC_API_KEY` enables AI drafts; it is not needed for handwritten drafting.

Imports are bounded to 64 KB; contact/ad batches up to 40, draft batches up to 10. Stable UUIDs make
imports repeatable; contact/ad updates are explicit upserts. Draft imports/saves are immutable on
UUID conflict. Inspect an uncertain result before retrying. Maximum visible records: 100 contacts,
100 ads, the current owner's 30 latest drafts. A larger installation will need pagination.

```json
{
  "contacts": [
    {
      "id": "20000000-0000-4000-8000-000000000001",
      "name": "Example reviewer",
      "email": "reviewer@example.test",
      "expertise": "",
      "notes": "",
      "status": "new",
      "follow_up_on": "",
      "user_id": null
    }
  ],
  "assets": [
    {
      "id": "30000000-0000-4000-8000-000000000001",
      "title": "Existing ad",
      "category": "Review",
      "url": "https://drive.google.com/file/d/example-file-id/view"
    }
  ],
  "drafts": [
    {
      "id": "40000000-0000-4000-8000-000000000001",
      "contact_id": "20000000-0000-4000-8000-000000000001",
      "subject": "Please review",
      "body": "Please share feedback on the selected ad.",
      "asset_ids": ["30000000-0000-4000-8000-000000000001"],
      "include_referral": false
    }
  ]
}
```

Keep personal contacts and private campaign identifiers outside this public repository. Import
through the authenticated owner UI after approved rollout. No contacts or real ads are seeded by
migration. Synthetic tests do not use a real provider, database, mail session or recipient.
