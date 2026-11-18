import Papa from 'papaparse';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function extractEnglishMissionCatalog(bytes, source) {
  const parsed = Papa.parse(bytes.toString('utf8'), { header: true, skipEmptyLines: 'greedy' });
  const fields = ['学年ユニット単元', '学年ユニット', '単元', '英語', '日本語'];
  if (parsed.errors.length || JSON.stringify(parsed.meta.fields) !== JSON.stringify(fields)) throw Error('教材CSVの列または形式を確認してください。');
  if (!parsed.data.length) throw Error('教材CSVに単元がありません。');
  const entries = new Map(), normalizedKeys = new Map(), warnings = new Set();
  for (const row of parsed.data) {
    const key = row[fields[0]], unit = row[fields[1]], section = row[fields[2]];
    const match = unit?.normalize('NFKC').match(/^中([123])Unit/);
    if (!match || !section || key !== unit + section || !row[fields[3]] || !row[fields[4]]) throw Error('教材CSVの単元情報が不正です。');
    const grade = '中' + String.fromCharCode(0xff10 + Number(match[1]));
    const normalized = key.normalize('NFKC').trim();
    if (normalizedKeys.has(normalized) && normalizedKeys.get(normalized) !== key) throw Error('正規化すると衝突する単元キーがあります。');
    normalizedKeys.set(normalized, key);
    if (key !== key.trim() || section !== section.trim()) warnings.add(key);
    if (!entries.has(key)) entries.set(key, { key, grade, unit, section, wordCount: 0 });
    const entry = entries.get(key);
    if (entry.unit !== unit || entry.section !== section || entry.grade !== grade) throw Error('同じキーの単元情報が一致しません。');
    entry.wordCount++;
  }
  const units = [...entries.values()];
  const grades = [...new Set(units.map(unit => unit.grade))];
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return {
    schemaVersion: 1, version: `wordlist-sha256:${sha256}`, source: { ...source, sha256, byteLength: bytes.length },
    wordCount: parsed.data.length, sectionCount: units.length,
    grades: grades.map(grade => ({ grade, unitCount: new Set(units.filter(u => u.grade === grade).map(u => u.unit)).size, sectionCount: units.filter(u => u.grade === grade).length, wordCount: units.filter(u => u.grade === grade).reduce((sum, u) => sum + u.wordCount, 0) })),
    warnings: [...warnings].map(key => ({ code: 'ORIGINAL_WHITESPACE_PRESERVED', key })), units,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [sourcePath, sourceCommit, sourceBlob, recordedOn] = process.argv.slice(2);
  if (!sourcePath || !/^[a-f0-9]{40}$/.test(sourceCommit || '') || !/^[a-f0-9]{40}$/.test(sourceBlob || '') || !recordedOn) throw Error('CSVパス・取得元commit・blob・確認日を指定してください。');
  const catalog = extractEnglishMissionCatalog(readFileSync(sourcePath), { repository: 'kohiramotonetz-create/student-app', path: 'public/wordlist.csv', commit: sourceCommit, blob: sourceBlob, recordedOn });
  writeFileSync(new URL('../src/data/englishMissionCatalog.js', import.meta.url), `// Generated from the recorded wordlist.csv. Preserve original keys and first-occurrence order.\nexport const englishMissionCatalog = ${JSON.stringify(catalog, null, 2)};\n`);
  console.log(JSON.stringify({ version: catalog.version, grades: catalog.grades, words: catalog.wordCount, sections: catalog.sectionCount, warnings: catalog.warnings }, null, 2));
}