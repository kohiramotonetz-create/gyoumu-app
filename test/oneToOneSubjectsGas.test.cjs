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
