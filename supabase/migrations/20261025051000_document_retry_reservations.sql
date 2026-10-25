create or replace function public.document_reserve(p_user uuid,p_id uuid,p_title text,p_source text,p_target text,p_characters integer)
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
 delete from study_documents where id=p_id and user_id=p_user and state='failed';
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
