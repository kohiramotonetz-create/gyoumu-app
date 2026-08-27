export function parseKoToreUnitsCsv(text) {
  return String(text || '').split(/\r?\n/).slice(1).filter(line => line.trim()).map((line, index) => {
    const cells = line.split(',').map(value => value.trim());
    return { grade: cells[0] || '', subject: cells[1] || '', textName: cells[2] || '', chapter: cells[3] || '', unitName: cells[4] || '', page: cells[5] || '', sourceOrder: index + 1 };
  }).filter(item => item.grade && item.subject && item.textName && item.page);
}

const normalizeAxisKey = value => String(value || '').normalize('NFKC').replace(/\s/g, '').toLowerCase();

export function ensureKoToreProfileAxes(data, masterUnits) {
  return {
    ...data,
    items: (data?.items || []).map(item => {
      if (Array.isArray(item.axis) && item.axis.length) return item;
      const axis = masterUnits.filter(unit => normalizeAxisKey(unit.subject) === normalizeAxisKey(item.subject) && normalizeAxisKey(unit.textName) === normalizeAxisKey(item.textName)).map((unit, index) => ({ ...unit, unitOrder: index + 1 }));
      return { ...item, axis };
    })
  };
}
