# Atlas Duo Runner — Operations

## Operator commands

Proposed CLI:

```text
atlas doctor
atlas project register
atlas task create
atlas task status <task-id>
atlas task reconcile <task-id>
atlas task pause <task-id>
atlas task resume <task-id>
atlas task cancel <task-id>
atlas run inspect <run-id>
atlas host list
atlas host drain <host-id>
atlas cleanup
```

Commands call the coordinator API; they do not directly edit state files.

## Installation sequence

1. Create the dedicated Atlas repository.
2. Install the GitHub App on one pilot repository.
3. Configure coordinator signing, webhook, and database.
4. Install the Mac Studio executor under a dedicated user.
5. Register the Studio host and capability adapters.
6. Add project configuration to Language Threshold.
7. Run read-only `doctor` and preflight.
8. Execute a documentation-only fixture.
9. Execute a non-Production application pilot.
10. Add the MacBook Air only after the Studio pilot is stable.

## Health signals

Coordinator:

- webhook latency and failures;
- queue depth;
- reconciliation age;
- transition errors;
- database availability.

Executor:

- online/offline;
- adapter capability versions;
- active lease;
- heartbeat age;
- disk capacity;
- orphan process/worktree count.

Task:

- phase age;
- last verified GitHub state;
- current branch/application/Preview commits;
- blocking owner;
- next automatic action;
- next human action.

## Service-level targets

- webhook acknowledgment: under 10 seconds;
- normal phase dispatch: under 2 minutes;
- state reconciliation after push/deploy: under 5 minutes;
- stale heartbeat detection: under 4 minutes;
- mobile status age: under 5 minutes;
- restart recovery: under 10 minutes.

## Reconciliation schedule

Use webhooks as the primary signal. Also reconcile:

- active tasks every 5 minutes;
- awaiting-human tasks every hour;
- Production alignment daily;
- executor inventory every 5 minutes;
- orphan worktrees/processes daily.

Polling must respect provider rate limits and use conditional requests.

## Failure playbooks

### Mac Studio offline

1. mark host unavailable;
2. stop new dispatch;
3. wait for lease expiry;
4. verify remote branch for pushed work;
5. preserve uncertain local work status;
6. offer MacBook Air failover only after explicit reconciliation;
7. never assume unpushed Studio work can be recreated.

### Executor process crashed

1. quarantine worktree;
2. inspect branch and dirty state;
3. push recoverable work to `recovery/<task>/<run>`;
4. create a new run ID;
5. resume from verified remote checkpoint.

### Wrong server provenance

1. reject browser evidence;
2. stop only the tracked process if authorized;
3. start a server from the exact worktree/application commit;
4. record new PID/port/provenance;
5. repeat verification.

### Preview mismatch

1. compare Preview commit with application head;
2. if documentation-only head, prove application-tree identity;
3. otherwise create a current Preview;
4. do not present stale Preview to Toby.

### Credential missing

1. classify `blocked_security` or `blocked_external`;
2. identify credential owner;
3. link to approved secret-management action;
4. do not request the secret value in chat;
5. resume after presence is verified.

### Coordinator unavailable

Executors finish only safe local cleanup and push already-authorized work.
They do not invent the next phase. On restart, Atlas replays GitHub state and
unprocessed events.

## Backups

- GitHub is the primary durable task record;
- coordinator database backed up daily;
- configuration and schemas versioned;
- executor local caches are disposable;
- quarantine branches protect uncertain work;
- no active repository relies on a single unpushed Mac folder.

## Upgrades

1. drain host;
2. finish or pause leases;
3. install signed executor/adapter version;
4. run capability probe;
5. run documentation-only fixture;
6. re-enable host.

Provider upgrades that change model names or CLI behavior must update the
capability report. Atlas never silently substitutes a model.

## Cost controls

Task policy defines:

- maximum executor runs;
- maximum retries;
- maximum model budget;
- maximum wall time;
- artifact limits;
- when to ask Toby for expansion.

Parallel-build and crossover modes display higher expected cost before start.

## First live pilot

Use a low-risk documentation or small UI task:

- no database migration;
- no payments;
- no Production deployment;
- clear visual acceptance;
- short automated tests;
- one Preview;
- reversible changes.

The pilot succeeds only if Toby is not used as a status relay.
