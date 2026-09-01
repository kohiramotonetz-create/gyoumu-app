import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCOUNT_MANAGER_ROLES, ADMIN_MANAGED_ROLES, STAFF_ROLES, canManageAccounts, canViewModelAnswers, isStaffRole } from '../src/utils/roles.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('5roleとstaff判定を正式仕様で共有する', () => {
  assert.deepEqual(ADMIN_MANAGED_ROLES, ['student', 'teacher', 'head-teacher', 'general', 'admin']);
  assert.deepEqual(STAFF_ROLES, ['teacher', 'head-teacher', 'general', 'admin']);
  for (const role of STAFF_ROLES) assert.equal(isStaffRole(role), true);
  assert.equal(isStaffRole('student'), false);
});

test('模範解答はgeneralとadminだけに許可する', () => {
  for (const role of ['teacher', 'head-teacher', 'student']) assert.equal(canViewModelAnswers(role), false);
  for (const role of ['general', 'admin']) assert.equal(canViewModelAnswers(role), true);
  const menu = read('../src/components/KoToreMenu.jsx');
  const shelf = read('../src/components/ModelAnswerShelf.jsx');
  assert.match(menu, /card\.id !== 'answers' \|\| canViewModelAnswers\(role\)/);
  assert.match(menu, /canViewModelAnswers\(role\) && <ModelAnswerShelf/);
  assert.match(shelf, /authorizeModelAnswerAccess/);
});

test('head-teacherとgeneralとadminだけがアカウント管理を開ける', () => {
  assert.deepEqual(ACCOUNT_MANAGER_ROLES, ['head-teacher', 'general', 'admin']);
  assert.equal(canManageAccounts('teacher'), false);
  for (const role of ACCOUNT_MANAGER_ROLES) assert.equal(canManageAccounts(role), true);
});

test('head-teacherとgeneralは講師情報と新規アカウントの共通タブを利用する', () => {
  const management = read('../src/components/AccountManagement.jsx');
  const view = read('../src/TeacherView.jsx');
  assert.match(management, /label: '講師情報'/);
  assert.match(management, /label: '新規アカウント'/);
  assert.match(management, /tab === 'staff' \? <StaffAccountList \{\.\.\.props\}/);
  assert.match(management, /tab === 'registration' \? <AccountRegistration \{\.\.\.props\}/);
  assert.match(view, /activeContent === 'create-account' && canManageAccounts\(role\)/);
});

test('非admin UIは上位role名とrole変更欄を表示せずadminだけ全roleを選べる', () => {
  const registration = read('../src/components/AccountRegistration.jsx');
  const list = read('../src/components/StaffAccountList.jsx');
  const detail = read('../src/components/StaffAccountDetail.jsx');
  assert.match(registration, /actorRole === 'admin'/);
  assert.match(registration, /value="general">社員・スタッフ/);
  assert.match(list, /isAdmin \? <label>アカウント種別/);
  assert.match(detail, /isAdmin \? <label className="account-form-field">アカウント種別/);
  assert.match(detail, /action: 'deleteStaffAccount'/);
  assert.match(read('../src/components/StudentAccountDetail.jsx'), /action: 'deleteStudentAccount'/);
});

test('generalは講師画面へ入り、初回パスワード変更対象になる', () => {
  const app = read('../src/App.jsx');
  const teacherView = read('../src/TeacherView.jsx');
  assert.match(app, /isStaffRole\(currentRole\)/);
  assert.match(app, /isStaffRole\(role\)/);
  assert.match(teacherView, /role === 'head-teacher' \|\| role === 'general'/);
});
