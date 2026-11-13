-- Catalog-only checks. Run with supabase db query --read-only.
with app_tables as (
  select c.oid,c.relrowsecurity,n.nspname,c.relname
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where (n.nspname='public' and c.relname in ('institutions','profiles','member_access','membership_requests',
    'membership_events','admin_notifications','audit_logs')) or (n.nspname='private' and c.relname='email_outbox')
), rpc as (
  select p.oid,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('get_my_access','update_my_profile','submit_membership_request',
    'review_membership_request','change_member_status','save_institution','mark_notification_read','list_members_for_admin')
), checks as (
  select 'migration_history' as check_name, count(*)=3 as passed from supabase_migrations.schema_migrations
    where version in ('20261111000100','20261111000200','20261113000100')
  union all select 'eight_tables_rls_enabled',count(*)=8 and bool_and(relrowsecurity) from app_tables
  union all select 'no_direct_api_table_writes',not exists(
    select 1 from app_tables t cross join (values('anon'),('authenticated')) r(role_name)
    where has_table_privilege(r.role_name,t.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
      or has_any_column_privilege(r.role_name,t.oid,'INSERT,UPDATE,REFERENCES'))
  union all select 'rpc_authenticated_only',count(*)=8 and bool_and(
    has_function_privilege('authenticated',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE')) from rpc
  union all select 'rpc_security_definer_fixed_search_path',count(*)=8 and bool_and(prosecdef and 'search_path=""'=any(proconfig)) from rpc
  union all select 'internal_functions_not_callable',not exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname not in ('is_active_admin','can_access_education','can_read_cms_asset')
      and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')))
  union all select 'auth_triggers_enabled',count(*)=3 and bool_and(tgenabled='O') from pg_trigger
    where tgrelid='auth.users'::regclass and tgname in ('member_created','member_email_confirmed','zz_member_confirmed_on_insert')
  union all select 'audit_triggers_enabled',count(*)=5 and bool_and(tgenabled='O') from pg_trigger
    where tgname in ('audit_profiles','audit_access','audit_institutions','audit_requests','audit_events')
  union all select 'outbox_not_readable_by_api',not has_table_privilege('anon','private.email_outbox','SELECT')
    and not has_table_privilege('authenticated','private.email_outbox','SELECT')
  union all select 'auth_users_not_readable_by_api',not has_table_privilege('anon','auth.users','SELECT')
    and not has_table_privilege('authenticated','auth.users','SELECT')
  union all select 'anonymous_institution_columns_limited',
    has_column_privilege('anon','public.institutions','id','SELECT')
    and has_column_privilege('anon','public.institutions','name','SELECT')
    and not has_column_privilege('anon','public.institutions','is_active','SELECT')
)
select check_name,passed from checks order by check_name;
