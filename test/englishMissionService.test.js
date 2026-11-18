import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnglishMissionMemoryBackend } from '../src/server/englishMissionMemoryBackend.js';
import { buildEnglishMissionWeeks, catalog, newEnglishMissionWeek } from '../src/utils/englishMissionPlanning.js';
import { ALL_SCHOOLS } from '../src/constants/organization.js';
const actions = { list: 'getSukimakunEnglishMissions', preview: 'previewSukimakunEnglishMissionBatch', create: 'saveSukimakunEnglishMissionBatch', update: 'updateSukimakunEnglishMission', remove: 'deleteSukimakunEnglishMission', status: 'getSukimakunEnglishMissionOperation', recover: 'recoverSukimakunEnglishMissionOperation' };
const target = { scopeSchools: ['栗林'], attendingSchoolName: '合成中学校', targetGrade: '中３', subject: 'english' };
const copy = value => structuredClone(value);
const draft = (grade = '中１', index = 0, last = index) => { const units = catalog.units.filter(u => u.grade === grade); return { ...newEnglishMissionWeek(), materialGrade: grade, startKey: units[index].key, endKey: units[last].key }; };
const weeks = (n = 1, date = '2026-11-05') => buildEnglishMissionWeeks(date, Array.from({ length: n }, (_, i) => draft('中１', i)));
function harness(options = {}) {
  const actor = { userId: '099001', role: 'admin', assignedSchools: ['栗林'], sessionExpiresAt: '2027-01-01T00:00:00Z' };
  let time = Date.parse('2026-11-05T00:00:00Z'); let valid = true; let exists = true;
  const backend = createEnglishMissionMemoryBackend({ resolveSession: token => token === 'synthetic-only' && valid ? actor : null, targetExists: () => exists, now: () => time, ...options });
  let serial = 0;
  const call = (action, payload = {}) => backend.handle(actions[action], { sessionToken: 'synthetic-only', target, ...payload });
  const prepared = (payload = {}) => { const request = { target, mode: 'create', operationId: 'operation-' + ++serial, weeks: weeks(), ...payload }; const result = call('preview', request); return { request: { ...request, confirmationToken: result.confirmationToken, expectedRevision: result.revision }, result }; };
  const save = (payload = {}, ack = true) => { const { request, result } = prepared(payload); assert.equal(result.result, 'success', JSON.stringify(result)); return call(request.mode === 'update' ? 'update' : 'create', { ...request, duplicatesAcknowledged: ack }); };
  return { actor, backend, call, prepared, save, advance: ms => { time += ms; }, revoke: () => { valid = false; }, missingTarget: () => { exists = false; } };
}
for (const role of ['admin', 'general', 'head-teacher']) test(`server authorization and four-week save: ${role}`, () => { const h = harness(); h.actor.role = role; const saved = h.save({ weeks: weeks(4) }); assert.equal(saved.result, 'success'); assert.equal(saved.records.length, 4); assert.equal(new Set(saved.records.map(r => r.batchId)).size, 1); assert.equal(h.call('list').records.length, 4); });
for (const role of ['teacher', 'student']) for (const action of ['list','preview','create','update','status']) test(`server denies ${role} ${action} despite client role spoof`, () => { const h = harness(); h.actor.role = role; assert.equal(h.call(action, { role: 'admin', weeks: weeks(), operationId: 'spoof' }).code, 'AUTHORIZATION_ERROR'); assert.equal(h.backend.snapshot().rows.length, 0); });
for (const token of [undefined, '', 'invalid', 'expired']) test(`missing/invalid session refused: ${String(token)}`, () => { const h = harness(); assert.equal(h.call('list', { sessionToken: token }).code, 'AUTHENTICATION_ERROR'); });
test('admin with no assignments can use formal all-campus target', () => { const h = harness(); h.actor.assignedSchools = []; assert.equal(h.save({ target: { ...target, scopeSchools: ALL_SCHOOLS } }).result, 'success'); });
for (const role of ['general','head-teacher']) test(`${role} cannot list/save/update another campus`, () => { const h = harness(); const saved = h.save({ target: { ...target, scopeSchools: ['番町'] } }); h.actor.role = role; for (const action of ['list','preview','create','update']) assert.equal(h.call(action, { target: saved.records[0].target, weeks: [{ ...saved.records[0], expectedVersion: 1 }], operationId: 'forbidden', mode: 'update' }).code, 'AUTHORIZATION_ERROR'); });
test('nonexistent campus and nonexistent current group refused', () => { const h = harness(); assert.equal(h.call('list', { target: { ...target, scopeSchools: ['存在しない'] } }).code, 'AUTHORIZATION_ERROR'); h.missingTarget(); assert.equal(h.prepared().result.code, 'TARGET_NOT_FOUND'); });
test('canonical scope identity stable across order and duplicates', () => { const h = harness(); const saved = h.save({ target: { ...target, scopeSchools: ['番町','栗林','栗林'] } }); const list = h.call('list', { target: { ...target, scopeSchools: ['栗林','番町'] } }); assert.equal(list.records[0].missionId, saved.records[0].missionId); });
test('assignment changes neither expand saved scope nor leak unauthorized related scope', () => { const h = harness(); h.save(); h.actor.assignedSchools = ['栗林','番町']; h.actor.role = 'general'; const broader = { ...target, scopeSchools: ['栗林','番町'] }; const r = h.call('list', { target: broader, includeAccessibleScopes: true }); assert.equal(r.records.length, 0); assert.deepEqual(r.relatedRecords[0].target.scopeSchools, ['栗林']); h.actor.assignedSchools = ['番町']; assert.equal(h.call('list', { target: { ...target, scopeSchools: ['番町'] }, includeAccessibleScopes: true }).relatedRecords.length, 0); });
for (const [label, date, expected] of [['standard','2026-11-05','2026-11-11'],['month-end','2026-04-28','2026-05-04'],['year-end','2026-12-29','2027-01-04'],['leap','2028-02-26','2028-03-03']]) test(`server seven calendar days ${label}`, () => { const h = harness(); const saved = h.save({ weeks: weeks(1,date) }); assert.equal(saved.records[0].endDate, expected); });
test('four weeks use consecutive dates but independently chosen grades/units', () => { const h = harness(); const input = buildEnglishMissionWeeks('2026-11-05',[draft('中１',10),draft('中３',0),draft('中２',9),draft('中１',1)]); const saved = h.save({ weeks: input }); assert.equal(saved.records[1].startDate,'2026-11-12'); assert.equal(saved.records[3].endDate,'2026-12-02'); assert.deepEqual(saved.records.map(r=>r.materials[0].materialGrade),['中１','中３','中２','中１']); });
for (const date of ['2026-11-05','2026-11-08','2026-11-11','2026-10-30']) test(`inclusive period overlap rejected: ${date}`, () => { const h = harness(); h.save(); const p = h.prepared({ weeks: weeks(1,date) }); assert.equal(p.result.canSave,false); assert.equal(h.call('create', { ...p.request, duplicatesAcknowledged: true }).code,'PERIOD_CONFLICT'); assert.equal(h.call('list').records.length,1); });
test('adjacent periods accepted with unit reuse acknowledged', () => { const h = harness(); h.save(); assert.equal(h.save({ weeks: weeks(1,'2026-11-12') }).result,'success'); });
test('one conflict in four aborts whole batch without even journal write', () => { const h = harness(); h.save({ weeks: weeks(1,'2026-11-19') }); const before = h.backend.snapshot(); const p = h.prepared({ weeks: weeks(4) }); assert.equal(h.call('create',p.request).code,'PERIOD_CONFLICT'); assert.deepEqual(h.backend.snapshot(),before); });
for (const change of [{ attendingSchoolName:'別中学校' },{ targetGrade:'中２' },{ scopeSchools:['栗林','番町'] }]) test(`different exact target may share dates: ${JSON.stringify(change)}`, () => { const h=harness(); h.save(); const p=h.prepared({target:{...target,...change}}); assert.equal(p.result.duplicates.length,0); assert.equal(h.call('create',p.request).result,'success'); });
for (const indices of [[0,1,0,1],[0,0,0,0]]) test(`repeated units preserved after explicit acknowledgment ${indices}`, () => { const h=harness(); const input=buildEnglishMissionWeeks('2026-11-05',indices.map(i=>draft('中１',i))); const p=h.prepared({weeks:input}); assert.ok(p.result.duplicates.length); assert.equal(h.call('create',p.request).code,'DUPLICATE_CONFIRMATION_REQUIRED'); assert.equal(h.call('create',{...p.request,duplicatesAcknowledged:'true'}).code,'DUPLICATE_CONFIRMATION_REQUIRED'); const saved=h.call('create',{...p.request,duplicatesAcknowledged:true}); assert.deepEqual(saved.records.map(r=>r.materials[0].unitKeys),input.map(r=>r.materials[0].unitKeys)); });
test('partial range overlap detected while CSV keys including trailing spaces retained', () => { const h=harness(); const units=catalog.units.filter(u=>u.grade==='中１'); const input=buildEnglishMissionWeeks('2026-11-05',[draft('中１',0,3),draft('中１',2,5)]); const p=h.prepared({weeks:input}); assert.equal(p.result.duplicates.length,2); assert.equal(h.call('create',{...p.request,duplicatesAcknowledged:true}).records[0].materials[0].unitKeys.length,4); const trailing=catalog.units.find(u=>u.key.endsWith(' ')); const saved=h.save({weeks:buildEnglishMissionWeeks('2026-12-10',[draft('中１',units.indexOf(trailing))])}); assert.equal(saved.records[0].materials[0].unitKeys[0],trailing.key); });
for (const mutation of [r=>{r.weeks[0].materials[0].unitKeys.push('missing');},r=>{r.weeks[0].materials[0].endUnitKey='missing';},r=>{r.weeks[0].endDate='2026-11-12';},r=>{r.weeks[0].catalogVersion='old';},r=>{r.weeks[0].weekNumber=99;},r=>{r.weeks[0].startDate='2026-02-30';}]) test(`malformed input rejected ${mutation.toString()}`, () => { const h=harness(); const request={weeks:weeks(),operationId:'invalid-input'}; mutation(request); assert.equal(h.call('preview',request).result,'error'); assert.equal(h.backend.snapshot().rows.length,0); });
test('range cannot reverse, cross grades or skip units',()=>{const h=harness(); for(const m of [ {startUnitKey:catalog.units[2].key,endUnitKey:catalog.units[0].key}, {endUnitKey:catalog.units[45].key} ]) { const input=weeks();Object.assign(input[0].materials[0],m);assert.equal(h.prepared({weeks:input}).result.result,'error'); }});
test('proof required even with boolean acknowledgment',()=>{const h=harness();const p=h.prepared();delete p.request.confirmationToken;assert.equal(h.call('create',{...p.request,duplicatesAcknowledged:true}).code,'CONFIRMATION_REQUIRED');});
for(const field of ['operationId','target','weeks','confirmationToken']) test(`proof binds ${field}`,()=>{const h=harness();const p=h.prepared();const r=copy(p.request);if(field==='operationId')r.operationId='changed';if(field==='target')r.target={...target,attendingSchoolName:'別中学校'};if(field==='weeks')r.weeks=weeks(1,'2026-11-12');if(field==='confirmationToken')r.confirmationToken+='x';assert.equal(h.call('create',r).code,'CONFIRMATION_INVALID');assert.equal(h.backend.snapshot().rows.length,0);});
test('proof expires and actor/role cannot be changed',()=>{const h=harness();const p=h.prepared();h.actor.userId='099002';assert.equal(h.call('create',p.request).code,'CONFIRMATION_INVALID');h.actor.userId='099001';h.actor.role='general';assert.equal(h.call('create',p.request).code,'CONFIRMATION_INVALID');h.actor.role='admin';h.advance(300001);assert.equal(h.call('create',p.request).code,'CONFIRMATION_EXPIRED');});
test('revoked session cannot save a preview',()=>{const h=harness();const p=h.prepared();h.revoke();assert.equal(h.call('create',p.request).code,'AUTHENTICATION_ERROR');});
test('two previews cannot race past latest revision',()=>{const h=harness();const a=h.prepared();const b=h.prepared({weeks:weeks(1,'2026-11-12')});assert.equal(h.call('create',a.request).result,'success');assert.equal(h.call('create',{...b.request,duplicatesAcknowledged:true}).code,'STALE_REVISION');assert.equal(h.call('list').records.length,1);});
test('same operation retry after lost response returns exact same IDs without second write',()=>{const h=harness();const p=h.prepared({weeks:weeks(4)});const a=h.call('create',p.request);const snap=h.backend.snapshot();h.advance(360000);const b=h.call('create',p.request);assert.deepEqual(b,a);assert.deepEqual(h.backend.snapshot(),snap);assert.equal(h.call('status',{operationId:p.request.operationId}).state,'COMMITTED');});
test('operation ID cannot be reused with changed content or another actor',()=>{const h=harness();const p=h.prepared();h.call('create',p.request);assert.equal(h.call('create',{...p.request,weeks:weeks(1,'2026-11-12')}).code,'IDEMPOTENCY_CONFLICT');h.actor.userId='099002';assert.equal(h.call('create',p.request).code,'IDEMPOTENCY_CONFLICT');});
test('update increments version, keeps ID/audit/period, excludes itself from duplicates',()=>{const h=harness();const saved=h.save().records[0];const edited={...saved,expectedVersion:saved.version};const p=h.prepared({mode:'update',weeks:[edited]});assert.equal(p.result.duplicates.length,0);const updated=h.call('update',p.request);assert.equal(updated.records[0].missionId,saved.missionId);assert.equal(updated.records[0].version,2);assert.equal(updated.records[0].createdAt,saved.createdAt);assert.deepEqual(h.call('update',p.request),updated);assert.equal(h.call('list').records[0].version,2);});
test('update changes units but requires reuse acknowledgment against another week',()=>{const h=harness();const saved=h.save({weeks:weeks(2)}).records;const edited={...saved[1],materials:saved[0].materials,expectedVersion:1};const p=h.prepared({mode:'update',weeks:[edited]});assert.equal(p.result.duplicates.length,1);assert.equal(h.call('update',p.request).code,'DUPLICATE_CONFIRMATION_REQUIRED');assert.equal(h.call('update',{...p.request,duplicatesAcknowledged:true}).result,'success');assert.equal(h.call('list').records.length,2);});
test('stale version does not overwrite earlier manager update',()=>{const h=harness();const saved=h.save().records[0];const payload={mode:'update',weeks:[{...saved,expectedVersion:1}]};assert.equal(h.save(payload).result,'success');assert.equal(h.prepared(payload).result.code,'VERSION_CONFLICT');});
test('update cannot change period, week number or target through another mission ID',()=>{const h=harness();const saved=h.save().records[0];for(const mutation of [{startDate:'2026-11-06',endDate:'2026-11-12'},{weekNumber:2}])assert.equal(h.prepared({mode:'update',weeks:[{...saved,expectedVersion:1,...mutation}]}).result.code,'IMMUTABLE_PERIOD');assert.equal(h.prepared({target:{...target,attendingSchoolName:'別中学校'},mode:'update',weeks:[{...saved,expectedVersion:1}]}).result.code,'AUTHORIZATION_ERROR');});
for(const stage of ['before-begin','after-begin','before-append','after-row','after-append','before-mark-COMMITTED'])test(`failure ${stage} exposes none of batch; safe retry uses fresh operation`,()=>{let armed=false,once=true;const h=harness({onWrite:s=>{if(armed&&once&&s===stage){once=false;throw Error('synthetic');}}});const p=h.prepared({weeks:weeks(4)});armed=true;const failed=h.call('create',p.request);assert.equal(failed.code,'OPERATION_ABORTED');assert.equal(h.call('list').records.length,0);assert.equal(h.save({weeks:weeks(4)}).records.length,4);});
test('failure after committed marker returns observed success rather than aborting valid data',()=>{let once=true;const h=harness({onWrite:s=>{if(s==='after-mark-COMMITTED'&&once){once=false;throw Error('response lost');}}});assert.equal(h.save({weeks:weeks(4)}).records.length,4);assert.equal(h.call('list').records.length,4);});
test('failed abort remains invisible; pending blocks writes; admin recovery aborts journal only',()=>{let broken=true;const h=harness({onWrite:s=>{if(broken&&['after-row','before-mark-ABORTED'].includes(s))throw Error('synthetic');}});const p=h.prepared({weeks:weeks(4)});assert.equal(h.call('create',p.request).code,'OUTCOME_UNKNOWN');assert.equal(h.call('status',{operationId:p.request.operationId}).state,'PREPARED');assert.equal(h.call('list').records.length,0);assert.equal(h.save({weeks:weeks(4)}).code,'RECOVERY_REQUIRED');h.actor.role='general';assert.equal(h.call('recover',{operationId:p.request.operationId}).code,'AUTHORIZATION_ERROR');h.actor.role='admin';broken=false;assert.equal(h.call('recover',{operationId:p.request.operationId}).state,'ABORTED');assert.equal(h.save({weeks:weeks(4)}).result,'success');});
test('reentrant lock refuses concurrent write rather than interleaving rows',()=>{let h,other,armed=false;h=harness({onWrite:s=>{if(armed&&s==='before-begin'){armed=false;other=h.call('create',h.prepared().request);}}});const p=h.prepared();armed=true;assert.equal(h.call('create',p.request).result,'success');assert.equal(other.code,'LOCK_BUSY');});

test('committed operation remains idempotent if current target population changes',()=>{const h=harness();const p=h.prepared();const first=h.call('create',p.request);h.missingTarget();assert.deepEqual(h.call('create',p.request),first);assert.equal(h.prepared().result.code,'TARGET_NOT_FOUND');});

const removal = (record, operationId = 'remove-week') => ({
  target: record.target, missionId: record.missionId, expectedVersion: record.version, operationId,
});

for (const [count, index] of [[1, 0], [4, 0], [4, 2], [4, 3]]) {
  test(`delete week ${index + 1} of ${count} without changing siblings or original operation`, () => {
    const h = harness();
    const batch = h.save({ weeks: weeks(count) });
    const record = batch.records[index];
    const before = h.backend.snapshot();
    const result = h.call('remove', removal(record));
    assert.equal(result.state, 'COMMITTED');
    const [deleted] = result.records;
    assert.equal(deleted.status, 'DELETED');
    assert.equal(deleted.deletedBy, h.actor.userId);
    assert.equal(deleted.deletedAt, deleted.updatedAt);
    assert.equal(deleted.version, record.version + 1);
    for (const key of ['missionId', 'batchId', 'createdAt', 'createdBy', 'weekNumber', 'startDate', 'endDate']) {
      assert.equal(deleted[key], record[key]);
    }
    assert.deepEqual(h.call('list').records, batch.records.filter(item => item !== record));
    assert.deepEqual(h.call('status', { operationId: batch.operationId }), batch);
    const after = h.backend.snapshot();
    assert.deepEqual(after.operations.slice(0, 1), before.operations);
    assert.deepEqual(after.rows.slice(0, count), before.rows);
  });
}

test('all four weeks can be deleted individually', () => {
  const h = harness();
  const { records } = h.save({ weeks: weeks(4) });
  for (const [i, record] of records.entries()) {
    assert.equal(h.call('remove', removal(record, 'remove-' + i)).state, 'COMMITTED');
    assert.deepEqual(h.call('list').records, records.slice(i + 1));
  }
});

test('deleted period and units are reusable, while collisions with active weeks still refuse a new batch', () => {
  const h = harness();
  const { records } = h.save({ weeks: weeks(4) });
  h.call('remove', removal(records[2]));
  const reused = buildEnglishMissionWeeks(records[2].startDate, [draft('中１', 2)]);
  const candidate = h.prepared({ weeks: reused });
  assert.equal(candidate.result.canSave, true);
  assert.deepEqual(candidate.result.duplicates, []);
  assert.equal(h.prepared({ weeks: weeks(4, records[2].startDate) }).result.canSave, false);
  assert.notEqual(h.call('create', candidate.request).records[0].missionId, records[2].missionId);
  assert.equal(h.call('list').records.length, 4);
});

test('same deletion replays exactly; changed request or a second operation never re-deletes', () => {
  const h = harness();
  const batch = h.save({ weeks: weeks(4) });
  const request = removal(batch.records[2]);
  const result = h.call('remove', request);
  const after = h.backend.snapshot();
  assert.deepEqual(h.call('remove', request), result);
  assert.deepEqual(h.call('status', { operationId: request.operationId }), result);
  assert.equal(h.call('remove', { ...request, expectedVersion: 2 }).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(h.call('remove', { ...request, missionId: batch.records[0].missionId }).code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(h.call('remove', { ...request, operationId: 'another-delete' }).code, 'MISSION_DELETED');
  assert.deepEqual(h.backend.snapshot(), after);
});

test('edit and deletion enforce versions whichever reaches the write lock first', () => {
  const h = harness();
  const { records: [first, second] } = h.save({ weeks: weeks(2) });
  const update = record => ({ mode: 'update', weeks: [{ ...record, expectedVersion: 1 }] });
  const editFirst = h.save(update(first));
  assert.equal(editFirst.records[0].version, 2);
  assert.equal(h.call('remove', removal(first)).code, 'VERSION_CONFLICT');
  const editSecond = h.prepared(update(second)).request;
  assert.equal(h.call('remove', removal(second)).state, 'COMMITTED');
  assert.equal(h.call('update', editSecond).code, 'MISSION_DELETED');
});

test('overlapping requests for the same week are serialized by the write lock', () => {
  let h, request, other;
  h = harness({ onWrite: stage => {
    if (request && stage === 'before-begin') {
      const concurrent = request;
      request = null;
      other = h.call('remove', { ...concurrent, operationId: 'concurrent-delete' });
    }
  } });
  const record = h.save().records[0];
  request = removal(record);
  assert.equal(h.call('remove', request).state, 'COMMITTED');
  assert.equal(other.code, 'LOCK_BUSY');
  assert.equal(h.call('remove', removal(record, 'concurrent-delete')).code, 'MISSION_DELETED');
});

for (const role of ['admin','general','head-teacher','teacher','student']) {
  test(`week deletion authorization: ${role}`, () => {
    const h = harness();
    const record = h.save().records[0];
    h.actor.role = role;
    const result = h.call('remove', { ...removal(record), role: 'admin' });
    if (['admin','general','head-teacher'].includes(role)) assert.equal(result.state, 'COMMITTED');
    else {
      assert.equal(result.code, 'AUTHORIZATION_ERROR');
      assert.equal(h.backend.snapshot().operations.length, 1);
    }
  });
}

test('deletion refuses a different group or assigned scope, invalid session and malformed request', () => {
  const h = harness();
  const record = h.save().records[0], request = removal(record);
  const before = h.backend.snapshot();
  assert.equal(h.call('remove', { ...request, target: { ...target, attendingSchoolName: '別中学校' } }).code, 'AUTHORIZATION_ERROR');
  assert.equal(h.call('remove', { ...request, sessionToken: 'invalid' }).code, 'AUTHENTICATION_ERROR');
  assert.equal(h.call('remove', { ...request, expectedVersion: '1' }).code, 'VALIDATION_ERROR');
  h.actor.role = 'general'; h.actor.assignedSchools = ['番町'];
  assert.equal(h.call('remove', request).code, 'AUTHORIZATION_ERROR');
  assert.deepEqual(h.backend.snapshot(), before);
});

test('failure before marking a deletion committed leaves the original week visible', () => {
  let armed = false;
  const h = harness({ onWrite: stage => {
    if (armed && stage === 'before-mark-COMMITTED') throw Error('synthetic mark failure');
  } });
  const batch = h.save({ weeks: weeks(4) });
  armed = true;
  const request = removal(batch.records[2]);
  assert.equal(h.call('remove', request).code, 'OPERATION_ABORTED');
  assert.equal(h.call('status', request).state, 'ABORTED');
  assert.deepEqual(h.call('list').records, batch.records);
});

test('uncertain deletion commit is established through operation status, not a new write', () => {
  let armed = false;
  const h = harness({ onWrite: stage => {
    if (armed && stage === 'after-mark-COMMITTED') throw Error('synthetic uncertain marker');
  } });
  const record = h.save().records[0];
  armed = true;
  const request = removal(record);
  assert.equal(h.call('remove', request).code, 'OUTCOME_UNKNOWN');
  assert.equal(h.call('status', request).records[0].status, 'DELETED');
  assert.equal(h.call('list').records.length, 0);
  assert.equal(h.backend.snapshot().operations.length, 2);
});
