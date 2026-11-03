import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSukimakunMissionGrade, readSukimakunMissionResponse as read } from '../src/utils/sukimakunMissionResponse.js';
const valid = () => ({ result: 'success', groups: [{ attendingSchoolName: '架空中学校', grade: '中1', schools: ['栗林'], studentCount: 2, lastRegisteredAt: null }], schools: ['栗林'], unsetSchoolCount: 1, sessionExpiresAt: '2030-01-01T00:00:00.000Z' });
test('v194 response keeps attending school, campus, grade, counts and expiry', () => { const data = valid(); assert.equal(read(data), data); });
test('a successful empty result is distinct from a failed response', () => { assert.deepEqual(read({ ...valid(), groups: [], unsetSchoolCount: 0 }).groups, []); assert.throws(() => read({ result: 'error', message: '取得失敗' }), /取得失敗/); });
for (const field of ['groups', 'schools', 'unsetSchoolCount', 'sessionExpiresAt']) test('missing ' + field + ' never becomes a zero result', () => { const data = valid(); delete data[field]; assert.throws(() => read(data), /応答が正しくありません/); });
for (const [field, value] of [['grade', null], ['attendingSchoolName', ''], ['studentCount', '2'], ['schools', null], ['lastRegisteredAt', undefined]]) test('malformed group ' + field + ' is rejected before rendering', () => { const data = valid(); data.groups[0][field] = value; assert.throws(() => read(data), /応答が正しくありません/); });
test('invalid counts and expiry are rejected', () => { assert.throws(() => read({ ...valid(), unsetSchoolCount: -1 })); assert.throws(() => read({ ...valid(), sessionExpiresAt: 'invalid' })); });
test('authorization and expired-session responses offer reauthentication without assuming which condition occurred', () => { for (const code of ['AUTHORIZATION_ERROR', 'AUTHENTICATION_ERROR']) { assert.throws(() => read({ result: 'error', code, message: '管理セッションが無効か、権限がありません' }), error => error.requiresReauthentication === true); } });
test('validation errors do not ask for a new login', () => { assert.throws(() => read({ result: 'error', code: 'VALIDATION_ERROR' }), error => error.requiresReauthentication === false); });

test('API grades use the formal full-width display without changing URL comparison', () => { assert.equal(formatSukimakunMissionGrade('中1'), '中１'); assert.equal(formatSukimakunMissionGrade('小６'), '小６'); assert.equal(formatSukimakunMissionGrade('大学受験'), '大学受験'); });
