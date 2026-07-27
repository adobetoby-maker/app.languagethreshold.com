# DUO-002 Protocol Lessons

Date: 2026-07-27
Scope: coordination behavior only; no application judgment or Production change

## Observed facts

1. The Rosetta control system existed on draft PR #2 but was not merged before
   DUO-002 implementation began. Track A and Track B therefore carried
   different, incomplete snapshots of the governing files.
2. DUO-001 preview completion was visible in GitHub/Vercel but did not propagate
   to Claude Code. Toby had to relay status in chat.
3. Agents read branch-local handoff/status files as current truth. Several were
   stale while remote branches and previews had advanced.
4. PR #3 and PR #4 were open and not draft, while result text described at
   least PR #3 as draft.
5. Application commits and later documentation-only branch heads were conflated,
   creating false stale-preview and stale-result findings.
6. The Mac Studio server on port 8080 served Track A while a review discussed
   Track B. The healthy port did not prove checkout provenance.
7. A dev server was left running after a handoff without a durable owner/stop
   record.
8. Preview environments did not have verified Anthropic configuration, so a
   READY deployment could not certify Word Card, Tutor, Grammar, or Speak.
9. A credential from another project was temporarily borrowed for local
   testing, then removed and confirmed uncommitted.
10. Cross-review could not start cleanly because the landing branch/file for
    each review and synthesis had not been specified.
11. It was unclear whether one agent should continue while the other was still
    implementing, which produced avoidable pauses and questions to Toby.
12. Both agents eventually produced explicit independent-completion records and
    commit-aligned Vercel evidence without modifying `main` or Production.
13. The expanded validator detected pre-existing tracked environment files and
    secret-shaped values. Their paths are recorded without values in
    `ai-rosetta/SECURITY_BASELINE.md`; remediation is outside this docs-only PR.

## Recommendations adopted

1. Record one canonical coordination ref before application work starts.
2. Maintain one coordinator-owned `REMOTE_STATE.md` populated from fresh remote
   facts; never use Toby as the status relay.
3. Allow factual propagation during independent work while keeping plans and
   solution reasoning isolated.
4. Require explicit completion vocabulary and separate open external
   limitations from unfinished implementation.
5. Record application head, documentation head, preview commit, and
   application-tree equivalence separately.
6. Open draft PRs at the first reviewable checkpoint and verify actual PR state.
7. Assign external-state owners, including project environment configuration.
8. Commit each cross-review on the reviewer's branch; create synthesis on a
   coordinator-owned branch.
9. Record every dev server's checkout, commit, PID, port, owner, and stop
   condition.
10. Prohibit borrowing or recovering credentials from another project.
11. Permit agents to continue approved independent work while the other works,
    stopping only at defined safety and scope boundaries.
12. Add validator coverage for the new task-control artifacts, alignment fields,
    tracked environment files, and secret-shaped values.

## Not claimed

- The protocol revision does not choose Track A or Track B.
- It does not certify either AI-backed preview.
- It does not configure credentials.
- It does not merge either implementation or deploy Production.
