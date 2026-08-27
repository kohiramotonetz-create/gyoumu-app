import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildStudentProfileHash, parseStudentProfileHash } from '../src/utils/studentProfileNavigation.js';
import { parseKoToreUnitsCsv } from '../src/utils/kotoreProfile.js';

test('プロフィールHashは先頭0を維持してsourceを往復する', () => {
  const hash = buildStudentProfileHash('037071', 'kotore-progress');
  assert.equal(hash, '#/student/037071?source=kotore-progress');
  assert.deepEqual(parseStudentProfileHash(hash), { userId: '037071', source: 'kotore-progress' });
  assert.equal(buildStudentProfileHash('37071'), '');
  assert.equal(parseStudentProfileHash('#/student/../../admin'), null);
});

test('プロフィールは共通リンクとHash navigationを使用する', () => {
  const teacher = fs.readFileSync(new URL('../src/TeacherView.jsx', import.meta.url), 'utf8');
  const link = fs.readFileSync(new URL('../src/components/common/StudentProfileLink.jsx', import.meta.url), 'utf8');
  assert.match(teacher, /parseStudentProfileHash/);
  assert.match(teacher, /hashchange/);
  assert.match(link, /<a href=\{href\}/);
});

test('初期5画面の生徒名はプロフィールリンクを共用する', () => {
  const files = ['OneToOneProgressManager.jsx', 'KoToreProgressTracker.jsx', 'SchoolProgressManager.jsx', 'SukimakunPermissionManager.jsx', 'StudentAccountList.jsx'];
  files.forEach(file => assert.match(fs.readFileSync(new URL(`../src/components/${file}`, import.meta.url), 'utf8'), /StudentProfileLink/));
});

test('プロフィールはカード別action・loading・再試行を持つ', () => {
  const source = fs.readFileSync(new URL('../src/components/StudentProfileView.jsx', import.meta.url), 'utf8');
  ['getStudentProfileSummary', 'getStudentProfileKoTore', 'getStudentProfileSukimakun', 'getStudentProfileOneToOne', 'getStudentProfileAcademicResults'].forEach(action => assert.match(source, new RegExp(action)));
  assert.match(source, /再試行/);
  assert.match(source, /OneToOneSubjectProgress/);
});

test('個トレ単元CSVは教材軸の順序と表示情報を保持する', () => {
  const units = parseKoToreUnitsCsv('学年,科目,テキスト名,章,単元,ページ\r\n中１,数学,教材A,1章,単元1,p.2\r\n中１,数学,教材A,1章,単元2,p.3\r\n');
  assert.deepEqual(units.map(unit => [unit.grade, unit.subject, unit.textName, unit.unitName, unit.page]), [['中１', '数学', '教材A', '単元1', 'p.2'], ['中１', '数学', '教材A', '単元2', 'p.3']]);
});

test('Issue #017一覧とプロフィールは同じ進捗ラインを使う', () => {
  const manager = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  const profile = fs.readFileSync(new URL('../src/components/StudentProfileView.jsx', import.meta.url), 'utf8');
  assert.match(manager, /OneToOneProgressLine as ProgressLine/);
  assert.match(profile, /OneToOneSubjectProgress/);
});
