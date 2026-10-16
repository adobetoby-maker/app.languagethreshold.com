-- Model existing permissive policies: a restrictive bucket guard must still win.
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select,insert,update,delete on storage.objects to anon,authenticated;
create policy fixture_existing_permissive on storage.objects for all to anon,authenticated using(true) with check(true);
\ir ../../supabase/migrations/20261016115847_assessment_private_listening_assets.sql
insert into storage.objects(bucket_id,name) values('assessment-listening-private','fixture'),('unrelated-bucket','unchanged');
set local role anon;
do $$ begin
 if (select count(*) from storage.objects)<>1 then raise exception 'Private audio was exposed or unrelated access changed'; end if;
end $$;
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values('assessment-listening-private','denied')$q$,'row-level security');
reset role;
set local role authenticated;
do $$ begin
 if (select count(*) from storage.objects)<>1 then raise exception 'Authenticated audio access bypassed the guard'; end if;
 if exists(select 1 from storage.objects where bucket_id='assessment-listening-private') then raise exception 'Private audio leaked'; end if;
end $$;
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values('assessment-listening-private','denied')$q$,'row-level security');
update storage.objects set bucket_id='assessment-listening-private' where bucket_id='assessment-listening-private';
reset role;
do $$ begin
 if not exists(select 1 from storage.buckets where id='assessment-listening-private' and not public and file_size_limit=4194304) then raise exception 'Private bucket configuration missing'; end if;
end $$;
