import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { createEnglishMissionHttpRepository } from '../src/data/englishMissionRepository.js';

test('Stage2 sends the existing management POST contract and verifies the GAS storage response', async t => {
  const url = 'https://example.invalid/mission-test';
  const repository = createEnglishMissionHttpRepository({ url, apiKey: 'synthetic-key', sessionToken: 'synthetic-session' });
  const seen = [];
  t.mock.method(axios, 'post', async (endpoint, body, config) => {
    assert.equal(endpoint, url);
    assert.equal(config.headers['Content-Type'], 'text/plain');
    assert.equal(config.timeout, 30000);
    const request = JSON.parse(body);
    seen.push(request);
    return { data: { result: 'success', storage: 'gas', records: [] } };
  });
  const target = { scopeSchools: ['架空校舎'], attendingSchoolName: '架空中学校', targetGrade: '中１', subject: 'english' };
  await repository.list(target);
  assert.deepEqual(seen, [{ action: 'getSukimakunEnglishMissions', target, includeAccessibleScopes: true, apiKey: 'synthetic-key', sessionToken: 'synthetic-session' }]);
});

test('a mock result cannot confirm a save through the direct GAS adapter', async t => {
  t.mock.method(axios, 'post', async () => ({ data: { result: 'success', storage: 'mock-server', records: [] } }));
  const repository = createEnglishMissionHttpRepository({ url: 'https://example.invalid', apiKey: 'synthetic-key', sessionToken: 'synthetic-session' });
  await assert.rejects(repository.saveBatch({ operationId: 'test-save' }), { code: 'INVALID_RESPONSE' });
});
