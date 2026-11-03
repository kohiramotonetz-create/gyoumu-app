import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSukimakunRegistrationHash, isSukimakunHash, parseSukimakunHash } from '../src/utils/sukimakunNavigation.js';

test('mission links retain campus scope, school name and grade without colliding with existing student profile links', () => {
  const hash = buildSukimakunRegistrationHash({ attendingSchoolName: 'A & B中学校', grade: '中1' }, '全担当校舎');
  assert.deepEqual(parseSukimakunHash(hash), { view: 'register', school: '全担当校舎', grade: '中1', attendingSchoolName: 'A & B中学校' });
  assert.equal(isSukimakunHash('#/student/000001?source=sukimakun-permissions'), false);
  assert.deepEqual(parseSukimakunHash('#/sukimakun/permissions'), { view: 'permissions' });
  assert.deepEqual(parseSukimakunHash('#/sukimakun/missions/register?grade=中1'), { view: 'invalid' });
  assert.deepEqual(parseSukimakunHash('#/sukimakun/unknown'), { view: 'invalid' });
});
