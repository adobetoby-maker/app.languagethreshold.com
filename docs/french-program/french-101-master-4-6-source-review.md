# French 101 Master source review notes

This internal note tracks two inconsistencies in the unreviewed Master source. It is not learner-facing teaching text or qualified French approval.

- Master 4: the Reader says Léa will arrive **avant quinze heures**, but `grammarNotes.model.availability` says she is available **après quinze heures**. The new authored-mode candidate avoids the disputed timing model. Resolve the intended time in the source and regenerate all dependent assets before review or release.
- Master 6: `grammarNotes.model.close` says the reservation is confirmed, while the speaking closure explicitly leaves availability pending. The new authored-mode candidate asks for a check without declaring the booking confirmed. Resolve the final booking state in the source and regenerate dependent assets before review or release.
- Master 20: `grammarNotes.model.close` says the schedule is confirmed and assigns the speaker a different handoff order, while the Reader and speaking closure leave room availability pending: Hugo checks the room, then Camille informs participants. The new authored-mode candidate avoids the disputed closing model. Resolve the handoff and booking state in the source and regenerate dependent assets before review or release.

Both lessons remain `reviewed:false` and `registered:false`.
