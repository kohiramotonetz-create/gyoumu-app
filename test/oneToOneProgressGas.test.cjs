const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const generated = fs.readFileSync(path.join(__dirname, '..', 'gas', 'schoolUnits.generated.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error });
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

test('teacher/head-teacher/adminだけ利用しteacherの担当校舎外を拒否する', () => {
  context.validateManagementSession = (_token, _extend, include) => ({ userId: 'teacher1', role: 'teacher', userContexts: include ? [{ userId: 'teacher1', assignedSchools: ['校舎A'] }] : undefined });
  const session = vm.runInContext('requireOneToOneProgressSession_("token", true)', context);
  assert.equal(session.role, 'teacher');
  context.__session = session;
  context.__student = { userId: '001200', role: 'student', enabled: true, deleted: false, school: '校舎B' };
  assert.throws(() => vm.runInContext('assertOneToOneProgressStudentAccess_(__session, __student, true)', context), /担当外/);
  context.__session.role = 'admin';
  assert.doesNotThrow(() => vm.runInContext('assertOneToOneProgressStudentAccess_(__session, __student, true)', context));
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
