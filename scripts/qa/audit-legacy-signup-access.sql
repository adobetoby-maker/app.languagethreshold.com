-- Read-only catalog audit; never selects beta_signups rows or changes access.
-- Project: pollhlkgltdkdskdzsgd. Dependency search is bounded, not an all-RPC audit.
with t as (
 select c.oid,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) as owner
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='beta_signups' and c.relkind in ('r','p')
), candidate_functions as (
 select p.oid,p.proname,n.nspname,p.prosecdef,p.proconfig
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.prokind='f' and n.nspname not in ('pg_catalog','information_schema')
 and (p.prosrc ilike '%beta_signups%' or exists(select 1 from pg_depend d cross join t where d.classid='pg_proc'::regclass and d.objid=p.oid and d.refobjid=t.oid))
), candidate_views as (
 select distinct v.oid,v.relname,n.nspname,v.reloptions
 from pg_rewrite rw join pg_class v on v.oid=rw.ev_class join pg_namespace n on n.oid=v.relnamespace join pg_depend d on d.classid='pg_rewrite'::regclass and d.objid=rw.oid cross join t
 where d.refobjid=t.oid and v.relkind in ('v','m')
)
select jsonb_build_object(
 'tableExists',exists(select 1 from t),
 'table',(select jsonb_build_object('rls',relrowsecurity,'forceRls',relforcerowsecurity,'owner',owner) from t),
 'roles',(select jsonb_agg(jsonb_build_object('role',r.rolname,'bypassRls',r.rolbypassrls,'canLogin',r.rolcanlogin,
   'schemaUsage',has_schema_privilege(r.oid,'public','USAGE'),
   'select',has_table_privilege(r.oid,t.oid,'SELECT'),'insert',has_table_privilege(r.oid,t.oid,'INSERT'),
   'update',has_table_privilege(r.oid,t.oid,'UPDATE'),'delete',has_table_privilege(r.oid,t.oid,'DELETE'),
   'truncate',has_table_privilege(r.oid,t.oid,'TRUNCATE'),'references',has_table_privilege(r.oid,t.oid,'REFERENCES'),'trigger',has_table_privilege(r.oid,t.oid,'TRIGGER'),
   'anyColumnSelect',has_any_column_privilege(r.oid,t.oid,'SELECT'),'anyColumnInsert',has_any_column_privilege(r.oid,t.oid,'INSERT'),'anyColumnUpdate',has_any_column_privilege(r.oid,t.oid,'UPDATE'),
   'serviceRoleMembership',pg_has_role(r.oid,'service_role','MEMBER'),
   'ownerRoleMembership',pg_has_role(r.oid,t.owner,'MEMBER')) order by r.rolname)
   from pg_roles r cross join t where r.rolname in ('anon','authenticated','service_role')),
 'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',policyname,'permissive',permissive,'roles',roles,'command',cmd,'using',qual,'check',with_check) order by policyname),'[]'::jsonb) from pg_policies where schemaname='public' and tablename='beta_signups'),
 'dependentViews',(select coalesce(jsonb_agg(jsonb_build_object('schema',nspname,'name',relname,'options',reloptions,'anonSelect',has_table_privilege('anon',oid,'SELECT'),'authenticatedSelect',has_table_privilege('authenticated',oid,'SELECT'))),'[]'::jsonb) from candidate_views),
 'referencingFunctions',(select coalesce(jsonb_agg(jsonb_build_object('schema',nspname,'name',proname,'securityDefiner',prosecdef,'config',proconfig,'anonExecute',has_function_privilege('anon',oid,'EXECUTE'),'authenticatedExecute',has_function_privilege('authenticated',oid,'EXECUTE'))),'[]'::jsonb) from candidate_functions)
) as access_metadata;

