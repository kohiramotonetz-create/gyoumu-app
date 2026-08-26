import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  areSameContentIds,
  getStudentsWithUnsavedChanges,
  getSukimakunPresetContentIds,
  replaceStudentContentIds,
  saveSukimakunPermissionsSequentially
} from '../src/utils/sukimakunPermissions.js';

const contents = [
  { contentId: 'junior', juniorHighMode: true, highSchoolMode: false },
  { contentId: 'high', juniorHighMode: false, highSchoolMode: true },
  { contentId: 'both', juniorHighMode: true, highSchoolMode: true },
  { contentId: 'unset' }
];

test('中学生・高校生プリセットはシート由来のTRUE対象だけを選択する', () => {
  assert.deepEqual(getSukimakunPresetContentIds(contents, 'juniorHighMode'), ['junior', 'both']);
  assert.deepEqual(getSukimakunPresetContentIds(contents, 'highSchoolMode'), ['high', 'both']);
});

test('プリセット適用は対象生徒だけを置換し、他の生徒と元stateを変更しない', () => {
  const current = { studentA: ['old'], studentB: ['keep'] };
  const next = replaceStudentContentIds(current, 'studentA', ['junior', 'both']);

  assert.deepEqual(next, { studentA: ['junior', 'both'], studentB: ['keep'] });
  assert.deepEqual(current, { studentA: ['old'], studentB: ['keep'] });
});

test('管理画面はプリセットをstateだけへ適用し、既存保存APIと個別変更を維持する', () => {
  const source = fs.readFileSync(new URL('../src/components/SukimakunPermissionManager.jsx', import.meta.url), 'utf8');
  const presetBody = source.match(/const applyModePreset = \([\s\S]*?\n {2}};/)?.[0] || '';

  assert.match(source, /applyModePreset\(student\.userId, 'juniorHighMode'/);
  assert.match(source, /applyModePreset\(student\.userId, 'highSchoolMode'/);
  assert.match(source, /width: '210px', minWidth: '210px', maxWidth: '210px'/);
  assert.match(source, /width: 'auto', flex: '1 1 90px'/);
  assert.match(presetBody, /setEditingByStudentId/);
  assert.doesNotMatch(presetBody, /postAction|updateSukimakunPermissions/);
  assert.match(source, /onChange=\{\(\) => toggleContent\(student\.userId, content\.contentId\)\}/);
  assert.match(source, /postAction\('updateSukimakunPermissions'/);
  assert.match(source, /allowedContentIds: editingContentIds/);
});

test('表示中の保存済み値と編集値の差分がある生徒だけを一括保存対象にする', () => {
  const students = [
    { userId: 'a', allowedContentIds: ['one', 'two'] },
    { userId: 'b', allowedContentIds: ['one'] },
    { userId: 'c', allowedContentIds: [] }
  ];
  const editing = { a: ['two', 'one'], b: ['two'], c: [] };

  assert.equal(areSameContentIds(students[0].allowedContentIds, editing.a), true);
  assert.deepEqual(getStudentsWithUnsavedChanges(students, editing).map(student => student.userId), ['b']);
  assert.equal(getStudentsWithUnsavedChanges(students.slice(0, 1), editing).length, 0);
  assert.equal(getStudentsWithUnsavedChanges(students, { a: [], b: [], c: ['one'] }).length, 3);
});

test('一括保存は逐次実行し、一部失敗後の再保存では失敗者だけを対象にできる', async () => {
  const students = [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }];
  const calls = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const firstResults = await saveSukimakunPermissionsSequentially(students, async student => {
    calls.push(student.userId);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await Promise.resolve();
    inFlight -= 1;
    if (student.userId === 'b') throw new Error('failed');
    return ['saved'];
  });

  assert.deepEqual(calls, ['a', 'b', 'c']);
  assert.equal(maxInFlight, 1);
  assert.deepEqual(firstResults.map(result => result.success), [true, false, true]);
  const retryTargets = firstResults.filter(result => !result.success).map(result => result.student);
  const retryCalls = [];
  const retryResults = await saveSukimakunPermissionsSequentially(retryTargets, async student => {
    retryCalls.push(student.userId);
  });
  assert.deepEqual(retryCalls, ['b']);
  assert.equal(retryResults[0].success, true);
});

test('管理画面は最下部の一括保存UIと二重送信防止を持つ', () => {
  const source = fs.readFileSync(new URL('../src/components/SukimakunPermissionManager.jsx', import.meta.url), 'utf8');

  assert.match(source, /getStudentsWithUnsavedChanges\(filteredStudents, editingByStudentId\)/);
  assert.match(source, /未保存の変更：\{unsavedStudents\.length\}人/);
  assert.match(source, /一括保存（\$\{unsavedStudents\.length\}人）/);
  assert.match(source, /saveSukimakunPermissionsSequentially\(targets, async student/);
  assert.match(source, /await persistStudentPermissions\(student\)/);
  assert.match(source, /disabled=\{bulkSaving \|\| sessionExpired \|\| unsavedStudents\.length === 0\}/);
  assert.match(source, /disabled=\{isSaving \|\| bulkSaving \|\| sessionExpired \|\| !needsSave\}/);
  assert.match(source, /if \(bulkSaveInProgressRef\.current \|\| unsavedStudents\.length === 0\) return/);
});
