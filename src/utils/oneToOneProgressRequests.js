export function collectOneToOneMatrixResults(subjectIds, settledResults) {
  const dataBySubjectId = {};
  const errorsBySubjectId = {};

  subjectIds.forEach((subjectId, index) => {
    const result = settledResults[index];
    if (result?.status === 'fulfilled') {
      dataBySubjectId[subjectId] = result.value;
      return;
    }
    errorsBySubjectId[subjectId] = result?.reason?.message || '進捗情報の取得に失敗しました。';
  });

  return { dataBySubjectId, errorsBySubjectId };
}
