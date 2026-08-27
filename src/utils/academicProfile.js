export const ACADEMIC_PROFILE_SUBJECTS = [
  ['japanese', '国語'], ['math', '数学'], ['english', '英語'], ['science', '理科'], ['social', '社会'], ['music', '音楽'], ['health', '保健'], ['art', '美術'], ['technologyHomeEconomics', '技家']
];

export function buildAcademicChartData(test) {
  return ACADEMIC_PROFILE_SUBJECTS.map(([key, label]) => {
    const raw = test?.scores?.[key];
    const missing = raw === '' || raw == null;
    return { key, label, score: missing ? null : Number(raw), maxScore: Number(test?.maxScore) };
  });
}
