# Owner marketing hub

`/owner?tab=marketing` is a platform-owner section using the existing owner gate.
It shows product links to the private My AI Marketing workspace, the existing
minute-refresh download lead report, Leader HQ, and Email & contacts. Marketing
links validate the product ID against the marketing workspace's existing products;
no contact information or access tokens are passed in URLs. The marketing site
keeps its separate owner session. No iframe or shared-password SSO was added.

Prepare follow-up starts an editable, unsent message from the actual requested
resource and product URL. Saving uses the existing owner CRM API. An existing
visible matching contact retains its details and reminder; a new contact gets the
selected reminder, source notes and an explicit unknown-consent note. Contact and
draft UUIDs stay stable across retries in the same editor. This is private owner
CRM preparation, not a second Leader HQ enrollment or campaign activation.

Source reporting records accepted requests, not confirmed subscriptions, delivery,
or engagement. Leader HQ remains the place to check confirmation/suppression and
manage sequences. The minute refresh runs only while visible and stops on unmount.
The report retains its explicit manual refresh and error state.

Social publishing connections do not yet provide a live comment/message inbox.
The page reports this honestly and opens the account connection page. Live read
and reply adapters, approved platform scopes and actual account grants remain
required; no external reply or email is sent by this change.

Verification: 2,936 repository tests; TypeScript; desktop and phone synthetic owner
flow for product links, actual contact/draft payloads, and no send/signup request.
Marketing live checks cover project deep links and return navigation. Synthetic
browser fixtures never send customer email or create real contacts.

The deploy scripts use Vercel archive uploads because the current static-file
manifest exceeds the normal deployment request limit. Production deployment
uses production runtime credentials; preview is not promoted as a substitute.
