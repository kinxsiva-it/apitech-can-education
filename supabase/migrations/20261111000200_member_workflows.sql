begin;

create function private.require_admin() returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Hold the actor's access row during the operation; never accept actor_id from the client.
  perform 1 from public.member_access where user_id = auth.uid() for share;
  if not private.is_active_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
end;
$$;

create function public.get_my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('user_id',a.user_id,'role',a.role,'status',a.status,'version',a.version,
    'email_confirmed',u.email_confirmed_at is not null,'can_access_education',private.can_access_education(),
    'latest_request',(select jsonb_build_object('id',r.id,'status',r.status,'round_no',r.round_no,'reason',r.reason,'version',r.version)
      from public.membership_requests r where r.user_id = a.user_id order by round_no desc limit 1))
  from public.member_access a join auth.users u on u.id = a.user_id where a.user_id = auth.uid();
$$;

create function public.update_my_profile(p_full_name text, p_institution_id uuid, p_institution_other text, p_expected_revision integer)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare a public.member_access; p public.profiles;
  full_name_value text := btrim(p_full_name); other_value text := nullif(btrim(p_institution_other),'');
begin
  select * into a from public.member_access where user_id = auth.uid() for update;
  if not found then raise exception 'Account required' using errcode = '42501'; end if;
  select * into p from public.profiles where user_id = a.user_id for update;
  if not found then raise exception 'Profile missing' using errcode = '55000'; end if;
  if p.revision is distinct from p_expected_revision then raise exception 'Profile version conflict' using errcode = '40001'; end if;
  if exists(select 1 from public.membership_requests where user_id = a.user_id and status = 'pending') then
    raise exception 'Profile is under review' using errcode = '55000';
  end if;
  if full_name_value is null or length(full_name_value) not between 1 and 200
    or length(other_value) > 200 or (p_institution_id is not null and other_value is not null) then
    raise exception 'Invalid profile fields' using errcode = '22023';
  end if;
  if p_institution_id is not null and p_institution_id is distinct from p.institution_id then
    perform 1 from public.institutions where id = p_institution_id and is_active for share;
    if not found then raise exception 'Institution unavailable' using errcode = '22023'; end if;
  end if;
  update public.profiles set full_name = full_name_value, institution_id = p_institution_id,
    institution_other = other_value, revision = revision+1, updated_at = now()
    where user_id = a.user_id returning * into p;
  return p;
end;
$$;

create function private.submit_request(p_user_id uuid, p_expected_revision integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare a public.member_access; p public.profiles; request_id_value uuid; event_id_value uuid; round_value integer;
begin
  select * into a from public.member_access where user_id = p_user_id for update;
  if not found or a.role <> 'instructor' then raise exception 'Instructor account required' using errcode = '42501'; end if;
  select * into p from public.profiles where user_id = p_user_id for update;
  if not found then raise exception 'Profile missing' using errcode = '55000'; end if;
  if p.revision is distinct from p_expected_revision then raise exception 'Profile version conflict' using errcode = '40001'; end if;
  if not exists(select 1 from auth.users where id = p_user_id and email_confirmed_at is not null) then
    raise exception 'Email confirmation required' using errcode = '42501';
  end if;
  if a.status not in ('pending','rejected') then raise exception 'Cannot submit in current state' using errcode = '55000'; end if;
  select id into request_id_value from public.membership_requests where user_id = p_user_id and status = 'pending';
  if found then return request_id_value; end if;
  if length(btrim(p.full_name)) = 0 then raise exception 'Complete your profile first' using errcode = '22023'; end if;
  if p.institution_id is not null then
    perform 1 from public.institutions where id = p.institution_id and is_active for share;
    if not found then raise exception 'Institution unavailable' using errcode = '22023'; end if;
  end if;
  select coalesce(max(round_no),0)+1 into round_value from public.membership_requests where user_id = p_user_id;
  insert into public.membership_requests(user_id,round_no,profile_snapshot)
  values(p_user_id,round_value,jsonb_build_object('full_name',p.full_name,'institution_id',p.institution_id,
    'institution_name',(select name from public.institutions where id = p.institution_id),'institution_other',p.institution_other))
    returning id into request_id_value;
  update public.member_access set status = 'pending', version = version+1, changed_at = now() where user_id = p_user_id;
  insert into public.membership_events(user_id,request_id,action,from_status,to_status,actor_id)
  values(p_user_id,request_id_value,'submitted',a.status,'pending',auth.uid()) returning id into event_id_value;
  insert into public.admin_notifications(recipient_id,request_id,event_id)
    select access.user_id,request_id_value,event_id_value from public.member_access access
    join auth.users u on u.id = access.user_id
    where access.role = 'admin' and access.status = 'approved' and u.email_confirmed_at is not null
    on conflict(recipient_id,event_id) do nothing;
  return request_id_value;
end;
$$;

create function public.submit_membership_request(p_expected_revision integer) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Account required' using errcode = '42501'; end if;
  return private.submit_request(auth.uid(),p_expected_revision);
end;
$$;

create function public.review_membership_request(p_request_id uuid, p_decision text, p_reason text, p_expected_version integer)
returns public.membership_requests language plpgsql security definer set search_path = '' as $$
declare r public.membership_requests; a public.member_access; event_id_value uuid; target_id uuid;
  reason_value text := nullif(btrim(p_reason),'');
begin
  perform private.require_admin();
  if p_decision is null or p_decision not in ('approved','rejected')
    or length(reason_value) > 2000 or (p_decision = 'rejected' and reason_value is null) then
    raise exception 'Invalid review decision or reason' using errcode = '22023';
  end if;
  select user_id into target_id from public.membership_requests where id = p_request_id;
  select * into a from public.member_access where user_id = target_id for update;
  if not found or a.role <> 'instructor' then raise exception 'Instructor required' using errcode = '42501'; end if;
  select * into r from public.membership_requests where id = p_request_id for update;
  if r.version is distinct from p_expected_version or r.status <> 'pending' or a.status <> 'pending' then
    raise exception 'Request version or state conflict' using errcode = '40001';
  end if;
  if not exists(select 1 from auth.users where id = a.user_id and email_confirmed_at is not null) then
    raise exception 'Email confirmation required' using errcode = '42501';
  end if;
  update public.membership_requests set status = p_decision, reason = reason_value,
    reviewed_by = auth.uid(), reviewed_at = now(), version = version+1 where id = p_request_id returning * into r;
  update public.member_access set status = p_decision, version = version+1, changed_at = now() where user_id = a.user_id;
  insert into public.membership_events(user_id,request_id,action,from_status,to_status,actor_id,reason)
    values(a.user_id,r.id,p_decision,'pending',p_decision,auth.uid(),reason_value) returning id into event_id_value;
  insert into private.email_outbox(membership_event_id,template) values(event_id_value,'membership_'||p_decision);
  return r;
end;
$$;

create function public.change_member_status(p_user_id uuid, p_action text, p_reason text, p_expected_version integer)
returns public.member_access language plpgsql security definer set search_path = '' as $$
declare a public.member_access; next_status text; reason_value text := nullif(btrim(p_reason),'');
begin
  perform private.require_admin();
  select * into a from public.member_access where user_id = p_user_id for update;
  if not found or a.role <> 'instructor' then raise exception 'Instructor required' using errcode = '42501'; end if;
  if a.version is distinct from p_expected_version then raise exception 'Access version conflict' using errcode = '40001'; end if;
  if p_action = 'suspend' and a.status = 'approved' and reason_value is not null then next_status := 'suspended';
  elsif p_action = 'restore' and a.status = 'suspended' then next_status := 'approved';
  else raise exception 'Invalid status transition or missing reason' using errcode = '22023'; end if;
  if length(reason_value) > 2000 then raise exception 'Reason too long' using errcode = '22023'; end if;
  update public.member_access set status = next_status, version = version+1, changed_at = now() where user_id = p_user_id;
  insert into public.membership_events(user_id,action,from_status,to_status,actor_id,reason)
    values(p_user_id,case when p_action = 'suspend' then 'suspended' else 'restored' end,a.status,next_status,auth.uid(),reason_value);
  select * into a from public.member_access where user_id = p_user_id;
  return a;
end;
$$;

create function public.save_institution(p_id uuid, p_name text, p_active boolean, p_expected_version integer)
returns public.institutions language plpgsql security definer set search_path = '' as $$
declare row_value public.institutions;
begin
  perform private.require_admin();
  if p_name is null or length(btrim(p_name)) not between 1 and 200 or p_active is null then
    raise exception 'Invalid institution' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.institutions(name,is_active) values(btrim(p_name),p_active) returning * into row_value;
  else
    select * into row_value from public.institutions where id = p_id for update;
    if not found or row_value.version is distinct from p_expected_version then
      raise exception 'Institution version conflict' using errcode = '40001'; end if;
    update public.institutions set name = btrim(p_name),is_active = p_active,
      version = version+1,updated_at = now() where id = p_id returning * into row_value;
  end if;
  return row_value;
end;
$$;

create function public.mark_notification_read(p_notification_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.admin_notifications set read_at = coalesce(read_at,now())
    where id = p_notification_id and recipient_id = auth.uid();
  return found;
end;
$$;

-- Only safe, validated registration metadata is copied. Never trust role/status/email_verified metadata.
create function private.initialize_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u auth.users; institution_value uuid; other_value text;
begin
  select * into u from auth.users where id = p_user_id;
  select id into institution_value from public.institutions where id::text = u.raw_user_meta_data->>'institution_id' and is_active;
  if institution_value is null then other_value := nullif(left(btrim(u.raw_user_meta_data->>'institution_other'),200),''); end if;
  insert into public.profiles(user_id,full_name,institution_id,institution_other)
    values(u.id,left(btrim(coalesce(u.raw_user_meta_data->>'full_name','')),200),institution_value,other_value)
    on conflict(user_id) do nothing;
  insert into public.member_access(user_id) values(u.id) on conflict(user_id) do nothing;
end;
$$;

create function private.on_auth_member_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.initialize_member(new.id);
  return new;
end;
$$;

create function private.queue_confirmed_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where user_id = new.id;
  if new.email_confirmed_at is not null and length(btrim(p.full_name)) > 0
    and exists(select 1 from public.member_access where user_id = new.id and role = 'instructor' and status = 'pending')
    and (p.institution_id is null or exists(select 1 from public.institutions where id = p.institution_id and is_active)) then
    perform private.submit_request(new.id,p.revision);
  end if;
  return new;
end;
$$;

create trigger member_created after insert on auth.users for each row execute function private.on_auth_member_created();
create trigger member_email_confirmed after update of email_confirmed_at on auth.users for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function private.queue_confirmed_member();
-- Also support a Dev-created user that is already confirmed on insert, without granting admin rights.
create trigger zz_member_confirmed_on_insert after insert on auth.users for each row execute function private.queue_confirmed_member();

-- Existing Auth accounts get the same instructor/pending defaults; no automatic Admin seed.
select private.initialize_member(id) from auth.users;

-- Supabase may grant EXECUTE by default. Revoke for each application function explicitly.
revoke all on function private.require_admin(), private.submit_request(uuid,integer),
  private.initialize_member(uuid), private.on_auth_member_created(), private.queue_confirmed_member()
  from public, anon, authenticated;
revoke all on function public.get_my_access(), public.update_my_profile(text,uuid,text,integer),
  public.submit_membership_request(integer), public.review_membership_request(uuid,text,text,integer),
  public.change_member_status(uuid,text,text,integer), public.save_institution(uuid,text,boolean,integer),
  public.mark_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.get_my_access(), public.update_my_profile(text,uuid,text,integer),
  public.submit_membership_request(integer), public.review_membership_request(uuid,text,text,integer),
  public.change_member_status(uuid,text,text,integer), public.save_institution(uuid,text,boolean,integer),
  public.mark_notification_read(uuid) to authenticated;
commit;
