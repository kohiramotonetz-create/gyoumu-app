export const TEACHER_HOME_PROGRESS_STATUSES = Object.freeze({
  good: Object.freeze({ label: '順調', colorKey: 'success' }),
  warning: Object.freeze({ label: '要注意', colorKey: 'warning' }),
  behind: Object.freeze({ label: '遅れ', colorKey: 'danger' }),
});

export function buildTeacherHomeProgressDonut(percentages = {}) {
  const good = Math.max(0, Math.min(100, Number(percentages.good) || 0));
  const warning = Math.max(0, Math.min(100 - good, Number(percentages.warning) || 0));
  const warningEnd = good + warning;
  return `conic-gradient(#26ad72 0 ${good}%, #ffd000 ${good}% ${warningEnd}%, #f23838 ${warningEnd}% 100%)`;
}

export function paginateTeacherHomeProgressItems(items, page, pageSize) {
  const values = Array.isArray(items) ? items : [];
  const size = [20, 50, 100].includes(Number(pageSize)) ? Number(pageSize) : 20;
  const totalPages = Math.max(1, Math.ceil(values.length / size));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const startIndex = (currentPage - 1) * size;
  return {
    items: values.slice(startIndex, startIndex + size),
    page: currentPage,
    pageSize: size,
    totalPages,
    start: values.length ? startIndex + 1 : 0,
    end: Math.min(values.length, startIndex + size),
    total: values.length,
  };
}

export function formatTeacherHomeProgressUnit(unit) {
  if (!unit) return '未登録';
  const values = [unit.textName, unit.chapter, unit.section, unit.unitName]
    .map(value => String(value || '').trim())
    .filter((value, index, all) => value && all.indexOf(value) === index);
  const page = String(unit.page || '').trim();
  if (page) values.push(/^p\.?/i.test(page) ? page : `p.${page}`);
  return values.join(' / ') || `単元${unit.unitOrder}`;
}

export function formatTeacherHomeProgressDifference(value) {
  const difference = Number(value);
  if (!Number.isFinite(difference)) return '比較不能';
  return `${difference > 0 ? '+' : ''}${difference}単元`;
}
