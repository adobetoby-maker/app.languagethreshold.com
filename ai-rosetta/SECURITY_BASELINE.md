# Rosetta Security Baseline

Recorded: 2026-07-27
Status: open remediation debt
Scope: path names only; no credential values are reproduced here

The expanded Rosetta scan found environment files and secret-shaped values that
were already tracked on the canonical protocol baseline. This documentation PR
does not delete, rotate, or rewrite them because that is a separate security
operation with broader repository/history consequences.

## Legacy tracked environment paths

- `.env.sentry-build-plugin`
- `.env.vercel-local`
- `.env.vercel-prod`
- `.env.vercel-pulled`

## Legacy secret-shaped paths

- `.env.vercel-local`
- `.env.vercel-prod`
- `.env.vercel-pulled`
- `.github/workflows/deploy.yml`

`rosetta:check` warns for these exact known paths and fails for any additional
tracked environment file or secret-shaped path.

## Required follow-up

1. Determine whether each value is live.
2. Rotate live credentials before repository cleanup.
3. Remove tracked environment files and replace safe configuration examples
   with redacted `.env.example` files.
4. Remove literal secret values from workflow files and use repository or
   Vercel secret references.
5. Decide whether Git history must be rewritten.
6. Revoke the legacy-path exception after remediation.

Do not paste values into issues, PR comments, Rosetta files, or chat.
