import { ALL_SCHOOLS } from '../constants/organization.js';

const GRADE_ORDER = ['小１', '小２', '小３', '小４', '小５', '小６', '中１', '中２', '中３', '高１', '高２', '高３', '大学受験'];
const SCHOOL_ORDER = new Map(ALL_SCHOOLS.map((school, index) => [school, index]));

export function compareStudentAccounts(left, right) {
  const schoolDifference = (SCHOOL_ORDER.get(left.school) ?? Number.MAX_SAFE_INTEGER) - (SCHOOL_ORDER.get(right.school) ?? Number.MAX_SAFE_INTEGER);
  if (schoolDifference) return schoolDifference;
  const leftKana = String(left.nameKana || '').trim();
  const rightKana = String(right.nameKana || '').trim();
  if (!leftKana && rightKana) return 1;
  if (leftKana && !rightKana) return -1;
  const kanaDifference = leftKana.localeCompare(rightKana, 'ja');
  if (kanaDifference) return kanaDifference;
  const gradeDifference = GRADE_ORDER.indexOf(left.grade) - GRADE_ORDER.indexOf(right.grade);
  if (gradeDifference) return gradeDifference;
  return String(left.name || '').localeCompare(String(right.name || ''), 'ja');
}
