import { build } from 'vite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const config = JSON.parse(await readFile('src/config/firebaseProject.json', 'utf8'));
if (!config.apiKey || !config.projectId || !config.appId) {
  throw new Error('Configure o app web do Firebase antes de compilar a página de login.');
}
await build({
  configFile: false,
  root: path.resolve('firebase-auth-bridge'),
  define: { __FIREBASE_CONFIG__: JSON.stringify(config) },
  build: { outDir: 'dist', emptyOutDir: true },
});
