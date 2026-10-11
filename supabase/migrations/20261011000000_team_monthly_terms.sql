alter table public.team_entitlements
  drop constraint if exists team_entitlements_term_check;

alter table public.team_entitlements
  add constraint team_entitlements_term_check
  check (term in ('monthly', 'quarterly', 'annual'));
