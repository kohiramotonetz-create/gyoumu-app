import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSchoolUnitsCsv, selectSchoolUnitAxis } from '../src/utils/schoolUnits.js';

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

test('社会の複数学年共通テキストを同一科目軸に含める', () => {
  const axis = selectSchoolUnitAxis(parseSchoolUnitsCsv(csv), '中１', 'social');
  assert.ok(axis.some(unit => unit.grade === '中１中２中３'));
  assert.deepEqual(Array.from(new Set(axis.map(unit => unit.textName))), ['中学生の歴史【帝国書籍】', '中学生の公民【帝国書籍】', '中学生の地理【帝国書籍】']);
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
  assert.match(source, /<section key=\{student\.userId\}/);
  assert.match(source, /label="学校"/);
  assert.match(source, /label="ネッツ"/);
  assert.match(source, /学校進捗入力/);
  assert.match(source, /ネッツ進捗入力/);
  assert.match(source, /履歴/);
  assert.match(source, /overflowX: 'auto'/);
});
