import Papa from 'papaparse';

const SUBJECT_LABEL_TO_ID = Object.freeze({ '英語': 'english', '数学': 'math', '国語': 'japanese', '理科': 'science', '社会': 'social' });

export function parseSchoolUnitsCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: header => header.trim() });
  if (parsed.errors.length) throw new Error('school_units.csvを読み込めません');
  const required = ['学年', '科目', 'テキスト名', '章', '節', '単元', 'ページ', 'unitId'];
  if (!required.every(header => parsed.meta.fields.includes(header))) throw new Error('school_units.csvのヘッダーが不正です');
  const seen = new Set();
  return parsed.data.map((row, index) => {
    const unitId = String(row.unitId || '').trim();
    if (!unitId || seen.has(unitId)) throw new Error('school_units.csvのunitIdが空欄または重複しています');
    seen.add(unitId);
    return {
      unitId,
      grade: String(row.学年 || '').trim(),
      subjectId: SUBJECT_LABEL_TO_ID[String(row.科目 || '').trim()] || '',
      subjectLabel: String(row.科目 || '').trim(),
      textName: String(row.テキスト名 || '').trim(),
      chapter: String(row.章 || '').trim(),
      section: String(row.節 || '').trim(),
      unitName: String(row.単元 || '').trim(),
      page: String(row.ページ || '').trim(),
      sourceOrder: index + 1
    };
  });
}

export function selectSchoolUnitAxis(units, grade, subjectId) {
  return units.filter(unit => unit.grade.includes(grade) && unit.subjectId === subjectId)
    .map((unit, index) => ({ ...unit, unitOrder: index + 1 }));
}

export function formatSchoolUnit(unit) {
  return [unit.textName, unit.chapter, unit.section, unit.unitName, unit.page].filter(Boolean).join(' ');
}
