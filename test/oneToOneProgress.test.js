import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSchoolUnitsCsv, selectSchoolUnitAxis, SOCIAL_FIELDS } from '../src/utils/schoolUnits.js';
import { formatLessonDateJa, getChapterSegments, isConsecutiveUnits } from '../src/utils/oneToOneProgressDisplay.js';

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

test('一覧は1生徒ブロックに学校・ネッツ2行と分離入力・履歴操作を持つ', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  const displaySource = fs.readFileSync(new URL('../src/components/common/OneToOneProgressDisplay.jsx', import.meta.url), 'utf8');
  assert.match(source, /<section key=\{student\.userId\}/);
  assert.match(source, /label="学校"/);
  assert.match(source, /label="ネッツ"/);
  assert.match(source, /学校進捗入力/);
  assert.match(source, /ネッツ進捗入力/);
  assert.match(source, /履歴/);
  assert.match(source, /overflowX: 'auto'/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /学校：.*ネッツ：/s);
  assert.match(source, /SOCIAL_FIELDS\.map/);
  assert.match(source, /学校とネッツの共通単元軸/);
  assert.match(displaySource, /currentUnit\.unitName/);
  assert.match(displaySource, /<strong>現在：<\/strong>/);
  assert.match(displaySource, /<span>未登録<\/span>/);
  assert.doesNotMatch(source, /onUnitClick=\{unit => setNotice/);
  assert.match(source, /無効化済み/);
  assert.doesNotMatch(source, /\{event\.status\}<\/strong>/);
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
