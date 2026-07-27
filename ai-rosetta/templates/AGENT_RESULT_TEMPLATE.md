---
task_id:
agent:
status: implementing
branch:
baseline_commit:
application_head:
documentation_head:
application_tree_verified_identical: false
pr_number:
pr_current_state: draft
preview_status:
preview_commit:
preview_url:
runtime_certified: false
---

# Agent Result

## Completion declaration

State exactly what is complete. Keep external/runtime limitations separate.

## What changed

## Attribution

## Files changed

## Checks

## Live flows verified

## Preview alignment

Explain whether `preview_commit` equals `application_head`. If the documentation
head is later, provide application-tree comparison evidence.

## Runtime certification

## Remaining limitations

For each limitation, record owner and next check.

## Server cleanup

```text
server_started:
checkout:
branch:
commit:
port:
pid:
stopped_at:
handoff_owner:
```

## Secret hygiene

- [ ] no secret value committed
- [ ] no tracked `.env` file
- [ ] no credential borrowed from another project
- [ ] temporary project credential removed or handed to the project operator

## Independent-completion declaration

Independent work completed before cross-review: yes/no
Other agent's solution read before completion: yes/no
