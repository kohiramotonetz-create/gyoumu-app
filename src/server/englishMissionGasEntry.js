import { createEnglishMissionService, ENGLISH_MISSION_ACTIONS } from './englishMissionService.js';
import { createEnglishMissionSheetsStore, ENGLISH_MISSION_SHEETS } from './englishMissionSheetsStore.js';

export { ENGLISH_MISSION_SHEETS };
export const isAction = action => Object.hasOwn(ENGLISH_MISSION_ACTIONS, action);
export function createGasService(environment) {
  const key = () => { const value = environment.properties.getProperty('SUKIMAKUN_ENGLISH_CONFIRMATION_KEY'); if (!value) { const error = new Error('ミッション保存用の確認鍵が未設定です。'); error.code = 'SETUP_REQUIRED'; throw error; } return value; };
  const hex = values => values.map(value => ((value + 256) % 256).toString(16).padStart(2, '0')).join('');
  const store = createEnglishMissionSheetsStore(environment.book);
  const service = createEnglishMissionService({
    store, schools: environment.schools,
    resolveSession: environment.resolveSession,
    flushWrites: () => environment.flush(),
    flushRecovery: () => environment.flush(),
    hash: text => hex(environment.utilities.computeDigest(environment.utilities.DigestAlgorithm.SHA_256, text, environment.utilities.Charset.UTF_8)),
    sign: text => hex(environment.utilities.computeHmacSha256Signature(text, key(), environment.utilities.Charset.UTF_8)),
    encode: text => environment.utilities.base64EncodeWebSafe(text, environment.utilities.Charset.UTF_8).replace(/=+$/, ''),
    decode: text => environment.utilities.newBlob(environment.utilities.base64DecodeWebSafe(text)).getDataAsString('UTF-8'),
    uuid: () => environment.utilities.getUuid(), now: environment.now || (() => Date.now()), withLock: environment.withLock,
    targetExists: (actor, target) => (actor.userContexts || []).some(user => user.role === 'student' && user.enabled && !user.deleted && target.scopeSchools.includes(user.school) && String(user.attendingSchoolName || '').trim() === target.attendingSchoolName && String(user.grade || '').normalize('NFKC') === target.targetGrade.normalize('NFKC')),
  });
  return { ...service, setup: () => environment.withLock(() => store.setup()) };
}
export function handle(data, environment) {
  try {
    // Open the book only inside the execution that owns the script lock.
    // The service's inner lock callbacks run while this outer lock is held.
    return environment.withLock(() => createGasService({
      ...environment,
      book: environment.openBook(),
      withLock: callback => callback(),
    }).handle(data.action, data));
  } catch (error) {
    return {
      result: 'error',
      code: error.code || 'STORAGE_INTEGRITY_ERROR',
      message: error.code ? error.message : 'ミッション保存先の状態を確認できません。',
    };
  }
}