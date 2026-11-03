import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SCHOOLS } from '../src/constants/organization.js';
import { canAccessSukimakunMissionSchool as canAccess } from '../src/utils/sukimakunMissionAccess.js';
import { buildSukimakunRegistrationHash, parseSukimakunHash } from '../src/utils/sukimakunNavigation.js';

const assigned = ['栗林', '番町'];

test('admin can select every canonical campus and all campuses, even with no assignments', () => {
  for (const school of [...ALL_SCHOOLS, '全校舎']) {
    assert.equal(canAccess('admin', school, assigned), true, school);
    assert.equal(canAccess('admin', school, []), true, school);
  }
  assert.equal(canAccess('admin', '不存在校舎', assigned), false);
  assert.equal(canAccess('admin', '', assigned), false);
});

test('previous admin links to all assigned campuses remain usable', () => {
  assert.equal(canAccess('admin', '全担当校舎', assigned), true);
  assert.equal(canAccess('admin', '全担当校舎', []), false);
});

for (const role of ['general', 'head-teacher']) {
  test(`${role} allows assigned campuses and rejects outside campuses and all campuses`, () => {
    for (const school of assigned) assert.equal(canAccess(role, school, assigned), true);
    assert.equal(canAccess(role, '全担当校舎', assigned), true);
    for (const school of ['木太南', '全校舎', '', '不存在校舎']) assert.equal(canAccess(role, school, assigned), false);
    assert.equal(canAccess(role, '全担当校舎', []), false);
  });
}

for (const role of ['teacher', 'student', 'unknown', '']) {
  test(`${role || 'empty role'} cannot access mission campuses`, () => {
    for (const school of ['栗林', '木太南', '全担当校舎', '全校舎']) assert.equal(canAccess(role, school, assigned), false);
  });
}

test('outside-campus and all-campus card URLs preserve scope and use campus rather than attending school for access', () => {
  for (const school of ['木太南', '全校舎']) {
    const route = parseSukimakunHash(buildSukimakunRegistrationHash({ attendingSchoolName: 'A & B中学校', grade: '中１' }, school));
    assert.equal(route.school, school);
    assert.equal(route.attendingSchoolName, 'A & B中学校');
    assert.equal(canAccess('admin', route.school, assigned), true);
    assert.equal(canAccess('general', route.school, assigned), false);
  }
});
