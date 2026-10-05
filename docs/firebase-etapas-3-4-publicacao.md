# Publicação das regras das etapas 3 e 4

Concluída em 2026-10-05 e conferida às 17:31 UTC (14:31 em São Paulo), após
autorização explícita do usuário para habilitar as contas sincronizadas.

- Projeto: `flow-rainan-prod`.
- Banco: `(default)`, Standard, `southamerica-east1`.
- Serviço alterado: somente as regras de segurança do Firestore.
- Ferramenta: MCP Firebase, job `1791221429642`, estado `success`.
- Arquivo enviado naquela data: cópia preservada em `build/stage4-production-published.rules`.
- SHA256 do arquivo local e da cópia enviada:
  `5AD62569A1113E9EE0BF740C5E11C3C138C3F6E006CB3505076DB87381820278`.

A leitura das regras ativas pelo MCP confirmou correspondência integral com o
arquivo testado, normalizando apenas finais de linha e espaços no fim do arquivo.
Esse resultado descreve a publicação da época. Em 2026-10-05, após nova
autorização do usuário, o campo opcional de posições de peixes do arquivo local
[firestore.rules](../firestore.rules) também foi publicado pelo MCP Firebase.
O job `1791232789279` terminou em `success`; a leitura posterior das regras
ativas confirmou `validFishPosition` e `positions`. A configuração isolada
continha somente as regras Firestore e o MCP foi restaurado à pasta do projeto.
Estão presentes os caminhos privados de pesca, aquário, inventário cosmético,
marcos, preferências e importações. O isolamento por usuário continua exigido.

Antes da publicação, a validação pelo MCP não encontrou erros (dois avisos
preexistentes de variáveis não utilizadas). A versão enviada havia passado
nos 29 testes dos emuladores Firebase e nos 550 testes do aplicativo.

## Escopo e recuperação

Nenhum documento de usuário foi criado ou alterado para esta conferência.
Índices, Auth, Hosting, Functions, instalador e versão do aplicativo não foram
publicados ou alterados. Faturamento permanece desativado.

O MCP aceita o alvo `firestore`, mas sua implementação descarta `firestore:rules`
e pode informar sucesso sem publicar. A primeira tentativa teve esse comportamento,
detectado pela leitura das regras ativas. A publicação efetiva usou uma configuração
isolada em `build/stage4-rule-deploy/firebase.json`, contendo apenas o arquivo
de regras e o banco alvo, sem índices ou outros serviços. A cópia foi conferida
por SHA256 antes do envio. Ao concluir, o MCP foi restaurado à pasta `flow-app`.

Para recuperação local, as regras anteriores foram guardadas em
`build/stage4-production-before.rules` e a leitura publicada em
`build/stage4-production-published.rules`. São artefatos locais ignorados pelo
Git; qualquer reversão em produção precisa ser uma ação deliberada.

As permissões das etapas 3 e 4 estão disponíveis para a versão atual do código.
Instaladores antigos não recebem a nova interface apenas com essa publicação.
O percurso com conta Google real no executável Tauri continua pendente para
a etapa 5; a conferência desta entrega prova a publicação e o conteúdo das regras.
