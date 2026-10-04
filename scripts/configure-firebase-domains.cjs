const path = require('node:path');
const fs = require('node:fs');

// Usa a sessão autenticada do CLI oficial, sem imprimir nem exportar tokens.
const cliDirectory = process.argv[2];
if (!cliDirectory) throw new Error('Informe o diretório do pacote firebase-tools instalado.');
const { getGlobalDefaultAccount, getProjectDefaultAccount, setActiveAccount } = require(
  path.join(cliDirectory, 'lib/auth')
);
const { requireAuth } = require(path.join(cliDirectory, 'lib/requireAuth'));
const { getAuthDomains, updateAuthDomains } = require(path.join(cliDirectory, 'lib/gcp/auth'));
const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const project = JSON.parse(fs.readFileSync('.firebaserc', 'utf8')).projects.default;

(async () => {
  const options = { project, projectId: project, projectRoot: process.cwd(), nonInteractive: true };
  const account = getProjectDefaultAccount(process.cwd()) || getGlobalDefaultAccount();
  if (!account) throw new Error('Conecte o CLI oficial com firebase login.');
  setActiveAccount(options, account);
  await requireAuth(options);
  const existing = await getAuthDomains(project);
  const desired = [...new Set([...existing, ...config.auth.authorizedDomains])];
  const domains =
    desired.length === existing.length ? existing : await updateAuthDomains(project, desired);
  console.log(JSON.stringify({ project, authorizedDomains: domains }));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
