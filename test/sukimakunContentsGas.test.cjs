const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const gasSource = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');

function loadDefaultContents() {
  const match = gasSource.match(/const DEFAULT_SUKIMAKUN_CONTENTS = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'DEFAULT_SUKIMAKUN_CONTENTS should be defined');
  return vm.runInNewContext(match[1]);
}

test('preposition test is included in the Sukimakun setup contents', () => {
  const contents = loadDefaultContents();
  const prepositionTest = contents.find(row => row[0] === 'preposition_test');

  assert.deepEqual(
    Array.from(prepositionTest),
    ['preposition_test', '前置詞テスト', 'general', 'all', 'english', true, 25]
  );
});

test('Sukimakun setup content IDs and sort orders remain unique', () => {
  const contents = loadDefaultContents();
  const contentIds = contents.map(row => row[0]);
  const sortOrders = contents.map(row => row[6]);

  assert.equal(new Set(contentIds).size, contents.length);
  assert.equal(new Set(sortOrders).size, contents.length);
});
