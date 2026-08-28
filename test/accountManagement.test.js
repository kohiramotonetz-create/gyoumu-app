import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getAccountStatus, matchesAccountQuery, paginateAccounts } from '../src/utils/accountManagement.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('アカウント状態は有効・無効・削除済みを正式条件で区別する', () => {
  assert.equal(getAccountStatus({ enabled: true, deletedAt: '' }), 'enabled');
  assert.equal(getAccountStatus({ enabled: false, deletedAt: '' }), 'disabled');
  assert.equal(getAccountStatus({ enabled: false, deletedAt: '2026-08-28' }), 'deleted');
});

test('氏名・フリガナ・先頭0を含むIDを部分一致検索する', () => {
  const account = { userId: '037071', name: '山田 太郎', nameKana: 'ヤマダ　タロウ' };
  assert.equal(matchesAccountQuery(account, ' 山田 '), true);
  assert.equal(matchesAccountQuery(account, 'ﾔﾏﾀﾞ'), true);
  assert.equal(matchesAccountQuery(account, '0370'), true);
  assert.equal(matchesAccountQuery(account, '37072'), false);
});

test('paginationは20件を初期値としてpageを有効範囲へ補正する', () => {
  const items = Array.from({ length: 42 }, (_, index) => index + 1);
  assert.deepEqual(paginateAccounts(items, 9, 20), {
    items: [41, 42], page: 3, pageSize: 20, totalItems: 42, totalPages: 3, start: 41, end: 42,
  });
  assert.equal(paginateAccounts(items, 1, 50).items.length, 42);
});

test('アカウント管理は3タブ構造でlegacy画面を新UIから除外する', () => {
  const source = read('../src/components/AccountManagement.jsx');
  assert.match(source, /生徒情報/);
  assert.match(source, /講師情報/);
  assert.match(source, /新規アカウント/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected/);
  assert.doesNotMatch(source, /AccountGenerator/);
  assert.doesNotMatch(source, /legacy/);
});

test('生徒・講師一覧は一覧を残して詳細を開き既存APIとsessionTokenを維持する', () => {
  const student = read('../src/components/StudentAccountList.jsx');
  const staff = read('../src/components/StaffAccountList.jsx');
  assert.match(student, /action: 'getStudentAccounts'/);
  assert.match(staff, /action: 'getStaffAccounts'/);
  assert.match(student, /sessionToken/);
  assert.match(staff, /sessionToken/);
  assert.match(student, /StudentProfileLink/);
  assert.match(student, /selectedAccount \? <StudentAccountDetail/);
  assert.match(staff, /selectedAccount \? <StaffAccountDetail/);
  assert.doesNotMatch(student, /if \(selectedAccount\) return/);
  assert.doesNotMatch(staff, /if \(selectedAccount\) return/);
});

test('詳細は最終ログインやパスワード再設定を表示せず既存更新APIを使う', () => {
  const student = read('../src/components/StudentAccountDetail.jsx');
  const staff = read('../src/components/StaffAccountDetail.jsx');
  assert.match(student, /action: 'updateStudentAccount'/);
  assert.match(student, /action: 'updateOneToOneSubjects'/);
  assert.match(staff, /action: 'updateStaffAccount'/);
  for (const source of [student, staff]) {
    assert.doesNotMatch(source, /最終ログイン/);
    assert.doesNotMatch(source, /パスワード再設定/);
    assert.match(source, /削除済みアカウントのため編集できません/);
  }
});

test('新規登録は既存action・共通select・GAS返却passwordを維持する', () => {
  const source = read('../src/components/AccountRegistration.jsx');
  assert.match(source, /action: 'checkUserIdAvailable'/);
  assert.match(source, /action: 'createStudentAccount'/);
  assert.match(source, /action: 'createStaffAccount'/);
  assert.match(source, /<SchoolSelect/);
  assert.match(source, /<GradeSelect/);
  assert.match(source, /includeGroups=\{false\}/);
  assert.match(source, /password: response\.data\.password/);
  assert.doesNotMatch(source, /['"]netzs['"]\s*\+/);
  assert.doesNotMatch(source, /password\s*=\s*['"]1234['"]/);
  assert.match(source, /生徒は初回パスワード変更の対象外です/);
});
