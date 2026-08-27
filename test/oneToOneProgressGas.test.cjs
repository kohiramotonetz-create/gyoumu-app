const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const generated = fs.readFileSync(path.join(__dirname, '..', 'gas', 'schoolUnits.generated.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const formatTokyoDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error, Utilities: { formatDate: formatTokyoDate } });
vm.runInContext(`${generated}\n${source}`, context);

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
