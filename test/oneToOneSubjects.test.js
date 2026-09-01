import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ONE_TO_ONE_SUBJECTS, areSameOneToOneSubjects, normalizeOneToOneSubjectIds, toggleOneToOneSubject } from '../src/utils/oneToOneSubjects.js';

test('1対1受講科目は正式IDと表示順を共通定義する', () => {
  assert.deepEqual(ONE_TO_ONE_SUBJECTS.map(subject => subject.subjectId), ['english', 'math', 'japanese', 'science', 'social']);
  assert.deepEqual(ONE_TO_ONE_SUBJECTS.map(subject => subject.label), ['英語', '数学', '国語', '理科', '社会']);
});

test('登録済み科目を正規化し、不正IDと重複を除外する', () => {
  assert.deepEqual(normalizeOneToOneSubjectIds(['social', 'english', 'invalid', 'english']), ['english', 'social']);
  assert.deepEqual(normalizeOneToOneSubjectIds(null), []);
});

test('チェック追加・解除は他科目へ影響せず未保存判定できる', () => {
  const original = ['english'];
  const added = toggleOneToOneSubject(original, 'math');
  assert.deepEqual(original, ['english']);
  assert.deepEqual(added, ['english', 'math']);
  assert.deepEqual(toggleOneToOneSubject(added, 'english'), ['math']);
  assert.equal(areSameOneToOneSubjects(['math', 'english'], ['english', 'math']), true);
  assert.equal(areSameOneToOneSubjects(['english'], ['english', 'math']), false);
});

test('生徒詳細は取得・チェック編集・専用保存APIを使用する', () => {
  const source = fs.readFileSync(new URL('../src/components/StudentAccountDetail.jsx', import.meta.url), 'utf8');
  assert.match(source, /action: 'getOneToOneSubjects'/);
  assert.match(source, /action: 'updateOneToOneSubjects'/);
  assert.match(source, /ONE_TO_ONE_SUBJECTS\.map/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /subjectsLoadFailed/);
  assert.doesNotMatch(source, /updateStudentAccount[^\n]+subjectIds/);
});

test('GASは専用シート・先頭0・enabled無効化・admin専用actionを定義する', () => {
  const source = fs.readFileSync(new URL('../gas/コード.js', import.meta.url), 'utf8');
  assert.match(source, /ONE_TO_ONE_SUBJECT_HEADERS = \["userId", "subjectId", "enabled", "createdAt", "updatedAt", "updatedBy"\]/);
  assert.match(source, /function setupOneToOneSubjectSheet\(\)/);
  assert.match(source, /setNumberFormat\("@"\)/);
  assert.match(source, /ONE_TO_ONE_SUBJECT_IDS\.map\(subjectId => \[formatUserIdForSheet/);
  assert.match(source, /enabled\.has\(subjectId\)/);
  assert.match(source, /function getOneToOneSubjects\(userId, userContexts, providedTarget\)/);
  assert.match(source, /const admin = requireAdminSession\(data\.sessionToken\)/);
  assert.match(source, /"getOneToOneSubjects", "updateOneToOneSubjects"/);
});
