import { rolldown } from 'rolldown';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = process.argv[2];
if (!output) throw Error('独立したGAS候補の出力先を指定してください。');
mkdirSync(output, { recursive: true });
const bundle = await rolldown({ input: new URL('../src/server/englishMissionGasEntry.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), treeshake: true });
await bundle.write({ file: resolve(output, 'SukimakunEnglishMissions.js'), format: 'iife', name: 'SukimakunEnglishMissions', minify: false });
await bundle.close();
const baseline = process.argv[3];
if (baseline) {
  const original = readFileSync(resolve(baseline, 'コード.js'), 'utf8');
  const anchor = '  if (oneToOneDetailTrace) data.__oneToOneDetailTrace = oneToOneDetailTrace;';
  if (original.split(anchor).length !== 2) throw Error('v194 action dispatch anchor mismatch');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const insertion = ['  if (SukimakunEnglishMissions.isAction(data.action)) {', '    return responseJSON(handleSukimakunEnglishMissionAction_(data));', '  }', ''].join(newline);
  writeFileSync(resolve(output, 'コード.js'), original.replace(anchor, insertion + anchor));
  for (const name of ['schoolUnits.generated.js', 'appsscript.json']) copyFileSync(resolve(baseline, name), resolve(output, name));
  copyFileSync(new URL('../src/server/englishMissionGasBridge.gs', import.meta.url), resolve(output, 'EnglishMissionBridge.js'));
}
