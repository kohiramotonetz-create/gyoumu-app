import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createEnglishMissionService } from '../src/server/englishMissionService.js';
import { handle as handleGas } from '../src/server/englishMissionGasEntry.js';
import { buildEnglishMissionWeeks, catalog } from '../src/utils/englishMissionPlanning.js';

const target = { scopeSchools: ['栗林'], attendingSchoolName: '合成中学校', targetGrade: '中３', subject: 'english' };
const firstDay = '2026-11-05';
const nextWeek = '2026-11-12';
const now = Date.parse('2026-11-05T00:00:00Z');
const actions = {
  preview: 'previewSukimakunEnglishMissionBatch',
  create: 'saveSukimakunEnglishMissionBatch',
  update: 'updateSukimakunEnglishMission',
  status: 'getSukimakunEnglishMissionOperation',
  recover: 'recoverSukimakunEnglishMissionOperation',
  list: 'getSukimakunEnglishMissions',
};
const hash = value => createHash('sha256').update(value).digest('hex');
const sign = value => createHmac('sha256', 'synthetic-test-only').update(value).digest('hex');
const encode = value => Buffer.from(value).toString('base64url');
const decode = value => Buffer.from(value, 'base64url').toString();
const bridge = readFileSync(new URL('../src/server/englishMissionGasBridge.gs', import.meta.url), 'utf8');

function weeks(start = firstDay, indexes = [0]) {
  return buildEnglishMissionWeeks(start, indexes.map(index => {
    const unit = catalog.units[index];
    return { materialGrade: unit.grade, startKey: unit.key, endKey: unit.key };
  }));
}

function fixture() {
  const actors = Object.fromEntries(['a', 'b'].map(userId => [
    userId, { userId, role: 'admin', assignedSchools: ['栗林'], sessionExpiresAt: '2027-01-01T00:00:00Z' },
  ]));
  const rows = [], operations = [], events = [];
  let pendingAbort;
  const options = { acquire: () => true, beforeAuth: () => {}, partial: false, fault: '', time: now };
  const store = {
    read() {
      events.push('read');
      if (pendingAbort && options.fault === 'read') throw Error('synthetic read failure');
      const visibleOperations = operations.filter(op => !(pendingAbort && options.fault === 'missing' && op.operationId === pendingAbort));
      return structuredClone({ rows, operations: visibleOperations });
    },
    begin: op => operations.push(structuredClone(op)),
    append(batch) {
      if (options.partial) {
        rows.push(...structuredClone(batch.slice(0, 2)));
        throw Error('synthetic partial write');
      }
      rows.push(...structuredClone(batch));
    },
    mark(id, state) {
      if (state === 'ABORTED') {
        if (options.partial) throw Error('synthetic abort failure');
        events.push('mark');
        pendingAbort = id;
      } else {
        operations.find(op => op.operationId === id).state = state;
      }
    },
  };
  const service = createEnglishMissionService({
    store, hash, sign, encode, decode, uuid: randomUUID, now: () => options.time, targetExists: () => true,
    resolveSession(token) {
      events.push('auth');
      options.beforeAuth();
      return actors[token] && structuredClone(actors[token]);
    },
    withLock(callback) {
      events.push('acquire');
      if (!options.acquire()) throw Object.assign(Error('busy'), { code: 'LOCK_BUSY' });
      try { return callback(); } finally { events.push('release'); }
    },
    flushRecovery() {
      events.push('flush');
      if (options.fault === 'flush') throw Error('synthetic flush failure');
      if (options.fault !== 'ignored') operations.find(op => op.operationId === pendingAbort).state = 'ABORTED';
    },
  });
  const call = (action, request = {}) => service.handle(actions[action], { sessionToken: 'a', target, ...request });
  const preview = (operationId, extra = {}) => {
    const request = { operationId, weeks: weeks(), ...extra };
    const result = call('preview', request);
    assert.equal(result.result, 'success');
    return { ...request, confirmationToken: result.confirmationToken, expectedRevision: result.revision };
  };
  const partial = () => {
    const request = preview('partial', { weeks: weeks(firstDay, [0, 1, 2, 3]) });
    options.partial = true;
    assert.equal(call('create', request).code, 'OUTCOME_UNKNOWN');
    options.partial = false;
    assert.equal(rows.length, 2);
    assert.equal(call('list').records.length, 0);
    events.length = 0;
    return request;
  };
  return { actors, rows, operations, events, options, call, preview, partial };
}

test('two admins with one revision can both save nonoverlapping dates and unchanged unit warnings', () => {
  const h = fixture();
  const a = h.preview('first');
  const b = h.preview('second', { sessionToken: 'b', weeks: weeks(nextWeek, [1]) });
  assert.equal(a.expectedRevision, b.expectedRevision);
  assert.equal(h.call('create', a).state, 'COMMITTED');
  assert.equal(h.call('create', b).state, 'COMMITTED');
  assert.deepEqual(h.call('list').records.map(row => row.operationId), ['first', 'second']);
});

test('the last day still conflicts after a competing save', () => {
  const h = fixture();
  const a = h.preview('first');
  const b = h.preview('second', { sessionToken: 'b', weeks: weeks('2026-11-11', [1]) });
  assert.equal(h.call('create', a).state, 'COMMITTED');
  assert.equal(h.call('create', b).code, 'PERIOD_CONFLICT');
  assert.equal(h.rows.length, 1);
});

test('a new duplicate requires a new preview and explicit acknowledgement', () => {
  const h = fixture();
  const a = h.preview('first');
  const b = h.preview('second', { sessionToken: 'b', weeks: weeks(nextWeek) });
  assert.equal(h.call('create', a).state, 'COMMITTED');
  assert.equal(h.call('create', { ...b, duplicatesAcknowledged: true }).code, 'STALE_REVISION');
  const renewed = h.preview('second', { sessionToken: 'b', weeks: b.weeks });
  assert.equal(h.call('create', renewed).code, 'DUPLICATE_CONFIRMATION_REQUIRED');
  assert.equal(h.call('create', { ...renewed, duplicatesAcknowledged: true }).state, 'COMMITTED');
});

test('same revision checks reject an altered revision and stale pre-upgrade proofs', () => {
  const h = fixture();
  const a = h.preview('first');
  const b = h.preview('second', { sessionToken: 'b', weeks: weeks(nextWeek, [1]) });
  const claims = JSON.parse(decode(b.confirmationToken.split('.')[0]));
  delete claims.duplicateKeys;
  const legacy = JSON.stringify(claims);
  assert.equal(h.call('create', a).state, 'COMMITTED');
  assert.equal(h.call('create', { ...b, expectedRevision: 1 }).code, 'STALE_REVISION');
  assert.equal(h.call('create', { ...b, confirmationToken: encode(legacy) + '.' + sign(legacy) }).code, 'STALE_REVISION');
});

test('an unrelated intervening save does not relax the revision requirement for editing', () => {
  const h = fixture();
  const [item] = h.call('create', h.preview('first')).records;
  const edit = h.preview('edit', {
    mode: 'update',
    weeks: [{ ...weeks(firstDay, [2])[0], missionId: item.missionId, expectedVersion: item.version }],
  });
  assert.equal(h.call('create', h.preview('second', { weeks: weeks(nextWeek, [1]) })).state, 'COMMITTED');
  assert.equal(h.call('update', edit).code, 'STALE_REVISION');
  assert.equal(h.call('list').records[0].version, item.version);
});

for (const [label, afterWait, code] of [
  ['role revoked', h => { h.actors.a.role = 'general'; }, 'AUTHORIZATION_ERROR'],
  ['session invalidated', h => { delete h.actors.a; }, 'AUTHENTICATION_ERROR'],
  ['assigned campus removed after demotion', h => { h.actors.a.role = 'general'; h.actors.a.assignedSchools = ['番町']; }, 'AUTHORIZATION_ERROR'],
  ['auth lookup throws', h => { h.options.beforeAuth = () => { throw Error('synthetic auth exception'); }; }, 'VALIDATION_ERROR'],
]) {
  test('recovery fails closed after lock wait when ' + label, () => {
    const h = fixture();
    const { operationId } = h.partial();
    h.options.acquire = () => { afterWait(h); return true; };
    assert.equal(h.call('recover', { operationId }).code, code);
    assert.equal(h.operations[0].state, 'PREPARED');
    assert.equal(h.rows.length, 2);
    assert.deepEqual(h.events, ['acquire', 'auth', 'release']);
  });
}

test('recovery rejects other groups, unauthorized roles and unauthenticated sessions', () => {
  const h = fixture();
  const { operationId } = h.partial();
  const wrong = { ...target, attendingSchoolName: '別の合成中学校' };
  assert.equal(h.call('recover', { target: wrong, operationId }).code, 'AUTHORIZATION_ERROR');
  for (const role of ['teacher', 'student', 'head-teacher', 'general']) {
    h.actors.b.role = role;
    assert.equal(h.call('recover', { sessionToken: 'b', operationId }).code, 'AUTHORIZATION_ERROR');
  }
  assert.equal(h.call('recover', { sessionToken: 'invalid', operationId }).code, 'AUTHENTICATION_ERROR');
  assert.equal(h.operations[0].state, 'PREPARED');
  assert.ok(!h.events.includes('mark'));
});

test('recovery lock timeout leaves data untouched and does not release an unowned lock', () => {
  const h = fixture();
  const { operationId } = h.partial();
  h.options.acquire = () => false;
  assert.equal(h.call('recover', { operationId }).code, 'LOCK_BUSY');
  assert.equal(h.operations[0].state, 'PREPARED');
  assert.deepEqual(h.events, ['acquire']);
});

test('recovery flushes and reads back before release, then permits a fresh batch', () => {
  const h = fixture();
  const request = h.partial();
  assert.equal(h.call('recover', request).state, 'ABORTED');
  assert.deepEqual(h.events, ['acquire', 'auth', 'read', 'mark', 'flush', 'read', 'release']);
  assert.equal(h.call('status', request).state, 'ABORTED');
  assert.equal(h.call('create', request).code, 'OPERATION_ABORTED');
  const fresh = h.preview('replacement', { weeks: request.weeks });
  assert.equal(h.call('create', fresh).state, 'COMMITTED');
  assert.equal(h.call('list').records.length, 4);
});

for (const [fault, status] of [['ignored', 'PREPARED'], ['flush', 'PREPARED'], ['read', 'ABORTED'], ['missing', 'ABORTED']]) {
  test('recovery reports unknown outcome on ' + fault, () => {
    const h = fixture();
    const request = h.partial();
    h.options.fault = fault;
    const result = h.call('recover', request);
    assert.equal(result.code, 'OUTCOME_UNKNOWN');
    assert.equal(result.operationId, request.operationId);
    assert.equal(result.state, undefined);
    assert.equal(h.events.at(-1), 'release');
    h.options.fault = '';
    assert.equal(h.call('status', request).state, status);
    assert.equal(h.call('create', request).code, status === 'PREPARED' ? 'OUTCOME_UNKNOWN' : 'OPERATION_ABORTED');
    assert.equal(h.call('list').records.length, 0);
    assert.equal(h.rows.length, 2);
  });
}

test('GAS bridge passes SpreadsheetApp.flush through the adapter before lock release', () => {
  const events = [];
  const headers = ['operationId', 'actorIdJson', 'groupId', 'mode', 'requestHash', 'baseRevision', 'commitRevision', 'recordCount', 'recordsDigest', 'createdAt', 'updatedAt', 'state'];
  const versions = ['operationId', 'missionId', 'version', 'groupId', 'ordinal', 'recordJson', 'recordHash'];
  const groupId = 'g-' + hash(JSON.stringify([1, target.scopeSchools, target.attendingSchoolName, target.targetGrade, target.subject]));
  const row = ['prep', '"a"', groupId, 'create', '', 0, 1, 4, '', '', '', 'PREPARED'];
  let queued;
  const book = { getSheetByName: name => {
    const journal = name === '英語ミッション操作';
    const fields = journal ? headers : versions;
    return {
      getLastColumn: () => fields.length,
      getRange: (r, c) => ({ getValues: () => [fields], setValue: value => {
        if (r === 2 && c === 12) { events.push('mark'); queued = value; }
      } }),
      getDataRange: () => ({ getValues: () => {
        if (journal) events.push('read');
        return journal ? [headers, [...row]] : [versions];
      } }),
    };
  } };
  const env = {
    request: { action: actions.recover, operationId: 'prep', sessionToken: 'a', target },
    openSpreadsheetByProperty: key => { assert.equal(key, 'SUKIMAKUN_ENGLISH_STORAGE_SPREADSHEET_ID'); return book; },
    SpreadsheetApp: { flush: () => { events.push('flush'); row[11] = queued; } },
    PropertiesService: { getScriptProperties: () => ({}) },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' }, computeDigest: (_, value) => [...Buffer.from(hash(value), 'hex')] },
    ACCOUNT_MIGRATION_SCHOOLS: ['栗林'],
    requirePrivilegedStaffSession_: () => ({ userId: 'a', role: 'admin', sessionExpiresAt: '2027-01-01T00:00:00Z' }),
    resolveTeacherHomeAssignedSchools_: () => ['栗林'],
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => events.push('release') }) },
    SukimakunEnglishMissions: { handle: handleGas },
  };
  const result = runInNewContext(bridge + '\nhandleSukimakunEnglishMissionAction_(request);', env);
  assert.equal(result.state, 'ABORTED');
  assert.deepEqual(events, ['read', 'read', 'mark', 'flush', 'read', 'release']);
});
