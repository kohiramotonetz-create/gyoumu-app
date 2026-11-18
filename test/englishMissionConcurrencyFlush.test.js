import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {createEnglishMissionService,ENGLISH_MISSION_ACTIONS} from '../src/server/englishMissionService.js';
import {catalog,buildEnglishMissionWeeks} from '../src/utils/englishMissionPlanning.js';

const target={scopeSchools:['栗林'],attendingSchoolName:'合成中学校',targetGrade:'中３',subject:'english'};
const sha=s=>createHash('sha256').update(s).digest('hex');
const action=Object.fromEntries(Object.entries(ENGLISH_MISSION_ACTIONS).map(([key,value])=>[value,key]));
function fixture(){
  let visible={operations:[],rows:[]}, writes=0, releases=0;
  const options={acquire:true,fault:null,wait:null};
  function context(userId){
    let local, flushed=0;
    const store={
      read(){
        if(options.fault==='read' && flushed>=2)throw Error('read unavailable');
        const state=structuredClone(local??visible);
        if(options.fault==='mismatch' && flushed>=2 && state.rows.length)state.rows.at(-1).hash='invalid';
        return state;
      },
      begin(op){local=structuredClone(visible);flushed=0;local.operations.push(structuredClone(op));writes++;},
      append(rows){local.rows.push(...structuredClone(rows));writes++;},
      mark(id,state){local.operations.find(op=>op.operationId===id).state=state;writes++;},
    };
    const service=createEnglishMissionService({
      store, hash:sha, sign:s=>createHmac('sha256','synthetic').update(s).digest('hex'),
      encode:s=>Buffer.from(s).toString('base64url'),decode:s=>Buffer.from(s,'base64url').toString(),
      uuid:randomUUID, targetExists:()=>true, now:()=>Date.parse('2026-11-18'),
      resolveSession:()=>({userId,role:'admin',sessionExpiresAt:'2026-11-19T00:00:00Z'}),
      withLock(fn){
        if(!options.acquire)throw Object.assign(Error('lock timed out'),{code:'LOCK_BUSY'});
        if(options.wait){const other=options.wait;options.wait=null;other();}
        try{return fn();}finally{releases++;}
      },
      flushWrites(){
        flushed++;
        if((options.fault==='flush'&&flushed===2)||(options.fault==='no-write'&&flushed===1))throw Error('flush failed');
        visible=structuredClone(local);
      },
    });
    return (kind,body={})=>service.handle(action[kind],{target,...body});
  }
  const a=context('a'),b=context('b');
  function prepared(call,date,index=0,fields={},kind='create'){
    const unit=catalog.units[index];
    const [week]=buildEnglishMissionWeeks(date,[{materialGrade:unit.grade,startKey:unit.key,endKey:unit.key}]);
    const request={mode:kind,operationId:randomUUID(),weeks:[{...week,...fields}]};
    const preview=call('preview',request);
    assert.equal(preview.result,'success');
    return {...request,confirmationToken:preview.confirmationToken,expectedRevision:preview.revision,duplicatesAcknowledged:true};
  }
  const seed=()=>{
    const request=prepared(a,'2026-11-05');
    assert.equal(a('create',request).state,'COMMITTED');
    return b('list').records[0];
  };
  return {a,b,prepared,seed,options,writes:()=>writes,releases:()=>releases};
}
test('update queued behind an independent execution reads the new version and never writes',()=>{
  const h=fixture(),original=h.seed(),fields={missionId:original.missionId,expectedVersion:1};
  const a=h.prepared(h.a,original.startDate,1,fields,'update'),b=h.prepared(h.b,original.startDate,2,fields,'update');
  h.options.wait=()=>assert.equal(h.a('update',a).state,'COMMITTED');
  assert.equal(h.b('update',b).code,'VERSION_CONFLICT');
  assert.equal(h.b('status',{operationId:b.operationId}).state,'NOT_FOUND');
  const [current]=h.b('list').records;
  assert.equal(current.version,2);assert.equal(current.operationId,a.operationId);assert.equal(current.endDate,original.endDate);
  assert.equal(h.writes(),6);
});
test('lock timeout rejects before any write',()=>{
  const h=fixture(),request=h.prepared(h.a,'2026-11-05');
  const releases=h.releases();
  h.options.acquire=false;
  assert.equal(h.a('create',request).code,'LOCK_BUSY');
  assert.equal(h.writes(),0);assert.equal(h.releases(),releases);
});
test('confirmed result is visible to another execution after releasing the lock',()=>{
  const h=fixture(),request=h.prepared(h.a,'2026-11-05');
  assert.equal(h.a('create',request).state,'COMMITTED');
  assert.equal(h.b('status',{operationId:request.operationId}).state,'COMMITTED');
  assert.equal(h.b('list').records.length,1);
});
for(const fault of ['flush','read','mismatch','no-write']){
  test('failed or unobservable storage state remains safe: '+fault,()=>{
    const h=fixture(),request=h.prepared(h.a,'2026-11-05');
    const releases=h.releases();
    h.options.fault=fault;
    const response=h.a('create',request);
    assert.ok(['OUTCOME_UNKNOWN','OPERATION_ABORTED'].includes(response.code),JSON.stringify(response));
    assert.equal(h.releases(),releases+1);
    h.options.fault=null;
    const expected=['read','mismatch'].includes(fault)?'COMMITTED':['flush','no-write'].includes(fault)?'PREPARED':'NOT_FOUND';
    const status=h.b('status',{operationId:request.operationId});
    if(fault==='no-write')assert.ok(['ABORTED','NOT_FOUND','PREPARED'].includes(status.state));
    else assert.ok([expected,'ABORTED'].includes(status.state));
    if(status.state!=='COMMITTED')assert.equal(h.b('list').records.length,0);
  });
}
test('an edit queued behind deletion never revives the old mission',()=>{
  const h=fixture(),item=h.seed();
  const edit=h.prepared(h.b,item.startDate,1,{missionId:item.missionId,expectedVersion:1},'update');
  h.options.wait=()=>assert.equal(h.a('delete',{missionId:item.missionId,expectedVersion:1,operationId:randomUUID()}).state,'COMMITTED');
  assert.equal(h.b('update',edit).code,'MISSION_DELETED');
  assert.equal(h.b('list').records.length,0);
  assert.equal(h.b('status',{operationId:edit.operationId}).state,'NOT_FOUND');
});
