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
const originalRequireAdminSession = context.requireAdminSession;
const originalGetCampSheet = context.getCampSheet_;
const originalBuildCampRanking = context.buildCampRanking_;

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

test('シートがない場合と空の場合は現在年度を返す', () => {
  const participantHeaders = ['year', 'season', 'studentId', 'updatedAt', 'updatedBy'];
  const trainingHeaders = ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy'];
  const sheets = {};
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null }) };
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context)), [2026]);
  sheets['合宿参加者'] = makeSheet([participantHeaders]);
  sheets['合宿特訓入力'] = makeSheet([trainingHeaders]);
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context)), [2026]);
});

test('片方または両方のシートから履歴年度を重複排除して降順で返す', () => {
  const participantHeaders = ['year', 'season', 'studentId', 'updatedAt', 'updatedBy'];
  const trainingHeaders = ['year', 'season', 'day', 'studentId', 'japanese', 'math', 'english', 'social', 'science', 'updatedAt', 'updatedBy'];
  const sheets = {};
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null }) };
  sheets['合宿参加者'] = makeSheet([participantHeaders, [2025, '夏', "'001234"], [2027, '冬', "'001235"]]);
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context)), [2027, 2026, 2025]);
  delete sheets['合宿参加者'];
  sheets['合宿特訓入力'] = makeSheet([trainingHeaders, [2024, '夏', 1, "'001234", 1, 2, 3, 4, 5]]);
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context)), [2026, 2024]);
  sheets['合宿参加者'] = makeSheet([participantHeaders, [2025, '夏', "'001234"], [2027, '冬', "'001235"]]);
  sheets['合宿特訓入力'] = makeSheet([trainingHeaders, [2026, '夏', 1, "'001234", 1, 2, 3, 4, 5], [2025, '夏', 1, "'001234", 1, 2, 3, 4, 5]]);
  assert.deepEqual(Array.from(vm.runInContext('getCampAvailableYears_(new Date(2026, 2, 31))', context)), [2027, 2026, 2025]);
  sheets['合宿参加者'].state.rows.push(['不正年度', '夏', "'001234"]);
  assert.throws(() => vm.runInContext('getCampAvailableYears_(new Date(2026, 3, 1))', context));
});

test('年度候補APIはadminとhead-teacherを許可しteacherと不正セッションを拒否する', () => {
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: () => null }) };
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  for (const role of ['admin', 'head-teacher']) {
    context.validateManagementSession = () => ({ userId: role, role });
    const result = vm.runInContext('handleCampAction_({action:"getCampAvailableYears",sessionToken:"token"})', context);
    assert.equal(result.result, 'success');
  }
  context.validateManagementSession = () => ({ userId: 'teacher', role: 'teacher' });
  assert.throws(() => vm.runInContext('handleCampAction_({action:"getCampAvailableYears",sessionToken:"token"})', context));
  context.validateManagementSession = () => { throw new Error('管理セッションが無効または期限切れです'); };
  assert.throws(() => vm.runInContext('handleCampAction_({action:"getCampAvailableYears",sessionToken:"invalid"})', context));
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
  const userContexts = [{ userId: 'admin', role: 'admin' }, { userId: '001234', role: 'student', enabled: true, deleted: false }];
  context.requirePrivilegedStaffSession_ = () => ({ userId: 'admin', role: 'admin', userContexts });
  context.getActiveCampStudents_ = originalGetActiveCampStudents;
  context.buildCampRanking_ = (year, season, mode, activeStudents) => {
    received = { year, season, mode, activeStudents };
    return [{ studentId: '001234' }];
  };
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  const result = vm.runInContext('handleCampAction_({action:"getCampTrainingInput",year:2027,season:"冬",day:3,sessionToken:"token"})', context);
  assert.deepEqual(
    { year: received.year, season: received.season, mode: received.mode, studentIds: Array.from(received.activeStudents, student => student.studentId) },
    { year: 2027, season: '冬', mode: '3', studentIds: ['001234'] }
  );
  assert.equal(result.rows[0].studentId, '001234');
});

test('入力ランキングは認証時に取得済みの生徒一覧を再利用する', () => {
  const activeStudents = [{ studentId: '000001', role: 'student', enabled: true, deleted: false }];
  let fallbackReads = 0;
  let participantStudents = null;
  context.getActiveCampStudents_ = originalGetActiveCampStudents;
  context.getUserAuthContexts_ = () => { fallbackReads++; return []; };
  context.getCampParticipantIds_ = (year, season, students) => {
    participantStudents = students;
    return new Set(['000001']);
  };
  context.getCampTrainingRecords_ = () => [];
  context.buildCampRanking_ = originalBuildCampRanking;
  const rows = vm.runInContext('buildCampRanking_(2026, "夏", "1", activeStudents)', Object.assign(context, { activeStudents }));
  assert.equal(fallbackReads, 0);
  assert.equal(participantStudents, activeStudents);
  assert.deepEqual(Array.from(rows, row => [row.studentId, row.total, row.rank]), [['000001', 0, 1]]);
});

test('最適化経路と従来フォールバック経路は13人・1～4日目で同じ行を返す', () => {
  const students = Array.from({ length: 14 }, (_, index) => {
    const studentId = String(index + 1).padStart(6, '0');
    return { studentId, name: `生徒${index + 1}`, nameKana: `セイト${String(index + 1).padStart(2, '0')}`, school: index % 2 ? '木太南' : '栗林', grade: '中３' };
  });
  const participantIds = new Set(students.slice(0, 13).map(student => student.studentId));
  let records = [
    { day: 1, studentId: '000001', japanese: 0, math: 0, english: 0, social: 0, science: 0 },
    { day: 1, studentId: '000002', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 1, studentId: '000003', japanese: 10, math: 0, english: 0, social: 0, science: 0 },
    { day: 2, studentId: '000001', japanese: 10, math: 2, english: 3, social: 4, science: 5 },
    { day: 2, studentId: '000002', japanese: 0, math: 0, english: 0, social: 0, science: 0 },
    ...students.slice(0, 13).map((student, index) => ({ day: 3, studentId: student.studentId, japanese: index, math: index + 1, english: index + 2, social: index + 3, science: index + 4 })),
    { day: 3, studentId: '000014', japanese: 999, math: 999, english: 999, social: 999, science: 999 }
  ];
  context.getActiveCampStudents_ = () => students;
  context.getCampParticipantIds_ = () => participantIds;
  context.getCampTrainingRecords_ = () => records;
  context.buildCampRanking_ = originalBuildCampRanking;
  const comparable = rows => JSON.parse(JSON.stringify(Array.from(rows, row => ({
    studentId: row.studentId, name: row.name, nameKana: row.nameKana, school: row.school,
    japanese: row.japanese, math: row.math, english: row.english, social: row.social, science: row.science,
    total: row.total, rank: row.rank, rankChange: row.rankChange, hasData: row.hasData
  }))));
  for (const day of [1, 2, 3, 4]) {
    const fallback = vm.runInContext(`buildCampRanking_(2026, "夏", "${day}")`, context);
    context.preloadedStudents = students;
    const optimized = vm.runInContext(`buildCampRanking_(2026, "夏", "${day}", preloadedStudents)`, context);
    assert.deepEqual(comparable(optimized), comparable(fallback));
    assert.equal(optimized.length, 13);
  }
  records = [];
  const zeroRows = vm.runInContext('buildCampRanking_(2026, "夏", "1", preloadedStudents)', context);
  assert.equal(zeroRows.length, 13);
  assert.equal(zeroRows.every(row => row.total === 0 && row.hasData === false), true);
});

test('入力取得の正常経路はマスターを1回だけ取得し各合宿シートとランキングとロックを1回使う', () => {
  const userContexts = [
    { userId: 'admin', role: 'admin', enabled: true, deleted: false },
    { userId: '000001', role: 'student', enabled: true, deleted: false, name: 'A', nameKana: 'エー', school: '栗林', grade: '中３' }
  ];
  const counts = { masterSets: 0, fallbackMasterSets: 0, participants: 0, inputs: 0, rankings: 0, locks: 0, releases: 0 };
  context.requirePrivilegedStaffSession_ = () => { counts.masterSets++; return { userId: 'admin', role: 'admin', userContexts }; };
  context.getUserAuthContexts_ = () => { counts.fallbackMasterSets++; return []; };
  context.getActiveCampStudents_ = originalGetActiveCampStudents;
  context.getCampParticipantIds_ = () => { counts.participants++; return new Set(['000001']); };
  context.getCampTrainingRecords_ = () => { counts.inputs++; return []; };
  context.buildCampRanking_ = (...args) => { counts.rankings++; return originalBuildCampRanking(...args); };
  context.LockService = { getDocumentLock: () => ({ tryLock: () => { counts.locks++; return true; }, releaseLock: () => { counts.releases++; } }) };
  const result = vm.runInContext('handleCampAction_({action:"getCampTrainingInput",year:2026,season:"夏",day:1,sessionToken:"token"})', context);
  assert.equal(result.result, 'success');
  assert.equal(result.rows.length, 1);
  assert.deepEqual(counts, { masterSets: 1, fallbackMasterSets: 0, participants: 1, inputs: 1, rankings: 1, locks: 1, releases: 1 });
});

test('入力取得APIはhead-teacherとgeneralを許可しteacherを拒否する', () => {
  context.requirePrivilegedStaffSession_ = () => ({ userId: 'staff', role: 'head-teacher', userContexts: [] });
  assert.doesNotThrow(() => vm.runInContext('handleCampAction_({action:"getCampTrainingInput",year:2026,season:"夏",day:1,sessionToken:"token"})', context));
  context.requirePrivilegedStaffSession_ = () => { throw new Error('閲覧権限が必要です'); };
  assert.throws(() => vm.runInContext('handleCampAction_({action:"getCampTrainingInput",year:2026,season:"夏",day:1,sessionToken:"token"})', context), /閲覧権限/);
  context.requirePrivilegedStaffSession_ = () => ({ userId: 'admin', role: 'admin' });
});

test('合宿シート未作成は専用エラーコードで判別できる', () => {
  context.getCampSheet_ = originalGetCampSheet;
  context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: () => null }) };
  assert.throws(
    () => vm.runInContext('getCampSheet_("合宿参加者", CAMP_PARTICIPANT_HEADERS)', context),
    error => error.code === 'CAMP_SETUP_REQUIRED'
  );
  assert.equal(vm.runInContext('getCampApiErrorCode_(({code:"CAMP_SETUP_REQUIRED",message:"合宿管理用シートが未セットアップです"}))', context), 'CAMP_SETUP_REQUIRED');
  assert.equal(vm.runInContext('getCampApiErrorCode_(new Error("管理セッションが無効です"))', context), 'AUTHORIZATION_ERROR');
  assert.equal(vm.runInContext('getCampApiErrorCode_(new Error("年度が不正です"))', context), 'VALIDATION_ERROR');
});

test('参加者がいれば入力済みデータ0件でも0の入力行を返す', () => {
  context.buildCampRanking_ = originalBuildCampRanking;
  context.getCampParticipantIds_ = () => new Set(['000001']);
  context.getActiveCampStudents_ = () => [{ studentId: '000001', name: 'A' }];
  context.getCampTrainingRecords_ = () => [];
  const rows = vm.runInContext('buildCampRanking_(2026, "夏", "1")', context);
  assert.deepEqual(Array.from(rows, row => [row.studentId, row.total, row.japanese, row.rank]), [['000001', 0, 0, 1]]);
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
  sheet.state.rows = [headers, [2026, '夏', '']];
  assert.throws(() => vm.runInContext('getCampParticipantIds_(2026, "夏")', context));
  sheet.state.rows = [headers, [2026, '夏', "'001234"], [2026, '夏', "'001234"]];
  assert.throws(() => vm.runInContext('getCampParticipantIds_(2026, "夏")', context));
});

test('読取ロックは処理失敗時にも解放する', () => {
  let released = false;
  context.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => { released = true; } }) };
  assert.throws(() => vm.runInContext('withCampReadLock_(() => { throw new Error("failed"); })', context));
  assert.equal(released, true);
});
