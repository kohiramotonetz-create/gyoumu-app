export function parseKoToreUnitsCsv(text) {
  return String(text || '').split(/\r?\n/).slice(1).filter(line => line.trim()).map((line, index) => {
    const cells = line.split(',').map(value => value.trim());
    return { grade: cells[0] || '', subject: cells[1] || '', textName: cells[2] || '', chapter: cells[3] || '', unitName: cells[4] || '', page: cells[5] || '', sourceOrder: index + 1 };
  }).filter(item => item.grade && item.subject && item.textName && item.page);
}
