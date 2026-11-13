import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// An isolated PostgreSQL engine. These are fixtures, not changes to hosted Supabase Auth.
async function fixture() {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    grant usage on schema public, auth to anon, authenticated;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant execute on function auth.uid() to anon,authenticated;
    -- Model Supabase's broad defaults to verify that migrations revoke them.
    alter default privileges in schema public grant all on tables to anon,authenticated;
    alter default privileges in schema public grant execute on functions to anon,authenticated;
  `)
  const migrations = new URL('../migrations/', import.meta.url)
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, migrations), 'utf8'))
  }
  return db
}

const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  admin2: '00000000-0000-4000-8000-000000000002',
  a: '00000000-0000-4000-8000-000000000003',
  b: '00000000-0000-4000-8000-000000000004',
}

async function as(db, user, fn) {
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ''])
  try { return await fn() } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub','',false)")
  }
}
async function user(db, id, metadata = { full_name: 'Instructor' }) {
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [id,`${id}@example.test`,JSON.stringify(metadata)])
}
async function confirm(db, id) {
  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [id])
}
async function admin(db, id) {
  await user(db,id,{ full_name: 'Admin' })
  // Dev-only bootstrap, before email confirmation; cannot be executed by API roles.
  await db.query("update public.member_access set role='admin',status='approved' where user_id=$1",[id])
  await confirm(db,id)
}
async function access(db, id) {
  return (await db.query('select * from public.member_access where user_id=$1',[id])).rows[0]
}
async function request(db, id) {
  return (await db.query('select * from public.membership_requests where user_id=$1 order by round_no desc limit 1',[id])).rows[0]
}
async function review(db, id, decision, reason = null) {
  const row = await request(db,id)
  return as(db,ids.admin,()=>db.query('select public.review_membership_request($1,$2,$3,$4)',[row.id,decision,reason,row.version]))
}
function denied(promise, code = '42501') {
  return assert.rejects(promise, (error) => error.code === code)
}

test('signup metadata cannot promote user; confirmation queues only once', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin)
    await user(db,ids.a,{ full_name: 'Teacher A', role: 'admin', status: 'approved', email_verified: true, institution_id: 'invalid-uuid' })
    assert.equal((await access(db,ids.a)).role,'instructor')
    assert.equal(await request(db,ids.a),undefined)
    await denied(as(db,ids.a,()=>db.query('select public.submit_membership_request(1)')))
    await confirm(db,ids.a)
    const row = await request(db,ids.a)
    assert.equal(row.status,'pending')
    await confirm(db,ids.a)
    const retry = await as(db,ids.a,()=>db.query('select public.submit_membership_request(1) as id'))
    assert.equal(retry.rows[0].id,row.id)
    assert.equal((await db.query('select count(*)::int as n from public.admin_notifications')).rows[0].n,1)
    await denied(as(db,null,()=>db.query('select public.get_my_access()')))
    await denied(as(db,ids.a,()=>db.query('select private.submit_request($1,1)',[ids.a])))
  } finally { await db.close() }
})

test('RLS isolates members; direct writes/log tampering remain denied to Admin', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin)
    await user(db,ids.a); await user(db,ids.b)
    await as(db,ids.a,async()=>{
      assert.deepEqual((await db.query('select user_id from public.profiles')).rows,[{user_id:ids.a}])
      assert.equal((await db.query('select * from public.audit_logs')).rows.length,0)
      await denied(db.query("update public.member_access set role='admin' where user_id=$1",[ids.a]))
      await denied(db.query("insert into public.member_access(user_id) values($1)",[ids.b]))
      await denied(db.query('select public.save_institution(null,$1,true,null)',['School']))
      await denied(db.query('select * from private.email_outbox'))
      await denied(db.query('select public.review_membership_request($1,$2,null,1)',[ids.a,'approved']))
    })
    await as(db,ids.admin,async()=>{
      assert.equal((await db.query('select * from public.profiles')).rows.length,3)
      await denied(db.query('delete from public.audit_logs'))
      await denied(db.query('insert into public.audit_logs(action,entity_type,entity_id,actor_kind) values(\'fake\',\'x\',\'x\',\'system\')'))
      await denied(db.query("update public.member_access set role='admin' where user_id=$1",[ids.a]))
      await denied(db.query('select public.change_member_status($1,$2,$3,1)',[ids.admin,'suspend','No']))
    })
    const rls = await db.query("select count(*)::int as n from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname in ('public','private') and c.relkind='r' and c.relrowsecurity")
    assert.equal(rls.rows[0].n,8)
  } finally { await db.close() }
})

test('approval transaction queues mail, prevents stale review, and suspension checks live state', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin); await user(db,ids.a); await confirm(db,ids.a)
    const original = await request(db,ids.a)
    await as(db,ids.a,async()=>{
      assert.equal((await db.query('select private.can_access_education() as allowed')).rows[0].allowed,false)
      await denied(db.query('select public.update_my_profile($1,null,null,1)',['Changed during review']),'55000')
    })
    await review(db,ids.a,'approved')
    assert.equal((await access(db,ids.a)).status,'approved')
    assert.equal((await db.query('select count(*)::int as n from private.email_outbox')).rows[0].n,1)
    await denied(as(db,ids.admin,()=>db.query('select public.review_membership_request($1,$2,null,1)',[original.id,'approved'])),'40001')
    assert.equal((await db.query('select count(*)::int as n from private.email_outbox')).rows[0].n,1)
    let version=(await access(db,ids.a)).version
    await denied(as(db,ids.admin,()=>db.query('select public.change_member_status($1,$2,null,$3)',[ids.a,'suspend',version])),'22023')
    await as(db,ids.admin,()=>db.query('select public.change_member_status($1,$2,$3,$4)',[ids.a,'suspend','Review required',version]))
    await as(db,ids.a,async()=>{
      assert.equal((await db.query('select private.can_access_education() as allowed')).rows[0].allowed,false)
      await denied(db.query('select public.submit_membership_request(1)'),'55000')
    })
    version=(await access(db,ids.a)).version
    await as(db,ids.admin,()=>db.query('select public.change_member_status($1,$2,null,$3)',[ids.a,'restore',version]))
    assert.equal((await as(db,ids.a,()=>db.query('select private.can_access_education() as allowed'))).rows[0].allowed,true)
    assert.ok((await db.query("select count(*)::int as n from public.audit_logs where entity_type='member_access'")).rows[0].n >= 4)
  } finally { await db.close() }
})

test('rejection requires reason; resubmission preserves old snapshot and increments round', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin); await user(db,ids.a); await confirm(db,ids.a)
    await denied(review(db,ids.a,'rejected','  '),'22023')
    assert.equal((await request(db,ids.a)).status,'pending')
    assert.equal((await db.query('select * from private.email_outbox')).rows.length,0)
    await review(db,ids.a,'rejected','Please correct your name')
    await as(db,ids.a,async()=>{
      await db.query('select public.update_my_profile($1,null,null,1)',['Corrected name'])
      await denied(db.query('select public.submit_membership_request(1)'),'40001')
      await db.query('select public.submit_membership_request(2)')
    })
    const rows=(await db.query('select * from public.membership_requests where user_id=$1 order by round_no',[ids.a])).rows
    assert.equal(rows.length,2)
    assert.equal(rows[0].reason,'Please correct your name')
    assert.equal(rows[0].profile_snapshot.full_name,'Instructor')
    assert.equal(rows[1].profile_snapshot.full_name,'Corrected name')
    assert.equal(rows[1].round_no,2)
  } finally { await db.close() }
})

test('institution grants, inactive selection and individual notification read state', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin); await admin(db,ids.admin2)
    await as(db,ids.admin,()=>db.query("select public.save_institution(null,'School',true,null)"))
    const school=(await db.query('select * from public.institutions')).rows[0]
    await as(db,null,async()=>{
      assert.equal((await db.query('select id,name from public.institutions')).rows.length,1)
      await denied(db.query('select * from public.institutions'))
    })
    await user(db,ids.a,{full_name:'Teacher',institution_id:school.id}); await confirm(db,ids.a)
    await user(db,ids.b)
    const notes=(await db.query('select * from public.admin_notifications')).rows
    assert.equal(notes.length,2)
    const own=notes.find((n)=>n.recipient_id===ids.admin)
    const other=notes.find((n)=>n.recipient_id===ids.admin2)
    await as(db,ids.admin,async()=>{
      assert.equal((await db.query('select * from public.admin_notifications')).rows.length,1)
      assert.equal((await db.query('select public.mark_notification_read($1) as done',[other.id])).rows[0].done,false)
      await db.query('select public.mark_notification_read($1)',[own.id])
      await db.query('select public.save_institution($1,$2,false,1)',[school.id,'School'])
    })
    assert.equal((await db.query('select read_at from public.admin_notifications where id=$1',[other.id])).rows[0].read_at,null)
    assert.equal((await as(db,null,()=>db.query('select id,name from public.institutions'))).rows.length,0)
    assert.equal((await as(db,ids.a,()=>db.query('select * from public.institutions'))).rows.length,1)
    await denied(as(db,ids.b,()=>db.query('select public.update_my_profile($1,$2,null,1)',['B',school.id])),'22023')
  } finally { await db.close() }
})

test('malformed/incomplete metadata cannot break Auth confirmation; own profile can be completed', async () => {
  const db = await fixture()
  try {
    await user(db,ids.a,{institution_id:'not-a-uuid'})
    await confirm(db,ids.a)
    assert.equal(await request(db,ids.a),undefined)
    await as(db,ids.a,async()=>{
      await db.query('select public.update_my_profile($1,null,$2,1)',['Teacher','Other institute'])
      await db.query('select public.submit_membership_request(2)')
    })
    assert.equal((await request(db,ids.a)).profile_snapshot.institution_other,'Other institute')
    const functions=await db.query("select p.proname,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef")
    assert.ok(functions.rows.every((fn)=>fn.proconfig?.some((value)=>value.startsWith('search_path='))))
  } finally { await db.close() }
})

test('failure while queuing approval mail rolls back access, review, event and audit together', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin); await user(db,ids.a); await confirm(db,ids.a)
    const before=(await db.query('select count(*)::int as n from public.audit_logs')).rows[0].n
    // Simulate a late database failure, after review/access/events have already been written.
    await db.exec("alter table private.email_outbox add constraint simulate_failure check (template <> 'membership_approved')")
    await denied(review(db,ids.a,'approved'),'23514')
    assert.equal((await access(db,ids.a)).status,'pending')
    assert.equal((await request(db,ids.a)).status,'pending')
    assert.equal((await db.query('select count(*)::int as n from public.audit_logs')).rows[0].n,before)
    assert.equal((await db.query("select count(*)::int as n from public.membership_events where action='approved'")).rows[0].n,0)
    assert.equal((await db.query('select count(*)::int as n from private.email_outbox')).rows[0].n,0)
  } finally { await db.close() }
})

test('already-confirmed Auth insert initializes before queuing; later metadata edits do not alter application roles', async () => {
  const db = await fixture()
  try {
    await db.query('insert into auth.users(id,email_confirmed_at,raw_user_meta_data) values($1,now(),$2)',[ids.a,JSON.stringify({full_name:'Confirmed'})])
    assert.equal((await request(db,ids.a)).status,'pending')
    await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify({role:'admin',status:'approved'}),ids.a])
    assert.equal((await access(db,ids.a)).role,'instructor')
    assert.equal((await access(db,ids.a)).status,'pending')
  } finally { await db.close() }
})

test('Admin member listing protects Auth emails, pending queue and bounded pagination', async () => {
  const db = await fixture()
  try {
    await admin(db,ids.admin)
    await user(db,ids.a,{full_name:'Visible Teacher'}); await confirm(db,ids.a)
    await user(db,ids.b,{full_name:'Unconfirmed Teacher'})
    await denied(as(db,ids.a,()=>db.query('select public.list_members_for_admin(null,\'\',20,0)')))
    await denied(as(db,null,()=>db.query('select public.list_members_for_admin(null,\'\',20,0)')))
    const listed=await as(db,ids.admin,()=>db.query("select public.list_members_for_admin('pending','Teacher',10,0) as page"))
    assert.equal(listed.rows[0].page.total,1)
    assert.equal(listed.rows[0].page.items[0].user_id,ids.a)
    assert.equal(listed.rows[0].page.items[0].email,`${ids.a}@example.test`)
    assert.equal(listed.rows[0].page.items[0].latest_request.profile_snapshot.full_name,'Visible Teacher')
    const all=await as(db,ids.admin,()=>db.query("select public.list_members_for_admin(null,'',1,1) as page"))
    assert.equal(all.rows[0].page.total,2)
    assert.equal(all.rows[0].page.items.length,1)
    await denied(as(db,ids.admin,()=>db.query("select public.list_members_for_admin(null,'',101,0)")),'22023')
    await denied(as(db,ids.admin,()=>db.query("select public.list_members_for_admin('invalid','',20,0)")),'22023')
    await as(db,ids.admin,async()=>{
      await denied(db.query('select email from auth.users'))
    })
    await db.query("update public.member_access set status='suspended' where user_id=$1",[ids.admin])
    await denied(as(db,ids.admin,()=>db.query("select public.list_members_for_admin(null,'',20,0)")))
  } finally { await db.close() }
})
