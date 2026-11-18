import { postManagementAction } from '../utils/managementApi.js';

// Transport is supplied explicitly. Normal Production never instantiates this repository.
export function createEnglishMissionRepository({ invoke, expectedStorage }) {
  const call = async (action, payload) => {
    let result;
    try { result = await invoke({ action, ...payload }); }
    catch { const error = new Error('通信結果を確認できません。操作IDから保存状態を確認してください。'); error.code = 'TRANSPORT_UNKNOWN'; throw error; }
    if (result?.result !== 'success') { const error = new Error(result?.message || 'ミッションAPIの応答を確認できません。'); error.code = result?.code || 'INVALID_RESPONSE'; error.details = result; throw error; }
    if (expectedStorage ? result.storage !== expectedStorage : !['gas', 'mock-server'].includes(result.storage)) { const error = new Error('保存先の応答を確認できません。'); error.code = 'INVALID_RESPONSE'; throw error; }
    const invalid = () => { const error = new Error('ミッションAPIの応答形式を確認できません。'); error.code = 'INVALID_RESPONSE'; throw error; };
    if (action === 'previewSukimakunEnglishMissionBatch') {
      if (!Array.isArray(result.conflicts) || !Array.isArray(result.duplicates) || typeof result.confirmationToken !== 'string' || !Number.isSafeInteger(result.revision) || typeof result.canSave !== 'boolean') invalid();
    } else if (!Array.isArray(result.records) || result.records.some(r => !r?.missionId || !Number.isSafeInteger(r.version) || !r.target || !Array.isArray(r.materials))) invalid();
    return result;
  };
  return {
    list: target => call('getSukimakunEnglishMissions', { target, includeAccessibleScopes: true }),
    prepare: request => call('previewSukimakunEnglishMissionBatch', request),
    saveBatch: request => call('saveSukimakunEnglishMissionBatch', request),
    updateMission: request => call('updateSukimakunEnglishMission', request),
    deleteMission: request => call('deleteSukimakunEnglishMission', request),
    getOperationStatus: request => call('getSukimakunEnglishMissionOperation', request),
  };
}

export function createEnglishMissionHttpRepository({ url, apiKey, sessionToken, expectedStorage = 'gas' }) {
  return createEnglishMissionRepository({
    expectedStorage,
    invoke: payload => postManagementAction(url, { ...payload, apiKey, sessionToken }),
  });
}
