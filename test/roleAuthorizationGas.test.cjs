const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'gas', 'コード.js'), 'utf8');
const context = vm.createContext({ console, Date, Set, Map, Object, Array, String, Number, Boolean, Math, JSON, RegExp, Error, URL });
vm.runInContext(source, context);

test('GASはgeneralを正式staff roleとして認識する', () => {
  assert.deepEqual(Array.from(vm.runInContext('ACCOUNT_MIGRATION_ROLES', context)), ['admin', 'general', 'head-teacher', 'teacher', 'student']);
  assert.deepEqual(Array.from(vm.runInContext('STAFF_ROLES_', context)), ['teacher', 'head-teacher', 'general', 'admin']);
});

test('管理session helperはroleごとの境界を維持する', () => {
  context.validateManagementSession = token => ({ userId: token, role: token, sessionExpiresAt: 'later' });
  for (const role of ['head-teacher', 'general', 'admin']) assert.equal(vm.runInContext(`requireAccountManagerSession_("${role}").role`, context), role);
  for (const role of ['student', 'teacher']) assert.throws(() => vm.runInContext(`requireAccountManagerSession_("${role}")`, context));
  for (const role of ['general', 'admin']) assert.equal(vm.runInContext(`requireModelAnswerSession_("${role}").role`, context), role);
  for (const role of ['student', 'teacher', 'head-teacher']) assert.throws(() => vm.runInContext(`requireModelAnswerSession_("${role}")`, context));
});

test('アカウント管理対象roleはadminと非adminで明示的に分離する', () => {
  for (const actorRole of ['head-teacher', 'general']) {
    for (const targetRole of ['student', 'teacher']) assert.equal(vm.runInContext(`canAccountManagerAccessRole_("${actorRole}", "${targetRole}")`, context), true);
    for (const targetRole of ['head-teacher', 'general', 'admin']) assert.equal(vm.runInContext(`canAccountManagerAccessRole_("${actorRole}", "${targetRole}")`, context), false);
  }
  for (const targetRole of ['student', 'teacher', 'head-teacher', 'general', 'admin']) assert.equal(vm.runInContext(`canAccountManagerAccessRole_("admin", "${targetRole}")`, context), true);
});

test('アカウントAPIは実セッション失効と権限不足を区別する', () => {
  assert.equal(vm.runInContext('isManagementSessionError_(new Error("管理セッションが無効または期限切れです"))', context), true);
  assert.equal(vm.runInContext('isManagementSessionError_(new Error("アカウント管理権限が必要です"))', context), false);
  assert.match(source, /sessionError \? "AUTHENTICATION_ERROR" : authorizationError \? "AUTHORIZATION_ERROR"/);
});

test('非adminのstaff一覧はteacherだけ、adminは全staffを取得する', () => {
  const users = [
    { userId: '1', role: 'student' }, { userId: '2', role: 'teacher' }, { userId: '3', role: 'head-teacher' },
    { userId: '4', role: 'general' }, { userId: '5', role: 'admin' },
  ];
  context.getNewAuthData_ = () => ({ contexts: users });
  context.__request = { action: 'getStaffAccounts', sessionToken: 'token' };
  context.requireAccountManagerSession_ = () => ({ userId: 'head', role: 'head-teacher' });
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(handleNewAccountAdminAction_(__request).accounts.map(item => item.role))', context)), ['teacher']);
  context.requireAccountManagerSession_ = () => ({ userId: 'admin', role: 'admin' });
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(handleNewAccountAdminAction_(__request).accounts.map(item => item.role))', context)), ['teacher', 'head-teacher', 'general', 'admin']);
});

test('非adminは上位staff作成を拒否しteacher作成は許可する', () => {
  context.requireAccountManagerSession_ = () => ({ userId: 'head', role: 'head-teacher' });
  context.executeAccountTransaction_ = callback => callback({ accounts: [], students: [], staff: [], assignments: [] });
  context.__create = { action: 'createStaffAccount', sessionToken: 'token', userId: '123456', name: '講師', nameKana: 'コウシ', role: 'general', assignedSchools: [{ school: '栗林', isPrimary: true }] };
  assert.throws(() => vm.runInContext('handleNewAccountAdminAction_(__create)', context), /not manageable/);
  context.__create.role = 'teacher';
  assert.equal(vm.runInContext('handleNewAccountAdminAction_(__create).result', context), 'success');
});

test('非adminは上位staffの編集・削除を拒否しadminは全staff roleを操作できる', () => {
  const makeState = role => ({
    accounts: [['123456', '1234', true, '', role, true, '', '', new Date(), new Date(), '']],
    students: [], staff: [['123456', '職員', 'ショクイン', new Date(), new Date()]],
    assignments: [['123456', '栗林', true, true, new Date(), new Date(), 'admin']],
  });
  context.__state = makeState('general');
  context.executeAccountTransaction_ = callback => callback(context.__state);
  context.requireAccountManagerSession_ = () => ({ userId: 'head', role: 'head-teacher' });
  context.__delete = { action: 'deleteStaffAccount', sessionToken: 'token', userId: '123456' };
  assert.throws(() => vm.runInContext('handleNewAccountAdminAction_(__delete)', context), /not manageable/);

  context.requireAccountManagerSession_ = () => ({ userId: 'admin', role: 'admin' });
  assert.equal(vm.runInContext('handleNewAccountAdminAction_(__delete).result', context), 'success');
  context.__state = makeState('general');
  context.__update = { action: 'updateStaffAccount', sessionToken: 'token', userId: '123456', name: '職員', nameKana: 'ショクイン', role: 'admin', enabled: true, assignedSchools: [{ school: '栗林', isPrimary: true }] };
  assert.equal(vm.runInContext('handleNewAccountAdminAction_(__update).result', context), 'success');
  assert.equal(context.__state.accounts[0][4], 'admin');
});
