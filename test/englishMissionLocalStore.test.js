import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { archiveLocalEnglishMissionData, createLocalEnglishMissionStore } from '../scripts/localEnglishMissionStore.mjs';
import { createEnglishMissionMemoryBackend } from '../src/server/englishMissionMemoryBackend.js';
import { buildEnglishMissionWeeks, catalog } from '../src/utils/englishMissionPlanning.js';

const target = { scopeSchools: ['栗林'], attendingSchoolName: '合成中学校', targetGrade: '中３', subject: 'english' };
const actor = { userId: '990001', role: 'admin', sessionExpiresAt: '2027-01-01T00:00:00.000Z' };
const actions = {
  list: 'getSukimakunEnglishMissions',
  preview: 'previewSukimakunEnglishMissionBatch',
  create: 'saveSukimakunEnglishMissionBatch',
  update: 'updateSukimakunEnglishMission',
  remove: 'deleteSukimakunEnglishMission',
  status: 'getSukimakunEnglishMissionOperation',
};

function weeks(date = '2026-11-05', ranges = [[0, 1], [2, 3], [0, 1], [2, 3]]) {
  return buildEnglishMissionWeeks(date, ranges.map(([first, last]) => ({
    materialGrade: '中１', startKey: catalog.units[first].key, endKey: catalog.units[last].key,
  })));
}

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'stage2-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'missions.json');
  function connect(onWrite) {
    const store = createLocalEnglishMissionStore(file, onWrite);
    const backend = createEnglishMissionMemoryBackend({
      store, now: () => Date.parse('2026-11-05T00:00:00Z'),
      resolveSession: token => token === 'fake-session' ? actor : null,
      targetExists: () => true,
    });
    const call = (action, request = {}) => backend.handle(actions[action], { target, sessionToken: 'fake-session', ...request });
    const prepare = (operationId, data = {}) => {
      const input = { operationId, weeks: weeks(), ...data };
      const result = call('preview', input);
      assert.equal(result.canSave, true, JSON.stringify(result));
      return { ...input, expectedRevision: result.revision, confirmationToken: result.confirmationToken, duplicatesAcknowledged: true };
    };
    return { call, prepare, store };
  }
  return { file, connect };
}

test('four-week registration, edit and exact retry survive opening a new backend', t => {
  const { file, connect } = fixture(t);
  const first = connect();
  const request = first.prepare('register-four');
  assert.equal(first.call('create', { ...request, duplicatesAcknowledged: false }).code, 'DUPLICATE_CONFIRMATION_REQUIRED');
  const created = first.call('create', request);
  assert.equal(created.records.length, 4);
  assert.deepEqual(created.records.map(record => record.materials), request.weeks.map(week => week.materials));
  const second = connect();
  const beforeRetry = readFileSync(file, 'utf8');
  assert.deepEqual(second.call('create', request), created);
  assert.equal(readFileSync(file, 'utf8'), beforeRetry);
  const saved = second.call('list').records[0];
  const edit = second.prepare('edit-one', { mode: 'update', weeks: [{
    ...weeks(saved.startDate, [[4, 5]])[0], missionId: saved.missionId, expectedVersion: saved.version,
  }] });
  assert.equal(second.call('update', edit).records[0].version, 2);
  const third = connect();
  const updated = third.call('list').records[0];
  assert.equal(updated.missionId, saved.missionId);
  assert.equal(updated.startDate, saved.startDate);
  assert.equal(updated.endDate, saved.endDate);
  assert.deepEqual(updated.materials, edit.weeks[0].materials);
  assert.equal(third.call('update', edit).records[0].version, 2);
});

test('saving a four-week batch with a one-day collision leaves the JSON byte-for-byte unchanged', t => {
  const { file, connect } = fixture(t);
  const { call, prepare } = connect();
  assert.equal(call('create', prepare('initial-week', { weeks: weeks('2026-11-05', [[0, 1]]) })).result, 'success');
  const before = readFileSync(file, 'utf8');
  const request = { operationId: 'conflict', weeks: weeks('2026-11-11') };
  assert.equal(call('preview', request).canSave, false);
  assert.equal(call('create', request).code, 'PERIOD_CONFLICT');
  assert.equal(readFileSync(file, 'utf8'), before);
});

test('a staged partial write remains invisible after restarting and cannot be replayed as success', t => {
  const { connect } = fixture(t);
  const { call, prepare } = connect(() => { throw Error('synthetic interruption'); });
  const request = prepare('partial');
  assert.equal(call('create', request).code, 'OPERATION_ABORTED');
  const reopened = connect();
  assert.equal(reopened.store.read().rows.length, 1);
  assert.equal(reopened.call('status', request).state, 'ABORTED');
  assert.equal(reopened.call('list').records.length, 0);
  assert.equal(reopened.call('create', reopened.prepare('new-operation')).records.length, 4);
});

test('damaged JSON fails closed and reset archives only the intended file', t => {
  const { file, connect } = fixture(t);
  const adjacent = join(file, '..', 'adjacent.txt');
  writeFileSync(file, '{broken');
  writeFileSync(adjacent, 'unrelated');
  assert.equal(connect().call('list').code, 'STORAGE_INTEGRITY_ERROR');
  assert.equal(readFileSync(file, 'utf8'), '{broken');
  const backup = archiveLocalEnglishMissionData(file);
  assert.equal(readFileSync(backup, 'utf8'), '{broken');
  assert.equal(readFileSync(adjacent, 'utf8'), 'unrelated');
  assert.equal(connect().call('list').records.length, 0);
  assert.equal(archiveLocalEnglishMissionData(file), null);
});

test('a compatibility-format JSON batch stays readable after delete, restart and same-period replacement', t => {
  const { file, connect } = fixture(t);
  const first = connect();
  const saved = first.call('create', first.prepare('original'));
  const before = first.store.read();
  assert.ok(before.rows.every(row => !Object.hasOwn(row.payload, 'status')));
  const selected = saved.records[2];
  const request = { operationId: 'delete-third', missionId: selected.missionId, expectedVersion: 1 };
  const second = connect();
  const removed = second.call('remove', request);
  assert.equal(removed.records[0].status, 'DELETED');
  const savedBytes = readFileSync(file, 'utf8');
  const restarted = connect();
  assert.deepEqual(restarted.call('remove', request), removed);
  assert.equal(readFileSync(file, 'utf8'), savedBytes);
  assert.deepEqual(restarted.call('status', { operationId: saved.operationId }), saved);
  assert.deepEqual(restarted.call('list').records, [saved.records[0], saved.records[1], saved.records[3]]);
  const replacement = restarted.call('create', restarted.prepare('replacement', { weeks: weeks(selected.startDate, [[4, 4]]) }));
  assert.notEqual(replacement.records[0].missionId, selected.missionId);
  assert.equal(connect().call('list').records.length, 4);
});
