import { readFile } from 'node:fs/promises';

const config = JSON.parse(
  await readFile(new URL('../src/config/firebaseProject.json', import.meta.url), 'utf8')
);
const authUrl = `https://identitytoolkit.googleapis.com/v1`;
const users = [];
let profileUrl;
const request = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
const json = (data) => ({ 'Content-Type': 'application/json', ...data });
try {
  const projectResponse = await request(`${authUrl}/projects?key=${config.apiKey}`);
  const project = await projectResponse.json();
  if (!projectResponse.ok || !project.authorizedDomains?.includes(config.authDomain))
    throw new Error('Domínio de autenticação indisponível.');
  const googleResponse = await request(`${authUrl}/accounts:signInWithIdp?key=${config.apiKey}`, {
    method: 'POST',
    headers: json(),
    body: JSON.stringify({
      requestUri: `https://${config.projectId}.web.app`,
      postBody: 'id_token=invalid-test-credential&providerId=google.com',
      returnSecureToken: true,
    }),
  });
  const google = await googleResponse.json();
  if (!google.error?.message?.startsWith('INVALID_IDP_RESPONSE'))
    throw new Error(
      `Provedor Google não respondeu como esperado: ${google.error?.message || googleResponse.status}`
    );
  console.log('Google habilitado; credencial inválida corretamente rejeitada.');
  for (let i = 0; i < 2; i++) {
    const response = await request(`${authUrl}/accounts:signUp?key=${config.apiKey}`, {
      method: 'POST',
      headers: json(),
      body: JSON.stringify({ returnSecureToken: true }),
    });
    const user = await response.json();
    if (!response.ok) throw new Error(`Conta de teste: ${user.error?.message || response.status}`);
    users.push(user);
  }
  profileUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/users/${users[0].localId}`;
  const ownHeaders = json({ Authorization: `Bearer ${users[0].idToken}` });
  const created = await request(profileUrl, {
    method: 'PATCH',
    headers: ownHeaders,
    body: JSON.stringify({
      fields: {
        displayName: { stringValue: 'Verificação temporária Flow' },
        plan: { stringValue: 'free' },
        profile: {
          mapValue: {
            fields: {
              name: { stringValue: 'Verificação temporária Flow' },
              objective: { stringValue: 'Verificar configuração' },
            },
          },
        },
      },
    }),
  });
  if (!created.ok) throw new Error(`Criação do perfil: ${created.status}`);
  const own = await request(profileUrl, { headers: ownHeaders });
  const other = await request(profileUrl, {
    headers: { Authorization: `Bearer ${users[1].idToken}` },
  });
  const anonymous = await request(profileUrl);
  if (!own.ok || other.status !== 403 || anonymous.status !== 403)
    throw new Error('Acesso ao perfil não respeitou as regras esperadas.');
  console.log(
    'Perfil criado e lido pela própria conta; acesso de outra conta e sem login bloqueados.'
  );
  const page = await request(`https://${config.projectId}.web.app`);
  if (!page.ok || !(await page.text()).includes('Continuar com Google'))
    throw new Error('Página de conexão indisponível.');
  console.log('Página de conexão publicada e acessível.');
} finally {
  if (profileUrl && users[0]) {
    const removed = await request(profileUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${users[0].idToken}` },
    });
    if (!removed.ok) throw new Error(`Falha ao remover perfil temporário: ${removed.status}`);
  }
  for (const user of users) {
    const removed = await request(`${authUrl}/accounts:delete?key=${config.apiKey}`, {
      method: 'POST',
      headers: json(),
      body: JSON.stringify({ idToken: user.idToken }),
    });
    if (!removed.ok) throw new Error(`Falha ao remover conta temporária: ${removed.status}`);
  }
  if (users.length) console.log('Contas e perfil temporários removidos.');
}
