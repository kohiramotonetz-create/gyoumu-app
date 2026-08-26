import { ALL_SCHOOLS } from '../constants/organization.js';
import { normalizeNameKana } from './nameKana.js';

const GRADE_ORDER = ['小１', '小２', '小３', '小４', '小５', '小６', '中１', '中２', '中３', '高１', '高２', '高３', '大学受験'];
const SCHOOL_ORDER = new Map(ALL_SCHOOLS.map((school, index) => [school, index]));

const compareText = (left, right) => String(left || '').localeCompare(String(right || ''), 'ja');

export function compareStudentsByKana(left, right) {
  const leftKana = normalizeNameKana(left.nameKana);
  const rightKana = normalizeNameKana(right.nameKana);
  if (!leftKana && rightKana) return 1;
  if (leftKana && !rightKana) return -1;
  const kanaDifference = leftKana.localeCompare(rightKana, 'ja');
  if (kanaDifference) return kanaDifference;
  const nameDifference = compareText(left.name, right.name);
  if (nameDifference) return nameDifference;
  return compareText(left.userId ?? left.studentId, right.userId ?? right.studentId);
}

const compareKanaAvailabilityAndValue = (left, right) => {
  const leftKana = normalizeNameKana(left.nameKana);
  const rightKana = normalizeNameKana(right.nameKana);
  if (!leftKana && rightKana) return 1;
  if (leftKana && !rightKana) return -1;
  return leftKana.localeCompare(rightKana, 'ja');
};

export function compareStudentAccounts(left, right) {
  const schoolDifference = (SCHOOL_ORDER.get(left.school) ?? Number.MAX_SAFE_INTEGER) - (SCHOOL_ORDER.get(right.school) ?? Number.MAX_SAFE_INTEGER);
  if (schoolDifference) return schoolDifference;
  const kanaDifference = compareKanaAvailabilityAndValue(left, right);
  if (kanaDifference) return kanaDifference;
  const gradeDifference = GRADE_ORDER.indexOf(left.grade) - GRADE_ORDER.indexOf(right.grade);
  if (gradeDifference) return gradeDifference;
  const nameDifference = compareText(left.name, right.name);
  if (nameDifference) return nameDifference;
  return compareText(left.userId ?? left.studentId, right.userId ?? right.studentId);
}

export function filterCampParticipants(students, { school, grades = [], assignedSchools = [], nameQuery = '' }) {
  const selectedGrade = grades[0] || '';
  const query = nameQuery.trim().toLocaleLowerCase('ja');
  const allowedSchools = school === '全担当校舎' ? new Set(assignedSchools) : null;
  return students
    .filter(student => allowedSchools ? allowedSchools.has(student.school) : student.school === school)
    .filter(student => !selectedGrade || student.grade === selectedGrade)
    .filter(student => !query || String(student.name || '').toLocaleLowerCase('ja').includes(query))
    .sort(compareStudentAccounts);
}
