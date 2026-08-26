const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const gasSource = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(gasSource, context);

function loadDefaultContents() {
  const match = gasSource.match(/const DEFAULT_SUKIMAKUN_CONTENTS = (\[[\s\S]*?\n\]\.map\(row => row\.concat\(\[false, false\]\)\));/);
  assert.ok(match, 'DEFAULT_SUKIMAKUN_CONTENTS should be defined');
  return vm.runInNewContext(match[1]);
}

function makeSheet(initialRows = []) {
  const state = { rows: initialRows.map(row => [...row]), writes: 0 };
  return {
    state,
    getLastRow: () => state.rows.length,
    getLastColumn: () => state.rows.reduce((max, row) => Math.max(max, row.length), 0),
    getDataRange: () => ({ getValues: () => state.rows.map(row => [...row]) }),
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => Array.from({ length: rowCount }, (_, rowOffset) => Array.from({ length: columnCount }, (_, columnOffset) => state.rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? '')),
      setValues: values => {
        state.writes++;
        values.forEach((valuesRow, rowOffset) => {
          const targetRow = row - 1 + rowOffset;
          if (!state.rows[targetRow]) state.rows[targetRow] = [];
          valuesRow.forEach((value, columnOffset) => { state.rows[targetRow][column - 1 + columnOffset] = value; });
        });
      }
    })
  };
}

function migrate(rows) {
  const sheet = makeSheet(rows);
  const result = { warnings: [], migratedLegacyContentSheet: false, expandedSevenColumnContentSheet: false };
  context.testSpreadsheet = { getSheetByName: () => sheet };
  context.testResult = result;
  vm.runInContext('migrateSukimakunContentSheet(testSpreadsheet, testResult)', context);
  return { sheet, result };
}

function makeSpreadsheet(initialSheets = {}) {
  const sheets = { ...initialSheets };
  return {
    sheets,
    getSheetByName: name => sheets[name] || null,
    insertSheet: name => {
      sheets[name] = makeSheet();
      return sheets[name];
    }
  };
}

test('preposition test is included in the Sukimakun setup contents', () => {
  const contents = loadDefaultContents();
  const prepositionTest = contents.find(row => row[0] === 'preposition_test');

  assert.deepEqual(
    Array.from(prepositionTest),
    ['preposition_test', '前置詞テスト', 'general', 'all', 'english', true, 25, false, false]
  );
});

test('Sukimakun setup content IDs and sort orders remain unique', () => {
  const contents = loadDefaultContents();
  const contentIds = contents.map(row => row[0]);
  const sortOrders = contents.map(row => row[6]);

  assert.equal(new Set(contentIds).size, contents.length);
  assert.equal(new Set(sortOrders).size, contents.length);
  assert.ok(contents.every(row => row.length === 9 && row[7] === false && row[8] === false));
});

test('新規セットアップは9列ヘッダーと両モードfalseのコンテンツを作成する', () => {
  const spreadsheet = makeSpreadsheet();
  context.SpreadsheetApp = { getActiveSpreadsheet: () => spreadsheet };
  const result = vm.runInContext('setupSukimakunPermissionSheets()', context);
  const rows = spreadsheet.sheets['スキマ君コンテンツ'].state.rows;

  assert.deepEqual(rows[0], ['contentId', 'displayName', 'category', 'schoolType', 'subject', 'enabled', 'sortOrder', '中学生モード', '高校生モード']);
  assert.ok(rows.slice(1).every(row => row[7] === false && row[8] === false));
  assert.equal(result.addedContents, loadDefaultContents().length);
});

test('7列コンテンツシートは既存データを維持して末尾のモード列だけを追加する', () => {
  const headers = ['contentId', 'displayName', 'category', 'schoolType', 'subject', 'enabled', 'sortOrder'];
  const existing = ['content-a', '表示A', 'general', 'all', 'english', true, 4];
  const { sheet, result } = migrate([headers, existing]);

  assert.deepEqual(sheet.state.rows[0], headers.concat(['中学生モード', '高校生モード']));
  assert.deepEqual(sheet.state.rows[1], existing);
  assert.equal(result.expandedSevenColumnContentSheet, true);
  assert.deepEqual(result.warnings, []);
});

test('9列コンテンツシートは既存モード値を変更しない', () => {
  const headers = ['contentId', 'displayName', 'category', 'schoolType', 'subject', 'enabled', 'sortOrder', '中学生モード', '高校生モード'];
  const existing = ['content-a', '表示A', 'general', 'all', 'english', true, 4, true, false];
  const { sheet, result } = migrate([headers, existing]);

  assert.equal(sheet.state.writes, 0);
  assert.deepEqual(sheet.state.rows[1], existing);
  assert.deepEqual(result.warnings, []);
});

test('セットアップ同期は既存コンテンツのモード値を保持する', () => {
  const headers = ['contentId', 'displayName', 'category', 'schoolType', 'subject', 'enabled', 'sortOrder', '中学生モード', '高校生モード'];
  const existing = ['paper_english_test', '手動表示', 'manual', 'all', 'english', true, 99, true, true];
  const contentSheet = makeSheet([headers, existing]);
  const spreadsheet = makeSpreadsheet({ 'スキマ君コンテンツ': contentSheet });
  context.SpreadsheetApp = { getActiveSpreadsheet: () => spreadsheet };
  vm.runInContext('setupSukimakunPermissionSheets()', context);

  assert.deepEqual(contentSheet.state.rows[1], existing);
});

test('旧4列コンテンツシートは既存値を維持して9列へ移行する', () => {
  const { sheet, result } = migrate([
    ['contentId', 'displayName', 'enabled', 'sortOrder'],
    ['legacy-a', '旧表示', true, 8]
  ]);

  assert.deepEqual(sheet.state.rows[0], ['contentId', 'displayName', 'category', 'schoolType', 'subject', 'enabled', 'sortOrder', '中学生モード', '高校生モード']);
  assert.deepEqual(sheet.state.rows[1], ['legacy-a', '旧表示', 'general', 'all', 'other', true, 8, false, false]);
  assert.equal(result.migratedLegacyContentSheet, true);
});

test('想定外ヘッダーや余分な列は変更せず警告する', () => {
  const rows = [['contentId', 'displayName', 'enabled', 'sortOrder', 'unexpected'], ['a', 'A', true, 1, 'keep']];
  const { sheet, result } = migrate(rows);

  assert.equal(sheet.state.writes, 0);
  assert.deepEqual(sheet.state.rows, rows);
  assert.equal(result.warnings.length, 1);
});

test('マスター読込はTRUEだけを各モード対象にして空欄をfalseにする', () => {
  const headers = ['contentId', 'displayName', 'category', 'schoolType', 'subject', 'enabled', 'sortOrder', '中学生モード', '高校生モード'];
  const sheet = makeSheet([
    headers,
    ['junior', '中学', 'general', 'all', 'other', true, 1, 'TRUE', ''],
    ['high', '高校', 'general', 'all', 'other', true, 2, false, true],
    ['both', '共通', 'general', 'all', 'other', true, 3, true, 'TRUE']
  ]);
  context.getRequiredSheet = () => sheet;
  const contents = vm.runInContext('getSukimakunContentMaster().contents', context);

  assert.deepEqual(Array.from(contents, content => [content.contentId, content.juniorHighMode, content.highSchoolMode]), [
    ['junior', true, false], ['high', false, true], ['both', true, true]
  ]);
});
