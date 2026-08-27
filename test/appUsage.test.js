import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  filterLogsByPeriod,
  filterUsageSummaries,
  getLatestUsageLog,
  getStudentUsageSummary,
  getUsageProgress,
  matchesStudentQuery,
  normalizeAssignedSchools,
  paginateItems,
  resolveAppUsageSchoolPayload,
  sortUsageSummaries,
} from '../src/utils/appUsage.js';

const NOW = Date.UTC(2026, 7, 28, 0, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const log = (daysAgo, score = '5', total = '10') => ({ rawDate: NOW - (daysAgo * DAY), date: `day-${daysAgo}`, score, total });

test('rawDate最大のログを配列順に依存せず最新として選ぶ', () => {
  assert.equal(getLatestUsageLog([log(10), log(1), log(5)]).date, 'day-1');
  assert.equal(getLatestUsageLog([log(5), log(10), log(1)]).date, 'day-1');
  assert.equal(getLatestUsageLog([{ rawDate: 0 }, { rawDate: 'invalid' }]), null);
});

test('score=0を未利用と区別しtotal=0では割合を算出しない', () => {
  assert.deepEqual(getUsageProgress(log(1, '0', '10')), { score: 0, total: 10, percent: 0 });
  assert.equal(getUsageProgress(log(1, '0', '0')), null);
  const used = getStudentUsageSummary({ usageData: { app: [log(1, '0', '10')] } }, ['app'], '30d', NOW);
  const unused = getStudentUsageSummary({ usageData: {} }, ['app'], '30d', NOW);
  assert.equal(used.appUsage.app.executionCount, 1);
  assert.equal(unused.appUsage.app.executionCount, 0);
});

test('期間境界を含み不正日時と未来日時を除外する', () => {
  const logs = [log(30), log(31), { ...log(-1), date: 'future' }, { rawDate: 0, date: 'invalid' }];
  assert.deepEqual(filterLogsByPeriod(logs, '30d', NOW).map(item => item.date), ['day-30']);
  assert.equal(filterLogsByPeriod(logs, 'all', NOW).length, 4);
});

test('nameとnameKanaをNFKC正規化して前後空白を除いた部分一致で検索する', () => {
  const student = { name: '山田 太郎', nameKana: 'ヤマダ　タロウ' };
  assert.equal(matchesStudentQuery(student, ' 山田 '), true);
  assert.equal(matchesStudentQuery(student, 'ﾔﾏﾀﾞ'), true);
  assert.equal(matchesStudentQuery(student, 'スズキ'), false);
});

test('未利用filterと最新日時・氏名順sortingで未利用を末尾へ安定配置する', () => {
  const students = [
    { userId: '0002', name: '未利用', nameKana: 'ミリヨウ', usageData: {} },
    { userId: '0003', name: '新しい', nameKana: 'アタラシイ', usageData: { app: [log(1)] } },
    { userId: '0001', name: '古い', nameKana: 'フルイ', usageData: { app: [log(5)] } },
  ];
  const summaries = students.map(student => getStudentUsageSummary(student, ['app'], '30d', NOW));
  assert.deepEqual(filterUsageSummaries(summaries, { status: 'unused', appName: 'app' }).map(item => item.student.userId), ['0002']);
  assert.deepEqual(sortUsageSummaries(summaries, 'latest-desc', 'app').map(item => item.student.userId), ['0003', '0001', '0002']);
  assert.deepEqual(sortUsageSummaries(summaries, 'latest-asc', 'app').map(item => item.student.userId), ['0001', '0003', '0002']);
  assert.deepEqual(sortUsageSummaries(summaries, 'name', 'app').map(item => item.student.userId), ['0003', '0001', '0002']);
});

test('paginationはpageを有効範囲へ補正し表示範囲を返す', () => {
  assert.deepEqual(paginateItems([1, 2, 3, 4, 5], 9, 2), {
    items: [5], page: 3, pageSize: 2, totalItems: 5, totalPages: 3, start: 5, end: 5,
  });
  assert.deepEqual(paginateItems([], 2, 20), {
    items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 1, start: 0, end: 0,
  });
});

test('全担当校舎は本人の担当校舎を重複除去してGAS互換の文字列へ展開する', () => {
  assert.deepEqual(normalizeAssignedSchools(['A', ' B ', 'A', '', null, 'C']), ['A', 'B', 'C']);
  assert.equal(resolveAppUsageSchoolPayload('全担当校舎', ['A', 'B', 'C']), 'A,B,C');
  assert.equal(resolveAppUsageSchoolPayload('全担当校舎', ['A']), 'A');
  assert.equal(resolveAppUsageSchoolPayload('B', ['A', 'B', 'C']), 'B');
});

test('全担当校舎を展開できない場合は0件扱いにせずエラーにする', () => {
  assert.throws(
    () => resolveAppUsageSchoolPayload('全担当校舎', []),
    /担当校舎情報を取得できませんでした/,
  );
});

test('一覧とカードは既存API・共通select・詳細画面を再利用する', () => {
  const source = fs.readFileSync(new URL('../src/components/AppUsageTracker.jsx', import.meta.url), 'utf8');
  assert.match(source, /action:\s*["']getAppUsageMatrix["']/);
  assert.match(source, /school:\s*schoolPayload/);
  assert.match(source, /grade:\s*selectedGrade\.join\(','\)/);
  assert.match(source, /<SchoolSelect/);
  assert.match(source, /<GradeSelect/);
  assert.match(source, /<UsageDetailView/);
  assert.match(source, /aria-pressed=\{displayMode === 'list'\}/);
  assert.match(source, /aria-pressed=\{displayMode === 'card'\}/);
});
