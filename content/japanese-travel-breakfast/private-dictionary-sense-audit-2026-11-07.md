# Japanese Breakfast dictionary sense audit — private draft

Historical scoped audit only: the full F10/C30/M20 draft and subsequent clinical vocabulary corrections have changed the source. Use [the current full review queue](private-dictionary-full-review-2026-11-07.md) for the 60-lesson inventory. The evidence below remains attached to the older F/C source hashes and does not establish review of current entries.

Scope: exact Japanese→English cards in Foundation 1–10 and Core 1–30 at PR #378 (`befb32aee`). This is a source-context audit, not fluent Japanese, food-safety, or human approval. No dictionary entry is released. All `reviewed:false` and `registered:false` flags remain unchanged.

Pinned source SHA-256:

- `foundation-1-10-draft.json`: `f1407f72421f76172021bc2735e909251d956572ef35356ee7f84f81cbfc8764`
- `core-1-30-draft.json`: `007e49dd72da7f62cc817b7e6645181908b7be7a570985b69f1284b53db92024`

The inventory contains 522 placements and 404 exact pairs. The review queue below names every one of its 11 multi-gloss Japanese headwords. “Context” describes what the authored lesson says; it does not authorize merging senses or changing translations. F and C mean Foundation and Core lesson numbers.

| Headword | Exact English card glosses | Source context and review question |
| --- | --- | --- |
| `ありがとうございます` | “Thank you very much” (F1); “Thank you” (C29) | F1 ends a café order; C29 acknowledges a friend’s payment offer. The same polite expression is translated with different English intensity; a reviewer should choose a primary gloss and retain contextual alternatives only if warranted. |
| `お会計` | “the bill; payment” (F9, C12); “the bill” (C14, C15) | F9 uses both requesting the bill and paying at the register; C14 asks to pay first; C15 asks for the toast bill. Bill/checkout/payment uses may be related, but the broad F9/C12 gloss should be checked against the specific dialogue. |
| `わかりません` | “I do not understand” (F10); “I do not know” (C6) | F10 explicitly asks for an explanation of unfamiliar food. C6 is an allergy/ingredient-uncertainty lesson; distinguish lack of knowledge from comprehension, and have a qualified reviewer check the safety-critical dialogue before adopting either gloss. |
| `カフェオレ` | “coffee with milk (menu label)” (C2); “coffee with milk” (C8–10) | C2 compares menu drinks and its Reader calls it “café au lait”; C8–10 use a drink order. The parenthetical looks like an editorial note rather than another sense. Review the menu term and whether English should say café au lait consistently. |
| `予約` | “reservation” (C20, C21, C30); “booking” (C27) | Hotel breakfast confirmation in C20/C27 and table reservation in C21/C30. The English terms overlap, but context may warrant hotel booking versus table reservation. |
| `少なめ` | “less; a small amount” (F8); “smaller amount” (C16) | F8 requests less sugar; C16 requests a smaller egg-dish portion. The amount varies by what is modified. Keep context and ask a reviewer for a usable dictionary explanation rather than assuming one fixed quantity. |
| `席` | “seat; place at a table” (F3); “seat” (C1, C5, C15, C16, C21, C26, C30) | F3 asks if this seat is free; C21/C30 can refer to a table or seating arrangement. The broad F3 gloss may be an explanatory duplicate. Check the exact Japanese usage before collapsing. |
| `料金` | “price; charge” (C19); “price” (C20); “charge” (C12, C27) | C19 contrasts posted menu prices and an added table charge; C12/C27 discuss a separate charge; C20 discusses breakfast pricing. This is a context-sensitive price/fee distinction, not three proven unrelated senses. |
| `明細` | “itemized details” (C12); “itemized bill” (C20, C30) | All three lessons concern checking billing details. C20/C30 Reader lines say “bill,” while C12 says “itemized details.” Verify whether the bill/statement interpretation holds in each scene. |
| `確認してください` | “please check” (F8, F10, C10, C20); “Please check” (C6) | Exact Japanese is identical; English differs only in capitalization. C6 concerns kitchen verification for an allergy, so do not alter its safety context while normalizing an editorial duplicate. |
| `調理器具` | “cooking utensils” (C6); “cooking tools” (C18) | Both concern shared preparation equipment in allergy scenes. “Utensils” is more specific; a food/allergy reviewer should check what equipment the scene actually means before collapsing. |

Two exact pairs have conflicting `kind` tags:

| Exact pair | Placements | Review question |
| --- | --- | --- |
| `ありますか` / “Do you have it?” | F1 card 9 `phrase`; F4 card 4 `term` | It is a question ending used with an omitted subject in these lessons. F1 Reader supplies menu/coffee/bread; F4 supplies orange juice. Review phrase classification and whether the context-free English card is misleading. |
| `カードで払えますか` / “Can I pay by card?” | F9 card 11 `phrase`; C12 card 12 `term` | The full payment question appears verbatim in both Readers. Review phrase classification; retain both source occurrences and stable IDs. |

Before a qualified reviewer resolves any entry, check Japanese wording, register, English sense, script/reading, part of speech and inflection, especially the C6/C18 allergy material. Preserve both exact source pairs and occurrence IDs until any correction is made to the authored lessons, regenerated into the inventory, and revalidated. New Master lessons require a fresh inventory and audit. The companion test pins the current flagged headword and kind-conflict sets so a future content change requires an explicit review of this queue.
