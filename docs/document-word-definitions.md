# Saved document word definitions

New document translations return a starter glossary of up to 60 useful terms in the same model request. The glossary saves inside the document’s aligned passage JSON, in the same `document_finish` transaction as the translation; no second write can leave a document partially saved. The app opens these definitions directly from the loaded document, including after a reload or on another device. The authenticated lookup endpoint also checks this glossary before the dictionary cache, budget check or provider call.

Only entries whose words occur in the stated passage and language side are accepted. Definitions stay contextual to each passage; nonexistent words, invalid passage indices, malformed entries and duplicate word/side/passage entries are discarded. Old documents and words outside the starter glossary retain the existing first-tap lookup flow. No automatic backfill or extra deduction from translation characters is performed.

On `/documents`, tap a word in either language to see its headword, meaning, grammar and meaning in the original sentence. The starter glossary uses the selected document model: Haiku 5.5 for everyday documents or Sonnet 5.5 for complex wording. First-tap definitions outside that glossary use Haiku 5.5. They do not spend the character balance used to translate a full document; existing server lookup request limits apply.

Definitions are stored server-side in `document_word_cards`, privately scoped to the account, document, passage, language side and normalized word. The authenticated route checks document ownership and that the selected word actually occurs in that passage before reading or creating a definition. These entries are never placed in the public lesson cache.

Reopening a definition, including after a browser reload or on another device, reads the saved card before any model call or generation budget check. A pending two-minute claim prevents simultaneous taps from issuing duplicate model calls. Failures release the claim; expired claims can be reclaimed, and an old worker cannot overwrite a newer claim. Deleting the document cascades to its definitions.

RLS is enabled, with all direct access revoked from anonymous and authenticated client roles. The server service role accesses the cache after authenticating and checking document ownership. Notes remain device-local as before.

Validation covers account ownership, fabricated inputs, repeated/case-normalized taps, concurrent calls, failed providers, generation budget denials, expired claims and failed database writes. Browser tests use synthetic account/document/definition responses at desktop and iPhone sizes; they exercise open, close, reload, retry and horizontal overflow without making paid AI requests.

## Built-in vocabulary and practice links

Document word cards and the main Reader's word cards first check a static Spanish–English vocabulary index built from the app's authored lesson terms and existing Spanish dictionary. Matching needs no dictionary/AI API call and uses no translation characters. The index is a lazy-loaded app asset, reused after its first load; private document text is not sent anywhere for this lookup.

Matches show the existing bilingual meaning and up to five practice destinations. Lesson destinations use the normal module/lesson/language links and retain the app's normal access checks. A dictionary-only term links to the app dictionary rather than inventing a lesson reference. The current lesson's module is preferred when available.

Matching preserves accents and inflections, handles exact slash-separated alternatives, and removes a leading article only when the remaining entry is a single word. It never assigns a compound phrase's meaning to one of its tokens. Multiple authored meanings stay visible; the local lookup does not infer the meaning in the user's private sentence. Other language pairs and unknown words retain the saved-glossary and existing AI lookup paths.

Regenerate with `npm run vocabulary:index`. Production builds regenerate the index automatically so curriculum edits do not leave stale lesson references. The generated index contains public app vocabulary only, with no user documents, progress or account data.
