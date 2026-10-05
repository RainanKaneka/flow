# Recompensas — etapa 2 implementada

Esta etapa liga o Refúgio às tarefas e ao Pomodoro reais. Não inclui pet,
pesca, compras com dinheiro, publicidade ou recursos pagos. O design usa
[ui-taste](../design/ui-taste/SKILL.md) e os tokens existentes do Flow.

## O que o usuário recebe

- XP permanente, níveis a partir dos limiares antigos e conquistas preservadas.
- 50 XP / 5 moedas por tarefa, até cinco por dia. A primeira acrescenta
  25 XP / 10 moedas / um bilhete. A confirmação espera cinco segundos;
  desmarcar nesse intervalo cancela a intenção.
- Foco completo de pelo menos 25 minutos observados: 20 XP / 2 moedas,
  até três sessões por dia. Alterar duração, reiniciar ou invocar o término
  antecipadamente não concede a recompensa. Pausar conserva a identidade;
  reabrir o aplicativo exige retomar o temporizador.
- Metas de 1/2/3 tarefas: 15/30/50 XP, 5/7/10 moedas e um bilhete nos dias
  planejados. Alterações passam a valer amanhã. Descansos planejados mantêm
  a sequência; XP e conquistas não são removidos por ausência.
- Até 50 moedas diárias. Quatro dias ativos na semana, de segunda a domingo,
  dão 100 XP / 20 moedas extras, uma única vez.
- Sálvia: 15 moedas; Bosque: 80; Horizonte: 120. Comprar e equipar são ações
  separadas. Remover uma aparência mantém o item desbloqueado. Claro/escuro
  continuam independentes e gratuitos. Bilhetes ficam guardados, sem gasto nesta etapa.

## Persistência e sincronização

`src/services/rewards/engine.ts` contém a economia determinística. As regras
do Firestore validam os mesmos resultados em transações atômicas. O projeto
`flow-rainan-prod` usa Firestore STANDARD e permanece **sem faturamento**;
esta implementação substitui a proposta inicial de Cloud Functions, que
exigiria Blaze. Não há nova dependência de produção.

Os dados ficam em `users/{uid}/rewardsWallet/main`, `rewardReceipts/{id}`,
`rewardDays/{epochDay}`, `rewardWeeks/{mondayEpochDay}` e
`rewardsPreferences/main`. O cliente não pode editar saldos isoladamente,
escolher preços, remover comprovantes ou apagar a carteira. Operações exigem
comprovante novo, revisão consecutiva e os contadores exatos na mesma transação.
O antigo acesso genérico às subcoleções foi substituído pelo acesso específico
ao documento `sync/state`, mantendo perfil e rotina privados.

Identidade de tarefa: `task_{dia}_{taskId}`. Identidade de foco:
`focus_{sessionId}`, independente do dia de retomada. Receber novamente um
comprovante confirmado só reconhece a operação anterior. Compras usam o
inventário e o saldo atuais da transação, inclusive com duas instâncias.

No desktop, `flow-rewards.db` guarda carteira, comprovantes, intenções,
preferências e backup anterior à migração, separados de `flow.db`.
Restaurar o backup da rotina, importar tarefas, excluir uma atividade ou
restaurar o template não reverte os comprovantes. Cada gravação é um único
upsert SQLite atômico; falhas de disco preservam a intenção para nova tentativa.
No navegador de desenvolvimento há um fallback em localStorage.

O convidado tem progresso local. Contas usam chaves com projeto Firebase e UID;
respostas antigas não escrevem na conta seguinte. Intenções são persistidas
mesmo durante a restauração inicial da sessão. Requisições de rede não bloqueiam
a fila de gravação local. Preferências podem ser equipadas offline e são
sincronizadas depois. Compras na conta exigem conexão e confirmação do servidor.

Ganhos offline aguardam até sete dias. Correções de datas antigas não rendem
novas moedas. Ocorrências noturnas pertencem à data original, com tolerância
até duas horas após o fim. Os últimos motivos de recusa aparecem no Refúgio.

O ciclo usa o **offset UTC fixado ao criar a carteira**, acompanhado do nome
IANA informativo, e exibe esse fuso nas configurações. Isso mantém o ciclo
estável em viagens. Conversão automática de horário de verão não está nesta
versão; substitui a intenção inicial de um calendário IANA calculado no backend.
Há nove períodos de meta: sete dias anteriores, hoje e a próxima mudança.
Os comprovantes fornecem índices de período; as regras verificam seus limites
e vizinhos, sem confiar no índice escolhido pelo cliente.

## Migração e limites de confiança

O progresso antigo tem um backup antes da migração. Convidados preservam o XP
calculado e as conquistas disponíveis. Quem já usava uma conta recebe uma
prévia para trazer o progresso local: usa-se o maior XP, preservam-se os três
cosméticos iniciais e as conquistas; moedas e bilhetes locais não são somados.
A migração confirmada dá 15 moedas uma única vez e não pode ser repetida.

Conclusões são declarações do usuário: o servidor valida identidade, revisão,
datas, tetos, ganhos, inventário e preços; não comprova que uma atividade
aconteceu fisicamente. XP legado e o inventário inicial têm uma importação
de confiança explicitamente limitada e única. Esses ativos são pessoais,
cosméticos, sem valor financeiro ou ranking público.

As regras são um protótipo verificado para esses fluxos. Os validadores de
perfil e rotina preservam compatibilidade e não auditam profundamente cada
campo histórico aninhado. Uma revisão de segurança antes de distribuição
ampla continua recomendada; não se declara proteção absoluta.

As regras foram publicadas em `flow-rainan-prod` usando o MCP Firebase e
conferidas novamente pela CLI. A leitura final pelo MCP corresponde ao
arquivo `firestore.rules` do projeto. Não foram criados dados de teste em
produção nem ativado faturamento.

## Verificação

Testes de economia, integração do store e SQLite real cobrem os tetos,
repetição, desfazer, reinício, exclusão/template/importação, migração,
compras, falha de disco e troca de conta durante requisição pendente.
Os testes do Pomodoro exercitam os 1.500 ticks com relógio observado.

`npx vitest run --config vitest.rewards.config.mts` usa **somente**
`demo-flow-rewards`, com Auth e Firestore em `127.0.0.1:9099/8080`.
Requer Java 21 e emuladores iniciados. Não usa dados de produção.
Inclui duas identidades, dois clientes da mesma conta, consultas públicas,
alteração direta de saldo/schema/fuso, replay, deleção, preço fraudado,
saldo insuficiente, metas futuras, uma semana completa e múltiplos períodos
de meta com sincronização atrasada. A preparação de históricos usa a API
administrativa **apenas do emulador** para simular dias já transcorridos.

A interface real foi exercitada no Chrome isolado em 1280×940, 1024×768 e
390×844: tarefa → confirmação → saldo → compra → equipagem → reabertura.
Bosque claro/escuro e Horizonte no perfil foram inspecionados com um fixture
local identificado, usado para disponibilizar os itens de preço maior.
Isso não substitui uma avaliação com pessoas reais nem uma sessão Google
interativa de ponta a ponta em outro computador.

Resultado final em 2026-10-04: **508 testes do aplicativo em 62 arquivos** e
**14 testes de integração Firebase** aprovados. O lint terminou sem erros,
com 86 avisos já existentes. As recompensas novas não acrescentam avisos.
O build de produção do Next concluiu a verificação de tipos e a exportação;
o Tauri gerou o instalador NSIS Windows x64 com sucesso.

A interface exportada foi inspecionada também em 1120×800, tamanho inicial
do desktop, sem exceções JavaScript não tratadas ou falhas de hidratação.
O modo claro salvo é aplicado ao reabrir, incluindo o Bosque. No navegador,
o banco da rotina registra a ausência esperada da API nativa Tauri; a
verificação de SQLite real foi feita pelos testes de persistência. Não foi
realizada uma sessão interativa do executável nativo nesta verificação.

Instalador local: `src-tauri/target/release/bundle/nsis/Flow_5.0.0_x64-setup.exe`.
SHA256: `F58E37D98D045925C8E6C4C9F1324B22E6C20309A1B52F283CEF0C7742F9A07B`.
A versão continua 5.0.0; esta etapa não publica uma nova release no GitHub.
