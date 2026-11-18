import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createEnglishMissionService } from './englishMissionService.js';

export function createEnglishMissionMemoryBackend({ resolveSession, targetExists, onWrite = () => {}, now = () => Date.now(), store: externalStore }) {
  let operations = [], rows = [], locked = false;
  const key = randomUUID() + randomUUID();
  const copy = value => JSON.parse(JSON.stringify(value));
  const store = externalStore ?? {
    read: () => { onWrite('read'); return copy({ operations, rows }); },
    begin(op) { onWrite('before-begin'); operations.push(copy(op)); onWrite('after-begin'); },
    append(batch) { onWrite('before-append'); for (const row of batch) { rows.push(copy(row)); onWrite('after-row', rows.length); } onWrite('after-append'); },
    mark(id, state, at) { onWrite('before-mark-' + state); const op = operations.find(item => item.operationId === id); if (!op) throw Error('missing operation'); op.updatedAt = at; op.state = state; onWrite('after-mark-' + state); },
  };
  const service = createEnglishMissionService({
    store, resolveSession, targetExists,
    hash: text => createHash('sha256').update(text).digest('hex'),
    sign: text => createHmac('sha256', key).update(text).digest('hex'),
    encode: text => Buffer.from(text).toString('base64url'), decode: text => Buffer.from(text, 'base64url').toString('utf8'),
    uuid: randomUUID, now, storage: 'mock-server',
    withLock: callback => { if (locked) { const error = new Error('他の保存処理が実行中です。'); error.code = 'LOCK_BUSY'; throw error; } locked = true; try { return callback(); } finally { locked = false; } },
  });
  return { handle: service.handle, snapshot: () => externalStore ? store.read() : copy({ operations, rows }) };
}