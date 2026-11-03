import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import preview from './scripts/sukimakunPreviewMock.cjs';
import { ALL_SCHOOLS } from './src/constants/organization.js';

export default defineConfig({
  envDir: false,
  envPrefix: 'SUKIMAKUN_PREVIEW_UNUSED_',
  plugins: [react(), {
    name: 'sukimakun-isolated-preview',
    configureServer(server) {
      const mock = preview.createSukimakunPreviewMock(ALL_SCHOOLS);
      server.middlewares.use((request, response, next) => {
        const route = request.url?.split('?')[0];
        if (!['/mock-gas', '/mock-control', '/mock-stats'].includes(route)) return next();
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        if (route === '/mock-stats') return response.end(JSON.stringify(mock.stats()));
        let body = '';
        request.on('data', chunk => { body += chunk; if (body.length > 4 * 1024 * 1024) request.destroy(); });
        request.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (route === '/mock-control') { mock.setMode(data.mode); return response.end(JSON.stringify({ synthetic: true })); }
            response.end(JSON.stringify(mock.handle(data)));
          } catch { response.statusCode = 400; response.end(JSON.stringify({ result: 'error', message: '合成APIの入力が正しくありません' })); }
        });
      });
    },
  }],
  define: { 'import.meta.env.VITE_GAS_URL': JSON.stringify('/mock-gas'), 'import.meta.env.VITE_API_KEY': JSON.stringify('mock-only') },
  server: {
    host: '127.0.0.1', port: 5178, strictPort: true,
    headers: { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:5178" },
  },
});