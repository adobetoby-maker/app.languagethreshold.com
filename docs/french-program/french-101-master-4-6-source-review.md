# French 101 Master 4–6 source review notes

This internal note tracks two inconsistencies in the unreviewed Master source. It is not learner-facing teaching text or qualified French approval.

- Master 4: the Reader says Léa will arrive **avant quinze heures**, but `grammarNotes.model.availability` says she is available **après quinze heures**. The new authored-mode candidate avoids the disputed timing model. Resolve the intended time in the source and regenerate all dependent assets before review or release.
- Master 6: `grammarNotes.model.close` says the reservation is confirmed, while the speaking closure explicitly leaves availability pending. The new authored-mode candidate asks for a check without declaring the booking confirmed. Resolve the final booking state in the source and regenerate dependent assets before review or release.

Both lessons remain `reviewed:false` and `registered:false`.
