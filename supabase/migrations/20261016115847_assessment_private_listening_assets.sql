-- Authored exam clips only. No learner speech or retention policy is enabled here.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('assessment-listening-private','assessment-listening-private',false,4194304,
 array['audio/mpeg','audio/wav','audio/ogg'])
on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='assessment-listening-private'
   and (public or file_size_limit is distinct from 4194304)) then
   raise exception 'Assessment listening bucket must be private and limited to 4 MiB';
 end if;
end $$;
-- Restrictive policies also defeat any unrelated permissive bucket-wide policies.
-- The service-only application proxy authorizes each frozen item before reading.
create policy assessment_listening_service_only on storage.objects as restrictive
for all to anon,authenticated
using(bucket_id <> 'assessment-listening-private')
with check(bucket_id <> 'assessment-listening-private');
