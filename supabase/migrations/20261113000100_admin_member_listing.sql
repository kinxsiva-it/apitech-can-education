begin;
-- Email is read from Auth only after current Admin access is checked; never expose auth.users itself.
create function public.list_members_for_admin(p_status text default null, p_search text default '', p_limit integer default 20, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare output jsonb;
begin
  perform private.require_admin();
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 100000
    or (p_status is not null and p_status not in ('pending','approved','rejected','suspended'))
    or length(p_search) > 200 then raise exception 'Invalid member list filters' using errcode = '22023'; end if;
  with matched as (
    select p.user_id,p.full_name,u.email,(u.email_confirmed_at is not null) as email_confirmed,
      coalesce(i.name,p.institution_other) as institution_name,a.status,a.version as access_version,p.revision as profile_revision,
      p.created_at,
      case when r.id is null then null else jsonb_build_object('id',r.id,'status',r.status,'round_no',r.round_no,
        'reason',r.reason,'version',r.version,'profile_snapshot',r.profile_snapshot) end as latest_request
    from public.profiles p join public.member_access a on a.user_id=p.user_id join auth.users u on u.id=p.user_id
    left join public.institutions i on i.id=p.institution_id
    left join lateral (select * from public.membership_requests req where req.user_id=p.user_id order by round_no desc limit 1) r on true
    where a.role='instructor' and (p_status is null or a.status=p_status)
      and (p_status is distinct from 'pending' or (r.status='pending' and u.email_confirmed_at is not null))
      and (coalesce(btrim(p_search),'')='' or position(lower(btrim(p_search)) in lower(p.full_name||' '||coalesce(u.email,'')))>0)
  ), page as (select * from matched order by created_at desc,user_id limit p_limit offset p_offset)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)-'created_at' order by page.created_at desc,page.user_id) from page),'[]'::jsonb),
    'total',(select count(*) from matched),'limit',p_limit,'offset',p_offset) into output;
  return output;
end;
$$;
revoke all on function public.list_members_for_admin(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.list_members_for_admin(text,text,integer,integer) to authenticated;
commit;
