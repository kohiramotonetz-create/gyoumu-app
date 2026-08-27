import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gasSource = fs.readFileSync(new URL('../gas/コード.js', import.meta.url), 'utf8');

function loadGasFunction(name) {
  const start = gasSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);

  const bodyStart = gasSource.indexOf('{', start);
  let depth = 0;
  let end = bodyStart;
  for (; end < gasSource.length; end += 1) {
    if (gasSource[end] === '{') depth += 1;
    if (gasSource[end] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  const context = vm.createContext({ Set, Array, String });
  vm.runInContext(`${gasSource.slice(start, end + 1)}; this.fn = ${name};`, context);
  return context.fn;
}

const normalizeSchools = loadGasFunction('normalizeAppUsageRequestedSchools_');
const matchesStudent = loadGasFunction('matchesAppUsageStudent_');

test('getAppUsageMatrix用の校舎正規化は単一・複数・重複を後方互換で扱う', () => {
  assert.deepEqual(Array.from(normalizeSchools('A')), ['A']);
  assert.deepEqual(Array.from(normalizeSchools('A,B,C')), ['A', 'B', 'C']);
  assert.deepEqual(Array.from(normalizeSchools('A, B,A,,C')), ['A', 'B', 'C']);
});

test('対象校舎群AND個別学年でstudentだけを抽出する', () => {
  const schools = new Set(['A', 'B', 'C']);
  const grades = new Set(['中３']);
  assert.equal(matchesStudent('A', '中３', 'student', schools, grades), true);
  assert.equal(matchesStudent('B', '中３', 'student', schools, grades), true);
  assert.equal(matchesStudent('C', '中３', 'student', schools, grades), true);
  assert.equal(matchesStudent('D', '中３', 'student', schools, grades), false);
  assert.equal(matchesStudent('A', '中２', 'student', schools, grades), false);
  assert.equal(matchesStudent('A', '中３', 'teacher', schools, grades), false);
});

test('対象校舎群AND学年グループの展開値で抽出する', () => {
  const schools = new Set(['A', 'B', 'C']);
  const middleSchoolGrades = new Set(['中１', '中２', '中３']);
  assert.equal(matchesStudent('A', '中１', 'student', schools, middleSchoolGrades), true);
  assert.equal(matchesStudent('B', '中２', 'student', schools, middleSchoolGrades), true);
  assert.equal(matchesStudent('C', '中３', 'student', schools, middleSchoolGrades), true);
  assert.equal(matchesStudent('A', '高１', 'student', schools, middleSchoolGrades), false);
});

test('getAppUsageMatrixは複数校舎Setと既存の正式な生徒順を使用する', () => {
  const actionStart = gasSource.indexOf('if (data.action === "getAppUsageMatrix")');
  const actionSource = gasSource.slice(actionStart, gasSource.indexOf('// --- 18.', actionStart));
  assert.match(actionSource, /new Set\(requestedSchools\)/);
  assert.match(actionSource, /matchesAppUsageStudent_/);
  assert.match(actionSource, /sort\(compareStudentsBySchoolGradeAndKana_\)/);
});
