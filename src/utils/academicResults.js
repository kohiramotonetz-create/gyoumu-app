export const ACADEMIC_SUBJECTS = [
  { key: 'japanese', label: '国語' },
  { key: 'math', label: '数学' },
  { key: 'english', label: '英語' },
  { key: 'science', label: '理科' },
  { key: 'social', label: '社会' },
  { key: 'music', label: '音楽' },
  { key: 'health', label: '保健' },
  { key: 'art', label: '美術' },
  { key: 'technologyHomeEconomics', label: '技家' }
];

export const TEST_TYPE_LABELS = { regular: '定期テスト', diagnostic: '診断テスト', other: 'その他' };
export const ACADEMIC_START_YEAR = 2024;

export function getCurrentSchoolYear(now = new Date()) {
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

export function getAcademicYearOptions(testYears = [], now = new Date()) {
  const currentYear = getCurrentSchoolYear(now);
  const validStoredYears = testYears.map(Number).filter(year => Number.isInteger(year) && year >= ACADEMIC_START_YEAR);
  const lastYear = Math.max(currentYear + 1, ACADEMIC_START_YEAR, ...validStoredYears);
  return Array.from({ length: lastYear - ACADEMIC_START_YEAR + 1 }, (_, index) => ACADEMIC_START_YEAR + index);
}

export function normalizeAcademicScore(value, maxScore) {
  if (value === '' || value === null || value === undefined) return '';
  const normalized = String(value).normalize('NFKC').trim();
  if (!/^\d+$/.test(normalized)) throw new Error(`点数は0～${maxScore}の整数で入力してください`);
  const score = Number(normalized);
  if (!Number.isInteger(score) || score < 0 || score > maxScore) throw new Error(`点数は0～${maxScore}の整数で入力してください`);
  return score;
}

export function calculateAcademicTotal(scores) {
  if (!scores || ACADEMIC_SUBJECTS.some(({ key }) => scores[key] === '' || scores[key] === null || scores[key] === undefined)) return null;
  return ACADEMIC_SUBJECTS.reduce((sum, { key }) => sum + Number(scores[key]), 0);
}

export function parseAcademicScorePaste(text, maxScore, availableRows) {
  const normalizedText = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const rows = normalizedText.split('\n');
  const errors = [];
  if (!normalizedText) errors.push('貼り付けるデータがありません。');
  if (rows.length > availableRows) errors.push(`貼り付け${availableRows + 1}行目：表示中の生徒一覧を超えています。`);
  const parsedRows = rows.map((row, rowIndex) => {
    const cells = row.split('\t');
    if (cells.length !== ACADEMIC_SUBJECTS.length) {
      errors.push(`貼り付け${rowIndex + 1}行目：9列ではなく${cells.length}列あります。${cells.length === 10 ? '合計列を除いた9科目だけコピーしてください。' : ''}`);
      return null;
    }
    return cells.map((cell, columnIndex) => {
      try { return normalizeAcademicScore(cell, maxScore); }
      catch {
        errors.push(`貼り付け${rowIndex + 1}行目・${ACADEMIC_SUBJECTS[columnIndex].label}：点数は0～${maxScore}で入力してください。`);
        return null;
      }
    });
  });
  return { rows: errors.length ? [] : parsedRows, errors };
}

export function areAcademicScoresEqual(left = {}, right = {}) {
  return ACADEMIC_SUBJECTS.every(({ key }) => (left[key] ?? '') === (right[key] ?? ''));
}
