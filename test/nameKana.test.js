import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidNameKana, normalizeNameKana } from '../src/utils/nameKana.js';
import { compareStudentAccounts, compareStudentsByKana } from '../src/utils/studentAccountOrdering.js';

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
  assert.match(gasSource, /function compareStudentsByKana_[\s\S]*?normalizeKana_\(left\.nameKana\)[\s\S]*?normalizeKana_\(right\.nameKana\)/);
});

test('生徒は新旧スペース形式を正規化してカナ五十音順になる', () => {
  const students = [
    { userId: '0004', name: '山田太郎', nameKana: 'ヤマダ　タロウ' },
    { userId: '0001', name: '青木太郎', nameKana: 'アオキ タロウ' },
    { userId: '0003', name: '佐藤次郎', nameKana: 'サトウ　ジロウ' },
    { userId: '0002', name: '伊藤花子', nameKana: 'イトウ ハナコ' }
  ];
  assert.deepEqual(students.sort(compareStudentsByKana).map(student => student.userId), ['0001', '0002', '0003', '0004']);
});

test('カナ未登録は後方へ置き、同一カナは氏名とuserIdで安定ソートする', () => {
  const students = [
    { userId: '0003', name: '未登録A', nameKana: '' },
    { userId: '0002', name: '佐藤花子', nameKana: 'サトウ　ハナコ' },
    { userId: '0001', name: '佐藤花子', nameKana: 'サトウ ハナコ' },
    { userId: '0004', name: '未登録B', nameKana: null }
  ];
  assert.deepEqual(students.sort(compareStudentsByKana).map(student => student.userId), ['0001', '0002', '0003', '0004']);
});

test('校舎グループを維持した生徒一覧はグループ内でカナ順になる', () => {
  const students = [
    { userId: '0002', school: '栗林', grade: '中１', name: '山田', nameKana: 'ヤマダ' },
    { userId: '0003', school: '木太南', grade: '中１', name: '伊藤', nameKana: 'イトウ' },
    { userId: '0001', school: '栗林', grade: '中１', name: '青木', nameKana: 'アオキ' }
  ];
  assert.deepEqual(students.sort(compareStudentAccounts).map(student => student.userId), ['0001', '0002', '0003']);
});

test('対象GASレスポンスはnameKanaを返し、業務グループ内で共通比較する', () => {
  const source = fs.readFileSync(new URL('../gas/コード.js', import.meta.url), 'utf8');
  assert.match(source, /function compareStudentsByKana_/);
  assert.match(source, /function compareStudentsBySchoolGradeAndKana_/);
  assert.match(source, /getSukimakunPermissionMatrix[\s\S]*?nameKana:[\s\S]*?sort\(compareStudentsByKana_\)/);
  for (const action of ['getTestReviewMatrix', 'getSchoolProgressMatrix', 'getKoToreProgressMatrix', 'getAppUsageMatrix']) {
    const actionSource = source.slice(source.indexOf(`data.action === "${action}"`));
    assert.match(actionSource, /nameKana:/, `${action} must return nameKana`);
    assert.match(actionSource, /sort\(compareStudentsBy/, `${action} must sort students`);
  }
});
