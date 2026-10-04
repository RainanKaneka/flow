# Firebase e contas do Flow

O projeto ativo é `flow-rainan-prod`, com o aplicativo web `Flow Desktop`.
A configuração pública do SDK acompanha o app em `src/config/firebaseProject.json`.
Ela não contém credenciais administrativas. Variáveis de ambiente e configurações
personalizadas continuam disponíveis para desenvolvimento.

Google, e-mail/senha e convidados são configurados em `firebase.json`.
O Firestore usa a região `southamerica-east1`. O perfil fica em `users/{uid}`;
as regras permitem acesso somente à própria conta autenticada.

No desktop, o botão Google abre `https://flow-rainan-prod.web.app` no navegador
do sistema. Após escolher a conta, essa página entrega a credencial por POST
a um servidor temporário em `127.0.0.1`, com porta aleatória, estado aleatório
de uso único e prazo de cinco minutos. O SDK Firebase do aplicativo valida a
credencial e persiste a sessão. Tokens não vão em URLs. A página de conexão
usa persistência em memória; o perfil é carregado ou criado no próprio app.

Para atualizar a página de conexão e as configurações:

```powershell
npm.cmd run build:firebase-auth
npx.cmd firebase-tools deploy --only auth,firestore,hosting -P production
```

Os domínios autorizados incluem o Hosting e `localhost`/`127.0.0.1` para
desenvolvimento. A versão atual do CLI provisiona os provedores pelo deploy,
mas não aplica `auth.authorizedDomains`. Para reaplicar essa lista, use
`node scripts/configure-firebase-domains.cjs <diretório-do-pacote-firebase-tools>`
com a sessão autenticada do CLI; o script preserva os demais domínios existentes.

O Hosting publica apenas `firebase-auth-bridge/dist`. Alterações nos comandos
nativos exigem recompilar o desktop com `npm.cmd run tauri build`.
O login Google pessoal precisa ser conferido no instalador: abrir o Flow,
clicar em Continuar com Google, selecionar a conta no navegador, voltar ao
app e conferir o perfil; depois reabrir o Flow para verificar a sessão.

`node scripts/verify-firebase.mjs` verifica os serviços publicados usando duas
contas temporárias de convidados. Confere criação/leitura de perfil, bloqueio
de acesso por outra conta e sem login, provedor Google e página de conexão.
As contas e o documento de teste são removidos ao finalizar; nenhum token
é impresso. Esse teste não substitui a escolha de uma conta Google real.

Referências: [Firebase Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
e [OAuth para aplicativos desktop](https://developers.google.com/identity/protocols/oauth2/native-app).
