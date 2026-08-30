import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSchoolUnitsCsv, selectSchoolUnitAxis, SOCIAL_FIELDS } from '../src/utils/schoolUnits.js';
import { formatLessonDateJa, getChapterSegments, isConsecutiveUnits, selectChapterSegments } from '../src/utils/oneToOneProgressDisplay.js';
import { collectOneToOneMatrixResults } from '../src/utils/oneToOneProgressRequests.js';
import {
  ONE_TO_ONE_UNIT_STEP,
  formatOneToOneCurrentUnit,
  getOneToOneAxisCanvasWidth,
  getOneToOneProgressDifference,
  getOneToOneUnitOrder,
  paginateOneToOneStudents,
} from '../src/utils/oneToOneProgressResults.js';

const csv = fs.readFileSync(new URL('../public/school_units.csv', import.meta.url), 'utf8');

test('school_units.csvは全行に一意な固定unitIdを持つ', () => {
  const units = parseSchoolUnitsCsv(csv);
  assert.equal(units.length, 985);
  assert.equal(new Set(units.map(unit => unit.unitId)).size, units.length);
  assert.ok(units.every(unit => /^school_(?:j1|j2|j3|j123)_(?:english|math|japanese|science|social)_[0-9a-f]{16}$/.test(unit.unitId)));
});

test('学年・科目で抽出しCSV順をunitOrderとして維持する', () => {
  const axis = selectSchoolUnitAxis(parseSchoolUnitsCsv(csv), '中２', 'math');
  assert.ok(axis.length > 0);
  assert.deepEqual(axis.map(unit => unit.unitOrder), Array.from({ length: axis.length }, (_, index) => index + 1));
  assert.ok(axis.every(unit => unit.subjectId === 'math' && unit.grade.includes('中２')));
});

test('社会を完全一致で歴史・地理・公民に判定し業務順で扱う', () => {
  const units = parseSchoolUnitsCsv(csv);
  assert.deepEqual(SOCIAL_FIELDS.map(field => field.fieldId), ['history', 'geography', 'civics']);
  assert.deepEqual(SOCIAL_FIELDS.map(field => field.label), ['歴史', '地理', '公民']);
  const expectations = [['history', '中学生の歴史【帝国書籍】'], ['geography', '中学生の地理【帝国書籍】'], ['civics', '中学生の公民【帝国書籍】']];
  expectations.forEach(([fieldId, textName]) => {
    const axis = selectSchoolUnitAxis(units, '中１', 'social', fieldId);
    assert.ok(axis.length > 0);
    assert.ok(axis.every(unit => unit.grade === '中１中２中３' && unit.fieldId === fieldId && unit.textName === textName));
  });
});

test('末尾unitId追加後も既存7列を位置参照できる', () => {
  const first = csv.split(/\r?\n/)[1].split(',');
  assert.equal(first[0], '中１中２中３');
  assert.equal(first[1], '社会');
  assert.equal(first[2], '中学生の歴史【帝国書籍】');
  assert.equal(first.length, 8);
});

test('GAS検証用生成物はCSVのunitId・件数と一致する', () => {
  const generatedSource = fs.readFileSync(new URL('../gas/schoolUnits.generated.js', import.meta.url), 'utf8');
  const generated = JSON.parse(generatedSource.match(/= (\[.*\]);\s*$/s)[1]);
  const units = parseSchoolUnitsCsv(csv);
  assert.equal(generated.length, units.length);
  assert.deepEqual(generated.map(row => row[0]), units.map(unit => unit.unitId));
});

test('一覧は専用結果componentで学校・ネッツ2段と分離入力・履歴操作を持つ', () => {
  const managerSource = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressResults.jsx', import.meta.url), 'utf8');
  const displaySource = fs.readFileSync(new URL('../src/components/common/OneToOneProgressDisplay.jsx', import.meta.url), 'utf8');
  const axisSource = fs.readFileSync(new URL('../src/components/common/ProgressAxisLine.jsx', import.meta.url), 'utf8');
  assert.match(managerSource, /<OneToOneProgressResults/);
  assert.match(source, /<StandardStudentRow key=\{student\.userId\}/);
  assert.match(source, /type="school"/);
  assert.match(source, /type="netz"/);
  assert.match(source, /学校進捗を入力/);
  assert.match(source, /ネッツ進捗を入力/);
  assert.match(source, /履歴/);
  assert.match(source, /data-timeline-viewport/);
  assert.match(source, /aria-expanded=\{isOpen\}/);
  assert.match(source, /学校：.*ネッツ：/s);
  assert.match(source, /SOCIAL_FIELDS\.map/);
  assert.match(source, /学校・ネッツ進捗タイムライン/);
  assert.match(displaySource, /unit\.unitName/);
  assert.match(axisSource, /<strong>現在：<\/strong>/);
  assert.match(axisSource, /<span>未登録<\/span>/);
  assert.match(managerSource, /無効化済み/);
  assert.doesNotMatch(managerSource, /\{event\.status\}<\/strong>/);
});

test('複数科目取得は成功結果と科目別エラーを分離して保持する', () => {
  const english = { axis: [{ unitId: 'u1' }], students: [{ userId: '000001' }] };
  const result = collectOneToOneMatrixResults(
    ['english', 'math', 'social'],
    [
      { status: 'fulfilled', value: english },
      { status: 'rejected', reason: new Error('数学の取得に失敗') },
      { status: 'rejected', reason: null },
    ],
  );
  assert.deepEqual(result.dataBySubjectId, { english });
  assert.deepEqual(result.errorsBySubjectId, {
    math: '数学の取得に失敗',
    social: '進捗情報の取得に失敗しました。',
  });
});

test('1対1条件UIは選択条件と適用済み条件を分離し既存matrix APIへ単一科目ずつ送る', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  assert.match(source, /selectedSubjectIds/);
  assert.match(source, /appliedFilters/);
  assert.match(source, /Promise\.allSettled\(subjectIds\.map\(subjectId/);
  assert.match(source, /requestMatrix\(\{[\s\S]*?subjectId,/);
  assert.doesNotMatch(source, /subjectIds:\s*subjectIds/);
  assert.match(source, /requestGenerationRef\.current/);
  assert.match(source, /onOpenStudent=\{openStudent\}/);
  assert.match(source, /subjectId: selectedSubjectId/);
});

test('Matrix requestは科目ごとの診断IDとclient経過時間を付けtimeout時に診断IDを表示する', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  assert.match(source, /one_to_one_matrix_/);
  assert.match(source, /diagnosticRequestId/);
  assert.match(source, /performance\.now\(\)/);
  assert.match(source, /clientElapsedMs/);
  assert.match(source, /ECONNABORTED/);
  assert.match(source, /診断ID:/);
  assert.match(source, /timeout: 30000/);
  assert.doesNotMatch(source, /timeout:\s*(?:60000|120000)/);
  assert.match(source, /Promise\.allSettled\(subjectIds\.map\(subjectId => requestMatrix/);
});

test('進捗差は同一axisのunitOrderだけで厳密に算出する', () => {
  const axis = [1, 2, 3, 4].map(unitOrder => ({ unitId: `u${unitOrder}`, unitOrder }));
  assert.equal(getOneToOneUnitOrder(axis, 'u3'), 3);
  assert.equal(getOneToOneUnitOrder(axis, 'unknown'), 0);
  assert.deepEqual(getOneToOneProgressDifference(axis, 'u2', 'u2'), { status: 'same', difference: 0, label: '学校と同じ位置' });
  assert.deepEqual(getOneToOneProgressDifference(axis, 'u4', 'u1'), { status: 'school-ahead', difference: 3, label: '学校が3単元先' });
  assert.deepEqual(getOneToOneProgressDifference(axis, 'u1', 'u3'), { status: 'netz-ahead', difference: 2, label: 'ネッツが2単元先' });
  assert.deepEqual(getOneToOneProgressDifference(axis, '', ''), { status: 'unavailable', difference: 0, label: '進捗未登録' });
  assert.deepEqual(getOneToOneProgressDifference(axis, 'u1', ''), { status: 'unavailable', difference: 0, label: '比較できません' });
  assert.deepEqual(getOneToOneProgressDifference(axis, 'unknown', 'u1'), { status: 'unavailable', difference: 0, label: '比較できません' });
});

test('timeline幅は全単元を固定間隔で保持し単元数に応じて拡張する', () => {
  assert.equal(ONE_TO_ONE_UNIT_STEP, 42);
  assert.equal(getOneToOneAxisCanvasWidth(1), 760);
  assert.ok(getOneToOneAxisCanvasWidth(40) > getOneToOneAxisCanvasWidth(20));
  assert.equal(getOneToOneAxisCanvasWidth(40) - getOneToOneAxisCanvasWidth(39), ONE_TO_ONE_UNIT_STEP);
});

test('科目別paginationは表示範囲とpageを有効範囲へ補正する', () => {
  const students = Array.from({ length: 42 }, (_, index) => ({ userId: String(index + 1) }));
  const second = paginateOneToOneStudents(students, 2, 20);
  assert.deepEqual({ page: second.page, start: second.start, end: second.end, totalPages: second.totalPages }, { page: 2, start: 21, end: 40, totalPages: 3 });
  const clamped = paginateOneToOneStudents(students, 9, 20);
  assert.equal(clamped.page, 3);
  assert.equal(clamped.items.length, 2);
  assert.deepEqual(paginateOneToOneStudents([], 1, 20).items, []);
});

test('現在単元表示は章・節・単元名・ページを重複なく構成する', () => {
  assert.deepEqual(formatOneToOneCurrentUnit(null), ['未登録']);
  assert.deepEqual(formatOneToOneCurrentUnit({ chapter: '第2章', section: '第3節', unitName: '式の計算', page: '42' }), ['第2章', '第3節', '式の計算', 'p.42']);
  assert.deepEqual(formatOneToOneCurrentUnit({ chapter: '文字の式', section: '文字の式', unitName: '計算' }), ['文字の式', '計算']);
});

test('結果timelineは全unit point・固定座標・同期scroll・専用色を定義する', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressResults.jsx', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/components/OneToOneProgressResults.css', import.meta.url), 'utf8');
  assert.match(source, /axis\.map\(unit =>/);
  assert.match(source, /key=\{unit\.unitId\}/);
  assert.match(source, /ONE_TO_ONE_UNIT_STEP/);
  assert.match(source, /aria-current=\{isCurrent \? 'step'/);
  assert.match(source, /dataset\.scrollGroup/);
  assert.match(source, /querySelectorAll\('\[data-timeline-viewport\]'\)/);
  assert.match(css, /one-to-one-progress-lane--school[\s\S]*#087a45/i);
  assert.match(css, /one-to-one-progress-lane--netz[\s\S]*#0867c5/i);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /::-webkit-scrollbar/);
  assert.match(css, /overflow-x:\s*auto/);
});

test('1対1条件UIは共通選択部品・正式科目定義・複数選択checkboxを使用する', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  assert.match(source, /<SchoolSelect/);
  assert.match(source, /<GradeSelect[\s\S]*?includeGroups=\{false\}/);
  assert.match(source, /ONE_TO_ONE_SUBJECTS\.map/);
  assert.match(source, /toggleOneToOneSubject/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /aria-busy=\{loading\}/);
});

test('授業日は時刻変換せず日本語の日付として表示する', () => {
  assert.equal(formatLessonDateJa('2026-08-27'), '8月27日');
  assert.equal(formatLessonDateJa('2026-01-01'), '1月1日');
  assert.equal(formatLessonDateJa('2026-08-31'), '8月31日');
  assert.equal(formatLessonDateJa('2026-12-31'), '12月31日');
});

test('章境界と学校の連続区間を表示用に判定する', () => {
  const axis = selectSchoolUnitAxis(parseSchoolUnitsCsv(csv), '中１', 'math');
  const segments = getChapterSegments(axis);
  assert.ok(segments.length > 1);
  assert.equal(segments[0].startOrder, 1);
  assert.equal(segments[0].chapter, axis[0].chapter);
  assert.ok(isConsecutiveUnits(axis.slice(0, 5)));
  assert.equal(isConsecutiveUnits([axis[0], axis[2]]), false);
});

test('細分化された章は主要区切りだけを等間隔に表示できる', () => {
  const segments = Array.from({ length: 20 }, (_, index) => ({ chapter: String(index + 1), startOrder: index + 1 }));
  const selected = selectChapterSegments(segments, 6);
  assert.equal(selected.length, 6);
  assert.equal(selected[0].chapter, '1');
  assert.equal(selected.at(-1).chapter, '20');
  assert.deepEqual(selectChapterSegments(segments, undefined), segments);
});
