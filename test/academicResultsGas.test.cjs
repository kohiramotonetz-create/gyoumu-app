const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error });
vm.runInContext(source, context);

function makeSheet(initialRows = []) {
  const state = { rows: initialRows.map(row => [...row]), formats: [] };
  const columnFromA1 = value => value.split(':')[0].charCodeAt(0) - 64;
  return {
    state,
    getLastRow: () => state.rows.reduce((last, row, index) => row.some(value => value !== '') ? index + 1 : last, 0),
    getLastColumn: () => state.rows.reduce((last, row) => Math.max(last, row.length), 0),
    getRange: (rowOrA1, column, rowCount = 1, columnCount = 1) => {
      const row = typeof rowOrA1 === 'string' ? 1 : rowOrA1;
      const col = typeof rowOrA1 === 'string' ? columnFromA1(rowOrA1) : column;
      return {
        getDisplayValues: () => Array.from({ length: rowCount }, (_, r) => Array.from({ length: columnCount }, (_, c) => String(state.rows[row - 1 + r]?.[col - 1 + c] ?? ''))),
        setValues: values => values.forEach((valuesRow, r) => valuesRow.forEach((value, c) => { if (!state.rows[row - 1 + r]) state.rows[row - 1 + r] = []; state.rows[row - 1 + r][col - 1 + c] = value; })),
        setNumberFormat: format => state.formats.push({ rowOrA1, format })
      };
    }
  };
}

test('GAS点数検証は空欄・0・満点・全角数字を許可する', () => {
  assert.equal(vm.runInContext('normalizeAcademicScore_("", 100)', context), '');
  assert.equal(vm.runInContext('normalizeAcademicScore_(0, 100)', context), 0);
  assert.equal(vm.runInContext('normalizeAcademicScore_(100, 100)', context), 100);
  assert.equal(vm.runInContext('normalizeAcademicScore_("７２", 100)', context), 72);
});

test('GAS点数検証は負数・小数・指数・文字・超過・カンマを拒否する', () => {
  for (const value of ['-1', '1.5', '1e2', 'abc', '101', '1,000']) {
    context.__score = value;
    assert.throws(() => vm.runInContext('normalizeAcademicScore_(__score, 100)', context));
  }
});

test('GAS合計は9科目入力済みの場合だけ計算し0を入力済みと扱う', () => {
  context.__scores = { japanese: 72, math: 81, english: 68, science: 75, social: 80, music: 90, health: 85, art: 88, technologyHomeEconomics: 92 };
  assert.equal(vm.runInContext('calculateAcademicTotal_(__scores)', context), 731);
  context.__scores.music = '';
  assert.equal(vm.runInContext('calculateAcademicTotal_(__scores)', context), null);
  Object.keys(context.__scores).forEach(key => { context.__scores[key] = 0; });
  assert.equal(vm.runInContext('calculateAcademicTotal_(__scores)', context), 0);
});

test('テスト入力の年度・種別・満点・名称を厳密検証する', () => {
  assert.equal(vm.runInContext('validateAcademicYear_(2026)', context), 2026);
  assert.equal(vm.runInContext('validateAcademicTestType_("diagnostic")', context), 'diagnostic');
  assert.equal(vm.runInContext('validateAcademicMaxScore_(50)', context), 50);
  assert.equal(vm.runInContext('normalizeAcademicTestName_(" １学期中間 ")', context), '1学期中間');
  assert.throws(() => vm.runInContext('validateAcademicTestType_("mock")', context));
  assert.throws(() => vm.runInContext('validateAcademicMaxScore_(0)', context));
});

test('学年グループは既存の正式学年検証を使い順序を維持する', () => {
  assert.deepEqual(Array.from(vm.runInContext('validateGrades_("中１,中２,中３")', context)), ['中１', '中２', '中３']);
  assert.deepEqual(Array.from(vm.runInContext('validateGrades_(["小1", "小２", "小1"])', context)), ['小１', '小２']);
  assert.throws(() => vm.runInContext('validateGrades_("中１,不正")', context), /Grade is invalid/);
});

test('学校成績actionはhead-teacher・general・adminセッションを許可しteacherを拒否する', () => {
  context.requirePrivilegedStaffSession_ = token => {
    if (token === 'teacher-token') throw new Error('閲覧権限が必要です');
    return { userId: token, role: token };
  };
  context.getAcademicTestRecords_ = () => [];
  context.__request = { action: 'getAcademicResultTests', sessionToken: 'admin-token', includeDisabled: true };
  assert.deepEqual(Array.from(vm.runInContext('handleAcademicResultAction_(__request).tests', context)), []);
  for (const role of ['head-teacher', 'general', 'admin']) {
    context.__request.sessionToken = role;
    assert.deepEqual(Array.from(vm.runInContext('handleAcademicResultAction_(__request).tests', context)), []);
  }
  context.__request.sessionToken = 'teacher-token';
  assert.throws(() => vm.runInContext('handleAcademicResultAction_(__request)', context), /閲覧権限/);
});

test('テスト作成はUUID・作成順を使い年度×名称重複を拒否する', () => {
  const writes = [];
  context.Utilities = { getUuid: () => 'uuid-001' };
  context.LockService = { getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) };
  context.getAcademicTestRecords_ = () => [{ testId: 'old', schoolYear: 2026, testName: '中間', testType: 'regular', maxScore: 100, sortOrder: 2 }];
  context.getAcademicSheets_ = () => ({ testSheet: { getLastRow: () => 2, getRange: (...args) => ({ setNumberFormat() {}, setValues: values => writes.push({ args, values }) }) } });
  context.__create = { schoolYear: 2026, testName: '期末', testType: 'regular', maxScore: 100 };
  context.__admin = { userId: 'admin' };
  const created = vm.runInContext('createAcademicResultTest_(__create, __admin)', context);
  assert.equal(created.testId, 'academic_uuid-001');
  assert.equal(created.sortOrder, 3);
  assert.equal(writes.length, 1);
  context.__create.testName = ' 中間 ';
  assert.throws(() => vm.runInContext('createAcademicResultTest_(__create, __admin)', context), /既に存在/);
  context.__create.schoolYear = 2027;
  assert.doesNotThrow(() => vm.runInContext('createAcademicResultTest_(__create, __admin)', context));
});

test('同一testIdを指定学年ごとに使え、bulk保存は先頭0を保持して対象だけupsertする', () => {
  const testRecord = { testId: 't1', schoolYear: 2026, testName: '期末', testType: 'regular', maxScore: 100, enabled: true, sortOrder: 1 };
  const blankScores = { japanese: '', math: '', english: '', science: '', social: '', music: '', health: '', art: '', technologyHomeEconomics: '' };
  const state = { rows: [] };
  const resultSheet = {
    getLastRow: () => state.rows.length + 1,
    getRange: (row, column, rowCount, columnCount) => ({
      clearContent: () => { state.rows = []; },
      setValues: values => { state.rows = values.map(item => [...item]); },
      setNumberFormat() {}
    })
  };
  context.getAcademicSheets_ = () => ({ resultSheet });
  context.getAcademicTestRecords_ = () => [testRecord];
  context.getNewAuthData_ = () => ({ contexts: [{ userId: '037071', role: 'student', enabled: true, deleted: false, grade: '中１' }, { userId: '001200', role: 'student', enabled: true, deleted: false, grade: '中２' }] });
  context.getAcademicResultRows_ = () => [{ testId: 't1', userId: '001200', scores: { ...blankScores, japanese: 50 }, createdAt: 'old', updatedAt: 'old', updatedBy: 'admin' }];
  context.__bulk = { testId: 't1', grade: '中１', records: [{ userId: '037071', scores: { ...blankScores, japanese: 0 } }] };
  const result = vm.runInContext('bulkUpdateAcademicResults_(__bulk, {userId:"admin"})', context);
  assert.equal(result.updatedCount, 1);
  assert.equal(state.rows.length, 2);
  assert.equal(state.rows[0][1], '001200');
  assert.equal(state.rows[1][1], '037071');
  assert.equal(state.rows[1][2], 0);
  context.__bulk = { testId: 't1', grade: '中２', records: [{ userId: '001200', scores: { ...blankScores, japanese: 60 } }] };
  assert.doesNotThrow(() => vm.runInContext('bulkUpdateAcademicResults_(__bulk, {userId:"admin"})', context));
});

test('bulk保存の書込み失敗時はsnapshotを復元して成功扱いにしない', () => {
  const testRecord = { testId: 't1', maxScore: 100, enabled: true };
  const scores = { japanese: 10, math: '', english: '', science: '', social: '', music: '', health: '', art: '', technologyHomeEconomics: '' };
  const original = { testId: 't1', userId: '037071', scores: { ...scores }, createdAt: 'created', updatedAt: 'old', updatedBy: 'admin' };
  const state = { rows: [], setAttempts: 0 };
  const resultSheet = {
    getLastRow: () => 2,
    getRange: () => ({
      clearContent: () => { state.rows = []; },
      setValues: values => { state.setAttempts++; if (state.setAttempts === 1) throw new Error('write failed'); state.rows = values.map(row => [...row]); },
      setNumberFormat() {}
    })
  };
  context.getAcademicSheets_ = () => ({ resultSheet });
  context.getAcademicTestRecords_ = () => [testRecord];
  context.getNewAuthData_ = () => ({ contexts: [{ userId: '037071', role: 'student', enabled: true, deleted: false, grade: '中１' }] });
  context.getAcademicResultRows_ = () => [{ ...original, scores: { ...original.scores } }];
  context.__rollbackBulk = { testId: 't1', grade: '中１', records: [{ userId: '037071', scores: { ...scores, japanese: 20 } }] };
  assert.throws(() => vm.runInContext('bulkUpdateAcademicResults_(__rollbackBulk, {userId:"admin"})', context), /復元/);
  assert.equal(state.setAttempts, 2);
  assert.equal(state.rows[0][2], 10);
});

test('setupは2シートを正式ヘッダーで作成し文字列書式を設定する', () => {
  const sheets = {};
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null, insertSheet: name => { sheets[name] = makeSheet(); return sheets[name]; } }) };
  const result = vm.runInContext('setupAcademicResultSheets()', context);
  assert.deepEqual(Array.from(result.createdSheets), ['学校成績テスト', '学校成績']);
  assert.deepEqual(sheets['学校成績テスト'].state.rows[0], ['testId', 'schoolYear', 'testName', 'testType', 'maxScore', 'enabled', 'sortOrder', 'createdAt', 'updatedAt', 'updatedBy']);
  assert.deepEqual(sheets['学校成績'].state.rows[0], ['testId', 'userId', 'japanese', 'math', 'english', 'science', 'social', 'music', 'health', 'art', 'technologyHomeEconomics', 'createdAt', 'updatedAt', 'updatedBy']);
  assert.ok(sheets['学校成績'].state.formats.some(item => item.rowOrA1 === 'A:B' && item.format === '@'));
});

test('setupは正式ヘッダーを維持し想定外ヘッダーを変更せず拒否する', () => {
  const testHeaders = ['testId', 'schoolYear', 'testName', 'testType', 'maxScore', 'enabled', 'sortOrder', 'createdAt', 'updatedAt', 'updatedBy'];
  const resultHeaders = ['testId', 'userId', 'japanese', 'math', 'english', 'science', 'social', 'music', 'health', 'art', 'technologyHomeEconomics', 'createdAt', 'updatedAt', 'updatedBy'];
  const sheets = { '学校成績テスト': makeSheet([testHeaders]), '学校成績': makeSheet([resultHeaders]) };
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null }) };
  assert.deepEqual(Array.from(vm.runInContext('setupAcademicResultSheets().createdSheets', context)), []);
  sheets['学校成績'].state.rows[0][1] = 'wrong';
  const before = JSON.stringify(sheets['学校成績'].state.rows);
  assert.throws(() => vm.runInContext('setupAcademicResultSheets()', context), /想定外/);
  assert.equal(JSON.stringify(sheets['学校成績'].state.rows), before);
});

test('setupは旧11列テストシートを自動変更せず拒否する', () => {
  const legacyHeaders = ['testId', 'schoolYear', 'grade', 'testName', 'testType', 'maxScore', 'enabled', 'sortOrder', 'createdAt', 'updatedAt', 'updatedBy'];
  const resultHeaders = ['testId', 'userId', 'japanese', 'math', 'english', 'science', 'social', 'music', 'health', 'art', 'technologyHomeEconomics', 'createdAt', 'updatedAt', 'updatedBy'];
  const sheets = { '学校成績テスト': makeSheet([legacyHeaders]), '学校成績': makeSheet([resultHeaders]) };
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null }) };
  const before = JSON.stringify(sheets['学校成績テスト'].state.rows);
  assert.throws(() => vm.runInContext('setupAcademicResultSheets()', context), /想定外/);
  assert.equal(JSON.stringify(sheets['学校成績テスト'].state.rows), before);
});

test('生徒別取得は現在学年に依存せず年度降順で無効テストの過去成績も返せる', () => {
  context.getAcademicTestRecords_ = () => [
    { testId: 't1', schoolYear: 2025, testName: '期末', testType: 'regular', maxScore: 100, enabled: false, sortOrder: 1 },
    { testId: 't2', schoolYear: 2026, testName: '診断', testType: 'diagnostic', maxScore: 50, enabled: true, sortOrder: 1 }
  ];
  const scores100 = { japanese: 10, math: 10, english: 10, science: 10, social: 10, music: 10, health: 10, art: 10, technologyHomeEconomics: 10 };
  const scores50 = { japanese: 5, math: 5, english: 5, science: 5, social: 5, music: 5, health: 5, art: 5, technologyHomeEconomics: 5 };
  context.getAcademicResultRows_ = () => [{ testId: 't1', userId: '037071', scores: scores100 }, { testId: 't2', userId: '037071', scores: scores50 }];
  const result = vm.runInContext('getAcademicResultsForStudent_("037071", {includeDisabled:true})', context);
  assert.deepEqual(Array.from(result.schoolYears, group => group.schoolYear), [2026, 2025]);
  assert.equal(result.schoolYears[1].tests[0].enabled, false);
  assert.equal(result.schoolYears[1].tests[0].total, 90);
  assert.equal(Object.hasOwn(result.schoolYears[0].tests[0], 'grade'), false);
});

test('成績マトリックスはAPI指定学年で生徒マスターを絞り込む', () => {
  context.validateGrade_ = value => value;
  context.getAcademicTestRecords_ = () => [{ testId: 't1', schoolYear: 2026, testName: '期末', maxScore: 100, enabled: true }];
  context.getAcademicResultRows_ = () => [];
  context.getNewAuthData_ = () => ({ contexts: [
    { userId: 's1', role: 'student', enabled: true, deleted: false, school: '木太南', grade: '中１', name: '一郎', nameKana: 'イチロウ' },
    { userId: 's2', role: 'student', enabled: true, deleted: false, school: '木太南', grade: '中２', name: '二郎', nameKana: 'ジロウ' },
    { userId: 's3', role: 'student', enabled: true, deleted: false, school: '木太南', grade: '中３', name: '三郎', nameKana: 'サブロウ' }
  ] });
  for (const grade of ['中１', '中２', '中３']) {
    context.__matrix = { testId: 't1', school: '木太南', grade };
    const result = vm.runInContext('getAcademicResultMatrix_(__matrix)', context);
    assert.equal(result.students.length, 1);
    assert.equal(result.students[0].grade, grade);
  }
  context.__matrix = { testId: 't1', school: '木太南', grade: '中１,中２,中３' };
  assert.equal(vm.runInContext('getAcademicResultMatrix_(__matrix).students.length', context), 3);
});
