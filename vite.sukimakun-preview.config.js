import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import preview from './scripts/sukimakunPreviewMock.cjs';
import { createLocalEnglishMissionStore, previewDataFile, previewDirectory, previewHost, previewPort } from './scripts/localEnglishMissionStore.mjs';
import { createEnglishMissionMemoryBackend } from './src/server/englishMissionMemoryBackend.js';
import { ALL_SCHOOLS } from './src/constants/organization.js';

const previewConfig = ({ directory, dataFile, port }) => ({
  envDir: false,
  cacheDir: join(directory, 'vite-cache'),
  envPrefix: 'SUKIMAKUN_PREVIEW_UNUSED_',
  plugins: [react(), {
    name: 'sukimakun-isolated-preview',
    configureServer(server) {
      const { host, strictPort } = server.config.server;
      if (host !== previewHost || server.config.server.port !== port || !strictPort || server.config.server.https) {
        throw Error('Sukimakun Preview requires its fixed loopback address and port.');
      }
      const mock = preview.createSukimakunPreviewMock(ALL_SCHOOLS);
      let fault = '';
      const store = createLocalEnglishMissionStore(dataFile, stage => {
        if (fault === 'partial' && stage === 'after-row') { fault = ''; throw Error('synthetic partial write'); }
      });
      const missions = createEnglishMissionMemoryBackend({
        store,
        resolveSession: token => { const actor = mock.getSession(token); if (!actor) { const error = new Error('管理セッションが無効です。再ログインしてください。'); error.code = 'AUTHENTICATION_ERROR'; throw error; } return actor; },
        targetExists: (actor, target) => actor.userContexts.some(s => target.scopeSchools.includes(s.school) && s.attendingSchoolName === target.attendingSchoolName && s.grade === target.targetGrade),
      });
      server.middlewares.use((request, response, next) => {
        const route = request.url?.split('?')[0];
        if (!['/mock-gas', '/mock-control', '/mock-stats', '/mock-stage2-gas', '/mock-mission-control'].includes(route)) return next();
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        if (route === '/mock-stats' && request.method === 'GET') return response.end(JSON.stringify(mock.stats()));
        const { origin } = request.headers;
        if (origin && ![`http://${previewHost}:${port}`, `http://localhost:${port}`].includes(origin)) {
          response.statusCode = 403;
          return response.end(JSON.stringify({ result: 'error', message: 'ローカルPreviewからアクセスしてください。' }));
        }
        if (request.method !== 'POST') {
          response.statusCode = 405;
          return response.end(JSON.stringify({ result: 'error', message: 'POSTでアクセスしてください。' }));
        }
        let body = '';
        request.on('data', chunk => { body += chunk; if (body.length > 4 * 1024 * 1024) request.destroy(); });
        request.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (route === '/mock-mission-control') { if (!['', 'partial', 'lost-response'].includes(data.fault)) throw Error(); fault = data.fault; return response.end(JSON.stringify({ synthetic: true })); }
            if (route === '/mock-stage2-gas') {
              if (data.apiKey !== 'mock-only') throw Error();
              const result = missions.handle(data.action, data);
              if (fault === 'lost-response' && ['saveSukimakunEnglishMissionBatch', 'updateSukimakunEnglishMission', 'deleteSukimakunEnglishMission'].includes(data.action) && result.result === 'success') { fault = ''; response.statusCode = 503; return response.end('{}'); }
              return response.end(JSON.stringify(result));
            }
            if (route === '/mock-control') { mock.setMode(data.mode); return response.end(JSON.stringify({ synthetic: true })); }
            response.end(JSON.stringify(mock.handle(data)));
          } catch { response.statusCode = 400; response.end(JSON.stringify({ result: 'error', message: '合成APIの入力が正しくありません' })); }
        });
      });
    },
  }],
  define: { 'import.meta.env.VITE_GAS_URL': JSON.stringify('/mock-gas'), 'import.meta.env.VITE_API_KEY': JSON.stringify('mock-only'), 'import.meta.env.VITE_SUKIMAKUN_MISSION_MOCK': JSON.stringify('true') },
  server: {
    host: previewHost, port, strictPort: true,
    headers: { 'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://${previewHost}:${port}` },
  },
});

export default defineConfig(({ mode }) => {
  if (mode !== 'sukimakun-week-delete-test') {
    return previewConfig({ directory: previewDirectory, dataFile: previewDataFile, port: previewPort });
  }
  const directory = join(previewDirectory, 'week-delete-test');
  return previewConfig({ directory, dataFile: join(directory, 'missions.json'), port: 5179 });
});