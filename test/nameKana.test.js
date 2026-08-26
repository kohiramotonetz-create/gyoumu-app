import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidNameKana, normalizeNameKana } from '../src/utils/nameKana.js';
import { compareStudentAccounts } from '../src/utils/studentAccountOrdering.js';

const cases = [
  ['ヤマダ タロウ', 'ヤマダ　タロウ'],
  ['ヤマダ　タロウ', 'ヤマダ　タロウ'],
  ['ヤマダ  タロウ', 'ヤマダ　タロウ'],
  ['　ヤマダ　　タロウ　', 'ヤマダ　タロウ'],
  ['ヤマダ　 タロウ', 'ヤマダ　タロウ'],
  ['やまだ たろう', 'ヤマダ　タロウ']
];

test('ReactのnameKana正規化はNFKC後に姓名間を全角スペース1個へ統一する', () => {
  cases.forEach(([input, expected]) => {
    assert.equal(normalizeNameKana(input), expected);
    assert.equal(isValidNameKana(input), true);
  });
  assert.equal(isValidNameKana('ヤマダ-TARO'), false);
});

test('GASの最終正規化結果はReactと一致する', () => {
  const source = fs.readFileSync(new URL('../gas/コード.js', import.meta.url), 'utf8');
  const functionSource = source.match(/function normalizeKana_\(value\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource);
  const normalizeKanaGas = vm.runInNewContext(`(${functionSource})`);

  cases.forEach(([input, expected]) => {
    assert.equal(normalizeKanaGas(input), expected);
    assert.equal(normalizeKanaGas(input), normalizeNameKana(input));
  });
});

test('登録・生徒編集・staff編集は共通nameKana正規化を使用する', () => {
  const files = [
    '../src/components/AccountRegistration.jsx',
    '../src/components/StudentAccountDetail.jsx',
    '../src/components/StaffAccountDetail.jsx'
  ];
  files.forEach(file => {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /normalizeNameKana/);
    assert.doesNotMatch(source, /const normalizeKanaInput/);
  });
});

test('既存半角スペースと新しい全角スペースはフリガナ順で同値として比較する', () => {
  const base = { school: '栗林', grade: '中１', name: '山田太郎' };
  assert.equal(compareStudentAccounts(
    { ...base, nameKana: 'ヤマダ タロウ' },
    { ...base, nameKana: 'ヤマダ　タロウ' }
  ), 0);

  const gasSource = fs.readFileSync(new URL('../gas/コード.js', import.meta.url), 'utf8');
  assert.match(gasSource, /normalizeKana_\(left\.nameKana\)\.localeCompare\(normalizeKana_\(right\.nameKana\), "ja"\)/);
});
