const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error });
vm.runInContext(source, context);
const originalGetOneToOneSubjects = context.getOneToOneSubjects;
const originalReplaceOneToOneSubjects = context.replaceOneToOneSubjects_;

function makeSheet(initialRows = []) {
  const state = { rows: initialRows.map(row => [...row]), formats: [], writes: 0 };
  return {
    state,
    getLastRow: () => state.rows.length,
    getLastColumn: () => state.rows.reduce((max, row) => Math.max(max, row.length), 0),
    getMaxRows: () => 100,
    getDataRange: () => ({ getValues: () => state.rows.map(row => [...row]) }),
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, r) => Array.from({ length: columnCount }, (_, c) => state.rows[row - 1 + r]?.[column - 1 + c] ?? '')),
      setValues: values => { state.writes++; values.forEach((valuesRow, r) => { if (!state.rows[row - 1 + r]) state.rows[row - 1 + r] = []; valuesRow.forEach((value, c) => { state.rows[row - 1 + r][column - 1 + c] = value; }); }); },
      clearContent: () => { for (let r = 0; r < rowCount; r++) for (let c = 0; c < columnCount; c++) if (state.rows[row - 1 + r]) state.rows[row - 1 + r][column - 1 + c] = ''; },
      setNumberFormat: format => { state.formats.push({ row, column, rowCount, format }); }
    })
  };
}

test('1生徒複数科目・複数生徒・TRUE/FALSE・先頭0を正しく取得する', () => {
  const rows = [
    ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'],
    ['001200', 'english', true, '', '', ''],
    ['001200', 'math', 'TRUE', '', '', ''],
    ['000007', 'science', false, '', '', ''],
    ['000007', 'social', 'FALSE', '', '', '']
  ];
  context.__rows = rows;
  const state = vm.runInContext('buildOneToOneSubjectStateMap_(__rows)', context);
  assert.deepEqual(Array.from(state.states['001200']), ['english', 'math']);
  assert.deepEqual(Array.from(state.states['000007']), []);
});

test('無効subjectIdは取得対象外、userId×subjectId重複は拒否する', () => {
  context.__invalidRows = [
    ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'],
    ['001200', 'other', true, '', '', '']
  ];
  const state = vm.runInContext('buildOneToOneSubjectStateMap_(__invalidRows)', context);
  assert.equal(state.warnings.invalidSubjectIdCount, 1);
  assert.equal(state.states['001200'], undefined);
  context.__duplicateRows = [
    context.__invalidRows[0],
    ['001200', 'english', true, '', '', ''],
    ['001200', 'english', false, '', '', '']
  ];
  assert.throws(() => vm.runInContext('buildOneToOneSubjectStateMap_(__duplicateRows)', context), /重複/);
});

test('読み取り専用診断は完全重複・TRUE/FALSE競合・正規化後重複を分類する', () => {
  context.__inspectRows = [
    ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'],
    ['037071', 'math', true, '', '', ''],
    ['37071', 'math', true, '', '', ''],
    ["'001200", ' english ', true, '', '', ''],
    ['001200', 'english', false, '', '', ''],
    ['000007', 'science', false, '', '', ''],
    ['000007', 'science', false, '', '', ''],
    ['000008', 'MATH', true, '', '', '']
  ];
  context.assertOneToOneSubjectSheet_ = () => ({ getDataRange: () => ({ getValues: () => context.__inspectRows }) });
  const result = vm.runInContext('inspectOneToOneSubjectDuplicateData_()', context);
  assert.equal(result.dataRows, 7);
  assert.equal(result.duplicateKeyCount, 3);
  assert.equal(result.duplicateRowCount, 3);
  const normalizedUser = result.duplicateKeys.find(item => item.userId === '037071');
  assert.equal(normalizedUser.duplicateType, 'ENABLED_TRUE_DUPLICATE');
  assert.equal(normalizedUser.hasUserIdNormalizationCollision, true);
  const conflict = result.duplicateKeys.find(item => item.userId === '001200');
  assert.equal(conflict.duplicateType, 'TRUE_FALSE_CONFLICT');
  assert.equal(conflict.hasSubjectIdTrimCollision, true);
  const disabled = result.duplicateKeys.find(item => item.userId === '000007');
  assert.equal(disabled.duplicateType, 'ENABLED_FALSE_DUPLICATE');
});

test('通常検査は正式5科目のTRUE/FALSEを正常として扱い不正subjectIdと未登録userIdだけを数える', () => {
  context.__summaryRows = [
    ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'],
    ['037071', 'english', true, '', '', ''],
    ['037071', 'math', false, '', '', ''],
    ['037071', 'japanese', false, '', '', ''],
    ['037071', 'science', false, '', '', ''],
    ['037071', 'social', false, '', '', ''],
    ['037071', 'other', false, '', '', ''],
    ['999999', 'math', false, '', '', '']
  ];
  context.assertOneToOneSubjectSheet_ = () => ({ getDataRange: () => ({ getValues: () => context.__summaryRows }) });
  context.getUserAuthContexts_ = () => [{ userId: '037071', role: 'student' }];
  const result = vm.runInContext('inspectOneToOneSubjectData()', context);
  assert.equal(result.dataRows, 7);
  assert.equal(result.enabledRows, 1);
  assert.equal(result.disabledRows, 6);
  assert.equal(result.duplicateRows, 0);
  assert.equal(result.invalidRows, 0);
  assert.equal(result.invalidSubjectIds, 1);
  assert.equal(result.unknownStudents, 1);
});

test('TRUE/FALSEに関係なく同一キーだけを重複とし完全空行を集計しない', () => {
  const headers = ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'];
  const uniqueRows = Array.from({ length: 394 }, (_, index) => {
    const userId = String(Math.floor(index / 5) + 1).padStart(6, '0');
    const subjectId = ['english', 'math', 'japanese', 'science', 'social'][index % 5];
    return [userId, subjectId, index % 2 === 0, '', '', ''];
  });
  context.__summaryRows = [headers, ...uniqueRows];
  context.assertOneToOneSubjectSheet_ = () => ({ getDataRange: () => ({ getValues: () => context.__summaryRows }) });
  context.getUserAuthContexts_ = () => Array.from({ length: 79 }, (_, index) => ({ userId: String(index + 1).padStart(6, '0'), role: 'student' }));
  let result = vm.runInContext('inspectOneToOneSubjectData()', context);
  assert.equal(result.dataRows, 394);
  assert.equal(result.duplicateRows, 0);
  assert.equal(result.invalidSubjectIds, 0);
  assert.equal(result.unknownStudents, 0);

  context.__summaryRows.push(['000001', 'english', false, '', '', '']);
  result = vm.runInContext('inspectOneToOneSubjectData()', context);
  assert.equal(result.duplicateRows, 1);

  context.__summaryRows = [headers, ...uniqueRows.slice(0, 93), ...Array.from({ length: 301 }, () => ['', '', '', '', '', ''])];
  result = vm.runInContext('inspectOneToOneSubjectData()', context);
  assert.equal(result.dataRows, 93);
  assert.equal(result.duplicateRows, 0);
  assert.equal(result.invalidSubjectIds, 0);
  assert.equal(result.unknownStudents, 0);
  assert.equal(result.disabledRows, 46);

  context.__summaryRows = [headers, ['000001', 'english', false, '', '', ''], ['', '', false, '', '', '']];
  result = vm.runInContext('inspectOneToOneSubjectData()', context);
  assert.equal(result.disabledRows, 1);
  assert.equal(result.invalidRows, 1);
  assert.equal(result.invalidSubjectIds, 0);
  assert.equal(result.unknownStudents, 0);
});

test('unknown診断は対象行だけを返しマスター・role・enabled・deleted状態を分類する', () => {
  const headers = ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'];
  context.__unknownRows = [
    headers,
    ['037071', 'math', true, '', '', ''],
    ['37072', 'english', false, '', '', ''],
    ['000003', 'science', true, '', '', ''],
    ['000004', 'social', true, '', '', ''],
    ['000005', 'japanese', false, '', '', '']
  ];
  context.assertOneToOneSubjectSheet_ = () => ({ getDataRange: () => ({ getValues: () => context.__unknownRows }) });
  context.getUserAuthContexts_ = () => [
    { userId: '037071', role: 'student', enabled: true, deleted: false },
    { userId: '000005', role: 'student', enabled: false, deleted: true }
  ];
  context.__accountRows = [
    ['037071', '', '', '', 'student', true, '', '', '', '', ''],
    ['037072', '', '', '', 'student', false, '', '', '', '', 'deleted'],
    ['000004', '', '', '', 'teacher', true, '', '', '', '', ''],
    ['000005', '', '', '', 'student', false, '', '', '', '', 'deleted']
  ];
  context.__studentRows = [['037071'], ['037072'], ['000003'], ['000004'], ['000005']];
  context.assertAccountMigrationSheets_ = () => ({ 'アカウントマスター': { rows: context.__accountRows }, '生徒マスター': { rows: context.__studentRows } });
  context.getAccountMigrationDataRows_ = sheet => sheet.rows;
  const result = vm.runInContext('inspectOneToOneSubjectUnknownStudents_()', context);
  assert.equal(result.unknownStudentCount, 3);
  assert.deepEqual(Array.from(result.rows, row => row.normalizedUserId), ['037072', '000003', '000004']);
  assert.equal(result.rows[0].rawUserId, '37072');
  assert.equal(result.rows[0].enabled, false);
  assert.equal(result.rows[0].accountEnabled, false);
  assert.equal(result.rows[0].accountDeleted, true);
  assert.equal(result.rows[0].reason, 'AUTH_CONTEXT_NOT_STUDENT');
  assert.equal(result.rows[1].reason, 'NOT_IN_ACCOUNT_MASTER');
  assert.equal(result.rows[2].reason, 'ACCOUNT_ROLE_NOT_STUDENT');
  assert.equal(result.rows.some(row => row.normalizedUserId === '000005'), false);
});

test('未登録生徒を拒否し、登録済み生徒の空設定は空配列で返す', () => {
  context.findOneToOneSubjectStudent_ = userId => userId === '001200' ? { userId: '001200', role: 'student' } : null;
  context.__sheetRows = [['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy']];
  context.assertOneToOneSubjectSheet_ = () => ({ getDataRange: () => ({ getValues: () => context.__sheetRows }) });
  assert.deepEqual(Array.from(vm.runInContext('getOneToOneSubjects("001200").subjectIds', context)), []);
  assert.throws(() => vm.runInContext('getOneToOneSubjects("999999")', context), /見つかりません/);
});

test('取得・更新actionはadminセッションを必須とする', () => {
  context.getOneToOneSubjects = () => ({ subjectIds: ['english'], warnings: {} });
  context.replaceOneToOneSubjects_ = (_userId, ids) => ({ subjectIds: ids });
  context.requireAdminSession = token => {
    if (token !== 'admin-token') throw new Error('管理者権限が必要です');
    return { userId: 'admin', role: 'admin' };
  };
  context.__getRequest = { action: 'getOneToOneSubjects', sessionToken: 'admin-token', userId: '001200' };
  assert.deepEqual(Array.from(vm.runInContext('handleNewAccountAdminAction_(__getRequest).subjectIds', context)), ['english']);
  context.__updateRequest = { action: 'updateOneToOneSubjects', sessionToken: 'admin-token', userId: '001200', subjectIds: ['math'] };
  assert.deepEqual(Array.from(vm.runInContext('handleNewAccountAdminAction_(__updateRequest).subjectIds', context)), ['math']);
  context.__getRequest.sessionToken = 'teacher-token';
  assert.throws(() => vm.runInContext('handleNewAccountAdminAction_(__getRequest)', context), /管理者権限/);
  context.getOneToOneSubjects = originalGetOneToOneSubjects;
  context.replaceOneToOneSubjects_ = originalReplaceOneToOneSubjects;
});

test('setupは6列シートを作成してuserId列を文字列形式にする', () => {
  const sheets = {};
  const spreadsheet = { getSheetByName: name => sheets[name] || null, insertSheet: name => { sheets[name] = makeSheet(); return sheets[name]; } };
  context.SpreadsheetApp = { getActiveSpreadsheet: () => spreadsheet };
  const result = vm.runInContext('setupOneToOneSubjectSheet()', context);
  assert.equal(result.created, true);
  assert.deepEqual(sheets['1対1受講科目'].state.rows[0], ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy']);
  assert.ok(sheets['1対1受講科目'].state.formats.some(item => item.column === 1 && item.format === '@'));
});

test('更新は対象生徒だけ5科目をTRUE/FALSEで置換し他生徒を保持する', () => {
  const headers = ['userId', 'subjectId', 'enabled', 'createdAt', 'updatedAt', 'updatedBy'];
  const sheet = makeSheet([headers, ["'001200", 'english', true, 'created', '', 'admin'], ["'000007", 'science', true, '', '', 'admin']]);
  context.__released = false;
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => { context.__released = true; } }) };
  context.findOneToOneSubjectStudent_ = userId => ({ userId: String(userId).replace(/^'/, ''), role: 'student' });
  context.assertOneToOneSubjectSheet_ = () => sheet;
  context.__updateIds = ['math', 'science'];
  const result = vm.runInContext('replaceOneToOneSubjects_("001200", __updateIds, "admin")', context);
  assert.deepEqual(Array.from(result.subjectIds), ['math', 'science']);
  assert.equal(context.__released, true);
  const dataRows = sheet.state.rows.slice(1).filter(row => row.some(value => value !== ''));
  assert.ok(dataRows.some(row => row[0] === "'000007" && row[1] === 'science' && row[2] === true));
  const targetRows = dataRows.filter(row => String(row[0]).replace(/^'/, '') === '001200');
  assert.equal(targetRows.length, 5);
  assert.equal(targetRows.find(row => row[1] === 'math')[2], true);
  assert.equal(targetRows.find(row => row[1] === 'english')[2], false);
  assert.equal(targetRows.find(row => row[1] === 'english')[3], 'created');
});
