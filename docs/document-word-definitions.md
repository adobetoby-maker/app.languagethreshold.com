# Saved document word definitions

On `/documents`, tap a word in either language to see its headword, meaning, grammar and meaning in the original sentence. New definitions use Haiku 5.5. They do not spend the character balance used to translate a full document; existing server lookup request limits apply.

Definitions are stored server-side in `document_word_cards`, privately scoped to the account, document, passage, language side and normalized word. The authenticated route checks document ownership and that the selected word actually occurs in that passage before reading or creating a definition. These entries are never placed in the public lesson cache.

Reopening a definition, including after a browser reload or on another device, reads the saved card before any model call or generation budget check. A pending two-minute claim prevents simultaneous taps from issuing duplicate model calls. Failures release the claim; expired claims can be reclaimed, and an old worker cannot overwrite a newer claim. Deleting the document cascades to its definitions.

RLS is enabled, with all direct access revoked from anonymous and authenticated client roles. The server service role accesses the cache after authenticating and checking document ownership. Notes remain device-local as before.

Validation covers account ownership, fabricated inputs, repeated/case-normalized taps, concurrent calls, failed providers, generation budget denials, expired claims and failed database writes. Browser tests use synthetic account/document/definition responses at desktop and iPhone sizes; they exercise open, close, reload, retry and horizontal overflow without making paid AI requests.
