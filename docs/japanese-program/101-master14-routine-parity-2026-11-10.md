# Japanese 101 Master 14 routine parity candidate

This private candidate adds the daily-routine sequence identified in the Spanish/French/Japanese 101 crosswalk while retaining the changed-plan and delayed-meeting grammar in Master 14. The stable module and lesson number remain `master-japanese-basics:14`; the course is `reviewed:false`. This is not a release approval.

The source now teaches ふだん, まず, それから, and さいごに through an ordinary morning, work, and home routine. The planned meeting, train delay, message, arrival, and past waiting state then show how the routine changes. The 18-line reading stays within the Master stage limit. Three cloze checks include the sequence marker, current delay, and past waiting form. Five private Master form prompts and six private mode prompts are re-anchored to the new dialogue; the private speaking mission and runtime previews are regenerated. Foundation and Core speaking fixtures were re-pinned only because the aggregate practice file hash changed; their practice subtrees did not change.

The prior delayed-meeting lesson and its four extension turns are preserved exactly in `content/japanese-basics/private-delayed-meeting-extension-ja-en.json`, unregistered and unreviewed, for a possible language-specific extension. Its source hashes are `450c88455988b8738595ef08c4aeaa99cee323339ae7afe7bef37b38dba3c47a` and `366e7538830e6cc9f0c08021ae1d9a461005a3ce2e94024bc5d1019d6b0277e7`. The new Master source hash is `29aa18064640ba1ed55514f61c25018e5407e7822d37e99ac68dd7015073c621`; the extension source hash is `d313ad465c98fd21c04f60dcf55c224ece2f79692719bdf42b3aafad07bfc0c9`.

## Audio delta

The existing private `ja-JP` Master 14 manifest has 25 distinct Japanese texts, each in Aoede and Charon, with `listeningReviewed:false`. The revised reading and card text has 30 distinct exact strings: 14 exactly match existing manifest keys, 16 are new, and 11 old strings are no longer in the lesson. The 14 exact matches represent 28 reusable voice files. The 16 new strings were synthesized in both voices in a separate private batch at `/Users/drive/lt-audio/japanese-101/master-14-routine-2026-11-10/`, using the previously documented `workerbee-494003` quota project. The 32 requests contain 416 spoken characters, with an estimated charge of US$0.0125 at the recorded US$0.00003 per-character rate. The old manifest source hash `8cfce671c012ea7e9be2128c9fad74aa4082560105eb1d9b0efbf63eb8d7d411` was not assigned to the revised lesson.

The revised private batch has fingerprint `fef1bf781dd2c59d12709da1698207cde50e7f538cd9823184a3a39f6d0b97b0` and 60 clips for 30 exact texts. `verify-japanese-hd-batch.py` passed text, voice, bytes, SHA-256, duration, scope, and unreviewed gates; the generator dry run found zero missing clips. Its pinned draft inventory lives beside the private manifest. The checked-in inventory is regenerated from the revised course source; older lesson manifests retain their original fingerprint and require a source-exact migration before a whole-course verification can pass. A private [listening worksheet](/Users/drive/lt-audio/japanese-101/course-listening-review/master-14-routine-2026-11-10.html) exposes every clip for review. The earlier owner approval covered pilot recordings, not these new Master 14 strings. None of these clips was installed in learner playback.

The 16 new strings are: `ふだんは あさ しちじに おきます。`, `あさは まず なにを しますか。`, `まず、かおを あらって、あさごはんを たべます。`, `それから、しごとに いきます。`, `しごとの あとは どう しますか。`, `ふだんは うちに かえります。`, `でも、きょうは えきで ともだちに あう よていです。`, `「おそく なって すみません」と いいました。`, `ともだちは 「だいじょうぶです」と いいました。`, `さいごに ともだちと はなして、うちに かえりました。`, `ふだんは あさ`, `それから`, `おきます`, `あさごはん`, `たべます`, `かえります`.

## Remaining gates

- Qualified Japanese review of the full revised lesson, form prompts, speaking mission, six modes, and preserved extension.
- Complete listening review and retakes if needed for the revised 60-clip private batch. Keep playback closed until then.
- Reconcile historical per-lesson manifest fingerprints with the updated course inventory through exact text and file verification; do not alter the accepted pilot recordings.
- Browser/phone and independent V4 iPhone/Watch acceptance, preserving learner progress and V3/V4 identities.
- Broader Spanish parity review across all 60 Japanese 101 lessons and the remaining specialty tracks. This one lesson does not close the program gap.
