begin;
create table public.cms_collections (
  id text primary key check (id in ('education','components')),
  version integer not null default 1,
  draft_version bigint, published_version bigint
);
create table public.cms_versions (
  id bigint generated always as identity primary key,
  collection_key text not null references public.cms_collections(id),
  document jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(id,collection_key)
);
alter table public.cms_collections add foreign key(draft_version,id) references public.cms_versions(id,collection_key);
alter table public.cms_collections add foreign key(published_version,id) references public.cms_versions(id,collection_key);
create table public.cms_assets (
  id uuid primary key,
  path text not null unique,
  bytes integer not null check (bytes between 1 and 5242880),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
insert into public.cms_collections(id) values ('education'),('components');
revoke all on public.cms_collections, public.cms_versions, public.cms_assets from public,anon,authenticated;
revoke all on sequence public.cms_versions_id_seq from public,anon,authenticated;
grant select on public.cms_collections, public.cms_versions, public.cms_assets to authenticated;
alter table public.cms_collections enable row level security;
alter table public.cms_versions enable row level security;
alter table public.cms_assets enable row level security;
create policy cms_collections_admin on public.cms_collections for select to authenticated using ((select private.is_active_admin()));
create policy cms_versions_admin on public.cms_versions for select to authenticated using ((select private.is_active_admin()));
create policy cms_assets_admin on public.cms_assets for select to authenticated using ((select private.is_active_admin()));
create trigger audit_cms_collections after update on public.cms_collections for each row execute function private.audit_change();
create trigger audit_cms_versions after insert on public.cms_versions for each row execute function private.audit_change();
create trigger audit_cms_assets after insert on public.cms_assets for each row execute function private.audit_change();

create function private.validate_content(p_document jsonb) returns void language plpgsql security definer set search_path='' as $$
declare lesson jsonb; topic jsonb; block jsonb; ids text[] := '{}'; identifier text;
begin
  if p_document is null or jsonb_typeof(p_document) <> 'object' or octet_length(p_document::text)>1000000
    or coalesce(jsonb_typeof(p_document->'lessons'),'')<>'array' or p_document-'lessons'<>'{}'::jsonb then raise exception 'Invalid content' using errcode='22023'; end if;
  if jsonb_array_length(p_document->'lessons')>100 then raise exception 'Too many lessons' using errcode='22023'; end if;
  for lesson in select * from jsonb_array_elements(p_document->'lessons') loop
    if jsonb_typeof(lesson)<>'object' or lesson-array['id','title','summary','topics']<>'{}'::jsonb
      or coalesce(jsonb_typeof(lesson->'title'),'')<>'string' or coalesce(jsonb_typeof(lesson->'summary'),'')<>'string'
      or coalesce(jsonb_typeof(lesson->'topics'),'')<>'array' or coalesce(length(btrim(lesson->>'title')),0) not between 1 and 200
      or coalesce(length(lesson->>'summary'),0)>2000 then raise exception 'Invalid lesson' using errcode='22023'; end if;
    if jsonb_array_length(lesson->'topics')>100 then raise exception 'Too many topics' using errcode='22023'; end if;
    identifier := lesson->>'id';
    if identifier is null or identifier=any(ids) then raise exception 'Duplicate/missing id' using errcode='22023'; end if;
    perform identifier::uuid; ids:=array_append(ids,identifier);
    for topic in select * from jsonb_array_elements(lesson->'topics') loop
      if jsonb_typeof(topic)<>'object' or topic-array['id','title','blocks']<>'{}'::jsonb or coalesce(jsonb_typeof(topic->'title'),'')<>'string'
        or coalesce(jsonb_typeof(topic->'blocks'),'')<>'array' or coalesce(length(btrim(topic->>'title')),0) not between 1 and 200 then raise exception 'Invalid topic' using errcode='22023'; end if;
      if jsonb_array_length(topic->'blocks')>100 then raise exception 'Too many blocks' using errcode='22023'; end if;
      identifier := topic->>'id';
      if identifier is null or identifier=any(ids) then raise exception 'Duplicate/missing id' using errcode='22023'; end if;
      perform identifier::uuid; ids:=array_append(ids,identifier);
      for block in select * from jsonb_array_elements(topic->'blocks') loop
        identifier := block->>'id';
        if identifier is null or identifier=any(ids) then raise exception 'Duplicate/missing id' using errcode='22023'; end if;
        perform identifier::uuid; ids:=array_append(ids,identifier);
        if jsonb_typeof(block)<>'object' or block-array['id','type','text','assetId','alt']<>'{}'::jsonb
          or coalesce(jsonb_typeof(block->'text'),'')<>'string' or coalesce(jsonb_typeof(block->'alt'),'')<>'string'
          or coalesce(jsonb_typeof(block->'assetId'),'') not in ('null','string')
          or coalesce(block->>'type','') not in ('text','heading','image') or coalesce(length(block->>'text'),0)>20000 or coalesce(length(block->>'alt'),0)>500 then raise exception 'Invalid block' using errcode='22023'; end if;
        if block->>'type'='image' and (coalesce(length(btrim(block->>'alt')),0)=0 or not exists(select 1 from public.cms_assets where id::text=block->>'assetId')) then raise exception 'Image and description required' using errcode='22023'; end if;
        if block->>'assetId' is not null then perform (block->>'assetId')::uuid; end if;
      end loop;
    end loop;
  end loop;
end; $$;

create function public.get_cms_content(p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.cms_collections;
begin
  perform private.require_admin(); select * into c from public.cms_collections where id=p_key;
  if not found then raise exception 'Invalid collection' using errcode='22023'; end if;
  return jsonb_build_object('key',c.id,'version',c.version,'draft',(select to_jsonb(v) from public.cms_versions v where id=c.draft_version),'published',(select to_jsonb(v) from public.cms_versions v where id=c.published_version));
end; $$;

create function public.save_cms_content(p_key text,p_document jsonb,p_expected_version integer,p_restore_version bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.cms_collections; new_id bigint; doc jsonb;
begin
  perform private.require_admin(); select * into c from public.cms_collections where id=p_key for update;
  if not found then raise exception 'Invalid collection' using errcode='22023'; end if;
  if c.version is distinct from p_expected_version then raise exception 'Content conflict' using errcode='40001'; end if;
  doc:=p_document;
  if p_restore_version is not null then
    select document into doc from public.cms_versions where id=p_restore_version and collection_key=p_key;
    if not found then raise exception 'Invalid version' using errcode='22023'; end if;
  end if;
  perform private.validate_content(doc);
  insert into public.cms_versions(collection_key,document,created_by) values(p_key,doc,auth.uid()) returning id into new_id;
  update public.cms_collections set draft_version=new_id,version=version+1 where id=p_key;
  if p_restore_version is not null then insert into public.audit_logs(actor_id,actor_kind,action,entity_type,entity_id,after_data) values(auth.uid(),'user','content.restore','cms_versions',new_id::text,jsonb_build_object('source_version',p_restore_version)); end if;
  return public.get_cms_content(p_key);
end; $$;

create function public.publish_cms_content(p_key text,p_expected_version integer,p_preview_version bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.cms_collections;
begin
  perform private.require_admin(); select * into c from public.cms_collections where id=p_key for update;
  if not found then raise exception 'Invalid collection' using errcode='22023'; end if;
  if c.version is distinct from p_expected_version or c.draft_version is null or c.draft_version is distinct from p_preview_version then raise exception 'Preview latest draft first' using errcode='40001'; end if;
  update public.cms_collections set published_version=draft_version,version=version+1 where id=p_key;
  insert into public.audit_logs(actor_id,actor_kind,action,entity_type,entity_id,after_data) values(auth.uid(),'user','content.publish','cms_collections',p_key,jsonb_build_object('version',c.draft_version));
  return public.get_cms_content(p_key);
end; $$;

create function public.get_published_content(p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not private.can_access_education() then raise exception 'Approved membership required' using errcode='42501'; end if;
  if p_key not in ('education','components') or p_key is null then raise exception 'Invalid collection' using errcode='22023'; end if;
  return (select to_jsonb(v) from public.cms_versions v join public.cms_collections c on c.published_version=v.id where c.id=p_key);
end; $$;

create function private.can_read_cms_asset(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select private.is_active_admin() or (private.can_access_education() and exists (
    select 1 from public.cms_assets a join public.cms_versions v on jsonb_path_exists(v.document,'$.lessons[*].topics[*].blocks[*] ? (@.assetId == $id)',jsonb_build_object('id',a.id::text))
    join public.cms_collections c on c.published_version=v.id where a.path=p_path));
$$;
revoke all on function private.can_read_cms_asset(text) from public,anon,authenticated;
grant execute on function private.can_read_cms_asset(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('cms-images','cms-images',false,5242880,array['image/webp']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp'];
create policy cms_images_insert on storage.objects for insert to authenticated with check(bucket_id='cms-images' and (select private.is_active_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy cms_images_read on storage.objects for select to authenticated using(bucket_id='cms-images' and private.can_read_cms_asset(name));

create function public.register_cms_asset(p_id uuid,p_path text,p_bytes integer) returns uuid language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin();
  if p_id is null or p_path is distinct from auth.uid()::text||'/'||p_id::text||'.webp' or not exists(select 1 from storage.objects where bucket_id='cms-images' and name=p_path) then raise exception 'Invalid upload' using errcode='22023'; end if;
  insert into public.cms_assets(id,path,bytes,created_by) values(p_id,p_path,p_bytes,auth.uid());
  return p_id;
end; $$;
create function public.get_cms_asset_path(p_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare p text;
begin
  select path into p from public.cms_assets where id=p_id;
  if p is null or not private.can_read_cms_asset(p) then raise exception 'Image access denied' using errcode='42501'; end if;
  return p;
end; $$;
revoke all on function public.get_cms_asset_path(uuid) from public,anon,authenticated;
grant execute on function public.get_cms_asset_path(uuid) to authenticated;
revoke all on function private.validate_content(jsonb),public.get_cms_content(text),public.save_cms_content(text,jsonb,integer,bigint),public.publish_cms_content(text,integer,bigint),public.get_published_content(text),public.register_cms_asset(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.get_cms_content(text),public.save_cms_content(text,jsonb,integer,bigint),public.publish_cms_content(text,integer,bigint),public.get_published_content(text),public.register_cms_asset(uuid,text,integer) to authenticated;
commit;
