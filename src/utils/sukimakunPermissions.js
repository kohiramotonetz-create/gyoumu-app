export const getSukimakunPresetContentIds = (activeContents, modeKey) => activeContents
  .filter(content => content?.[modeKey] === true)
  .map(content => content.contentId);

export const replaceStudentContentIds = (editingByStudentId, studentId, contentIds) => ({
  ...editingByStudentId,
  [studentId]: [...contentIds]
});

export const areSameContentIds = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every(contentId => rightSet.has(contentId));
};

export const getStudentsWithUnsavedChanges = (students, editingByStudentId) => students.filter(student =>
  !areSameContentIds(editingByStudentId[student.userId] || [], student.allowedContentIds || [])
);

export const saveSukimakunPermissionsSequentially = async (students, saveStudent) => {
  const results = [];
  for (const student of students) {
    try {
      results.push({ student, success: true, value: await saveStudent(student) });
    } catch (error) {
      results.push({ student, success: false, error });
    }
  }
  return results;
};
