export const ONE_TO_ONE_UNIT_STEP = 42;
export const ONE_TO_ONE_AXIS_LEADING = 150;
export const ONE_TO_ONE_AXIS_MIN_WIDTH = 760;

export function getOneToOneUnitOrder(axis, unitId) {
  if (!unitId) return 0;
  return axis.find(unit => unit.unitId === unitId)?.unitOrder || 0;
}

export function getOneToOneProgressDifference(axis, schoolCurrentUnitId, netzCurrentUnitId) {
  const schoolOrder = getOneToOneUnitOrder(axis, schoolCurrentUnitId);
  const netzOrder = getOneToOneUnitOrder(axis, netzCurrentUnitId);
  if (!schoolOrder && !netzOrder) return { status: 'unavailable', difference: 0, label: '進捗未登録' };
  if (!schoolOrder || !netzOrder) return { status: 'unavailable', difference: 0, label: '比較できません' };
  const difference = schoolOrder - netzOrder;
  if (difference === 0) return { status: 'same', difference: 0, label: '学校と同じ位置' };
  if (difference > 0) return { status: 'school-ahead', difference, label: `学校が${difference}単元先` };
  return { status: 'netz-ahead', difference: Math.abs(difference), label: `ネッツが${Math.abs(difference)}単元先` };
}

export function getOneToOneAxisCanvasWidth(axisLength) {
  return Math.max(ONE_TO_ONE_AXIS_MIN_WIDTH, ONE_TO_ONE_AXIS_LEADING + Math.max(0, axisLength - 1) * ONE_TO_ONE_UNIT_STEP + 36);
}

export function paginateOneToOneStudents(students, page, pageSize) {
  const total = students.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = total ? (safePage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, total);
  return {
    page: safePage,
    total,
    totalPages,
    start: total ? startIndex + 1 : 0,
    end: endIndex,
    items: students.slice(startIndex, endIndex),
  };
}

export function formatOneToOneCurrentUnit(unit) {
  if (!unit) return ['未登録'];
  const page = String(unit.page || '').trim();
  const values = [unit.chapter, unit.section, unit.unitName, page ? (/^p\./i.test(page) ? page : `p.${page}`) : ''];
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}
