import { randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { env } from 'node:process';

export const previewHost = '127.0.0.1';
export const previewPort = 5178;
export const previewDirectory = join(env.LOCALAPPDATA || homedir(), 'gyoumu-stage2-preview');
export const previewDataFile = join(previewDirectory, 'missions.json');

export function createLocalEnglishMissionStore(file, onWrite = () => {}) {
  function read() {
    try {
      const snapshot = JSON.parse(readFileSync(file, 'utf8'));
      if (snapshot?.format !== 1 || !Array.isArray(snapshot.operations) || !Array.isArray(snapshot.rows)) throw Error();
      return snapshot;
    } catch (error) {
      if (error.code === 'ENOENT') return { format: 1, operations: [], rows: [] };
      throw Object.assign(Error('ローカル保存ファイルを読み取れません。元のファイルを保全して確認してください。'), { code: 'STORAGE_INTEGRITY_ERROR' });
    }
  }

  function persist(snapshot) {
    mkdirSync(dirname(file), { recursive: true });
    const temporaryFile = file + '.' + randomUUID() + '.tmp';
    try {
      const fd = openSync(temporaryFile, 'wx', 0o600);
      try {
        writeFileSync(fd, JSON.stringify(snapshot, null, 2) + '\n');
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(temporaryFile, file);
    } finally {
      rmSync(temporaryFile, { force: true });
    }
  }

  return {
    read,
    begin(operation) {
      const snapshot = read();
      snapshot.operations.push(operation);
      persist(snapshot);
    },
    append(batch) {
      const snapshot = read();
      try {
        for (const row of batch) {
          snapshot.rows.push(row);
          onWrite('after-row', snapshot.rows.length);
        }
      } catch (error) {
        // Keep the staged prefix for Preview's existing partial-write test.
        persist(snapshot);
        throw error;
      }
      persist(snapshot);
    },
    mark(id, state, at) {
      const snapshot = read();
      const operation = snapshot.operations.find(item => item.operationId === id);
      if (!operation) throw Error('missing operation');
      operation.state = state;
      operation.updatedAt = at;
      persist(snapshot);
    },
  };
}

export function archiveLocalEnglishMissionData(file) {
  const backup = file + '.' + new Date().toISOString().replaceAll(':', '-') + '.' + randomUUID() + '.bak';
  try {
    renameSync(file, backup);
    return backup;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
