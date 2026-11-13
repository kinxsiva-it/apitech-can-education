import { test } from 'node:test'
import assert from 'node:assert/strict'
import { processOne, message } from '../scripts/email-worker.mjs'
const job={id:'job-one',claim:'claim-one',recipient:'teacher@example.test',template:'membership_rejected',reason:'Fix institution'}
test('worker uses a stable provider idempotency key and acknowledges the same lease',async()=>{
  const calls=[]
  const client={rpc:async(name,args)=>{calls.push({name,args});return name==='claim_membership_email'?{data:job,error:null}:{data:true,error:null}}}
  let sent
  assert.equal(await processOne(client,{key:'fake-key',from:'test@example.test',siteUrl:'https://education.example.test'},async(url,init)=>{sent={url,init};return Response.json({id:'provider-one'})}),true)
  assert.equal(sent.init.headers['Idempotency-Key'],'membership-job-one')
  assert.deepEqual(JSON.parse(sent.init.body).to,['teacher@example.test'])
  assert.deepEqual(calls[1].args,{p_id:'job-one',p_claim:'claim-one',p_sent:true,p_provider_id:'provider-one'})
})
test('provider failure is recorded without propagating response secrets',async()=>{
  const calls=[]
  const client={rpc:async(name,args)=>{calls.push({name,args});return name==='claim_membership_email'?{data:job}:{data:true}}}
  await processOne(client,{key:'fake-key',from:'test@example.test',siteUrl:'https://education.example.test'},async()=>Response.json({error:'sensitive-provider-details'},{status:429}))
  assert.equal(calls[1].args.p_sent,false);assert.equal(calls[1].args.p_provider_id,null)
  assert.ok(message(job,'https://education.example.test').text.includes('Fix institution'))
})
test('no pending or obsolete task sends no provider request',async()=>{
  for(const data of [null,{skipped:true}]){
    let sent=false
    await processOne({rpc:async()=>({data})},{},async()=>{sent=true})
    assert.equal(sent,false)
  }
})
