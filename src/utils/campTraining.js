export const CAMP_SEASONS = Object.freeze(['夏', '冬']);
export const CAMP_DAYS = Object.freeze([1, 2, 3, 4]);
export const CAMP_SUBJECTS = Object.freeze(['japanese', 'math', 'english', 'social', 'science']);

export function getCurrentFiscalYear(date = new Date()) {
  return date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear();
}

export function normalizeCampCount(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error('問題数は0以上の整数で入力してください。');
  return number;
}

export function calculateCampTotal(entry) {
  return CAMP_SUBJECTS.reduce((sum, subject) => sum + normalizeCampCount(entry[subject]), 0);
}

export function assignCompetitionRanks(rows) {
  let previousTotal = null;
  let previousRank = 0;
  return [...rows]
    .sort((left, right) => right.total - left.total || String(left.studentId).localeCompare(String(right.studentId), 'ja'))
    .map((row, index) => {
      const rank = row.total === previousTotal ? previousRank : index + 1;
      previousTotal = row.total;
      previousRank = rank;
      return { ...row, rank };
    });
}

export function formatRankChange(currentRank, previousRank, comparable = true) {
  if (!comparable || !previousRank) return '―';
  const difference = previousRank - currentRank;
  if (difference > 0) return `↑${difference}`;
  if (difference < 0) return `↓${Math.abs(difference)}`;
  return '―';
}
