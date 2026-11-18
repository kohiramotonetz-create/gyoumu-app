/* global SukimakunEnglishMissions */
// Local candidate only. Existing authentication helpers and their session side effects are unchanged.
function englishMissionEnvironment_() {
  return {
    openBook: () => openSpreadsheetByProperty('SUKIMAKUN_ENGLISH_STORAGE_SPREADSHEET_ID'),
    properties: PropertiesService.getScriptProperties(), utilities: Utilities, schools: ACCOUNT_MIGRATION_SCHOOLS,
    resolveSession: function (token) {
      let session;
      try { session = requirePrivilegedStaffSession_(token, true); }
      catch (_) { const error = new Error('管理セッションが無効か、権限がありません。再ログインしてください。'); error.code = 'AUTHENTICATION_ERROR'; throw error; }
      return Object.assign({}, session, { assignedSchools: resolveTeacherHomeAssignedSchools_(session) });
    },
    flush: () => SpreadsheetApp.flush(),
    withLock: function (callback) {
      // Stage2 writes share one lock across editor and Web App executions.
      const lock = LockService.getScriptLock();
      if (!lock || !lock.tryLock(10000)) { const error = new Error('他の保存処理が実行中です。時間をおいて再確認してください。'); error.code = 'LOCK_BUSY'; throw error; }
      try { return callback(); } finally { lock.releaseLock(); }
    }
  };
}
function handleSukimakunEnglishMissionAction_(data) {
  return SukimakunEnglishMissions.handle(data, englishMissionEnvironment_());
}
