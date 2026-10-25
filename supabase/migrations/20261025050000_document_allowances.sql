-- Document entitlements are private, server-owned, and independent of course subscriptions.
create table public.document_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 purchased_characters bigint not null default 0 check(purchased_characters>=0),
 storage_paid_until timestamptz,
 stripe_subscription_id text,
 stripe_customer_id text
);
create table public.document_months (
 user_id uuid references auth.users(id) on delete cascade,
 month date not null,
 used integer not null default 0 check(used between 0 and 50000),
 primary key(user_id,month)
);
create table public.study_documents (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 source_language text not null,
 target_language text not null,
 sentences jsonb,
 state text not null check(state in ('pending','ready','failed')),
 allowance_month date not null,
 base_characters integer not null,
 purchased_characters integer not null,
 expires_at timestamptz not null default now()+interval '5 minutes',
 created_at timestamptz not null default now()
);
create index study_documents_owner on public.study_documents(user_id,state);
create table public.document_payment_grants (
 payment_id text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('storage','translations')),
 created_at timestamptz not null default now()
);
alter table public.document_accounts enable row level security;
alter table public.document_months enable row level security;
alter table public.study_documents enable row level security;
alter table public.document_payment_grants enable row level security;
-- All mutations go through authenticated server endpoints. No direct browser grants.
revoke all on public.document_accounts,public.document_months,public.study_documents,public.document_payment_grants from anon,authenticated;
grant all on public.document_accounts,public.document_months,public.study_documents,public.document_payment_grants to service_role;

create function public.document_reserve(p_user uuid,p_id uuid,p_title text,p_source text,p_target text,p_characters integer)
returns void language plpgsql security definer set search_path=public as $$
declare m date := date_trunc('month',now() at time zone 'UTC')::date; a document_accounts; u integer; b integer; r study_documents; lim integer;
begin
 if p_characters<10 or p_characters>8000 then raise exception 'Document must contain 10–8,000 characters.'; end if;
 insert into document_accounts(user_id) values(p_user) on conflict do nothing;
 select * into a from document_accounts where user_id=p_user for update;
 -- Expired reservations are refunded exactly once; finished documents never expire.
 for r in select * from study_documents where user_id=p_user and state='pending' and expires_at<now() for update loop
   update document_months set used=used-r.base_characters where user_id=p_user and month=r.allowance_month;
   update document_accounts set purchased_characters=purchased_characters+r.purchased_characters where user_id=p_user;
   update study_documents set state='failed' where id=r.id;
 end loop;
 if exists(select 1 from study_documents where id=p_id) then raise exception 'This translation request already exists. Refresh your documents before retrying.'; end if;
 lim := case when a.storage_paid_until>now() then 110 else 10 end;
 if (select count(*) from study_documents where user_id=p_user and state in ('ready','pending'))>=lim then raise exception 'Document storage is full. Buy more space or delete a document.'; end if;
 insert into document_months(user_id,month) values(p_user,m) on conflict do nothing;
 select used into u from document_months where user_id=p_user and month=m;
 b := least(p_characters,50000-u);
 if (select purchased_characters from document_accounts where user_id=p_user)<p_characters-b then raise exception 'Translation allowance reached. Buy another 50,000 characters or wait for the next calendar month.'; end if;
 update document_months set used=used+b where user_id=p_user and month=m;
 update document_accounts set purchased_characters=purchased_characters-(p_characters-b) where user_id=p_user;
 insert into study_documents(id,user_id,title,source_language,target_language,state,allowance_month,base_characters,purchased_characters) values(p_id,p_user,p_title,p_source,p_target,'pending',m,b,p_characters-b);
end $$;

create function public.document_finish(p_user uuid,p_id uuid,p_sentences jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
declare r study_documents;
begin
 perform 1 from document_accounts where user_id=p_user for update;
 select * into r from study_documents where user_id=p_user and id=p_id for update;
 if r.id is null or r.state<>'pending' then raise exception 'Translation reservation is no longer available.'; end if;
 if p_sentences is null or r.expires_at<now() then
   update document_months set used=used-r.base_characters where user_id=p_user and month=r.allowance_month;
   update document_accounts set purchased_characters=purchased_characters+r.purchased_characters where user_id=p_user;
   update study_documents set state='failed' where id=p_id;
 else
   if jsonb_typeof(p_sentences)<>'array' or jsonb_array_length(p_sentences)=0 then raise exception 'No translated passages returned.'; end if;
   update study_documents set state='ready',sentences=p_sentences where id=p_id;
 end if;
end $$;

create function public.document_grant(p_user uuid,p_payment text,p_kind text,p_until timestamptz default null,p_subscription text default null,p_customer text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into document_accounts(user_id) values(p_user) on conflict do nothing;
 perform 1 from document_accounts where user_id=p_user for update;
 insert into document_payment_grants(payment_id,user_id,kind) values(p_payment,p_user,p_kind) on conflict do nothing;
 if not found then return; end if;
 if p_kind='translations' then
   update document_accounts set purchased_characters=purchased_characters+50000,stripe_customer_id=coalesce(p_customer,stripe_customer_id) where user_id=p_user;
 elsif p_kind='storage' and p_until is not null and p_subscription is not null then
   update document_accounts set storage_paid_until=greatest(coalesce(storage_paid_until,'1970-01-01'),p_until),stripe_subscription_id=p_subscription,stripe_customer_id=coalesce(p_customer,stripe_customer_id) where user_id=p_user;
 else raise exception 'Invalid document purchase.'; end if;
end $$;
revoke all on function public.document_reserve(uuid,uuid,text,text,text,integer),public.document_finish(uuid,uuid,jsonb),public.document_grant(uuid,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.document_reserve(uuid,uuid,text,text,text,integer),public.document_finish(uuid,uuid,jsonb),public.document_grant(uuid,text,text,timestamptz,text,text) to service_role;
