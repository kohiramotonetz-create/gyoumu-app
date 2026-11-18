import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { extractEnglishMissionCatalog } from '../scripts/buildEnglishMissionCatalog.mjs';
import { buildEnglishMissionWeeks, catalog, englishMissionTargetKey, expandEnglishMissionRange, findEnglishMissionDuplicates, findEnglishMissionPeriodConflicts, formatMissionPeriod, missionPeriod, newEnglishMissionWeek, normalizeEnglishMissionTarget, resizeEnglishMissionWeeks, todayInTokyo } from '../src/utils/englishMissionPlanning.js';

const target = { scopeSchools: ['栗林', '番町'], attendingSchoolName: '合成中学校', targetGrade: '中３', subject: 'english' };
const units = grade => catalog.units.filter(unit => unit.grade === grade);
const draft = (grade = '中１', first = 0, last = first) => ({ ...newEnglishMissionWeek(), materialGrade: grade, startKey: units(grade)[first].key, endKey: units(grade)[last].key });
const batch = (drafts, start = '2026-11-05') => buildEnglishMissionWeeks(start, drafts);
const saved = (week, id, t = target) => ({ ...week, missionId: id, target: t });
for (const [name, start, index, expected] of [
  ['first week', '2026-11-05', 0, ['2026-11-05', '2026-11-11']],
  ['second week', '2026-11-05', 1, ['2026-11-12', '2026-11-18']],
  ['fourth week', '2026-11-05', 3, ['2026-11-26', '2026-12-02']],
  ['month end', '2026-01-29', 0, ['2026-01-29', '2026-02-04']],
  ['year end', '2026-12-29', 0, ['2026-12-29', '2027-01-04']],
  ['leap year', '2028-02-27', 0, ['2028-02-27', '2028-03-04']],
  ['non-leap century', '2100-02-27', 0, ['2100-02-27', '2100-03-05']],
]) test(`calendar: ${name}`, () => { const p = missionPeriod(start, index); assert.deepEqual([p.startDate, p.endDate], expected); });
test('Japanese weekday display matches required text', () => assert.equal(formatMissionPeriod('2026-11-05', '2026-11-11'), '11/5（木）～11/11（水）'));
for (const invalid of ['', '2026-02-29', '2026-13-01', '2026-00-01', '2026-11-00', '2026-11-31', '2026-1-1', '0000-01-01']) test(`reject invalid date ${invalid}`, () => assert.throws(() => missionPeriod(invalid)));
test('no date overflow at maximum representable calendar year', () => assert.throws(() => missionPeriod('9999-12-31')));
test('calendar has no local-timezone drift', () => {
  const url = new URL('../src/utils/englishMissionPlanning.js', import.meta.url).href;
  const code = `import {missionPeriod} from ${JSON.stringify(url)}; console.log(JSON.stringify(missionPeriod('2026-11-05',3)))`;
  const outputs = ['UTC', 'Asia/Tokyo', 'America/Los_Angeles'].map(TZ => execFileSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim());
  assert.equal(new Set(outputs).size, 1);
});
test('today is resolved at JST midnight', () => { assert.equal(todayInTokyo(new Date('2026-11-04T15:00:00Z')), '2026-11-05'); assert.equal(todayInTokyo(new Date('2026-11-04T14:59:59Z')), '2026-11-04'); });
for (const [grade, count, unitCount, words] of [['中１', 43, 10, 665], ['中２', 35, 7, 433], ['中３', 30, 6, 407]]) test(`complete original catalog ${grade}`, () => { assert.equal(units(grade).length, count); assert.equal(new Set(units(grade).map(u => u.unit)).size, unitCount); assert.equal(units(grade).reduce((s, u) => s + u.wordCount, 0), words); });
test('catalog provenance and unique exact keys', () => { assert.equal(catalog.wordCount, 1505); assert.equal(catalog.units.length, 108); assert.equal(new Set(catalog.units.map(u => u.key)).size, 108); assert.equal(catalog.source.sha256, '894e908998d1775e69192c407fc3503febcb655442c0c5eacaceb94c3d8d52b3'); assert.match(catalog.source.commit, /^[a-f0-9]{40}$/); });
test('Unit10 remains after Unit2', () => assert.ok(units('中１').findIndex(u => u.unit === '中１Unit１０') > units('中１').findIndex(u => u.unit === '中１Unit２')));
for (const section of ['part1', 'part4', 'Read and Think', 'Read and Think2', 'Stage Activity3', "Let's Read Gon, the Fox", 'Scene2 Real Life English Speaking']) test(`original section retained: ${section}`, () => assert.ok(catalog.units.some(u => u.section === section)));
test('trailing whitespace in original key is preserved', () => { const key = '中１Unit９Scene5 Real Life English '; assert.ok(catalog.units.some(u => u.key === key)); assert.ok(!catalog.units.some(u => u.key === key.trim())); assert.equal(catalog.warnings[0].code, 'ORIGINAL_WHITESPACE_PRESERVED'); });
const csvHeader = '学年ユニット単元,学年ユニット,単元,英語,日本語\n';
test('CSV quoted comma and repeated words produce one section in first occurrence order', () => {
  const csv = csvHeader + '中１Unit２part1,中１Unit２,part1,word,語句\n中１Unit１part1,中１Unit１,part1,"hello, world",語句\n中１Unit２part1,中１Unit２,part1,other,別\n';
  const result = extractEnglishMissionCatalog(Buffer.from(csv), {});
  assert.equal(result.units.length, 2); assert.equal(result.units[0].unit, '中１Unit２'); assert.equal(result.units[0].wordCount, 2); assert.equal(result.wordCount, 3);
});
test('CSV rejects normalized key collisions', () => assert.throws(() => extractEnglishMissionCatalog(Buffer.from(csvHeader + '中１Unit１part1,中１Unit１,part1,a,あ\n中1Unit1part1,中1Unit1,part1,b,い'), {}), /衝突/));
test('CSV rejects malformed schema', () => assert.throws(() => extractEnglishMissionCatalog(Buffer.from('incorrect\na'), {})));
test('range crosses Unit boundary in exact CSV order', () => assert.deepEqual(expandEnglishMissionRange('中１Unit１part2', '中１Unit２part1', '中１').map(u => u.key), ['中１Unit１part2', '中１Unit１part3', '中１Unit１part4', '中１Unit２part1']));
test('range includes mixed part, reading, stage and Lets Read', () => { const range = expandEnglishMissionRange('中２Unit３part1', "中２Unit３Let's Read1", '中２'); assert.equal(range.length, 6); assert.deepEqual(range.map(u => u.section), ['part1', 'part2', 'Read and Think1', 'Read and Think2', 'Stage Activity1', "Let's Read1"]); });
test('single-section range', () => assert.equal(expandEnglishMissionRange(units('中１')[0].key, units('中１')[0].key, '中１').length, 1));
test('inverted range rejected', () => assert.throws(() => expandEnglishMissionRange(units('中１')[2].key, units('中１')[0].key, '中１'), /以降/));
test('cross-grade range rejected at present', () => assert.throws(() => expandEnglishMissionRange(units('中１')[0].key, units('中２')[0].key, '中１'), /同じ教材学年/));
test('unknown exact key rejected', () => assert.throws(() => expandEnglishMissionRange('not-in-csv', units('中１')[0].key, '中１')));
test('different material grades and non-contiguous weeks are independent', () => { const records = batch([draft('中１', 10, 12), draft('中２', 8, 11), draft('中３', 0, 1), draft('中１', 0, 1)]); assert.deepEqual(records.map(w => w.materials[0].materialGrade), ['中１', '中２', '中３', '中１']); assert.equal(records[3].endDate, '2026-12-02'); });
test('adding beyond eight weeks keeps original entries unchanged', () => { const initial = [draft(), draft('中２'), draft('中３'), draft()]; const expanded = resizeEnglishMissionWeeks(initial, 12, () => true); assert.equal(expanded.length, 12); assert.ok(initial.every((w, i) => w === expanded[i])); assert.equal(expanded[4].materialGrade, ''); });
test('cancel shrinking populated weeks preserves all input', () => { const initial = [draft(), draft()]; let prompts = 0; const result = resizeEnglishMissionWeeks(initial, 1, () => { prompts++; return false; }); assert.equal(result, initial); assert.equal(prompts, 1); });
test('confirm shrinking removes only trailing week', () => { const initial = [draft(), draft()]; assert.deepEqual(resizeEnglishMissionWeeks(initial, 1, () => true), [initial[0]]); });
test('blank trailing weeks need no confirmation', () => assert.equal(resizeEnglishMissionWeeks([draft(), newEnglishMissionWeek()], 1, () => { throw Error('unexpected confirmation'); }).length, 1));
test('start date change recomputes dates and preserves units', () => { const drafts = [draft(), draft('中２')]; const a = batch(drafts), b = batch(drafts, '2027-12-30'); assert.deepEqual(a.map(w => w.materials), b.map(w => w.materials)); assert.equal(b[1].startDate, '2028-01-06'); });
test('group identity uses canonical campus scope, school, grade and subject', () => { assert.equal(englishMissionTargetKey(target), englishMissionTargetKey({ ...target, targetGrade: '中3', scopeSchools: ['番町', '栗林', '栗林'] })); assert.notEqual(englishMissionTargetKey(target), englishMissionTargetKey({ ...target, scopeSchools: ['栗林'] })); assert.notEqual(englishMissionTargetKey(target), englishMissionTargetKey({ ...target, attendingSchoolName: '別中学校' })); });
test('target campus scope must be an array', () => assert.throws(() => normalizeEnglishMissionTarget({ ...target, scopeSchools: '栗林' })));
test('two cycles retain every repeated week and key', () => { const records = batch([draft('中１', 0, 1), draft('中１', 2, 3), draft('中１', 0, 1), draft('中１', 2, 3)]); assert.equal(findEnglishMissionDuplicates(records, [], target).length, 4); assert.equal(records.length, 4); assert.equal(records.flatMap(w => w.materials[0].unitKeys).length, 8); });
test('no unit duplication', () => assert.deepEqual(findEnglishMissionDuplicates(batch([draft('中１', 0), draft('中１', 1)]), [], target), []));
test('partially overlapping unit ranges detected', () => assert.deepEqual(findEnglishMissionDuplicates(batch([draft('中１', 0, 2), draft('中１', 2, 3)]), [], target), [units('中１')[2].key]));
test('duplication with another registered week', () => { const existing = saved(batch([draft()], '2026-10-01')[0], 'old'); assert.deepEqual(findEnglishMissionDuplicates(batch([draft()]), [existing], target), [units('中１')[0].key]); });
for (const [name, other] of [['school', { ...target, attendingSchoolName: '別中学校' }], ['grade', { ...target, targetGrade: '中２' }], ['scope', { ...target, scopeSchools: ['木太南'] }]]) test(`no unit warning across a different ${name}`, () => assert.deepEqual(findEnglishMissionDuplicates(batch([draft()]), [saved(batch([draft()])[0], 'other', other)], target), []));
test('editing own ID does not compare against its previous data', () => { const week = saved(batch([draft()])[0], 'same'); assert.deepEqual(findEnglishMissionDuplicates([week], [week], target), []); });
test('editing still detects other registration IDs', () => { const week = saved(batch([draft()])[0], 'same'); assert.deepEqual(findEnglishMissionDuplicates([week], [week, saved(week, 'other')], target), [units('中１')[0].key]); });
test('historical duplicate unrelated to incoming units does not prompt', () => { const existing = [saved(batch([draft()])[0], 'a'), saved(batch([draft()])[0], 'b')]; assert.deepEqual(findEnglishMissionDuplicates(batch([draft('中１', 1)]), existing, target), []); });
test('period conflict and unit duplicate are independent', () => { const existing = saved(batch([draft('中２')])[0], 'old'); assert.equal(findEnglishMissionPeriodConflicts(batch([draft()]), [existing], target).length, 1); assert.equal(findEnglishMissionDuplicates(batch([draft()]), [existing], target).length, 0); });
test('inclusive period overlap is detected but adjacent day is allowed', () => { const existing = saved(batch([draft()], '2026-11-05')[0], 'old'); assert.equal(findEnglishMissionPeriodConflicts(batch([draft()], '2026-11-11'), [existing], target).length, 1); assert.equal(findEnglishMissionPeriodConflicts(batch([draft()], '2026-11-12'), [existing], target).length, 0); });
test('different fixed campus scope is a distinct group', () => { const existing = saved(batch([draft()])[0], 'old', { ...target, scopeSchools: ['栗林'] }); assert.equal(findEnglishMissionPeriodConflicts(batch([draft()]), [existing], target).length, 0); });
test('other subject does not warn or collide with English', () => {
  const other = saved(batch([draft()])[0], 'math', { ...target, subject: 'math' });
  assert.deepEqual(findEnglishMissionDuplicates(batch([draft()]), [other], target), []);
  assert.deepEqual(findEnglishMissionPeriodConflicts(batch([draft()]), [other], target), []);
});
test('empty CSV cannot produce an empty catalog silently', () => assert.throws(() => extractEnglishMissionCatalog(Buffer.from(csvHeader), {})));
