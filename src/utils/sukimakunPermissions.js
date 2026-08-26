export const getSukimakunPresetContentIds = (activeContents, modeKey) => activeContents
  .filter(content => content?.[modeKey] === true)
  .map(content => content.contentId);

export const replaceStudentContentIds = (editingByStudentId, studentId, contentIds) => ({
  ...editingByStudentId,
  [studentId]: [...contentIds]
});
