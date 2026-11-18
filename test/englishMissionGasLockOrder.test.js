import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handle} from '../src/server/englishMissionGasEntry.js';
import {ENGLISH_MISSION_SHEETS} from '../src/server/englishMissionSheetsStore.js';

const target={scopeSchools:['栗林'],attendingSchoolName:'架空中学校',targetGrade:'中１',subject:'english'};
function fixture({busy=false,failOpen=false,failAuth=false}={}){
 const events=[];
 let held=false;
 function inside(phase){assert.equal(held,true,phase);events.push(phase);}
 return {events, env:{
   openBook(){
     inside('open');
     if(failOpen)throw Error('book unavailable');
     return {getSheetByName(name){
       inside('sheet');
       const spec=Object.values(ENGLISH_MISSION_SHEETS).find(v=>v.name===name);
       return {getLastColumn(){inside('width');return spec.headers.length;},
         getRange(){inside('range');return {getValues(){inside('header');return [spec.headers];}};},
         getDataRange(){inside('dataRange');return {getValues(){inside('history');return [spec.headers];}};},
       };
     }};
   },
   withLock(callback){
     assert.equal(held,false,'lock must not be acquired recursively');
     events.push('lock.wait');
     if(busy)throw Object.assign(Error('busy'),{code:'LOCK_BUSY'});
     held=true;events.push('lock.acquired');
     try{return callback();}finally{held=false;events.push('lock.released');}
   },
   resolveSession(){inside('auth');
     return failAuth?null:{userId:'actor',role:'admin',sessionExpiresAt:'2099-01-01T00:00:00Z',
       userContexts:[{school:'栗林',attendingSchoolName:'架空中学校',grade:'中１',role:'student',enabled:true}]};},
   properties:{getProperty:()=>null},
   utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(_,text)=>[...createHash('sha256').update(text).digest()]},
 }};
}
const req={action:'getSukimakunEnglishMissions',sessionToken:'session',target};
test('GAS request opens and reads the book only after acquiring exactly one lock',()=>{
 const {env,events}=fixture();
 const result=handle(req,env);
 assert.equal(result.result,'success');assert.deepEqual(result.records,[]);
 assert.deepEqual(events.slice(0,4),['lock.wait','lock.acquired','open','auth']);
 assert.equal(events.filter(v=>v==='history').length,2);
 assert.equal(events.at(-1),'lock.released');
});
test('GAS lock timeout does not open the book or resolve the session',()=>{
 const {env,events}=fixture({busy:true});
 const result=handle({...req,action:'saveSukimakunEnglishMissionBatch'},env);
 assert.equal(result.code,'LOCK_BUSY');
 assert.deepEqual(events,['lock.wait']);
});
test('GAS open failure releases its lock before returning an integrity error',()=>{
 const {env,events}=fixture({failOpen:true});
 assert.equal(handle(req,env).code,'STORAGE_INTEGRITY_ERROR');
 assert.deepEqual(events,['lock.wait','lock.acquired','open','lock.released']);
});
test('GAS resolves current authorization under the lock before reading either history',()=>{
 const {env,events}=fixture({failAuth:true});
 assert.equal(handle({...req,action:'recoverSukimakunEnglishMissionOperation',operationId:'one'},env).code,'AUTHENTICATION_ERROR');
 assert.deepEqual(events,['lock.wait','lock.acquired','open','auth','lock.released']);
});
