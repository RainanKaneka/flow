import { initializeApp, FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

declare const __FIREBASE_CONFIG__: FirebaseOptions;

const button = document.getElementById('signin') as HTMLButtonElement;
const status = document.getElementById('status')!;
const params = new URLSearchParams(window.location.search);
const state = params.get('state') || '';
const port = Number(params.get('port'));
// O identificador temporário não deve permanecer no histórico nem em referrers.
window.history.replaceState(null, '', window.location.pathname);

if (!/^[a-f0-9]{64}$/.test(state) || !Number.isInteger(port) || port < 1 || port > 65535) {
  status.textContent = 'Abra esta conexão pelo botão Continuar com Google no aplicativo Flow.';
} else {
  const auth = getAuth(initializeApp(__FIREBASE_CONFIG__));
  setPersistence(auth, inMemoryPersistence)
    .then(() => {
      status.textContent = 'O Flow está aguardando sua conexão.';
      button.disabled = false;
    })
    .catch(() => {
      status.textContent = 'Não foi possível preparar o login. Volte ao Flow e tente novamente.';
    });

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Escolha sua conta na janela do Google…';
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const token = GoogleAuthProvider.credentialFromResult(result)?.idToken;
      if (!token) throw new Error('missing-credential');
      await signOut(auth);

      // POST de navegação: nenhum token é colocado na URL ou na área de transferência.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `http://127.0.0.1:${port}/callback`;
      for (const [name, value] of [
        ['state', state],
        ['id_token', token],
      ]) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      status.textContent = 'Conectado. Retornando ao Flow…';
      form.submit();
    } catch (error) {
      const code = (error as { code?: string }).code;
      status.textContent =
        code === 'auth/popup-closed-by-user'
          ? 'A conexão foi cancelada. Você pode tentar novamente.'
          : 'Não foi possível concluir a conexão. Volte ao Flow e tente novamente.';
      button.disabled = false;
    }
  });
}
