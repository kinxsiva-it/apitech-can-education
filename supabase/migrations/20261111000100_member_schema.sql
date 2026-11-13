-- Application data only. Supabase owns auth.users and auth.uid().
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and length(name) between 1 and 200),
  is_active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index institutions_name_unique on public.institutions (lower(name));

create table public.profiles (
  user_id uuid primary key references auth.users(id),
  full_name text not null default '' check (length(full_name) <= 200),
  institution_id uuid references public.institutions(id),
  institution_other text check (institution_other = btrim(institution_other) and length(institution_other) between 1 and 200),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (institution_id is null or institution_other is null)
);
create index profiles_institution_idx on public.profiles(institution_id);

create table public.member_access (
  user_id uuid primary key references auth.users(id),
  role text not null default 'instructor' check (role in ('instructor','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  version integer not null default 1 check (version > 0),
  changed_at timestamptz not null default now()
);

create table public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  round_no integer not null check (round_no > 0),
  profile_snapshot jsonb not null check (jsonb_typeof(profile_snapshot) = 'object'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reason text check (reason = btrim(reason) and length(reason) between 1 and 2000),
  version integer not null default 1 check (version > 0),
  unique (user_id, round_no),
  check ((status = 'pending' and reviewed_at is null and reviewed_by is null and reason is null)
    or (status in ('approved','rejected') and reviewed_at is not null and reviewed_by is not null)),
  check (status <> 'rejected' or reason is not null)
);
create unique index membership_one_pending on public.membership_requests(user_id) where status = 'pending';
create index membership_pending_idx on public.membership_requests(submitted_at) where status = 'pending';
create index membership_reviewer_idx on public.membership_requests(reviewed_by);

create table public.membership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  request_id uuid references public.membership_requests(id),
  action text not null check (action in ('submitted','approved','rejected','suspended','restored')),
  from_status text not null check (from_status in ('pending','approved','rejected','suspended')),
  to_status text not null check (to_status in ('pending','approved','rejected','suspended')),
  actor_id uuid references auth.users(id),
  reason text check (reason = btrim(reason) and length(reason) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index membership_events_user_idx on public.membership_events(user_id, created_at);
create index membership_events_request_idx on public.membership_events(request_id);
create index membership_events_actor_idx on public.membership_events(actor_id);

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id),
  request_id uuid not null references public.membership_requests(id),
  event_id uuid not null references public.membership_events(id),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(recipient_id, event_id)
);
create index notifications_unread_idx on public.admin_notifications(recipient_id, created_at) where read_at is null;
create index notifications_request_idx on public.admin_notifications(request_id);
create index notifications_event_idx on public.admin_notifications(event_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_kind text not null check (actor_kind in ('user','system')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_logs(entity_type, entity_id, created_at);
create index audit_actor_idx on public.audit_logs(actor_id);

create table private.email_outbox (
  id uuid primary key default gen_random_uuid(),
  membership_event_id uuid not null references public.membership_events(id),
  template text not null check (template in ('membership_approved','membership_rejected')),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(membership_event_id, template)
);
create index email_outbox_pending_idx on private.email_outbox(next_attempt_at) where status in ('pending','failed');

-- Do not inherit broad public-schema defaults from a Supabase project.
revoke all on public.institutions, public.profiles, public.member_access,
  public.membership_requests, public.membership_events, public.admin_notifications,
  public.audit_logs from public, anon, authenticated;
revoke all on private.email_outbox from public, anon, authenticated;

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.member_access enable row level security;
alter table public.membership_requests enable row level security;
alter table public.membership_events enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table private.email_outbox enable row level security;

create function private.is_active_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.member_access a join auth.users u on u.id = a.user_id
    where a.user_id = (select auth.uid()) and a.role = 'admin' and a.status = 'approved'
      and u.email_confirmed_at is not null);
$$;
create function private.can_access_education() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.member_access a join auth.users u on u.id = a.user_id
    where a.user_id = (select auth.uid()) and a.status = 'approved' and u.email_confirmed_at is not null);
$$;
revoke all on function private.is_active_admin(), private.can_access_education() from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_active_admin() to anon, authenticated;
grant execute on function private.can_access_education() to authenticated;

grant select(id,name) on public.institutions to anon;
grant select on public.institutions, public.profiles, public.member_access,
  public.membership_requests, public.membership_events, public.admin_notifications,
  public.audit_logs to authenticated;

create policy institutions_anon_read on public.institutions for select to anon using (is_active);
create policy institutions_member_read on public.institutions for select to authenticated
using (is_active or (select private.is_active_admin()) or exists(
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.institution_id = institutions.id));
create policy profiles_read on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_active_admin()));
create policy access_read on public.member_access for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_active_admin()));
create policy requests_read on public.membership_requests for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_active_admin()));
create policy events_read on public.membership_events for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_active_admin()));
create policy notifications_read on public.admin_notifications for select to authenticated
using (recipient_id = (select auth.uid()) and (select private.is_active_admin()));
create policy audit_read on public.audit_logs for select to authenticated
using ((select private.is_active_admin()));

-- Append-only for API roles. Owner/Dev maintenance is deliberately outside CMS.
create function private.audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare old_data jsonb; new_data jsonb; actor uuid := auth.uid();
begin
  if tg_op <> 'INSERT' then old_data := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_data := to_jsonb(new); end if;
  insert into public.audit_logs(actor_id, actor_kind, action, entity_type, entity_id, before_data, after_data)
  values(actor, case when actor is null then 'system' else 'user' end,
    lower(tg_op), tg_table_name, coalesce(new_data->>'id',new_data->>'user_id',old_data->>'id',old_data->>'user_id'), old_data,new_data);
  return null;
end;
$$;
revoke all on function private.audit_change() from public, anon, authenticated;
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function private.audit_change();
create trigger audit_access after insert or update or delete on public.member_access for each row execute function private.audit_change();
create trigger audit_institutions after insert or update or delete on public.institutions for each row execute function private.audit_change();
create trigger audit_requests after insert or update or delete on public.membership_requests for each row execute function private.audit_change();
create trigger audit_events after insert on public.membership_events for each row execute function private.audit_change();
commit;
