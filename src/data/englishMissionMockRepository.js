// Node-only synthetic adapter. The browser uses the same service through the isolated dev server.
import { createEnglishMissionMemoryBackend } from '../server/englishMissionMemoryBackend.js';
import { createEnglishMissionRepository } from './englishMissionRepository.js';
export function createEnglishMissionMockRepository({ getActor, beforeCommit = () => {} }) {
  const backend = createEnglishMissionMemoryBackend({
    resolveSession: () => { const actor = getActor(); return actor && { ...actor, userId: actor.id, sessionExpiresAt: new Date(Date.now() + 3600000).toISOString() }; },
    targetExists: () => true,
    onWrite: stage => { if (stage === 'before-append') beforeCommit(); },
  });
  return createEnglishMissionRepository({ invoke: request => backend.handle(request.action, request) });
}
