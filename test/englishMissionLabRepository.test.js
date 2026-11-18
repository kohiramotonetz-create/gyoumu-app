import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnglishMissionRepository } from '../src/data/englishMissionRepository.js';

test('LAB repository accepts GAS readback and rejects a mock result', async () => {
  const records = [];
  const gas = createEnglishMissionRepository({ expectedStorage: 'gas', invoke: async () => ({ result: 'success', storage: 'gas', records }) });
  const mock = createEnglishMissionRepository({ expectedStorage: 'gas', invoke: async () => ({ result: 'success', storage: 'mock-server', records }) });
  assert.deepEqual((await gas.list({})).records, []);
  await assert.rejects(mock.list({}), { code: 'INVALID_RESPONSE' });
});
