function normalizeUnitIds(unitIds) {
  if (!Array.isArray(unitIds)) return [];
  return Array.from(new Set(unitIds.map(unitId => String(unitId || '').trim()).filter(Boolean)));
}

export function applyOneToOneNetzUnitSelection(currentUnitIds, selectedUnitId) {
  const unitId = String(selectedUnitId || '').trim();
  const unitIds = normalizeUnitIds(currentUnitIds);
  return {
    selectedUnitId: unitId,
    unitIds: unitId ? Array.from(new Set([...unitIds, unitId])) : unitIds,
  };
}

export function removeOneToOneNetzUnitSelection(currentUnitIds, selectedUnitId, unitIdToRemove) {
  const removedUnitId = String(unitIdToRemove || '').trim();
  return {
    selectedUnitId: selectedUnitId === removedUnitId ? '' : selectedUnitId,
    unitIds: normalizeUnitIds(currentUnitIds).filter(unitId => unitId !== removedUnitId),
  };
}

export function addOneToOneNetzUnitRange(axis, currentUnitIds, rangeStart, rangeEnd) {
  const start = axis.find(unit => unit.unitId === rangeStart)?.unitOrder;
  const end = axis.find(unit => unit.unitId === rangeEnd)?.unitOrder;
  if (!start || !end) return normalizeUnitIds(currentUnitIds);
  const [low, high] = start <= end ? [start, end] : [end, start];
  const rangeUnitIds = axis
    .filter(unit => unit.unitOrder >= low && unit.unitOrder <= high)
    .map(unit => unit.unitId);
  return Array.from(new Set([...normalizeUnitIds(currentUnitIds), ...rangeUnitIds]));
}

export function buildOneToOneNetzProgressReplacement({ lessonDate, unitIds, requestId }) {
  return { lessonDate, unitIds: normalizeUnitIds(unitIds), requestId };
}
