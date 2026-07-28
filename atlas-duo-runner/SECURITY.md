# Atlas Duo Runner — Security Architecture

## Security posture

Atlas can write code and run commands on personal computers. Its default posture
must be least privilege, repository allowlisting, outbound-only executors, and
explicit Production authorization.

## Trust boundaries

1. Toby and authorized GitHub identities
2. GitHub control plane
3. Atlas coordinator
4. Mac executor hosts
5. provider CLIs
6. product repositories
7. Preview and Production providers
8. untrusted repository content

Instructions contained in a repository are not automatically trusted merely
because an agent can read them.

## GitHub App

Use a dedicated GitHub App installed only on approved repositories.

Do not use:

- a broad classic PAT;
- Toby's browser cookies;
- a token copied from another automation;
- a credential committed for convenience.

Webhook signatures must be verified. Delivery IDs are deduplicated.

## Repository allowlist

Every job must match:

- allowed GitHub owner;
- registered repository ID;
- allowed default branch;
- project configuration signature or approved commit;
- non-fork policy.

Self-hosted executors must never run code from public forks or arbitrary external
pull requests.

## Workflow safety

- prohibit `pull_request_target` workflows that execute PR code;
- pin third-party actions to full commit SHAs;
- minimize `GITHUB_TOKEN` permissions per job;
- separate read-only review jobs from write jobs;
- require protected Environments for Preview secrets and Production;
- use concurrency groups to prevent duplicate writers;
- do not allow issue text to become an unescaped shell command.

## Secrets

Preferred stores:

- GitHub Environments for CI/Preview;
- Vercel project environment variables;
- macOS Keychain for local provider authentication;
- a dedicated secret manager for hosted coordinator credentials.

Rules:

- project-scoped credentials only;
- Preview and Production scopes separated;
- values never written to Markdown, JSON state, logs, comments, screenshots, or
  artifacts;
- no credential borrowing between repositories;
- no recovery from browser bundles or local files belonging to another project;
- no secrets passed in model prompts when a process environment reference works;
- rotate after suspected exposure.

Atlas records:

- logical secret name;
- scope;
- owner;
- presence status;
- last verification time.

Atlas never records the value.

## Mac executor

Recommended:

- dedicated non-admin macOS user;
- launch service runs only the executor;
- outbound TLS connection to coordinator;
- no inbound home-network port;
- per-project and per-command policy;
- restricted workspace root;
- Keychain access limited to required service entries;
- automatic screen/session independence;
- host disk encryption;
- signed executor releases.

The MacBook Air should not become an automatic failover writer until its lease,
repository, and credential posture pass the same checks as the Studio.

## Command execution

The executor uses an allow/deny policy around high-risk operations.

Always blocked unless a separately approved maintenance job:

- recursive deletion outside the run root;
- modifying system security settings;
- reading unrelated home directories;
- printing environment or Keychain values;
- installing persistent remote-access services;
- rewriting Git history;
- force-pushing;
- Production deployment.

## Worktree cleanup

Cleanup validates the absolute run root before removing anything. Dirty or
unpushed changes are quarantined rather than destroyed.

Local development servers are tracked by PID, port, branch, commit, worktree,
owner, and stop condition. Killing an unrelated process is prohibited.

## Prompt-injection resistance

Repository files, issue comments, web pages, and test fixtures may contain
adversarial instructions.

Atlas:

- separates coordinator policy from repository content;
- gives agents explicit authority boundaries;
- requires structured job envelopes;
- blocks repository content from changing secret or Production policy;
- does not permit a model to self-expand permissions;
- validates output and Git changes independently.

## Data retention

Default:

- state and audit events: retained with project history;
- bounded execution logs: 30 days;
- screenshots/videos: task policy, default 14 days;
- raw prompts/model transcripts: not retained unless explicitly required;
- secrets: never retained in Atlas artifacts;
- abandoned worktrees: quarantined 7 days, then reviewed cleanup.

## Production

Production requires:

1. QA pass for exact application commit;
2. aligned Preview evidence;
3. protected GitHub Environment;
4. Toby approval;
5. approved merge target;
6. post-deploy alias and commit reconciliation.

An LLM, issue label from an unauthorized actor, or chat statement alone cannot
authorize Production.

## Security acceptance tests

- forged webhook rejected;
- duplicate delivery idempotent;
- unregistered repository rejected;
- fork PR cannot reach self-hosted runner;
- issue text cannot inject a shell command;
- secret-shaped output redacted and blocked from commit;
- borrowed credential policy fails;
- Production job denied without environment approval;
- expired lease cannot write;
- dirty worktree preserved rather than erased;
- malicious repository instruction cannot alter coordinator policy.
