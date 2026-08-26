export const ONE_TO_ONE_SUBJECTS = Object.freeze([
  Object.freeze({ subjectId: 'english', label: '英語' }),
  Object.freeze({ subjectId: 'math', label: '数学' }),
  Object.freeze({ subjectId: 'japanese', label: '国語' }),
  Object.freeze({ subjectId: 'science', label: '理科' }),
  Object.freeze({ subjectId: 'social', label: '社会' })
]);

const subjectOrder = new Map(ONE_TO_ONE_SUBJECTS.map((subject, index) => [subject.subjectId, index]));

export function normalizeOneToOneSubjectIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(subjectId => subjectOrder.has(subjectId))))
    .sort((left, right) => subjectOrder.get(left) - subjectOrder.get(right));
}

export function areSameOneToOneSubjects(left, right) {
  const normalizedLeft = normalizeOneToOneSubjectIds(left);
  const normalizedRight = normalizeOneToOneSubjectIds(right);
  return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((subjectId, index) => subjectId === normalizedRight[index]);
}

export function toggleOneToOneSubject(subjectIds, subjectId) {
  if (!subjectOrder.has(subjectId)) return normalizeOneToOneSubjectIds(subjectIds);
  const next = new Set(normalizeOneToOneSubjectIds(subjectIds));
  if (next.has(subjectId)) next.delete(subjectId); else next.add(subjectId);
  return normalizeOneToOneSubjectIds(Array.from(next));
}
