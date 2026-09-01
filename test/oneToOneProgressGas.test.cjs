const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const generated = fs.readFileSync(path.join(__dirname, '..', 'gas', 'schoolUnits.generated.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const formatTokyoDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error, Utilities: { formatDate: formatTokyoDate, getUuid: () => '00000000-0000-0000-0000-000000000000' } });
vm.runInContext(`${generated}\n${source}`, context);

function createTeacherHomeContext() {
  const homeContext = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error, Utilities: { formatDate: formatTokyoDate, getUuid: () => '00000000-0000-0000-0000-000000000000' } });
  vm.runInContext(`${generated}\n${source}`, homeContext);
  return homeContext;
}

test('GAS検証用単元軸はCSV順と同じ連番を返す', () => {
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', context);
  assert.ok(axis.length > 0);
  assert.deepEqual(Array.from(axis, unit => unit.unitOrder), Array.from({ length: axis.length }, (_, index) => index + 1));
});

test('ACTIVE履歴だけで学校・ネッツ最大位置を計算しVOIDを除外する', () => {
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', context);
  const eventHeaders = ['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId'];
  const unitHeaders = ['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot'];
  context.__sheets = {
    '1対1進捗イベント': { getDataRange: () => ({ getValues: () => [eventHeaders, ['e1','001200','math','school','',new Date('2026-08-20'),'t','ACTIVE','','','','','r1'], ['e2','001200','math','school','',new Date('2026-08-27'),'t','VOID','','','','','r2'], ['e3','001200','math','netz','',new Date('2026-08-27'),'t','ACTIVE','','','','','r3']] }) },
    '1対1進捗単元': { getDataRange: () => ({ getValues: () => [unitHeaders, ['e1',axis[2].unitId,3,'','','','',''], ['e2',axis[7].unitId,8,'','','','',''], ['e3',axis[1].unitId,2,'','','','',''], ['e3',axis[5].unitId,6,'','','','','']] }) }
  };
  const state = vm.runInContext('readOneToOneProgressState_("001200", "math", "中２", __sheets)', context);
  assert.equal(state.schoolCurrent.unitOrder, 3);
  assert.equal(state.netzCurrent.unitOrder, 6);
});

test('Matrix用読込contextは進捗シートを1回ずつ読み複数生徒で共有する', () => {
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("\u4e2d\uff12", "math")', context);
  const eventHeaders = ['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId','fieldId'];
  const unitHeaders = ['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot'];
  let eventReads = 0;
  let unitReads = 0;
  context.__sharedSheets = {
    '1対1進捗イベント': { getDataRange: () => ({ getValues: () => { eventReads += 1; return [eventHeaders, ['e1','001200','math','school','',new Date(),'t','ACTIVE','','','','','r1',''], ['e2','001201','math','netz','',new Date(),'t','ACTIVE','','','','','r2','']]; } }) },
    '1対1進捗単元': { getDataRange: () => ({ getValues: () => { unitReads += 1; return [unitHeaders, ['e1',axis[2].unitId,3,'','','','',''], ['e2',axis[4].unitId,5,'','','','','']]; } }) }
  };
  context.__sharedAxis = axis;
  context.__readContext = vm.runInContext('buildOneToOneProgressReadContext_(__sharedSheets)', context);
  context.__firstState = vm.runInContext('readOneToOneProgressState_("001200", "math", "\u4e2d\uff12", __sharedSheets, "", __readContext, __sharedAxis)', context);
  context.__secondState = vm.runInContext('readOneToOneProgressState_("001201", "math", "\u4e2d\uff12", __sharedSheets, "", __readContext, __sharedAxis)', context);
  assert.equal(eventReads, 1);
  assert.equal(unitReads, 1);
  assert.equal(context.__firstState.schoolCurrent.unitOrder, 3);
  assert.equal(context.__secondState.netzCurrent.unitOrder, 5);
});

test('性能診断helperは実データ行数と処理区間を計測し進捗シートを各1回だけ読む', () => {
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', context);
  const subjectRows = [['userId','subjectId','enabled','createdAt','updatedAt','updatedBy'], ['001200','math',true,'','',''], ['', '', '', '', '', '']];
  const eventRows = [['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId','fieldId'], ['e1','001200','math','school','',new Date(),'t','ACTIVE','','','','','r1',''], ['', '', '', '', '', '', '', '', '', '', '', '', '', '']];
  const unitRows = [['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot'], ['e1',axis[2].unitId,3,'','','','',''], ['', '', '', '', '', '', '', '']];
  let subjectReads = 0;
  let eventReads = 0;
  let unitReads = 0;
  const sheet = (rows, onRead) => ({
    getDataRange: () => ({ getValues: () => { onRead(); return rows; } }),
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length
  });
  context.__performanceSubjectSheet = sheet(subjectRows, () => { subjectReads += 1; });
  context.__performanceEventSheet = sheet(eventRows, () => { eventReads += 1; });
  context.__performanceUnitSheet = sheet(unitRows, () => { unitReads += 1; });
  vm.runInContext(`
    getUserAuthContexts_ = () => [{ userId: '001200', role: 'student', enabled: true, deleted: false, grade: '中２', school: '校舎A', name: '生徒', nameKana: 'セイト' }];
    assertOneToOneSubjectSheet_ = () => __performanceSubjectSheet;
    assertOneToOneProgressSheets_ = () => ({
      [ONE_TO_ONE_PROGRESS_EVENT_SHEET_NAME]: __performanceEventSheet,
      [ONE_TO_ONE_PROGRESS_UNIT_SHEET_NAME]: __performanceUnitSheet
    });
  `, context);
  const result = vm.runInContext('inspectOneToOneProgressPerformance_()', context);
  assert.equal(subjectReads, 1);
  assert.equal(eventReads, 1);
  assert.equal(unitReads, 1);
  assert.equal(result.sheets.subjects.actualDataRows, 1);
  assert.equal(result.sheets.events.actualDataRows, 1);
  assert.equal(result.sheets.progressUnits.actualDataRows, 1);
  assert.equal(result.scenarios.length, 1);
  assert.equal(result.scenarios[0].studentCount, 1);
  assert.equal(result.scenarios[0].subjectId, 'math');
  assert.equal(typeof result.timings.indexBuildMs, 'number');
  assert.equal(typeof result.scenarios[0].estimatedResponseBytes, 'number');
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /password|sessionToken|token/i);
  assert.doesNotMatch(serialized, /001200|生徒|セイト/);
});

test('Matrix診断IDは安全な値を維持し未指定・不正値にはサーバーIDを発行する', () => {
  assert.equal(vm.runInContext('normalizeOneToOneMatrixDiagnosticRequestId_("one_to_one_matrix_123_abcd")', context), 'one_to_one_matrix_123_abcd');
  assert.equal(vm.runInContext('normalizeOneToOneMatrixDiagnosticRequestId_("invalid id")', context), 'one_to_one_matrix_server_00000000000000000000000000000000');
  assert.equal(vm.runInContext('normalizeOneToOneMatrixDiagnosticRequestId_("")', context), 'one_to_one_matrix_server_00000000000000000000000000000000');
});

test('管理セッション診断はread・lookup・認証context・期限延長を分離しLock未使用を明示する', () => {
  let extendWrites = 0;
  context.__managementSheet = {
    getDataRange: () => ({ getValues: () => [['token','userId','role','expiresAt'], ['session-token','teacher1','teacher',new Date(Date.now() + 60000)]] }),
    getRange: () => ({ setValue: () => { extendWrites += 1; } })
  };
  vm.runInContext(`
    getRequiredSheet = () => __managementSheet;
    getUserAuthContexts_ = () => [{ userId: 'teacher1', role: 'teacher', enabled: true, deleted: false }];
    __authDiagnostics = {};
  `, context);
  const session = vm.runInContext('validateManagementSession("session-token", true, true, __authDiagnostics)', context);
  const diagnostics = context.__authDiagnostics;
  assert.equal(session.userId, 'teacher1');
  assert.equal(extendWrites, 1);
  for (const key of ['sessionReadMs', 'sessionLookupMs', 'authContextLoadMs', 'sessionExtendMs', 'lockWaitMs', 'authTotalMs']) assert.equal(typeof diagnostics[key], 'number');
  assert.equal(diagnostics.lockWaitMs, 0);
  assert.equal(diagnostics.lockUsed, false);
});

test('Detailは認証で取得したuserContextsと対象生徒を再利用してアカウントcontextを1回だけ読む', () => {
  const detailContext = createTeacherHomeContext();
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', detailContext);
  const actor = { userId: 'teacher1', role: 'teacher', enabled: true, deleted: false, assignedSchools: ['校舎A'] };
  const student = { userId: '001200', role: 'student', enabled: true, deleted: false, grade: '中２', school: '校舎A', name: '生徒', nameKana: 'セイト' };
  const subjectRows = [['userId','subjectId','enabled','createdAt','updatedAt','updatedBy'], ['001200','math',true,'','','']];
  const eventRows = [['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId','fieldId'], ['e1','001200','math','school','2026-09-01',new Date(),'teacher1','ACTIVE','','','','','r1','']];
  const unitRows = [['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot'], ['e1',axis[0].unitId,1,'','','','','']];
  const sheet = rows => ({
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getRange: (row, column, rowCount) => ({
      getValues: () => row === 1 ? [rows[0]] : rows.slice(row - 1, row - 1 + rowCount),
      setValue: () => {},
    }),
    getDataRange: () => ({ getValues: () => rows }),
  });
  detailContext.__actor = actor;
  detailContext.__student = student;
  detailContext.__managementSheet = sheet([['token','userId','role','expiresAt'], ['session-token','teacher1','teacher',new Date(Date.now() + 60000)]]);
  detailContext.__subjectSheet = sheet(subjectRows);
  detailContext.__eventSheet = sheet(eventRows);
  detailContext.__unitSheet = sheet(unitRows);
  vm.runInContext(`
    __userContextReads = 0;
    getRequiredSheet = () => __managementSheet;
    getUserAuthContexts_ = () => { __userContextReads += 1; return [__actor, __student]; };
    SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => ({
      [ONE_TO_ONE_SUBJECT_SHEET_NAME]: __subjectSheet,
      [ONE_TO_ONE_PROGRESS_EVENT_SHEET_NAME]: __eventSheet,
      [ONE_TO_ONE_PROGRESS_UNIT_SHEET_NAME]: __unitSheet
    })[name] }) };
    __detailTrace = { startedAt: Date.now(), timings: { apiKeyMs: 0 } };
    __detailResult = handleOneToOneProgressAction_({ action: 'getOneToOneProgressDetail', sessionToken: 'session-token', userId: '001200', subjectId: 'math', fieldId: '', __oneToOneDetailTrace: __detailTrace });
  `, detailContext);
  assert.equal(detailContext.__userContextReads, 1);
  assert.equal(detailContext.__detailResult.result, 'success');
  assert.equal(detailContext.__detailResult.schoolCurrentUnitId, axis[0].unitId);
  assert.deepEqual(Array.from(detailContext.__detailResult.netzHistory), []);
  const diagnostics = detailContext.__detailResult.diagnostics;
  for (const key of ['apiKeyMs', 'authMs', 'targetAndSubjectMs', 'axisMs', 'eventsReadMs', 'progressUnitsReadMs', 'processingMs', 'responseBuildMs', 'totalMs']) {
    assert.equal(typeof diagnostics[key], 'number');
    assert.ok(diagnostics[key] >= 0);
  }
  assert.equal(diagnostics.action, 'getOneToOneProgressDetail');
  assert.equal(diagnostics.eventsRows, 1);
  assert.equal(diagnostics.progressUnitsRows, 1);
  assert.equal(diagnostics.eventsReadCount, 1);
  assert.equal(diagnostics.progressUnitsReadCount, 1);
  assert.ok(Number.isInteger(diagnostics.eventsRows));
  assert.ok(Number.isInteger(diagnostics.progressUnitsRows));
  for (const secretKey of ['sessionToken', 'apiKey', 'password', 'userId', 'name']) assert.equal(Object.hasOwn(diagnostics, secretKey), false);
});

test('Matrix traceは認証・matrix・response段階と後方互換diagnosticsを持つ', () => {
  for (const stage of ['START', 'AUTH_START', 'AUTH_DONE', 'AUTH_ERROR', 'MATRIX_START', 'MATRIX_DONE', 'RESPONSE_START', 'RESPONSE_DONE']) {
    assert.match(source, new RegExp(`"${stage}"`));
  }
  for (const field of ['requestId', 'matrixElapsedMs', 'responseElapsedMs', 'serverTotalMs']) {
    assert.match(source, new RegExp(field));
  }
  assert.match(source, /Object\.assign\(\{\}, payload, \{ diagnostics \}\)/);
  assert.doesNotMatch(source, /logOneToOneMatrixTrace_\([^\n]*(?:sessionToken|userId|nameKana|password)/);
});

test('teacher/head-teacher/adminは担当外を含む単一校舎の生徒を利用できる', () => {
  context.validateManagementSession = (_token, _extend, include) => ({ userId: 'teacher1', role: 'teacher', userContexts: include ? [{ userId: 'teacher1', assignedSchools: ['校舎A'] }] : undefined });
  const session = vm.runInContext('requireOneToOneProgressSession_("token", true)', context);
  assert.equal(session.role, 'teacher');
  context.__session = session;
  context.__student = { userId: '001200', role: 'student', enabled: true, deleted: false, school: '校舎B' };
  for (const role of ['teacher', 'head-teacher', 'admin']) {
    context.__session.role = role;
    assert.doesNotThrow(() => vm.runInContext('assertOneToOneProgressStudentAccess_(__session, __student, true)', context));
  }
});

test('単一校舎は担当外も許可し、staffの複数校舎だけ担当範囲に制限する', () => {
  context.__session = { userId: 'teacher1', role: 'teacher', userContexts: [{ userId: 'teacher1', assignedSchools: ['校舎A', '校舎B'] }] };
  context.__data = { schools: ['校舎A'] };
  assert.deepEqual(Array.from(vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context)), ['校舎A']);
  context.__data = { schools: ['校舎C'] };
  assert.deepEqual(Array.from(vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context)), ['校舎C']);
  context.__data = { schools: ['校舎A', '校舎B'] };
  assert.deepEqual(Array.from(vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context)), ['校舎A', '校舎B']);
  context.__data = { schools: ['校舎A', '校舎C'] };
  assert.throws(() => vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context), /担当校舎の範囲内/);

  context.__session = { userId: 'head1', role: 'head-teacher', userContexts: [{ userId: 'head1', assignedSchools: ['校舎A', '校舎B'] }] };
  context.__data = { schools: ['校舎A', '校舎B'] };
  assert.doesNotThrow(() => vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context));
  context.__data = { schools: ['校舎A', '校舎C'] };
  assert.throws(() => vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context), /担当校舎の範囲内/);

  context.__session = { userId: 'admin', role: 'admin', userContexts: [] };
  assert.deepEqual(Array.from(vm.runInContext('resolveOneToOneProgressSchools_(__data, __session)', context)), ['校舎A', '校舎C']);
});

test('業務エラーはログアウト用認証エラーにせず、セッション失効だけを認証エラーにする', () => {
  assert.equal(vm.runInContext('getOneToOneProgressErrorCode_(new Error("複数校舎選択は担当校舎の範囲内で指定してください"))', context), 'VALIDATION_ERROR');
  assert.equal(vm.runInContext('getOneToOneProgressErrorCode_(new Error("対象生徒が見つかりません"))', context), 'VALIDATION_ERROR');
  assert.equal(vm.runInContext('getOneToOneProgressErrorCode_(new Error("管理セッションが無効または期限切れです"))', context), 'AUTHORIZATION_ERROR');
  assert.equal(vm.runInContext('getOneToOneProgressErrorCode_(new Error("1対1進捗の利用権限がありません"))', context), 'AUTHORIZATION_ERROR');
});

test('通常講師は訂正できず、adminだけVOID化できる', () => {
  context.__data = { eventId: 'e1', correctionReason: '入力誤り' };
  context.__teacher = { userId: 't1', role: 'teacher' };
  assert.throws(() => vm.runInContext('voidOneToOneProgressEvent_(__data, __teacher, "")', context), /管理者権限/);
});

test('学校は未登録区間だけを生成し、通常登録の後退を拒否する', () => {
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', context);
  context.__axis = axis;
  context.__to = axis[5].unitId;
  const selected = vm.runInContext('selectOneToOneSchoolProgressUnits_(__axis, 3, __to)', context);
  assert.deepEqual(Array.from(selected, unit => unit.unitOrder), [4, 5, 6]);
  context.__back = axis[1].unitId;
  assert.throws(() => vm.runInContext('selectOneToOneSchoolProgressUnits_(__axis, 3, __back)', context), /先を指定/);
});

test('ネッツは飛び飛び・過去復習を順序化し、同じ単元の別イベント利用を妨げない', () => {
  const axis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', context);
  context.__axis = axis;
  context.__ids = [axis[10].unitId, axis[2].unitId, axis[5].unitId];
  const selected = vm.runInContext('selectOneToOneNetzProgressUnits_(__axis, __ids)', context);
  assert.deepEqual(Array.from(selected, unit => unit.unitOrder), [3, 6, 11]);
  const repeatedLesson = vm.runInContext('selectOneToOneNetzProgressUnits_(__axis, [__ids[1]])', context);
  assert.equal(repeatedLesson[0].unitOrder, 3);
});

test('社会は歴史・地理・公民順の独立軸を持ち他分野unitIdを拒否する', () => {
  const fields = vm.runInContext('ONE_TO_ONE_SOCIAL_FIELDS', context);
  assert.deepEqual(Array.from(fields, field => field.fieldId), ['history', 'geography', 'civics']);
  const history = vm.runInContext('getOneToOneSchoolUnitAxis_("中３", "social", "history")', context);
  const geography = vm.runInContext('getOneToOneSchoolUnitAxis_("中３", "social", "geography")', context);
  const civics = vm.runInContext('getOneToOneSchoolUnitAxis_("中３", "social", "civics")', context);
  assert.ok(history.every(unit => unit.fieldId === 'history' && unit.grade === '中１中２中３'));
  assert.ok(geography.every(unit => unit.fieldId === 'geography'));
  assert.ok(civics.every(unit => unit.fieldId === 'civics'));
  context.__history = history;
  context.__foreignId = geography[0].unitId;
  assert.throws(() => vm.runInContext('selectOneToOneNetzProgressUnits_(__history, [__foreignId])', context), /不正/);
});

test('社会の現在位置とVOID再計算は分野間で相互干渉しない', () => {
  const history = vm.runInContext('getOneToOneSchoolUnitAxis_("中３", "social", "history")', context);
  const geography = vm.runInContext('getOneToOneSchoolUnitAxis_("中３", "social", "geography")', context);
  const civics = vm.runInContext('getOneToOneSchoolUnitAxis_("中３", "social", "civics")', context);
  const eventHeaders = ['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId','fieldId'];
  const unitHeaders = ['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot'];
  const events = [eventHeaders, ['h1','001200','social','school','',new Date(),'t','ACTIVE','','','','','r1','history'], ['h2','001200','social','netz','',new Date(),'t','VOID','','','','','r2','history'], ['g1','001200','social','school','',new Date(),'t','ACTIVE','','','','','r3','geography'], ['c1','001200','social','netz','',new Date(),'t','ACTIVE','','','','','r4','civics']];
  const units = [unitHeaders, ['h1',history[7].unitId,8,'','','','',''], ['h2',history[11].unitId,12,'','','','',''], ['g1',geography[4].unitId,5,'','','','',''], ['c1',civics[2].unitId,3,'','','','','']];
  context.__socialSheets = { '1対1進捗イベント': { getDataRange: () => ({ getValues: () => events }) }, '1対1進捗単元': { getDataRange: () => ({ getValues: () => units }) } };
  context.__h = vm.runInContext('readOneToOneProgressState_("001200", "social", "中３", __socialSheets, "history")', context);
  context.__g = vm.runInContext('readOneToOneProgressState_("001200", "social", "中３", __socialSheets, "geography")', context);
  context.__c = vm.runInContext('readOneToOneProgressState_("001200", "social", "中３", __socialSheets, "civics")', context);
  assert.equal(context.__h.schoolCurrent.unitOrder, 8);
  assert.equal(context.__h.netzCurrent, null);
  assert.equal(context.__g.schoolCurrent.unitOrder, 5);
  assert.equal(context.__g.netzCurrent, null);
  assert.equal(context.__c.schoolCurrent, null);
  assert.equal(context.__c.netzCurrent.unitOrder, 3);
});

test('lessonDateは日本時間の暦日をAPI境界で維持しrecordedAtは日時として分離する', () => {
  const cases = [
    ['2026-08-26T15:00:00.000Z', '2026-08-27'],
    ['2025-12-31T15:00:00.000Z', '2026-01-01'],
    ['2026-08-30T15:00:00.000Z', '2026-08-31'],
    ['2026-12-30T15:00:00.000Z', '2026-12-31']
  ];
  cases.forEach(([iso, expected]) => {
    context.__dateState = { fieldId: '', axis: [], schoolCurrent: null, netzCurrent: null, events: [{ eventId: 'e', progressType: 'school', lessonDate: new Date(iso), recordedAt: new Date('2026-08-27T01:23:45.000Z'), correctedAt: '', units: [] }] };
    const serialized = vm.runInContext('serializeOneToOneProgressState_(__dateState)', context);
    assert.equal(serialized.schoolHistory[0].lessonDate, expected);
    assert.equal(serialized.schoolHistory[0].recordedAt, '2026-08-27T01:23:45.000Z');
  });
  context.__dateState.events[0].lessonDate = '2026-08-27';
  const stringDate = vm.runInContext('serializeOneToOneProgressState_(__dateState)', context);
  assert.equal(stringDate.schoolHistory[0].lessonDate, '2026-08-27');
});

test('講師ホーム判定は符号付きネッツ差の全境界を分類する', () => {
  const homeContext = createTeacherHomeContext();
  const values = [-2, -1, 0, 1, 2, 3].map(value => vm.runInContext(`classifyTeacherHomeProgressDifference_(${value})`, homeContext));
  assert.deepEqual(Array.from(values), ['behind', 'behind', 'warning', 'warning', 'good', 'good']);
  assert.equal(vm.runInContext('classifyTeacherHomeProgressDifference_(NaN)', homeContext), null);
});

test('講師ホーム割合は0件を安全に扱い丸め後も100になる', () => {
  const homeContext = createTeacherHomeContext();
  const thirds = vm.runInContext('calculateTeacherHomeProgressPercentages_({ good: 1, warning: 1, behind: 1 })', homeContext);
  assert.deepEqual({ ...thirds }, { good: 34, warning: 33, behind: 33 });
  const mixed = vm.runInContext('calculateTeacherHomeProgressPercentages_({ good: 2, warning: 0, behind: 1 })', homeContext);
  assert.equal(Object.values(mixed).reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual({ ...vm.runInContext('calculateTeacherHomeProgressPercentages_({ good: 1, warning: 0, behind: 0 })', homeContext) }, { good: 100, warning: 0, behind: 0 });
  assert.deepEqual({ ...vm.runInContext('calculateTeacherHomeProgressPercentages_({ good: 0, warning: 8, behind: 0 })', homeContext) }, { good: 0, warning: 100, behind: 0 });
  assert.deepEqual({ ...vm.runInContext('calculateTeacherHomeProgressPercentages_({ good: 0, warning: 0, behind: 0 })', homeContext) }, { good: 0, warning: 0, behind: 0 });
});

test('講師ホームは両方未登録・片側未登録・不正単元を3分類へ含めない', () => {
  const homeContext = createTeacherHomeContext();
  homeContext.__unit = { unitId: 'u1', unitOrder: 1, unitName: '単元1' };
  assert.equal(vm.runInContext('buildTeacherHomeProgressComparison_({ schoolCurrent: null, netzCurrent: null }, {})', homeContext), null);
  assert.equal(vm.runInContext('buildTeacherHomeProgressComparison_({ schoolCurrent: __unit, netzCurrent: null }, {})', homeContext), null);
  assert.equal(vm.runInContext('buildTeacherHomeProgressComparison_({ schoolCurrent: null, netzCurrent: __unit }, {})', homeContext), null);
  homeContext.__invalid = { unitId: null, unitOrder: 999 };
  assert.equal(vm.runInContext('buildTeacherHomeProgressComparison_({ schoolCurrent: __invalid, netzCurrent: __unit }, {})', homeContext), null);
  assert.equal(vm.runInContext('getTeacherHomeProgressExcludedReason_([{ schoolCurrent: null, netzCurrent: null }], false)', homeContext), 'noProgress');
  assert.equal(vm.runInContext('getTeacherHomeProgressExcludedReason_([{ schoolCurrent: __unit, netzCurrent: null }], false)', homeContext), 'partialProgress');
  assert.equal(vm.runInContext('getTeacherHomeProgressExcludedReason_([{ schoolCurrent: __invalid, netzCurrent: __unit }], false)', homeContext), 'axisUnavailable');
  assert.equal(vm.runInContext('getTeacherHomeProgressExcludedReason_([], true)', homeContext), 'axisUnavailable');
});

test('講師ホームはroleに関係なくsession本人の全assignedSchoolsだけを使用する', () => {
  const homeContext = createTeacherHomeContext();
  for (const role of ['teacher', 'head-teacher', 'admin']) {
    homeContext.__session = { userId: 'staff', role, userContexts: [{ userId: 'staff', role, enabled: true, deleted: false, assignedSchools: ['校舎A', '校舎B', '校舎A'] }] };
    const schools = vm.runInContext('resolveTeacherHomeAssignedSchools_(__session)', homeContext);
    assert.deepEqual(Array.from(schools), ['校舎A', '校舎B']);
  }
  homeContext.__session = { userId: 'staff', role: 'admin', userContexts: [{ userId: 'staff', role: 'admin', enabled: true, deleted: false, assignedSchools: [] }] };
  assert.deepEqual(Array.from(vm.runInContext('resolveTeacherHomeAssignedSchools_(__session)', homeContext)), []);
});

test('講師ホーム集計は生徒×科目・社会最悪状態を1件で集計しシートを各1回だけ読む', () => {
  const homeContext = createTeacherHomeContext();
  const mathAxis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', homeContext);
  const englishAxis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "english")', homeContext);
  const socialAxes = Object.fromEntries(['history', 'geography', 'civics'].map(field => [field, vm.runInContext(`getOneToOneSchoolUnitAxis_("中２", "social", "${field}")`, homeContext)]));
  const subjectRows = [
    ['userId','subjectId','enabled','createdAt','updatedAt','updatedBy'],
    ['001200','math',true,'','',''], ['001200','english',true,'','',''], ['001200','social',true,'','',''],
    ['001201','math',true,'','',''], ['001202','math',true,'','',''], ['001203','math',true,'','',''],
    ['001204','math',true,'','',''], ['001205','math',true,'','',''], ['001207','math',true,'','','']
  ];
  const eventRows = [['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId','fieldId']];
  const unitRows = [['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot']];
  const addProgress = (eventId, userId, subjectId, type, axis, order, fieldId = '') => {
    eventRows.push([eventId,userId,subjectId,type,'',new Date(),'staff','ACTIVE','','','','',`r-${eventId}`,fieldId]);
    const unit = axis[order - 1];
    unitRows.push([eventId,unit.unitId,order,unit.textName,unit.chapter,unit.section,unit.unitName,unit.page]);
  };
  addProgress('m-s','001200','math','school',mathAxis,5); addProgress('m-n','001200','math','netz',mathAxis,7);
  addProgress('e-s','001200','english','school',englishAxis,5); addProgress('e-n','001200','english','netz',englishAxis,4);
  addProgress('h-s','001200','social','school',socialAxes.history,3,'history'); addProgress('h-n','001200','social','netz',socialAxes.history,5,'history');
  addProgress('g-s','001200','social','school',socialAxes.geography,4,'geography'); addProgress('g-n','001200','social','netz',socialAxes.geography,4,'geography');
  addProgress('c-s','001200','social','school',socialAxes.civics,5,'civics'); addProgress('c-n','001200','social','netz',socialAxes.civics,4,'civics');
  addProgress('p-s','001201','math','school',mathAxis,2);
  let subjectReads = 0; let eventReads = 0; let unitReads = 0;
  const sheet = (rows, counter) => ({ getDataRange: () => ({ getValues: () => { counter(); return rows; } }) });
  homeContext.__subjectSheet = sheet(subjectRows, () => { subjectReads += 1; });
  homeContext.__eventSheet = sheet(eventRows, () => { eventReads += 1; });
  homeContext.__unitSheet = sheet(unitRows, () => { unitReads += 1; });
  homeContext.__session = {
    userId: 'staff', role: 'admin', sessionExpiresAt: '2026-08-31T00:00:00.000Z',
    userContexts: [
      { userId: 'staff', role: 'admin', enabled: true, deleted: false, assignedSchools: ['校舎A'] },
      { userId: '001200', role: 'student', enabled: true, deleted: false, school: '校舎A', grade: '中２', name: '甲', nameKana: 'コウ' },
      { userId: '001201', role: 'student', enabled: true, deleted: false, school: '校舎A', grade: '中２', name: '乙', nameKana: 'オツ' },
      { userId: '001202', role: 'student', enabled: true, deleted: false, school: '校舎外', grade: '中２', name: '外', nameKana: 'ソト' },
      { userId: '001203', role: 'student', enabled: true, deleted: false, school: '校舎A', grade: '高１', name: '高', nameKana: 'コウ' },
      { userId: '001204', role: 'student', enabled: false, deleted: false, school: '校舎A', grade: '中２', name: '無効', nameKana: 'ムコウ' },
      { userId: '001205', role: 'student', enabled: true, deleted: true, school: '校舎A', grade: '中２', name: '削除', nameKana: 'サクジョ' },
      { userId: '001206', role: 'student', enabled: true, deleted: false, school: '校舎A', grade: '中２', name: '未受講', nameKana: 'ミジュコウ' },
      { userId: '001207', role: 'student', enabled: true, deleted: false, school: '校舎A', grade: '小６', name: '小学生', nameKana: 'ショウガクセイ' }
    ]
  };
  vm.runInContext(`
    assertOneToOneSubjectSheet_ = () => __subjectSheet;
    assertOneToOneProgressSheets_ = () => ({
      [ONE_TO_ONE_PROGRESS_EVENT_SHEET_NAME]: __eventSheet,
      [ONE_TO_ONE_PROGRESS_UNIT_SHEET_NAME]: __unitSheet
    });
  `, homeContext);
  const result = vm.runInContext('buildTeacherHomeProgressSummary_(__session)', homeContext);
  assert.equal(subjectReads, 1);
  assert.equal(eventReads, 1);
  assert.equal(unitReads, 1);
  assert.deepEqual({ ...result.summary.counts }, { good: 1, warning: 0, behind: 2 });
  assert.equal(result.summary.targetEntryCount, 4);
  assert.equal(result.summary.comparableEntryCount, 3);
  assert.equal(result.summary.excludedEntryCount, 1);
  assert.equal(result.excludedCounts.partialProgress, 1);
  assert.equal(result.items.filter(item => item.subjectId === 'social').length, 1);
  const social = result.items.find(item => item.subjectId === 'social');
  assert.equal(social.status, 'behind');
  assert.equal(social.comparisons.length, 3);
  assert.equal(result.items.some(item => ['001202', '001203', '001204', '001205', '001206', '001207'].includes(item.userId)), false);
  assert.equal(Object.values(result.summary.percentages).reduce((sum, value) => sum + value, 0), 100);
});

test('講師ホームは現行axisにないunitIdを保存済みunitOrderで復元せず比較不能にする', () => {
  const homeContext = createTeacherHomeContext();
  const mathAxis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "math")', homeContext);
  const englishAxis = vm.runInContext('getOneToOneSchoolUnitAxis_("中２", "english")', homeContext);
  const socialAxes = Object.fromEntries(['history', 'geography', 'civics'].map(field => [field, vm.runInContext(`getOneToOneSchoolUnitAxis_("中２", "social", "${field}")`, homeContext)]));
  const subjectRows = [
    ['userId','subjectId','enabled','createdAt','updatedAt','updatedBy'],
    ['001300','math',true,'','',''], ['001301','math',true,'','',''], ['001302','math',true,'','',''],
    ['001303','math',true,'','',''], ['001304','math',true,'','',''], ['001304','english',true,'','',''],
    ['001305','social',true,'','',''], ['001306','social',true,'','','']
  ];
  const eventRows = [['eventId','userId','subjectId','progressType','lessonDate','recordedAt','recordedBy','status','correctedAt','correctedBy','correctionReason','replacementEventId','requestId','fieldId']];
  const unitRows = [['eventId','unitId','unitOrder','textNameSnapshot','chapterSnapshot','sectionSnapshot','unitNameSnapshot','pageSnapshot']];
  const addProgress = (eventId, userId, subjectId, type, unitId, order, fieldId = '') => {
    eventRows.push([eventId,userId,subjectId,type,'',new Date(),'staff','ACTIVE','','','','',`r-${eventId}`,fieldId]);
    unitRows.push([eventId,unitId,order,'','','','','']);
  };
  const addInvalidPair = (userId, subjectId, fieldId = '') => {
    addProgress(`${userId}-${fieldId}-s`, userId, subjectId, 'school', `invalid-${userId}-${fieldId}-school`, 5, fieldId);
    addProgress(`${userId}-${fieldId}-n`, userId, subjectId, 'netz', `invalid-${userId}-${fieldId}-netz`, 7, fieldId);
  };

  addProgress('school-invalid-s','001300','math','school','invalid-school-unit',5);
  addProgress('school-invalid-n','001300','math','netz',mathAxis[6].unitId,7);
  addProgress('netz-invalid-s','001301','math','school',mathAxis[4].unitId,5);
  addProgress('netz-invalid-n','001301','math','netz','invalid-netz-unit',7);
  addInvalidPair('001302','math');
  addProgress('valid-s','001303','math','school',mathAxis[4].unitId,5);
  addProgress('valid-n','001303','math','netz',mathAxis[6].unitId,7);
  addInvalidPair('001304','math');
  addProgress('other-valid-s','001304','english','school',englishAxis[1].unitId,2);
  addProgress('other-valid-n','001304','english','netz',englishAxis[3].unitId,4);
  addInvalidPair('001305','social','history');
  addProgress('social-g-s','001305','social','school',socialAxes.geography[1].unitId,2,'geography');
  addProgress('social-g-n','001305','social','netz',socialAxes.geography[3].unitId,4,'geography');
  addProgress('social-c-s','001305','social','school',socialAxes.civics[3].unitId,4,'civics');
  addProgress('social-c-n','001305','social','netz',socialAxes.civics[4].unitId,5,'civics');
  ['history', 'geography', 'civics'].forEach(field => addInvalidPair('001306','social',field));

  const sheet = rows => ({ getDataRange: () => ({ getValues: () => rows }) });
  homeContext.__subjectSheet = sheet(subjectRows);
  homeContext.__eventSheet = sheet(eventRows);
  homeContext.__unitSheet = sheet(unitRows);
  homeContext.__mathAxis = mathAxis;
  homeContext.__session = {
    userId: 'staff', role: 'teacher', sessionExpiresAt: '2026-08-31T00:00:00.000Z',
    userContexts: [
      { userId: 'staff', role: 'teacher', enabled: true, deleted: false, assignedSchools: ['校舎A'] },
      ...['001300','001301','001302','001303','001304','001305','001306'].map((userId, index) => ({ userId, role: 'student', enabled: true, deleted: false, school: '校舎A', grade: '中２', name: `生徒${index}`, nameKana: `セイト${index}` }))
    ]
  };
  vm.runInContext(`
    assertOneToOneSubjectSheet_ = () => __subjectSheet;
    assertOneToOneProgressSheets_ = () => ({
      [ONE_TO_ONE_PROGRESS_EVENT_SHEET_NAME]: __eventSheet,
      [ONE_TO_ONE_PROGRESS_UNIT_SHEET_NAME]: __unitSheet
    });
    __strictReadContext = buildOneToOneProgressReadContext_({
      [ONE_TO_ONE_PROGRESS_EVENT_SHEET_NAME]: __eventSheet,
      [ONE_TO_ONE_PROGRESS_UNIT_SHEET_NAME]: __unitSheet
    });
  `, homeContext);

  homeContext.__schoolInvalid = vm.runInContext('readTeacherHomeProgressStateStrict_("001300", "math", "", __strictReadContext, __mathAxis)', homeContext);
  homeContext.__netzInvalid = vm.runInContext('readTeacherHomeProgressStateStrict_("001301", "math", "", __strictReadContext, __mathAxis)', homeContext);
  homeContext.__bothInvalid = vm.runInContext('readTeacherHomeProgressStateStrict_("001302", "math", "", __strictReadContext, __mathAxis)', homeContext);
  homeContext.__valid = vm.runInContext('readTeacherHomeProgressStateStrict_("001303", "math", "", __strictReadContext, __mathAxis)', homeContext);
  assert.equal(homeContext.__schoolInvalid.schoolCurrent, null);
  assert.equal(homeContext.__schoolInvalid.netzCurrent.unitOrder, 7);
  assert.equal(homeContext.__netzInvalid.schoolCurrent.unitOrder, 5);
  assert.equal(homeContext.__netzInvalid.netzCurrent, null);
  assert.equal(homeContext.__bothInvalid.schoolCurrent, null);
  assert.equal(homeContext.__bothInvalid.netzCurrent, null);
  assert.equal(homeContext.__valid.schoolCurrent.unitOrder, 5);
  assert.equal(homeContext.__valid.netzCurrent.unitOrder, 7);

  const result = vm.runInContext('buildTeacherHomeProgressSummary_(__session)', homeContext);
  assert.equal(result.summary.targetEntryCount, 8);
  assert.equal(result.summary.comparableEntryCount, 3);
  assert.equal(result.summary.excludedEntryCount, 5);
  assert.deepEqual({ ...result.summary.counts }, { good: 2, warning: 1, behind: 0 });
  assert.equal(result.excludedCounts.axisUnavailable, 5);
  assert.equal(result.items.some(item => ['001300','001301','001302'].includes(item.userId) || (item.userId === '001304' && item.subjectId === 'math') || item.userId === '001306'), false);
  assert.equal(result.items.some(item => item.userId === '001304' && item.subjectId === 'english' && item.status === 'good'), true);
  const social = result.items.find(item => item.userId === '001305' && item.subjectId === 'social');
  assert.equal(social.status, 'warning');
  assert.equal(social.comparisons.length, 2);
  assert.equal(Object.values(result.summary.counts).reduce((sum, value) => sum + value, 0), result.summary.comparableEntryCount);
  assert.equal(Object.values(result.summary.percentages).reduce((sum, value) => sum + value, 0), 100);

  const matrixCompatibleState = vm.runInContext('readOneToOneProgressState_("001300", "math", "中２", {}, "", __strictReadContext, __mathAxis)', homeContext);
  assert.equal(matrixCompatibleState.schoolCurrent.unitOrder, 5);
});

test('講師ホームactionはmanagement sessionを必須にしstudentを拒否する', () => {
  const homeContext = createTeacherHomeContext();
  homeContext.validateManagementSession = () => ({ userId: 'student', role: 'student', userContexts: [] });
  assert.throws(() => vm.runInContext('handleTeacherHomeProgressAction_({ sessionToken: "token" })', homeContext), /利用権限/);
  assert.match(source, /data\.action === "getTeacherHomeProgressSummary"/);
  assert.match(source, /handleTeacherHomeProgressAction_\(data\)/);
});
