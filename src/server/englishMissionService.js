import { ALL_SCHOOLS } from '../constants/organization.js';
import { addMissionDays, catalog, englishMissionTargetKey, expandEnglishMissionRange, findEnglishMissionDuplicates, findEnglishMissionPeriodConflicts, normalizeEnglishMissionTarget } from '../utils/englishMissionPlanning.js';

export const ENGLISH_MISSION_PERIOD_ERROR = '登録期間が重複しています。指定した期間には、すでに英語ミッションが登録されています。新規登録はできません。登録済みミッションの内容を変更してください。';
export const ENGLISH_MISSION_ACTIONS = {
  getSukimakunEnglishMissions: 'list',
  previewSukimakunEnglishMissionBatch: 'preview',
  saveSukimakunEnglishMissionBatch: 'create',
  updateSukimakunEnglishMission: 'update',
  deleteSukimakunEnglishMission: 'delete',
  getSukimakunEnglishMissionOperation: 'status',
  recoverSukimakunEnglishMissionOperation: 'recover',
};
const clone = value => JSON.parse(JSON.stringify(value));
const fail = (code, message, details) => { const error = new Error(message); error.code = code; error.details = details; throw error; };
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
const equal = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; };

export function createEnglishMissionService({ store, resolveSession, hash, sign, encode, decode, uuid, now = () => Date.now(), withLock, flushWrites = () => {}, flushRecovery = () => {}, storage = 'gas', targetExists, schools = ALL_SCHOOLS }) {
  const groupId = target => 'g-' + hash(englishMissionTargetKey(target));
  const authorize = (request, requireExistingGroup = false) => {
    const actor = resolveSession(request.sessionToken);
    if (!actor) fail('AUTHENTICATION_ERROR', '管理セッションが無効です。再ログインしてください。');
    if (!actor.userId || !['admin', 'general', 'head-teacher'].includes(actor.role)) fail('AUTHORIZATION_ERROR', 'ミッション管理を利用する権限がありません。');
    const target = normalizeEnglishMissionTarget(request.target);
    if (target.scopeSchools.some(s => !schools.includes(s) || (actor.role !== 'admin' && !actor.assignedSchools?.includes(s)))) fail('AUTHORIZATION_ERROR', '対象校舎を操作する権限がありません。');
    if (requireExistingGroup && !targetExists(actor, target)) fail('TARGET_NOT_FOUND', '指定した学校・学年グループを確認できません。');
    return { actor, target, groupId: groupId(target), targetKey: englishMissionTargetKey(target) };
  };
  const digestRows = rows => hash(JSON.stringify(rows.slice().sort((a, b) => a.ordinal - b.ordinal).map(row => row.payload)));
  const verifyRows = (operation, rawRows) => {
    const rows = rawRows.filter(row => row.operationId === operation.operationId).sort((a, b) => a.ordinal - b.ordinal);
    if (rows.length !== operation.recordCount || rows.some((row, index) => !row.payload || row.ordinal !== index || row.hash !== hash(JSON.stringify(row.payload)) || row.missionId !== row.payload.missionId || row.version !== row.payload.version || row.groupId !== operation.groupId || row.payload.groupId !== operation.groupId || row.payload.operationId !== operation.operationId) || digestRows(rows) !== operation.recordsDigest) fail('STORAGE_INTEGRITY_ERROR', '保存データの整合性を確認できません。管理者に連絡してください。');
    return rows;
  };
  const deletedVersion = (previous, operationId, actorId, timestamp) => ({
    ...previous, operationId, version: previous.version + 1, status: 'DELETED',
    deletedAt: timestamp, deletedBy: actorId, updatedAt: timestamp, updatedBy: actorId,
  });
  const readState = () => {
    const raw = store.read(), latest = new Map(), seen = new Set(); let globalRevision = 0;
    for (const op of raw.operations) {
      if (!validId(op.operationId) || seen.has(op.operationId) || !['PREPARED', 'COMMITTED', 'ABORTED'].includes(op.state)) fail('STORAGE_INTEGRITY_ERROR', '操作記録の整合性を確認できません。');
      seen.add(op.operationId);
    }
    for (const op of raw.operations.filter(op => op.state === 'COMMITTED').sort((a, b) => a.commitRevision - b.commitRevision)) {
      if (!Number.isSafeInteger(op.commitRevision) || op.commitRevision <= globalRevision || !['create', 'update', 'delete'].includes(op.mode) || (op.mode === 'delete' && op.recordCount !== 1)) fail('STORAGE_INTEGRITY_ERROR', '保存版の整合性を確認できません。');
      globalRevision = op.commitRevision;
      for (const row of verifyRows(op, raw.rows)) {
        const previous = latest.get(row.missionId), value = row.payload;
        const invalid = op.mode === 'delete'
          ? !previous || previous.status === 'DELETED' || previous.groupId !== op.groupId
            || JSON.stringify(value) !== JSON.stringify(deletedVersion(previous, op.operationId, op.actorId, op.createdAt))
          : value.status === 'DELETED'
            || (op.mode === 'create' ? previous || value.version !== 1
              : !previous || previous.status === 'DELETED' || value.version !== previous.version + 1
                || value.targetKey !== previous.targetKey || value.startDate !== previous.startDate || value.endDate !== previous.endDate);
        if (invalid) fail('STORAGE_INTEGRITY_ERROR', 'ミッション履歴の整合性を確認できません。');
        latest.set(row.missionId, value);
      }
    }
    return { ...raw, latest, records: [...latest.values()].filter(value => value.status !== 'DELETED'), globalRevision, revision: id => Math.max(0, ...raw.operations.filter(op => op.state === 'COMMITTED' && op.groupId === id).map(op => op.commitRevision)) };
  };
  const normalize = (request, auth, state, mode) => {
    if (!validId(request.operationId)) fail('VALIDATION_ERROR', '登録操作IDを確認してください。');
    if (!Array.isArray(request.weeks) || !request.weeks.length || (mode === 'update' && request.weeks.length !== 1)) fail('VALIDATION_ERROR', '登録する週を確認してください。');
    return request.weeks.map((week, index) => {
      if (week.catalogVersion !== catalog.version || week.materials?.length !== 1) fail('CATALOG_VERSION_ERROR', '教材の版を再確認してください。');
      const material = week.materials[0], selected = expandEnglishMissionRange(material.startUnitKey, material.endUnitKey, material.materialGrade);
      if (JSON.stringify(material.unitKeys) !== JSON.stringify(selected.map(u => u.key)) || week.endDate !== addMissionDays(week.startDate, 6)) fail('VALIDATION_ERROR', '期間または単元の連番を確認してください。');
      const normalized = { weekNumber: week.weekNumber, startDate: week.startDate, endDate: week.endDate, catalogVersion: catalog.version, materials: [{ materialGrade: material.materialGrade, startUnitKey: material.startUnitKey, endUnitKey: material.endUnitKey, unitKeys: selected.map(u => u.key) }], wordCount: selected.reduce((sum, u) => sum + u.wordCount, 0) };
      if (mode === 'create') {
        if (week.missionId || week.weekNumber !== index + 1 || week.startDate !== addMissionDays(request.weeks[0].startDate, index * 7)) fail('VALIDATION_ERROR', '新規登録の週番号・日程を確認してください。');
      } else {
        const existing = state.latest.get(week.missionId);
        if (!existing || existing.groupId !== auth.groupId) fail('AUTHORIZATION_ERROR', '指定されたミッションを更新できません。');
        if (existing.status === 'DELETED') fail('MISSION_DELETED', 'この週はすでに削除されています。一覧を再取得してください。');
        if (!Number.isSafeInteger(week.expectedVersion) || existing.version !== week.expectedVersion) fail('VERSION_CONFLICT', '他の管理者が更新しています。最新の登録内容を取得して再確認してください。');
        if (week.startDate !== existing.startDate || week.endDate !== existing.endDate || week.weekNumber !== existing.weekNumber) fail('IMMUTABLE_PERIOD', '登録済みの実施期間・週番号は変更できません。');
        normalized.missionId = existing.missionId; normalized.expectedVersion = existing.version;
      }
      return normalized;
    });
  };
  const inspect = (weeks, state, auth) => ({ duplicates: findEnglishMissionDuplicates(weeks, state.records, auth.target), conflicts: findEnglishMissionPeriodConflicts(weeks, state.records, auth.target), revision: state.revision(auth.groupId) });
  const requestHash = (auth, mode, weeks) => hash(JSON.stringify([1, auth.actor.userId, auth.targetKey, mode, weeks]));
  const success = (auth, extra) => ({ result: 'success', storage, sessionExpiresAt: auth.actor.sessionExpiresAt, ...extra });
  const operationResponse = (auth, op, state) => success(auth, { operationId: op.operationId, state: op.state, revision: op.commitRevision, records: clone(verifyRows(op, state.rows).map(row => row.payload)) });
  const checkOperationAccess = (auth, op) => { if (op.groupId !== auth.groupId || (op.actorId !== auth.actor.userId && auth.actor.role !== 'admin')) fail('AUTHORIZATION_ERROR', '指定された操作を確認できません。'); };
  const preview = request => {
    if (request.mode !== undefined && !['create', 'update'].includes(request.mode)) fail('VALIDATION_ERROR', '登録操作の種類を確認してください。');
    const mode = request.mode === 'update' ? 'update' : 'create';
    const auth = authorize(request, mode === 'create');
    return withLock(() => {
      const state = readState(), weeks = normalize(request, auth, state, mode), inspection = inspect(weeks, state, auth);
      const bodyHash = requestHash(auth, mode, weeks);
      const claims = { version: 1, actorId: auth.actor.userId, role: auth.actor.role, groupId: auth.groupId, operationId: request.operationId, mode, requestHash: bodyHash, revision: inspection.revision, duplicateKeys: inspection.duplicates.slice().sort(), expiresAt: Math.min(now() + 300000, Date.parse(auth.actor.sessionExpiresAt)), nonce: uuid() };
      if (!Number.isFinite(claims.expiresAt) || claims.expiresAt <= now()) fail('AUTHENTICATION_ERROR', '管理セッションの有効期限を確認してください。');
      const serialized = JSON.stringify(claims), confirmationToken = encode(serialized) + '.' + sign(serialized);
      return success(auth, { ...inspection, operationId: request.operationId, requestHash: bodyHash, confirmationToken, confirmationExpiresAt: new Date(claims.expiresAt).toISOString(), canSave: inspection.conflicts.length === 0 });
    });
  };
  const verifyProof = (request, auth, mode, weeks, inspection) => {
    const pieces = typeof request.confirmationToken === 'string' ? request.confirmationToken.split('.') : [];
    if (pieces.length !== 2) fail('CONFIRMATION_REQUIRED', '登録内容を確認してから保存してください。');
    let claims;
    try { const text = decode(pieces[0]); if (!equal(sign(text), pieces[1])) throw Error(); claims = JSON.parse(text); }
    catch (error) { if (error.code === 'SETUP_REQUIRED') throw error; fail('CONFIRMATION_INVALID', '登録確認が無効です。もう一度内容を確認してください。'); }
    if (claims.version !== 1 || claims.actorId !== auth.actor.userId || claims.role !== auth.actor.role || claims.groupId !== auth.groupId || claims.operationId !== request.operationId || claims.mode !== mode || claims.requestHash !== requestHash(auth, mode, weeks)) fail('CONFIRMATION_INVALID', '確認した内容と保存内容が一致しません。');
    if (claims.expiresAt <= now()) fail('CONFIRMATION_EXPIRED', '登録確認の期限が切れました。内容を再確認してください。');
    const canUseEarlierPreview = mode === 'create' && claims.revision < inspection.revision
      && Array.isArray(claims.duplicateKeys)
      && JSON.stringify(claims.duplicateKeys) === JSON.stringify(inspection.duplicates.slice().sort());
    // The latest dates, catalog and permissions have already been checked under the lock.
    if (request.expectedRevision !== claims.revision
      || (claims.revision !== inspection.revision && !canUseEarlierPreview)) {
      fail('STALE_REVISION', '登録内容が更新されています。内容を再確認してください。');
    }
  };
  const replayOperation = (prior, auth, state, mode, bodyHash) => {
    checkOperationAccess(auth, prior);
    if (prior.mode !== mode || prior.requestHash !== bodyHash) fail('IDEMPOTENCY_CONFLICT', '同じ操作IDで異なる内容は保存できません。');
    if (prior.state === 'COMMITTED') return operationResponse(auth, prior, state);
    if (prior.state === 'ABORTED') fail('OPERATION_ABORTED', mode === 'delete' ? 'この削除は確定していません。一覧を再取得してください。' : 'この操作は全週とも有効化されていません。内容を再確認してください。');
    fail('OUTCOME_UNKNOWN', '操作IDから状態を確認してください。', { operationId: prior.operationId });
  };
  const persistOperation = (request, auth, state, mode, bodyHash, records, timestamp, flush = () => {}) => {
    const rows = records.map((payload, ordinal) => ({ operationId: request.operationId, missionId: payload.missionId, version: payload.version, groupId: auth.groupId, ordinal, payload, hash: hash(JSON.stringify(payload)) }));
    const op = { operationId: request.operationId, actorId: auth.actor.userId, groupId: auth.groupId, mode, requestHash: bodyHash, baseRevision: state.revision(auth.groupId), commitRevision: state.globalRevision + 1, recordCount: rows.length, recordsDigest: digestRows(rows), createdAt: timestamp, updatedAt: timestamp, state: 'PREPARED' };
    let commitFlushed = false, commitFlushFailed = false;
    try {
      store.begin(op); store.append(rows); flush();
      const staged = store.read(); verifyRows(op, staged.rows);
      store.mark(op.operationId, 'COMMITTED', timestamp);
      try { flush(); commitFlushed = true; }
      catch (error) { commitFlushFailed = true; throw error; }
      const after = readState(), committed = after.operations.find(item => item.operationId === op.operationId);
      if (committed?.state !== 'COMMITTED') throw Error('COMMIT_READBACK_FAILED');
      return operationResponse(auth, committed, after);
    } catch {
      let observed;
      try { observed = readState(); } catch { fail('OUTCOME_UNKNOWN', '保存結果を操作IDから確認してください。', { operationId: request.operationId }); }
      const current = observed.operations.find(item => item.operationId === op.operationId);
      if (current?.state === 'COMMITTED') {
        if (commitFlushFailed || (mode === 'delete' && !commitFlushed)) fail('OUTCOME_UNKNOWN', mode === 'delete' ? '削除結果を操作IDから確認してください。' : '保存結果を操作IDから確認してください。', { operationId: request.operationId });
        return operationResponse(auth, current, observed);
      }
      if (current?.state === 'PREPARED') {
        try { store.mark(op.operationId, 'ABORTED', new Date(now()).toISOString()); flush(); const aborted = store.read().operations.find(item => item.operationId === op.operationId); if (aborted?.state !== 'ABORTED') throw Error(); }
        catch { fail('OUTCOME_UNKNOWN', '未完了の保存操作があります。操作IDから状態を確認してください。', { operationId: request.operationId }); }
      }
      fail('OPERATION_ABORTED', mode === 'delete' ? '削除に失敗しました。この操作の削除は確定していません。一覧を再取得してください。' : '保存に失敗しました。この操作の週は有効化されていません。内容を再確認してください。', { operationId: request.operationId });
    }
  };
  const commit = (request, mode) => {
    authorize(request);
    return withLock(() => {
      const auth = authorize(request), state = readState();
      const prior = state.operations.find(op => op.operationId === request.operationId);
      // A retry of an already committed update must not fail merely because its expectedVersion is now old.
      if (prior) {
        checkOperationAccess(auth, prior);
        if (prior.mode !== mode) fail('IDEMPOTENCY_CONFLICT', '同じ操作IDで異なる内容は保存できません。');
        const originalShape = clone(request.weeks || []).map(week => { const selected = expandEnglishMissionRange(week.materials?.[0]?.startUnitKey, week.materials?.[0]?.endUnitKey, week.materials?.[0]?.materialGrade); const material = week.materials[0]; return { weekNumber: week.weekNumber, startDate: week.startDate, endDate: week.endDate, catalogVersion: week.catalogVersion, materials: [{ materialGrade: material.materialGrade, startUnitKey: material.startUnitKey, endUnitKey: material.endUnitKey, unitKeys: material.unitKeys }], wordCount: selected.reduce((sum, u) => sum + u.wordCount, 0), ...(mode === 'update' ? { missionId: week.missionId, expectedVersion: week.expectedVersion } : {}) }; });
        return replayOperation(prior, auth, state, mode, requestHash(auth, mode, originalShape));
      }
      if (mode === 'create' && !targetExists(auth.actor, auth.target)) fail('TARGET_NOT_FOUND', '指定した学校・学年グループを確認できません。');
      if (state.operations.some(op => op.state === 'PREPARED')) fail('RECOVERY_REQUIRED', '未完了の保存操作があります。管理者による復旧確認が必要です。');
      const weeks = normalize(request, auth, state, mode), inspection = inspect(weeks, state, auth);
      if (inspection.conflicts.length) fail('PERIOD_CONFLICT', ENGLISH_MISSION_PERIOD_ERROR, { conflicts: inspection.conflicts });
      verifyProof(request, auth, mode, weeks, inspection);
      if (inspection.duplicates.length && request.duplicatesAcknowledged !== true) fail('DUPLICATE_CONFIRMATION_REQUIRED', '同一単元の登録確認が必要です。');
      const timestamp = new Date(now()).toISOString(), batchId = 'b-' + uuid();
      const records = weeks.map(week => {
        const old = mode === 'update' ? state.records.find(record => record.missionId === week.missionId) : null;
        const { expectedVersion: _expected, ...content } = week;
        return { ...content, operationId: request.operationId, missionId: old?.missionId || 'm-' + uuid(), batchId: old?.batchId || batchId, groupId: auth.groupId, targetKey: auth.targetKey, target: auth.target, timeZone: 'Asia/Tokyo', version: old ? old.version + 1 : 1, createdAt: old?.createdAt || timestamp, createdBy: old?.createdBy || auth.actor.userId, updatedAt: timestamp, updatedBy: auth.actor.userId };
      });
      return persistOperation(request, auth, state, mode, requestHash(auth, mode, weeks), records, timestamp, flushWrites);
    });
  };
  const removeWeek = request => {
    authorize(request);
    if (!validId(request.operationId) || !validId(request.missionId) || !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 1) {
      fail('VALIDATION_ERROR', '削除対象の週と更新版を確認してください。');
    }
    const mode = 'delete';
    return withLock(() => {
      const auth = authorize(request), state = readState();
      const bodyHash = requestHash(auth, mode, { missionId: request.missionId, expectedVersion: request.expectedVersion });
      const prior = state.operations.find(op => op.operationId === request.operationId);
      if (prior) return replayOperation(prior, auth, state, mode, bodyHash);
      const previous = state.latest.get(request.missionId);
      if (!previous || previous.groupId !== auth.groupId) fail('AUTHORIZATION_ERROR', '指定されたミッションを削除できません。');
      if (previous.status === 'DELETED') fail('MISSION_DELETED', 'この週はすでに削除されています。一覧を再取得してください。');
      if (previous.version !== request.expectedVersion) fail('VERSION_CONFLICT', '他の管理者が更新しています。最新の登録内容を取得して再確認してください。');
      if (state.operations.some(op => op.state === 'PREPARED')) fail('RECOVERY_REQUIRED', '未完了の保存操作があります。管理者による復旧確認が必要です。');
      const timestamp = new Date(now()).toISOString();
      const deleted = deletedVersion(previous, request.operationId, auth.actor.userId, timestamp);
      return persistOperation(request, auth, state, mode, bodyHash, [deleted], timestamp, flushWrites);
    });
  };
  const list = request => {
    const auth = authorize(request);
    return withLock(() => {
      const state = readState(), records = state.records.filter(record => record.groupId === auth.groupId);
      if (!records.length && !targetExists(auth.actor, auth.target)) fail('TARGET_NOT_FOUND', '指定した学校・学年グループを確認できません。');
      const relatedRecords = request.includeAccessibleScopes === true ? state.records.filter(record => record.groupId !== auth.groupId && record.target.attendingSchoolName === auth.target.attendingSchoolName && record.target.targetGrade === auth.target.targetGrade && record.target.subject === auth.target.subject && record.target.scopeSchools.every(s => auth.actor.role === 'admin' || auth.actor.assignedSchools?.includes(s))) : [];
      return success(auth, { records: clone(records).sort((a, b) => a.startDate.localeCompare(b.startDate)), relatedRecords: clone(relatedRecords), revision: state.revision(auth.groupId), catalogVersion: catalog.version });
    });
  };
  const operation = (request, recover) => {
    const statusAuth = recover ? null : authorize(request);
    if (!validId(request.operationId)) fail('VALIDATION_ERROR', '登録操作IDを確認してください。');
    return withLock(() => {
      const auth = statusAuth || authorize(request);
      if (recover && auth.actor.role !== 'admin') fail('AUTHORIZATION_ERROR', '復旧確認には管理者権限が必要です。');
      const state = readState(), op = state.operations.find(item => item.operationId === request.operationId);
      if (!op) return success(auth, { operationId: request.operationId, state: 'NOT_FOUND', records: [] });
      checkOperationAccess(auth, op);
      if (recover && op.state === 'PREPARED') {
        let observed;
        try {
          store.mark(op.operationId, 'ABORTED', new Date(now()).toISOString());
          flushRecovery();
          observed = readState().operations.find(item => item.operationId === op.operationId);
        } catch { /* A later status request can read the persisted outcome. */ }
        if (observed?.state !== 'ABORTED' || observed.groupId !== op.groupId || observed.actorId !== op.actorId) {
          fail('OUTCOME_UNKNOWN', '復旧結果を確定できません。操作IDから状態を確認してください。', { operationId: op.operationId });
        }
        return success(auth, { operationId: op.operationId, state: observed.state, records: [] });
      }
      if (op.state === 'COMMITTED') return operationResponse(auth, op, state);
      return success(auth, { operationId: op.operationId, state: op.state, records: [] });
    });
  };
  return {
    handle(action, request) {
      try {
        const method = ENGLISH_MISSION_ACTIONS[action];
        if (method === 'list') return list(request);
        if (method === 'delete') return removeWeek(request);
        if (method === 'preview') return preview(request);
        if (method === 'create' || method === 'update') return commit(request, method);
        if (method === 'status' || method === 'recover') return operation(request, method === 'recover');
        fail('VALIDATION_ERROR', '未対応のミッション操作です。');
      } catch (error) {
        return { result: 'error', code: error.code || 'VALIDATION_ERROR', message: error.code ? error.message : '入力内容または保存設定を確認してください。', ...(error.details || {}) };
      }
    },
  };
}