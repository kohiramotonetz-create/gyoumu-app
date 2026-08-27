import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACADEMIC_SUBJECTS, areAcademicScoresEqual, calculateAcademicTotal, getAcademicYearOptions, getCurrentSchoolYear, normalizeAcademicScore, parseAcademicScorePaste } from '../src/utils/academicResults.js';

const completeScores = values => Object.fromEntries(ACADEMIC_SUBJECTS.map(({ key }, index) => [key, values[index]]));

test('学校成績年度は2024年度から現在年度+1まで自動生成し保存済み将来年度も含める', () => {
  const now = new Date(2026, 7, 27);
  assert.equal(getCurrentSchoolYear(now), 2026);
  assert.deepEqual(getAcademicYearOptions([], now), [2024, 2025, 2026, 2027]);
  assert.deepEqual(getAcademicYearOptions([2023, 2028], now), [2024, 2025, 2026, 2027, 2028]);
  assert.equal(getAcademicYearOptions([], now).some(year => year < 2024), false);
});

test('アプリ利用チェックと学校成績管理は同じ学年候補・値・順序を使う', () => {
  const appUsage = fs.readFileSync(new URL('../src/components/AppUsageTracker.jsx', import.meta.url), 'utf8');
  const manager = fs.readFileSync(new URL('../src/components/AcademicResultsManager.jsx', import.meta.url), 'utf8');
  assert.match(appUsage, /<GradeSelect value=\{selectedGrade\}/);
  assert.match(manager, /<GradeSelect style=\{fieldControl\} value=\{grades\}/);
  assert.doesNotMatch(manager, /includeGroups=\{false\}/);
  assert.match(manager, /grade: grades\.join\(','\)/);
});

test('9科目すべて入力済みの場合だけ合計する', () => {
  assert.equal(calculateAcademicTotal(completeScores([72, 81, 68, 75, 80, 90, 85, 88, 92])), 731);
  assert.equal(calculateAcademicTotal(completeScores([72, 81, 68, 75, 80, '', 85, 88, 92])), null);
  assert.equal(calculateAcademicTotal(completeScores([0, 0, 0, 0, 0, 0, 0, 0, 0])), 0);
});

test('点数は空欄・0・満点・全角数字を受理する', () => {
  assert.equal(normalizeAcademicScore('', 100), '');
  assert.equal(normalizeAcademicScore('0', 100), 0);
  assert.equal(normalizeAcademicScore('100', 100), 100);
  assert.equal(normalizeAcademicScore('７２', 100), 72);
});

test('負数・小数・指数・文字・超過・カンマを拒否する', () => {
  for (const value of ['-1', '1.5', '1e2', 'abc', '101', '1,000']) assert.throws(() => normalizeAcademicScore(value, 100));
});

test('Excelの3行×9列とCRLF、空セルを解析する', () => {
  const source = '72\t81\t68\t75\t80\t90\t85\t88\t92\r\n65\t77\t82\t70\t74\t86\t81\t90\t89\r\n0\t\t3\t4\t5\t6\t7\t8\t9\r\n';
  const result = parseAcademicScorePaste(source, 100, 3);
  assert.deepEqual(result.errors, []);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[2][0], 0);
  assert.equal(result.rows[2][1], '');
});

test('10列、行超過、不正セルでは全行を返さない', () => {
  const tenColumns = parseAcademicScorePaste('1\t2\t3\t4\t5\t6\t7\t8\t9\t45', 100, 1);
  assert.equal(tenColumns.rows.length, 0);
  assert.match(tenColumns.errors.join(' '), /合計列を除いた9科目/);
  const invalid = parseAcademicScorePaste('1\t2\t3\t4\tX\t6\t7\t8\t9\n1\t2\t3\t4\t5\t6\t7\t8\t9', 100, 1);
  assert.equal(invalid.rows.length, 0);
  assert.match(invalid.errors.join(' '), /表示中の生徒一覧|社会/);
});

test('保存済みとの比較は空欄と0を区別する', () => {
  const left = completeScores([0, '', '', '', '', '', '', '', '']);
  const right = completeScores([0, '', '', '', '', '', '', '', '']);
  assert.equal(areAcademicScoresEqual(left, right), true);
  right.math = 0;
  assert.equal(areAcademicScoresEqual(left, right), false);
});

test('管理画面はadmin限定メニュー・9科目表・未保存一括保存を持つ', () => {
  const teacherView = fs.readFileSync(new URL('../src/TeacherView.jsx', import.meta.url), 'utf8');
  const manager = fs.readFileSync(new URL('../src/components/AcademicResultsManager.jsx', import.meta.url), 'utf8');
  assert.match(teacherView, /academic-results.*adminOnly: true/);
  assert.match(teacherView, /activeContent === 'academic-results' && role === 'admin'/);
  assert.match(manager, /parseAcademicScorePaste/);
  assert.match(manager, /未保存の変更/);
  assert.match(manager, /一括保存/);
  assert.match(manager, /subjectKey !== 'japanese'/);
  assert.doesNotMatch(manager, /test\.grade/);
  assert.match(manager, /getAcademicResultMatrix', \{ testId, school, grade: grades\.join\(','\) \}/);
  assert.match(manager, /bulkUpdateAcademicResults', \{ testId, grade: grades\.join\(','\),/);
  assert.match(manager, /styles\.select/);
  assert.match(manager, /repeat\(auto-fit, minmax\(180px, 1fr\)\)/);
});
