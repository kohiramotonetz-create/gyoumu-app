import { createServer } from 'node:net';
import { archiveLocalEnglishMissionData, previewDataFile, previewHost, previewPort } from './localEnglishMissionStore.mjs';

const reservation = createServer(connection => connection.destroy());
try {
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen({ host: previewHost, port: previewPort, exclusive: true }, resolve);
  });
} catch (error) {
  if (error.code === 'EADDRINUSE') throw Error('初期化するには、先にローカルPreviewを停止してください。');
  throw error;
}
try {
  const backup = archiveLocalEnglishMissionData(previewDataFile);
  console.log(backup ? `ローカル保存を初期化しました。退避先: ${backup}` : '初期化するローカル保存データはありません。');
} finally {
  reservation.close();
}
