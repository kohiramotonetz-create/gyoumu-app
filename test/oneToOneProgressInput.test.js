import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatSchoolUnit } from '../src/utils/schoolUnits.js';
import {
  addOneToOneNetzUnitRange,
  applyOneToOneNetzUnitSelection,
  buildOneToOneNetzProgressReplacement,
  removeOneToOneNetzUnitSelection,
} from '../src/utils/oneToOneProgressInput.js';

const axis = [
  { unitId: 'unit-5', unitOrder: 5 },
  { unitId: 'unit-6', unitOrder: 6 },
  { unitId: 'unit-7', unitOrder: 7 },
  { unitId: 'unit-8', unitOrder: 8 },
];

test('ネッツ進捗の単元選択はunitIdを表示stateと登録対象の両方へ保持する', () => {
  const selected = applyOneToOneNetzUnitSelection([], 'unit-6');
  assert.deepEqual(selected, { selectedUnitId: 'unit-6', unitIds: ['unit-6'] });

  const rerendered = applyOneToOneNetzUnitSelection(selected.unitIds, selected.selectedUnitId);
  assert.deepEqual(rerendered, { selectedUnitId: 'unit-6', unitIds: ['unit-6'] });
});

test('ネッツ進捗の範囲開始・終了から連続するunitIdを重複なく追加する', () => {
  assert.deepEqual(addOneToOneNetzUnitRange(axis, ['unit-5'], 'unit-6', 'unit-8'), ['unit-5', 'unit-6', 'unit-7', 'unit-8']);
  assert.deepEqual(addOneToOneNetzUnitRange(axis, [], 'unit-8', 'unit-6'), ['unit-6', 'unit-7', 'unit-8']);
  assert.deepEqual(addOneToOneNetzUnitRange(axis, ['unit-5'], '', 'unit-8'), ['unit-5']);
});

test('範囲開始・終了は単元追加と同じ教材・単元ラベルを表示しunitIdをvalueに保つ', () => {
  const displayUnit = {
    unitId: 'unit-6',
    unitOrder: 6,
    textName: 'NEW HORIZON 2【東京書籍】',
    chapter: '【Unit1】What can we experience on a trip?',
    section: '【Read and Think2】',
    unitName: '',
    page: 'p.14-15',
  };
  assert.equal(formatSchoolUnit(displayUnit), 'NEW HORIZON 2【東京書籍】 【Unit1】What can we experience on a trip? 【Read and Think2】 p.14-15');

  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  const rangeStartMarkup = source.match(/<select value=\{rangeStart\}[\s\S]*?<\/select>/)?.[0] || '';
  const rangeEndMarkup = source.match(/<select value=\{rangeEnd\}[\s\S]*?<\/select>/)?.[0] || '';
  [rangeStartMarkup, rangeEndMarkup].forEach(markup => {
    assert.match(markup, /value=\{unit\.unitId\}/);
    assert.match(markup, /\{unit\.unitOrder\}\. \{formatSchoolUnit\(unit\)\}/);
    assert.doesNotMatch(markup, />単元\{unit\.unitOrder\}<\/option>/);
  });
});

test('選択済み単元を外すと同じ単元を示すselectだけ選択状態へ戻す', () => {
  assert.deepEqual(removeOneToOneNetzUnitSelection(['unit-5', 'unit-6'], 'unit-6', 'unit-6'), {
    selectedUnitId: '',
    unitIds: ['unit-5'],
  });
  assert.deepEqual(removeOneToOneNetzUnitSelection(['unit-5', 'unit-6'], 'unit-6', 'unit-5'), {
    selectedUnitId: 'unit-6',
    unitIds: ['unit-6'],
  });
});

test('ネッツ進捗登録payloadへ単元選択と範囲追加のunitIdを保持する', () => {
  const selected = applyOneToOneNetzUnitSelection([], 'unit-5');
  const unitIds = addOneToOneNetzUnitRange(axis, selected.unitIds, 'unit-6', 'unit-7');
  assert.deepEqual(buildOneToOneNetzProgressReplacement({
    lessonDate: '2026-08-31',
    unitIds,
    requestId: 'request-1',
  }), {
    lessonDate: '2026-08-31',
    unitIds: ['unit-5', 'unit-6', 'unit-7'],
    requestId: 'request-1',
  });
});

test('ネッツ進捗modalは単元selectを制御stateへ接続しDOM値を直接リセットしない', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  assert.match(source, /const \[selectedNetzUnitId, setSelectedNetzUnitId\] = useState\(''\)/);
  assert.match(source, /<select value=\{selectedNetzUnitId\}/);
  assert.match(source, /applyOneToOneNetzUnitSelection\(netzUnits, event\.target\.value\)/);
  assert.doesNotMatch(source, /event\.target\.value = ''/);
  assert.match(source, /<select value=\{rangeStart\}/);
  assert.match(source, /<select value=\{rangeEnd\}/);
  assert.match(source, /buildOneToOneNetzProgressReplacement/);
});

test('学校進捗の制御selectと既存payload生成は維持する', () => {
  const source = fs.readFileSync(new URL('../src/components/OneToOneProgressManager.jsx', import.meta.url), 'utf8');
  assert.match(source, /今回の最終到達位置<select value=\{schoolTarget\}/);
  assert.match(source, /mode === 'school'[\s\S]*?toUnitId: schoolTarget/);
  assert.match(source, /addOneToOneSchoolProgress/);
});
