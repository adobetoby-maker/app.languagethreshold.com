-- OPTIONAL, NOT APPLIED BY THE PR: the platform owner applies it to project pollhlkgltdkdskdzsgd.
-- Owner "Disable account" bans the user through the Auth admin API, which already blocks new
-- sign-ins and token refresh. This function additionally ends every existing session at once
-- (refresh tokens cascade with their session). Until it is applied the dashboard says that
-- already-issued access tokens stay valid until they expire.
-- Only the server (service role) may call it, after /api/owner-users verified the platform owner
-- and refused self-changes and platform-owner targets. It re-checks the target here as well.
create function public.platform_revoke_user_sessions(p_user uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service access required'; end if;
  if p_user is null then raise exception 'User required'; end if;
  if exists(select 1 from public.platform_admin_roles where user_id=p_user and role='owner') then
    raise exception 'Platform owner sessions cannot be revoked here';
  end if;
  delete from auth.sessions where user_id=p_user;
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.platform_revoke_user_sessions(uuid) from public,anon,authenticated;
grant execute on function public.platform_revoke_user_sessions(uuid) to service_role;
