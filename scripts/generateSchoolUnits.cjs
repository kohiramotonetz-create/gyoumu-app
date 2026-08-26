const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'public', 'school_units.csv');
const gasPath = path.join(root, 'gas', 'schoolUnits.generated.js');
const subjectIds = { '英語': 'english', '数学': 'math', '国語': 'japanese', '理科': 'science', '社会': 'social' };
const gradeCodes = { '中１': 'j1', '中２': 'j2', '中３': 'j3', '中１中２中３': 'j123' };

const lines = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
const headers = lines.shift().split(',').map(value => value.trim());
const expected = ['学年', '科目', 'テキスト名', '章', '節', '単元', 'ページ'];
if (headers.slice(0, expected.length).join('\t') !== expected.join('\t')) throw new Error('school_units.csvの既存7列ヘッダーが不正です');
const hasUnitId = headers[7] === 'unitId';
if (headers.length !== (hasUnitId ? 8 : 7)) throw new Error('school_units.csvに想定外の列があります');

const seenIds = new Set();
const generated = lines.map((line, index) => {
  const cells = line.split(',').map(value => value.trim());
  if (cells.length !== headers.length) throw new Error(`${index + 2}行目の列数が不正です`);
  const identity = cells.slice(0, 7).join('\u241f');
  const hash = crypto.createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 16);
  const subjectId = subjectIds[cells[1]];
  const gradeCode = gradeCodes[cells[0]];
  if (!subjectId || !gradeCode) throw new Error(`${index + 2}行目の学年または科目が不正です`);
  const expectedId = `school_${gradeCode}_${subjectId}_${hash}`;
  const unitId = hasUnitId ? cells[7] : expectedId;
  if (unitId !== expectedId) throw new Error(`${index + 2}行目のunitIdが内容と一致しません`);
  if (seenIds.has(unitId)) throw new Error(`unitIdが重複しています: ${unitId}`);
  seenIds.add(unitId);
  return [...cells.slice(0, 7), unitId];
});

fs.writeFileSync(csvPath, `${expected.concat('unitId').join(',')}\r\n${generated.map(row => row.join(',')).join('\r\n')}\r\n`, 'utf8');
const compact = generated.map((row, index) => [row[7], row[0], subjectIds[row[1]], row[2], row[3], row[4], row[5], row[6], index + 1]);
fs.writeFileSync(gasPath, `// public/school_units.csv から自動生成。直接編集しないこと。\nvar SCHOOL_UNIT_MASTER_GENERATED = ${JSON.stringify(compact)};\n`, 'utf8');
console.log(`school_units.csv: ${generated.length} units`);
