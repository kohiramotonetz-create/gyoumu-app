const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error });
vm.runInContext(source, context);

const contexts = [
  { userId: 'admin', role: 'admin', enabled: true, deleted: false, assignedSchools: [] },
  { userId: 'teacher1', role: 'teacher', enabled: true, deleted: false, assignedSchools: ['木太南'] },
  { userId: 'head1', role: 'head-teacher', enabled: true, deleted: false, assignedSchools: ['木太南'] },
  { userId: '037071', role: 'student', enabled: true, deleted: false, school: '木太南', name: '木太南 太郎', nameKana: 'キタミナミ　タロウ', grade: '中１' },
  { userId: '000007', role: 'student', enabled: true, deleted: false, school: '栗林', name: '別生徒', nameKana: '', grade: '中１' },
  { userId: '000008', role: 'student', enabled: false, deleted: false, school: '木太南' },
  { userId: '000009', role: 'student', enabled: true, deleted: true, school: '木太南' }
];

test('プロフィール認可はadmin全校舎、担当staffだけを許可する', () => {
  for (const role of ['admin', 'teacher', 'head-teacher']) {
    context.__session = { userId: role === 'admin' ? 'admin' : role === 'teacher' ? 'teacher1' : 'head1', role, userContexts: contexts };
    assert.equal(vm.runInContext('assertStudentProfileAccess_(__session, "037071").userId', context), '037071');
  }
  context.__session = { userId: 'teacher1', role: 'teacher', userContexts: contexts };
  assert.throws(() => vm.runInContext('assertStudentProfileAccess_(__session, "000007")', context), /権限/);
  assert.throws(() => vm.runInContext('assertStudentProfileAccess_(__session, "000008")', context), /見つかりません/);
  assert.throws(() => vm.runInContext('assertStudentProfileAccess_(__session, "000009")', context), /見つかりません/);
  assert.throws(() => vm.runInContext('assertStudentProfileAccess_(__session, "999999")', context), /見つかりません/);
});

test('プロフィールsessionはstudentを拒否する', () => {
  context.validateManagementSession = () => ({ userId: '037071', role: 'student', userContexts: contexts });
  assert.throws(() => vm.runInContext('requireStudentProfileSession_("token")', context), /閲覧権限/);
});

test('Summaryは必要情報だけを返しpasswordやtokenを含めない', () => {
  context.getOneToOneSubjects = () => ({ subjectIds: ['english', 'math'] });
  context.__student = contexts[3];
  context.__session = { sessionExpiresAt: '2026-08-27T00:00:00.000Z' };
  const result = vm.runInContext('getStudentProfileSummary_(__student, __session)', context);
  assert.equal(result.student.userId, '037071');
  assert.deepEqual(Array.from(result.oneToOneSubjectIds), ['english', 'math']);
  assert.equal('password' in result.student, false);
  assert.equal('sukimakunToken' in result.student, false);
});

test('プロフィールactionは既存正本処理を再利用する', () => {
  assert.match(source, /getOneToOneProgressState_\(student\.userId, subjectId\)/);
  assert.match(source, /getAcademicResultsForStudent_\(student\.userId/);
  assert.match(source, /normalizeUserId\(row\[2\]\) !== student\.userId/);
  assert.match(source, /String\(row\[11\]/);
  assert.doesNotMatch(source.slice(source.indexOf('function getStudentProfileSukimakun_'), source.indexOf('function getStudentProfileOneToOne_')), /row\[3\].*student/);
});
