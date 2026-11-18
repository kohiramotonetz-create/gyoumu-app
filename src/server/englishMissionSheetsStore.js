export const ENGLISH_MISSION_SHEETS = {
  versions: { name: '英語ミッション履歴', headers: ['operationId', 'missionId', 'version', 'groupId', 'ordinal', 'recordJson', 'recordHash'] },
  operations: { name: '英語ミッション操作', headers: ['operationId', 'actorIdJson', 'groupId', 'mode', 'requestHash', 'baseRevision', 'commitRevision', 'recordCount', 'recordsDigest', 'createdAt', 'updatedAt', 'state'] },
};
const parsePayload = value => { try { return JSON.parse(String(value)); } catch { return null; } };
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };

export function createEnglishMissionSheetsStore(book) {
  const sheet = spec => {
    const result = book.getSheetByName(spec.name);
    if (!result) fail('SETUP_REQUIRED', 'ミッション専用シートの準備が必要です。');
    if (result.getLastColumn() !== spec.headers.length || JSON.stringify(result.getRange(1, 1, 1, spec.headers.length).getValues()[0]) !== JSON.stringify(spec.headers)) fail('STORAGE_INTEGRITY_ERROR', 'ミッション専用シートの見出しを確認してください。');
    return result;
  };
  const append = (target, values) => {
    if (!values.length) return;
    const first = target.getLastRow() + 1;
    if (first + values.length - 1 > target.getMaxRows()) {
      if (!target.insertRowsAfter) fail('STORAGE_CAPACITY', '保存先の行数が不足しています。管理者に連絡してください。');
      target.insertRowsAfter(target.getMaxRows(), first + values.length - 1 - target.getMaxRows());
    }
    const range = target.getRange(first, 1, values.length, values[0].length);
    range.setNumberFormat('@'); range.setValues(values);
  };
  const operationRows = () => sheet(ENGLISH_MISSION_SHEETS.operations).getDataRange().getValues().slice(1).filter(row => row.some(value => value !== ''));
  return {
    setup() {
      for (const spec of Object.values(ENGLISH_MISSION_SHEETS)) {
        if (!book.getSheetByName(spec.name)) book.insertSheet(spec.name).getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
        sheet(spec);
      }
      return { sheetNames: Object.values(ENGLISH_MISSION_SHEETS).map(spec => spec.name) };
    },
    read() {
      try {
        const operations = operationRows().map(r => ({ operationId: String(r[0]), actorId: JSON.parse(String(r[1])), groupId: String(r[2]), mode: String(r[3]), requestHash: String(r[4]), baseRevision: Number(r[5]), commitRevision: Number(r[6]), recordCount: Number(r[7]), recordsDigest: String(r[8]), createdAt: String(r[9]), updatedAt: String(r[10]), state: String(r[11]) }));
        const rows = sheet(ENGLISH_MISSION_SHEETS.versions).getDataRange().getValues().slice(1).filter(row => row.some(value => value !== '')).map(r => ({ operationId: String(r[0]), missionId: String(r[1]), version: Number(r[2]), groupId: String(r[3]), ordinal: Number(r[4]), payload: parsePayload(r[5]), hash: String(r[6]) }));
        return { operations, rows };
      } catch (error) { if (error.code) throw error; fail('STORAGE_INTEGRITY_ERROR', 'ミッション保存内容の読み取りに失敗しました。'); }
    },
    begin(op) {
      append(sheet(ENGLISH_MISSION_SHEETS.operations), [[op.operationId, JSON.stringify(op.actorId), op.groupId, op.mode, op.requestHash, op.baseRevision, op.commitRevision, op.recordCount, op.recordsDigest, op.createdAt, op.updatedAt, 'PREPARED']]);
    },
    append(rows) {
      append(sheet(ENGLISH_MISSION_SHEETS.versions), rows.map(row => [row.operationId, row.missionId, row.version, row.groupId, row.ordinal, JSON.stringify(row.payload), row.hash]));
    },
    mark(operationId, state, updatedAt) {
      const target = sheet(ENGLISH_MISSION_SHEETS.operations);
      const physicalRows = target.getDataRange().getValues().slice(1);
      const index = physicalRows.findIndex(row => String(row[0]) === operationId);
      if (index < 0) fail('STORAGE_INTEGRITY_ERROR', '保存操作の記録がありません。');
      target.getRange(index + 2, 11).setValue(updatedAt);
      // The state cell is the final visibility marker. Readers verify the full batch before exposing it.
      target.getRange(index + 2, 12).setValue(state);
    },
  };
}