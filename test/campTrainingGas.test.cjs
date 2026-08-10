const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(source, context);
const originalGetActiveCampStudents = context.getActiveCampStudents_;
const originalGetCampParticipantIds = context.getCampParticipantIds_;

function makeSheet(initialRows = []) {
  const state = { rows: initialRows.map(row => [...row]), writes: 0 };
  return {
    state,
    getLastRow: () => state.rows.length,
    getLastColumn: () => state.rows.reduce((max, row) => Math.max(max, row.length), 0),
    getDataRange: () => ({ getValues: () => state.rows.map(row => [...row]) }),
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) => Array.from({ length: columnCount }, (_, columnOffset) => state.rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? '')),
      clearContent: () => {
        for (let r = row - 1; r < row - 1 + rowCount; r++) for (let c = column - 1; c < column - 1 + columnCount; c++) if (state.rows[r]) state.rows[r][c] = '';
        while (state.rows.length > 0 && state.rows[state.rows.length - 1].every(value => value === '')) state.rows.pop();
      },
      setValues: values => {
        state.writes++;
        values.forEach((valuesRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset;
          if (!state.rows[targetRow]) state.rows[targetRow] = [];
          valuesRow.forEach((value, columnOffset) => { state.rows[targetRow][column - 1 + columnOffset] = value; });
        });
      }
    })
  };
}

test('GASでも0以上の整数だけを許可する', () => {
  assert.equal(vm.runInContext('validateCampCount_("")', context), 0);
  assert.equal(vm.runInContext('validateCampCount_(12)', context), 12);
  assert.throws(() => vm.runInContext('validateCampCount_(-1)', context));
  assert.throws(() => vm.runInContext('validateCampCount_(1.5)', context));
  assert.throws(() => vm.runInContext('validateCampCount_("abc")', context));
  assert.throws(() => vm.runInContext('validateCampCount_(NaN)', context));
  assert.throws(() => vm.runInContext('validateCampCount_(Infinity)', context));
});

test('GASの順位も標準競技順位になる', () => {
  const ranks = vm.runInContext('assignCampRanks_([{studentId:"3",total:5},{studentId:"1",total:10},{studentId:"2",total:10}]).map(row => row.rank)', context);
  assert.deepEqual(Array.from(ranks), [1, 1, 3]);
});

test('閲覧権限はadminとhead-teacherだけに許可する', () => {
  context.validateManagementSession = () => ({ userId: 'staff', role: 'head-teacher' });
  assert.equal(vm.runInContext('requireCampViewerSession("token").role', context), 'head-teacher');
  context.validateManagementSession = () => ({ userId: 'staff', role: 'teacher' });
  assert.throws(() => vm.runInContext('requireCampViewerSession("token")', context));
});

test('admin限定認可はhead-teacherを拒否する', () => {
  context.validateManagementSession = () => ({ userId: 'staff', role: 'head-teacher' });
  assert.throws(() => vm.runInContext('requireAdminSession("token")', context));
  context.validateManagementSession = () => ({ userId: 'admin', role: 'admin' });
  assert.equal(vm.runInContext('requireAdminSession("token").role', context), 'admin');
});

test('不正または期限切れセッションを拒否する', () => {
  context.validateManagementSession = () => { throw new Error('管理セッションが無効または期限切れです'); };
  assert.throws(() => vm.runInContext('requireCampViewerSession("invalid")', context));
  assert.throws(() => vm.runInContext('requireAdminSession("invalid")', context));
});

test('生徒コードの先頭ゼロを保持する', () => {
  assert.equal(vm.runInContext('normalizeUserId("001234")', context), '001234');
  assert.equal(vm.runInContext('normalizeUserId("\'001234")', context), '001234');
});

test('年度・季節・日で入力データを分離し、重複キーを拒否する', () => {
  const headers = ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy'];
  const sheet = makeSheet([headers, [2026, '夏', 1, "'001234", 1, 2, 3, 4, 5], [2026, '冬', 1, "'001234", 9, 9, 9, 9, 9], [2027, '夏', 1, "'001234", 8, 8, 8, 8, 8], [2026, '夏', 2, "'001234", 6, 7, 8, 9, 10]]);
  context.getCampSheet_ = () => sheet;
  const records = vm.runInContext('getCampTrainingRecords_(2026, "夏")', context);
  assert.deepEqual(Array.from(records, record => [record.day, record.studentId, record.japanese]), [[1, '001234', 1], [2, '001234', 6]]);
  sheet.state.rows.push([2026, '夏', 1, "'001234", 0, 0, 0, 0, 0]);
  assert.throws(() => vm.runInContext('getCampTrainingRecords_(2026, "夏")', context));
});

test('合宿履歴と現在年度だけを重複排除して降順で返す', () => {
  const participantHeaders = ['year', 'season', 'studentId', 'updatedAt', 'updatedBy'];
  const trainingHeaders = ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy'];
  const sheets = {
    '合宿参加者': makeSheet([participantHeaders, [2025, '夏', "'001234"], [2027, '冬', "'001235"]]),
    '合宿特訓入力': makeSheet([trainingHeaders, [2026, '夏', 1, "'001234", 1, 2, 3, 4, 5], [2025, '夏', 1, "'001234", 1, 2, 3, 4, 5]])
  };
  context.getCampSheet_ = name => sheets[name];
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 2, 31))', context)), [2027, 2026, 2025]);
  sheets['合宿参加者'] = makeSheet([participantHeaders]);
  sheets['合宿特訓入力'] = makeSheet([trainingHeaders]);
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 2, 31))', context)), [2025]);
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context)), [2026]);
  sheets['合宿参加者'].state.rows.push(['不正年度', '夏', "'001234"]);
  assert.throws(() => vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context));
});

test('総合集計・参加解除・同順位を含む前日比を正しく処理する', () => {
  context.getCampParticipantIds_ = () => new Set(['000001', '000002', '000003']);
  context.getActiveCampStudents_ = () => [
    { studentId: '000001', name: 'A' }, { studentId: '000002', name: 'B' }, { studentId: '000003', name: 'C' }, { studentId: '000004', name: '解除済' }
  ];
  context.getCampTrainingRecords_ = () => [
    { day: 1, studentId: '000001', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 1, studentId: '000002', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 1, studentId: '000003', japanese: 5, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000001', japanese: 5, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000002', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000003', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000004', japanese: 999, math: 0, english: 0, social: 0, science: 0 }
  ];
  const day2 = vm.runInContext('buildCampRanking_(2026, "夏", "2")', context);
  assert.deepEqual(Array.from(day2, row => [row.studentId, row.rank, row.rankChange]), [['000002', 1, '―'], ['000003', 1, '↑2'], ['000001', 3, '↓2']]);
  const total = vm.runInContext('buildCampRanking_(2026, "夏", "total")', context);
  assert.deepEqual(Array.from(total, row => [row.studentId, row.total, row.rankChange]), [['000002', 20, '―'], ['000001', 15, '―'], ['000003', 15, '―']]);
  assert.equal(total.some(row => row.studentId === '000004'), false);
});

test('前日に0問の保存行があればデータありとして前日比を計算する', () => {
  context.getCampParticipantIds_ = () => new Set(['000001', '000002']);
  context.getActiveCampStudents_ = () => [{ studentId: '000001' }, { studentId: '000002' }];
  context.getCampTrainingRecords_ = () => [
    { day: 1, studentId: '000001', japanese: 0, math: 0, english: 0, social: 0, science: 0 },
    { day: 1, studentId: '000002', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000001', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000002', japanese: 0, math: 0, english: 0, social: 0, science: 0 }
  ];
  const rows = vm.runInContext('buildCampRanking_(2026, "夏", "2")', context);
  assert.deepEqual(Array.from(rows, row => [row.studentId, row.rankChange]), [['000001', '↑1'], ['000002', '↓1']]);
});

test('入力取得APIはadminの年度・季節・日を既存取得処理へ渡す', () => {
  let received = null;
  context.requireAdminSession = () => ({ userId: 'admin', role: 'admin' });
  context.buildCampRanking_ = (year, season, mode) => {
    received = { year, season, mode };
    return [{ studentId: '001234' }];
  };
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  const result = vm.runInContext('handleCampAction_({action:"getCampTrainingInput",year:2027,season:"冬",day:3,sessionToken:"token"})', context);
  assert.deepEqual(received, { year: 2027, season: '冬', mode: '3' });
  assert.equal(result.rows[0].studentId, '001234');
});

test('セットアップは再実行で既存データを書き換えず、不正ヘッダーを拒否する', () => {
  const participantHeaders = ['year', 'season', 'studentId', 'updatedAt', 'updatedBy'];
  const trainingHeaders = ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy'];
  const sheets = { '合宿参加者': makeSheet([participantHeaders, [2026, '夏', "'001234"]]), '合宿特訓入力': makeSheet([trainingHeaders]) };
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name], insertSheet: name => (sheets[name] = makeSheet()) }) };
  vm.runInContext('setupCampTrainingSheets()', context);
  vm.runInContext('setupCampTrainingSheets()', context);
  assert.equal(sheets['合宿参加者'].state.writes, 0);
  assert.equal(sheets['合宿参加者'].state.rows.length, 2);
  sheets['合宿参加者'].state.rows[0] = ['wrong'];
  assert.throws(() => vm.runInContext('setupCampTrainingSheets()', context));
  assert.equal(sheets['合宿参加者'].state.rows.length, 2);
});

test('セットアップは不足シートへ正しいヘッダーを作成する', () => {
  const sheets = {};
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null, insertSheet: name => (sheets[name] = makeSheet()) }) };
  const result = vm.runInContext('setupCampTrainingSheets()', context);
  assert.deepEqual(Array.from(result.createdSheets), ['合宿参加者', '合宿特訓入力']);
  assert.deepEqual(sheets['合宿参加者'].state.rows[0], ['year', 'season', 'studentId', 'updatedAt', 'updatedBy']);
  assert.deepEqual(sheets['合宿特訓入力'].state.rows[0], ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy']);
  vm.runInContext('setupCampTrainingSheets()', context);
  assert.equal(sheets['合宿参加者'].state.rows.length, 1);
  assert.equal(sheets['合宿特訓入力'].state.rows.length, 1);
});

test('同じ日別データを再保存しても重複行を作らない', () => {
  const headers = ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy'];
  const sheet = makeSheet([headers, [2026, '夏', 1, "'001234", 1, 1, 1, 1, 1, new Date(), 'admin']]);
  context.requireAdminSession = () => ({ userId: 'admin', role: 'admin' });
  context.getCampParticipantIds_ = () => new Set(['001234']);
  context.getCampSheet_ = () => sheet;
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  const request = '({action:"saveCampTrainingInput",year:2026,season:"夏",day:1,entries:[{studentId:"001234",japanese:2,math:2,english:2,social:2,science:2}]})';
  vm.runInContext(`handleCampAction_(${request})`, context);
  vm.runInContext(`handleCampAction_(${request})`, context);
  const matching = sheet.state.rows.slice(1).filter(row => Number(row[0]) === 2026 && row[1] === '夏' && Number(row[2]) === 1 && String(row[3]).replace(/^'/, '') === '001234');
  assert.equal(matching.length, 1);
  assert.deepEqual(matching[0].slice(4, 9), [2, 2, 2, 2, 2]);
});

test('参加者更新APIは重複した生徒コードを拒否する', () => {
  let released = false;
  context.requireAdminSession = () => ({ userId: 'admin', role: 'admin' });
  context.getActiveCampStudents_ = () => [{ studentId: '001234' }];
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => { released = true; } }) };
  assert.throws(() => vm.runInContext('handleCampAction_({action:"updateCampParticipants",year:2026,season:"夏",participantIds:["001234","001234"]})', context));
  assert.equal(released, true);
});

test('生徒マスターの重複コードと存在しない参加者コードを拒否する', () => {
  context.getActiveCampStudents_ = originalGetActiveCampStudents;
  context.getUserAuthContexts_ = () => [
    { userId: '001234', role: 'student', enabled: true, deleted: false },
    { userId: '001234', role: 'student', enabled: true, deleted: false }
  ];
  assert.throws(() => vm.runInContext('getActiveCampStudents_()', context));
  const headers = ['year', 'season', 'studentId', 'updatedAt', 'updatedBy'];
  const sheet = makeSheet([headers, [2026, '夏', "'009999"]]);
  context.getCampSheet_ = () => sheet;
  context.getActiveCampStudents_ = () => [{ studentId: '001234' }];
  context.getCampParticipantIds_ = originalGetCampParticipantIds;
  assert.throws(() => vm.runInContext('getCampParticipantIds_(2026, "夏")', context));
});

test('読取ロックは処理失敗時にも解放する', () => {
  let released = false;
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => { released = true; } }) };
  assert.throws(() => vm.runInContext('withCampReadLock_(() => { throw new Error("failed"); })', context));
  assert.equal(released, true);
});
