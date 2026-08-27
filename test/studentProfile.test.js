import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildStudentProfileHash, parseStudentProfileHash } from '../src/utils/studentProfileNavigation.js';
import { parseKoToreUnitsCsv } from '../src/utils/kotoreProfile.js';
import { ACADEMIC_PROFILE_SUBJECTS, buildAcademicChartData } from '../src/utils/academicProfile.js';

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

test('個トレと1対1は章境界・横スクロールを持つ汎用進捗ラインを共用する', () => {
  const profile = fs.readFileSync(new URL('../src/components/StudentProfileView.jsx', import.meta.url), 'utf8');
  const oneToOne = fs.readFileSync(new URL('../src/components/common/OneToOneProgressDisplay.jsx', import.meta.url), 'utf8');
  const axis = fs.readFileSync(new URL('../src/components/common/ProgressAxisLine.jsx', import.meta.url), 'utf8');
  assert.match(profile, /ProgressAxisLine/);
  assert.match(oneToOne, /ProgressAxisLine/);
  assert.match(axis, /getChapterSegments/);
  assert.match(profile, /overflowX: 'auto'/);
  assert.match(profile, /unit\.page/);
  assert.match(profile, /unit\.unitName/);
});

test('学校成績グラフは9科目順・テスト満点・0点・未入力を区別する', () => {
  const scores = Object.fromEntries(ACADEMIC_PROFILE_SUBJECTS.map(([key], index) => [key, index === 0 ? 0 : index === 1 ? '' : index * 5]));
  const hundred = buildAcademicChartData({ maxScore: 100, scores });
  const fifty = buildAcademicChartData({ maxScore: 50, scores });
  assert.deepEqual(hundred.map(item => item.label), ['国語', '数学', '英語', '理科', '社会', '音楽', '保健', '美術', '技家']);
  assert.equal(hundred[0].score, 0);
  assert.equal(hundred[1].score, null);
  assert.equal(hundred.every(item => item.maxScore === 100), true);
  assert.equal(fifty.every(item => item.maxScore === 50), true);
});

test('プロフィールUIは権限OFF履歴を表示せず、利用可能・履歴なし・成績表と棒グラフを表示する', () => {
  const profile = fs.readFileSync(new URL('../src/components/StudentProfileView.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(profile, /pastContents|過去の利用履歴|legacyLogCount/);
  assert.match(profile, /利用履歴はありません/);
  assert.match(profile, /AcademicScoreChart/);
  assert.match(profile, /<table/);
});
