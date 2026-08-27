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

test('個トレはunits.csv軸を教材ごとに返し復習後も最大到達から後退しない', () => {
  context.openSpreadsheetByProperty = () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => [[], [new Date('2026-08-27T00:00:00Z'), '木太南', '037071', '', '中１', '数学', '教材A', 'p.3'], [new Date('2026-08-28T00:00:00Z'), '木太南', '037071', '', '中１', '数学', '教材A', 'p.1']] }) }) });
  context.Utilities = { formatDate: date => date.toISOString().slice(5, 10) };
  context.__student = contexts[3];
  context.__units = [
    { grade: '中１', subject: '数学', textName: '教材A', chapter: '1章', unitName: '単元1', page: 'p.1' },
    { grade: '中１', subject: '数学', textName: '教材A', chapter: '1章', unitName: '単元2', page: 'p.2' },
    { grade: '中１', subject: '数学', textName: '教材A', chapter: '2章', unitName: '単元3', page: 'p.3' },
    { grade: '中１', subject: '数学', textName: '教材B', chapter: '1章', unitName: '別単元', page: 'p.1' }
  ];
  const result = vm.runInContext('getStudentProfileKoTore_(__student, __units)', context);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].unitOrder, 3);
  assert.equal(result.items[0].page, 'p.3');
  assert.equal(result.items[0].unitName, '単元3');
  assert.deepEqual(Array.from(result.items[0].axis, item => [item.chapter, item.page]), [['1章', 'p.1'], ['1章', 'p.2'], ['2章', 'p.3']]);
});

test('スキマ君はallowedContentIdsだけをマスター順で返し、履歴なしも保持する', () => {
  context.getSukimakunContents = () => [
    { contentId: 'allowed_empty', displayName: '利用可能・未利用', enabled: true, sortOrder: 1 },
    { contentId: 'allowed_used', displayName: '利用可能・利用済み', enabled: true, sortOrder: 2 },
    { contentId: 'permission_off', displayName: '権限OFF', enabled: true, sortOrder: 3 }
  ];
  context.getSukimakunPermissionState = () => ({ permissionsInitialized: true, allowedContentIds: ['allowed_empty', 'allowed_used'] });
  context.openSpreadsheetByProperty = () => ({ getSheets: () => [{ getName: () => '未対応シート', getDataRange: () => ({ getValues: () => [[],
    [new Date('2026-08-27T09:30:00Z'), '', '037071', '同名を使用しない', '', '通常', 8, 10, '', '', '', 'allowed_used'],
    [new Date('2026-08-27T10:00:00Z'), '', '037071', '', '', '通常', 9, 10, '', '', '', 'permission_off'],
    [new Date('2026-08-27T11:00:00Z'), '', '037071', '', '', '通常', 1, 1, '', '', '', '']
  ] }) }] });
  context.Utilities = { formatDate: date => date.toISOString() };
  context.__student = contexts[3];
  const result = vm.runInContext('getStudentProfileSukimakun_(__student)', context);
  assert.deepEqual(Array.from(result.currentContents, item => item.contentId), ['allowed_empty', 'allowed_used']);
  assert.equal(result.currentContents[0].attemptCount, 0);
  assert.equal(result.currentContents[1].cumulativeRate, 80);
  assert.equal('pastContents' in result, false);
  assert.equal(result.legacyLogCount, 1);
});

test('正式1対1シートのlegacy行だけを互換集計しcanonical行と二重計上しない', () => {
  context.getSukimakunContents = () => [
    { contentId: 'junior_english_quiz', displayName: '1問ずつテスト', enabled: true, sortOrder: 1 },
    { contentId: 'kakitan', displayName: '書き単', enabled: true, sortOrder: 2 }
  ];
  context.getSukimakunPermissionState = () => ({ permissionsInitialized: true, allowedContentIds: ['junior_english_quiz'] });
  const rows = [[],
    [new Date('2026-08-20T09:00:00Z'), '', '037071', '', '', '通常', 7, 10, '', '', '', ''],
    [new Date('2026-08-21T09:00:00Z'), '', '037071', '', '', '通常', 8, 10, '', '', '', 'junior_english_quiz']
  ];
  context.openSpreadsheetByProperty = () => ({ getSheets: () => [
    { getName: () => '1問ずつテスト(自習)', getDataRange: () => ({ getValues: () => rows }) },
    { getName: () => '曖昧・未対応', getDataRange: () => ({ getValues: () => [[], [new Date(), '', '037071', '', '', '', 10, 10, '', '', '', '']] }) }
  ] });
  context.Utilities = { formatDate: date => date.toISOString() };
  context.__student = contexts[3];
  const result = vm.runInContext('getStudentProfileSukimakun_(__student)', context);
  assert.equal(result.currentContents.length, 1);
  assert.equal(result.currentContents[0].attemptCount, 2);
  assert.equal(result.currentContents[0].cumulativeScore, 15);
  assert.equal(result.compatibleLegacyLogCount, 1);
  assert.equal(result.legacyLogCount, 2);
});

test('個トレ共通ページ照合は個別ページとCSV範囲を対応させ教材名表記を正規化する', () => {
  context.__matcher = vm.runInContext('buildKoToreCompletionMatcher_(["iワークプラス 14, iワークプラス 15, iワークプラス 16"], "ｉワーク プラス")', context);
  assert.equal(vm.runInContext('isKoToreUnitPageCompleted_("p.14-16", __matcher)', context), true);
  context.__drillMatcher = vm.runInContext('buildKoToreCompletionMatcher_(["iワークドリル p.8"], "iワークドリル")', context);
  assert.equal(vm.runInContext('isKoToreUnitPageCompleted_("p.8", __drillMatcher)', context), true);
  assert.equal(vm.runInContext('isKoToreUnitPageCompleted_("p.9", __drillMatcher)', context), false);
});
