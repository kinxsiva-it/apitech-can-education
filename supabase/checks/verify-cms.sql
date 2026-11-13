-- Read-only checks after applying CMS migrations; no customer content or credentials selected.
with checks as (
  select 'cms_migrations_present' as check_name,count(*)=2 as passed from supabase_migrations.schema_migrations where version in ('20261113000200','20261113000300')
  union all select 'cms_tables_rls',count(*)=3 and bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('cms_collections','cms_versions','cms_assets')
  union all select 'cms_tables_read_only_for_api',not exists(select 1 from (values('cms_collections'),('cms_versions'),('cms_assets')) t(name) cross join (values('anon'),('authenticated')) r(name) where has_table_privilege(r.name,'public.'||t.name,'INSERT,UPDATE,DELETE,TRUNCATE'))
  union all select 'cms_bucket_private',count(*)=1 and bool_and(not public) from storage.buckets where id='cms-images'
  union all select 'cms_storage_policies',count(*)=2 from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('cms_images_insert','cms_images_read')
  union all select 'worker_rpc_service_only',not has_function_privilege('authenticated','public.claim_membership_email()','EXECUTE') and not has_function_privilege('anon','public.claim_membership_email()','EXECUTE') and has_function_privilege('service_role','public.claim_membership_email()','EXECUTE')
  union all select 'cms_rpc_authenticated_only',bool_and(has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE') and p.prosecdef and 'search_path=""'=any(p.proconfig)) and count(*)=7 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('get_cms_content','save_cms_content','publish_cms_content','get_published_content','register_cms_asset','get_cms_asset_path','list_membership_email_status')
) select check_name,passed from checks order by check_name;
