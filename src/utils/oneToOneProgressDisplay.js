export function formatLessonDateJa(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '日付未設定';
  return `${Number(match[2])}月${Number(match[3])}日`;
}

export function getChapterSegments(axis) {
  return axis.reduce((segments, unit, index) => {
    const last = segments.at(-1);
    if (!last || last.chapter !== unit.chapter) {
      segments.push({ chapter: unit.chapter || '章未設定', startOrder: unit.unitOrder, endOrder: unit.unitOrder, startIndex: index, endIndex: index });
    } else {
      last.endOrder = unit.unitOrder;
      last.endIndex = index;
    }
    return segments;
  }, []);
}

export function isConsecutiveUnits(units) {
  if (!units.length) return false;
  return units.every((unit, index) => index === 0 || unit.unitOrder === units[index - 1].unitOrder + 1);
}

