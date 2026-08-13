-- Durable controls for paid Speaking API routes running on Vercel.
-- These objects are reachable only by server code using the service role.

create table if not exists public.speaking_age_attestations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.speaking_age_attestations enable row level security;
revoke all on table public.speaking_age_attestations from public, anon, authenticated;
grant select, insert, update, delete on table public.speaking_age_attestations to service_role;

create table if not exists public.speaking_request_buckets (
  bucket_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count > 0),
  primary key (bucket_hash, window_start)
);

alter table public.speaking_request_buckets enable row level security;
revoke all on table public.speaking_request_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.speaking_request_buckets to service_role;

create or replace function public.consume_speaking_request(
  p_bucket_hash text,
  p_request_limit integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_bucket_hash !~ '^[0-9a-f]{64}$'
    or p_request_limit < 1
    or p_request_limit > 1000
    or p_window_seconds < 10
    or p_window_seconds > 3600 then
    return false;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.speaking_request_buckets (
    bucket_hash,
    window_start,
    request_count
  ) values (
    p_bucket_hash,
    v_window_start,
    1
  )
  on conflict (bucket_hash, window_start)
  do update set request_count = public.speaking_request_buckets.request_count + 1
  returning request_count into v_request_count;

  delete from public.speaking_request_buckets
  where bucket_hash = p_bucket_hash
    and window_start < clock_timestamp() - interval '1 day';

  return v_request_count <= p_request_limit;
end;
$$;

revoke execute on function public.consume_speaking_request(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_speaking_request(text, integer, integer)
  to service_role;
