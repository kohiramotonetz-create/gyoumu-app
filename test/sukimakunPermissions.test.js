import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getSukimakunPresetContentIds, replaceStudentContentIds } from '../src/utils/sukimakunPermissions.js';

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
  assert.match(presetBody, /setEditingByStudentId/);
  assert.doesNotMatch(presetBody, /postAction|updateSukimakunPermissions/);
  assert.match(source, /onChange=\{\(\) => toggleContent\(student\.userId, content\.contentId\)\}/);
  assert.match(source, /postAction\('updateSukimakunPermissions'/);
  assert.match(source, /allowedContentIds: editingContentIds/);
});
