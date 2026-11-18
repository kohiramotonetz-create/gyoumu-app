import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createGasService } from '../src/server/englishMissionGasEntry.js';
import { createEnglishMissionSheetsStore, ENGLISH_MISSION_SHEETS } from '../src/server/englishMissionSheetsStore.js';
import { buildEnglishMissionWeeks, catalog, newEnglishMissionWeek } from '../src/utils/englishMissionPlanning.js';
function bookFixture(){
 const sheets=new Map();let fault=()=>{};
 function sheet(name){const cells=[],formats=[];return {name,cells,formats,getName:()=>name,getMaxRows:()=>1000,getLastRow:()=>{let n=cells.length;while(n&&!cells[n-1]?.some(v=>v!==''&&v!==undefined))n--;return n;},getLastColumn:()=>Math.max(0,...cells.map(r=>r.length)),getRange(r,c,n=1,m=1){const read=()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>cells[r+i-1]?.[c+j-1]??''));const write=values=>{fault(name,r,c,n,m,values);values.forEach((row,i)=>row.forEach((v,j)=>{(cells[r+i-1]??=[])[c+j-1]=v;}));};return{getValues:read,setValues:write,setValue:v=>write([[v]]),setNumberFormat:f=>{for(let i=0;i<n;i++)for(let j=0;j<m;j++)(formats[r+i-1]??=[])[c+j-1]=f;}};},getDataRange(){return this.getRange(1,1,Math.max(this.getLastRow(),1),Math.max(this.getLastColumn(),1));}};}
 return{getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=sheet(n);sheets.set(n,s);return s;},setFault:f=>{fault=f;},sheets};
}
const target={scopeSchools:['栗林'],attendingSchoolName:'合成中学校',targetGrade:'中３',subject:'english'};
const units=[0,1,0,1].map(i=>{const u=catalog.units[i];return{...newEnglishMissionWeek(),materialGrade:u.grade,startKey:u.key,endKey:u.key};});
const weeks=buildEnglishMissionWeeks('2026-11-05',units);
const utilities={DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,text)=>[...createHash('sha256').update(text).digest()],computeHmacSha256Signature:(text,key)=>[...createHmac('sha256',key).update(text).digest()],base64EncodeWebSafe:text=>Buffer.from(text).toString('base64url'),base64DecodeWebSafe:text=>Buffer.from(text,'base64url'),newBlob:bytes=>({getDataAsString:()=>Buffer.from(bytes).toString('utf8')}),getUuid:randomUUID};
function h(flush = () => {}){const book=bookFixture();let property='synthetic-proof-only';const service=createGasService({book,utilities,flush,properties:{getProperty:()=>property},resolveSession:()=>({userId:'000099',role:'admin',assignedSchools:[],sessionExpiresAt:'2027-01-01T00:00:00Z',userContexts:[{role:'student',enabled:true,school:'栗林',grade:'中３',attendingSchoolName:'合成中学校'}]}),withLock:fn=>fn(),now:()=>Date.parse('2026-11-05')});service.setup();const call=(action,p={})=>service.handle(action,{target,...p});const request={target,operationId:'native-adapter',weeks};const preview=call('previewSukimakunEnglishMissionBatch',request);const save=()=>call('saveSukimakunEnglishMissionBatch',{...request,confirmationToken:preview.confirmationToken,expectedRevision:preview.revision,duplicatesAcknowledged:true});return{book,call,save,unsetKey:()=>{property='';}};}
test('GAS Utilities adapter + actual Sheets store batch save/list/update/audit text',()=>{const x=h();const result=x.save();assert.equal(result.result,'success');assert.equal(result.records.length,4);assert.equal(result.storage,'gas');assert.equal(x.call('getSukimakunEnglishMissions').records.length,4);const operations=x.book.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name);assert.equal(operations.cells[1][1],'"000099"');assert.equal(operations.formats[1][1],'@');const edited={...result.records[0],expectedVersion:1};const r={target,operationId:'native-update',weeks:[edited],mode:'update'};const p=x.call('previewSukimakunEnglishMissionBatch',r);assert.equal(x.call('updateSukimakunEnglishMission',{...r,confirmationToken:p.confirmationToken,expectedRevision:p.revision,duplicatesAcknowledged:true}).records[0].version,2);});
test('setup touches only dedicated sheets and requires exact headers',()=>{const x=bookFixture();const store=createEnglishMissionSheetsStore(x);store.setup();assert.deepEqual([...x.sheets.keys()],Object.values(ENGLISH_MISSION_SHEETS).map(s=>s.name));x.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name).cells[0][0]='wrong';assert.throws(()=>store.read(),{code:'STORAGE_INTEGRITY_ERROR'});});
test('missing proof key fails closed',()=>{const x=h();x.unsetKey();assert.equal(x.save().code,'SETUP_REQUIRED');assert.equal(x.book.getSheetByName(ENGLISH_MISSION_SHEETS.versions.name).getLastRow(),1);});
test('partial setValues never exposes a subset of weeks',()=>{const x=h();let once=true;x.book.setFault((name,r,c,n,m,values)=>{if(name===ENGLISH_MISSION_SHEETS.versions.name&&r===2&&once){once=false;x.book.getSheetByName(name).cells[1]=values[0];throw Error('synthetic mid-write');}});assert.equal(x.save().code,'OPERATION_ABORTED');assert.equal(x.call('getSukimakunEnglishMissions').records.length,0);assert.equal(x.book.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name).cells[1][11],'ABORTED');});
test('state-cell failure leaves whole batch invisible and abortable',()=>{const x=h();x.book.setFault((name,r,c,n,m,v)=>{if(c===12&&v[0][0]==='COMMITTED')throw Error('synthetic');});assert.equal(x.save().code,'OPERATION_ABORTED');assert.equal(x.call('getSukimakunEnglishMissions').records.length,0);});
test('committed row corruption fails closed, never displays partial cards',()=>{const x=h();x.save();x.book.getSheetByName(ENGLISH_MISSION_SHEETS.versions.name).cells[2][5]='{}';assert.equal(x.call('getSukimakunEnglishMissions').code,'STORAGE_INTEGRITY_ERROR');});
test('blank physical journal rows cannot redirect state marker to another operation',()=>{const book=bookFixture(),store=createEnglishMissionSheetsStore(book);store.setup();const op={operationId:'row-three',actorId:'000099',groupId:'g',mode:'create',requestHash:'h',baseRevision:0,commitRevision:1,recordCount:1,recordsDigest:'h',createdAt:'x',updatedAt:'x'};book.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name).cells[1]=Array(12).fill('');store.begin(op);store.mark('row-three','ABORTED','y');assert.equal(book.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name).cells[1][11],'ABORTED');});

test('malformed uncommitted payload is aborted without hiding older committed missions',()=>{const x=h();let once=true;x.book.setFault((name,r,c,n,m,values)=>{if(name===ENGLISH_MISSION_SHEETS.versions.name&&r===2&&once){once=false;x.book.getSheetByName(name).cells[1]=[values[0][0],values[0][1],1,values[0][3],0,'{broken',values[0][6]];throw Error('partial cell values');}});assert.equal(x.save().code,'OPERATION_ABORTED');assert.equal(x.call('getSukimakunEnglishMissions').records.length,0);});

const bridgeSource=readFileSync(new URL('../src/server/englishMissionGasBridge.gs',import.meta.url),'utf8');
function bridgeFixture(acquire=true){let acquired=0,released=0,auth=0;const env={openSpreadsheetByProperty:key=>{assert.equal(key,'SUKIMAKUN_ENGLISH_STORAGE_SPREADSHEET_ID');assert.equal(acquired,1);assert.equal(released,0);return{};},PropertiesService:{getScriptProperties:()=>({})},Utilities:{},ACCOUNT_MIGRATION_SCHOOLS:['栗林'],requirePrivilegedStaffSession_:(token,contexts)=>{assert.equal(token,'synthetic');assert.equal(contexts,true);auth++;return{userId:'000099',role:'admin'};},resolveTeacherHomeAssignedSchools_:()=>['栗林'],LockService:{getDocumentLock:()=>null,getScriptLock:()=>({tryLock:()=>{acquired++;return acquire;},releaseLock:()=>{released++;}})},SukimakunEnglishMissions:{handle:(data,e)=>e.withLock(()=>{e.openBook();return e.resolveSession(data.sessionToken);})}};return{execute:()=>runInNewContext(bridgeSource+'\nhandleSukimakunEnglishMissionAction_({sessionToken:"synthetic"});',env),counts:()=>({acquired,released,auth})};}
test('Web App bridge works even where DocumentLock is null and releases its ScriptLock',()=>{const b=bridgeFixture();assert.equal(b.execute().role,'admin');assert.deepEqual(b.counts(),{acquired:1,released:1,auth:1});});
test('Web App bridge rejects contention without releasing an unowned lock',()=>{const b=bridgeFixture(false);assert.throws(b.execute,{code:'LOCK_BUSY'});assert.deepEqual(b.counts(),{acquired:1,released:0,auth:0});});

test('GAS adapter flushes the append-only deletion and reuses the existing sheet columns', () => {
  const flushedStates = [];
  const x = h(() => {
    flushedStates.push(x.book.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name).cells.at(-1)[11]);
  });
  const batch = x.save();
  const original = batch.records[2];
  const deletion = x.call('deleteSukimakunEnglishMission', { operationId: 'gas-delete-third', missionId: original.missionId, expectedVersion: original.version });
  assert.equal(deletion.state, 'COMMITTED');
  assert.deepEqual(flushedStates, ['PREPARED', 'COMMITTED', 'PREPARED', 'COMMITTED']);
  assert.equal(deletion.records[0].status, 'DELETED');
  assert.equal(deletion.records[0].version, 2);
  assert.equal(deletion.records[0].batchId, original.batchId);
  assert.equal(x.book.getSheetByName(ENGLISH_MISSION_SHEETS.versions.name).getLastColumn(), 7);
  assert.equal(x.book.getSheetByName(ENGLISH_MISSION_SHEETS.operations.name).getLastColumn(), 12);
  assert.deepEqual(x.call('getSukimakunEnglishMissionOperation', { operationId: batch.operationId }), batch);
  assert.deepEqual(x.call('getSukimakunEnglishMissions').records, [batch.records[0], batch.records[1], batch.records[3]]);
});
