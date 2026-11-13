begin;
alter table private.email_outbox add column claim_token uuid;
create function public.claim_membership_email() returns jsonb language plpgsql security definer set search_path='' as $$
declare job private.email_outbox; recipient text; event public.membership_events; claim uuid:=gen_random_uuid();
begin
  update private.email_outbox set status='failed',locked_until=null,claim_token=null,last_error='worker_lease_expired'
    where status='sending' and locked_until<now() and attempts>=5;
  select * into job from private.email_outbox where attempts<5 and (
    (status in ('pending','failed') and next_attempt_at<=now()) or (status='sending' and locked_until<now()))
    order by created_at,id limit 1 for update skip locked;
  if not found then return null; end if;
  select * into event from public.membership_events where id=job.membership_event_id;
  select email into recipient from auth.users where id=event.user_id and email_confirmed_at is not null;
  if recipient is null or not exists(select 1 from public.member_access where user_id=event.user_id and status=event.to_status) then
    update private.email_outbox set status='skipped',last_error='obsolete_or_unconfirmed',claim_token=null where id=job.id;
    return jsonb_build_object('skipped',true);
  end if;
  update private.email_outbox set status='sending',attempts=attempts+1,locked_until=now()+interval '2 minutes',claim_token=claim where id=job.id;
  return jsonb_build_object('id',job.id,'claim',claim,'recipient',recipient,'template',job.template,'reason',event.reason);
end; $$;
create function public.finish_membership_email(p_id uuid,p_claim uuid,p_sent boolean,p_provider_id text default null) returns boolean language plpgsql security definer set search_path='' as $$
begin
  update private.email_outbox set status=case when p_sent then 'sent' else 'failed' end,
    provider_message_id=case when p_sent then left(p_provider_id,200) else provider_message_id end,
    sent_at=case when p_sent then now() else null end,locked_until=null,claim_token=null,
    last_error=case when p_sent then null else 'provider_delivery_failed' end,
    next_attempt_at=now()+make_interval(secs=>least(3600,60*(2^attempts)::integer))
    where id=p_id and claim_token=p_claim and status='sending';
  return found;
end; $$;
create function public.list_membership_email_status(p_limit integer default 20,p_offset integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare output jsonb;
begin
  perform private.require_admin();
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(q)) from (select id,membership_event_id,template,status,attempts,created_at,sent_at,last_error,next_attempt_at from private.email_outbox order by created_at desc,id limit p_limit offset p_offset) q),'[]'::jsonb),'total',(select count(*) from private.email_outbox),'limit',p_limit,'offset',p_offset) into output;
  return output;
end; $$;
revoke all on function public.claim_membership_email(),public.finish_membership_email(uuid,uuid,boolean,text),public.list_membership_email_status(integer,integer) from public,anon,authenticated;
grant execute on function public.claim_membership_email(),public.finish_membership_email(uuid,uuid,boolean,text) to service_role;
grant execute on function public.list_membership_email_status(integer,integer) to authenticated;
commit;
