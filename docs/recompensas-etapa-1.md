# Refúgio Flow — etapa 1: definição e protótipo

Status: decisões v1 e protótipo navegável preparados para revisão. A economia
real, a persistência e a validação no servidor pertencem à etapa 2. Não há
recompensas novas ativadas nas tarefas reais, nem alterações/deploy no Firebase.

## Entregas e como revisar

- [Protótipo portátil](../design/prototypes/refugio/index.html): abrir no navegador.
  A pasta inteira pode ser copiada; não depende de instalação ou login.
- [Contrato visual](../DESIGN.md): composição, tokens, responsividade e estados.
- [Regras v1 estruturadas](../design/rewards-rules.v1.json): valores para revisão,
  sem importação pelo aplicativo de produção.
- [Simulação da economia](../design/simular-economia.mjs): executar
  `node design/simular-economia.mjs` na raiz de `flow-app`.
- Skill [ui-taste](../design/ui-taste/SKILL.md): cópia pública da Uizze, com licença
  e referências. A preferência foi registrada nas orientações do projeto.

Roteiro principal: concluir «Ler um capítulo», esperar os cinco segundos de
confirmação, abrir Catálogo, desbloquear Sálvia por 15 moedas e equipá-la. O
ganho da primeira tarefa explica a primeira compra, sem tutorial externo.

O seletor no topo permite revisar primeiro uso, usuário atual, offline,
falha e carregamento. O saldo é fictício e volta ao início ao recarregar.
«Avançar um dia» e «Simular conclusão de foco» são ferramentas da revisão,
não propostas de botões para o produto final.

## Escopo e decisões de produto

Refúgio reúne progresso, personalização, companheiro e coleções. A rotina e
o Pomodoro continuam sendo a finalidade principal. Recompensas são opcionais,
gratuitas e pessoais; sem ranking, venda de moedas, vantagens pagas, troca
entre contas ou bônus de indicação na primeira versão.

Uma capivara é o companheiro inicial sugerido, com nome «Brisa» na prévia.
A ilustração vetorial original demonstra a direção 2D, sem ser a arte final
animada. Nome e personalização real do pet chegam na etapa 3. A pesca fica
anunciada como indisponível na prévia e chega na etapa 4.

## Economia v1

XP é cumulativo e permanente. Moedas financiam somente cosméticos; bilhetes
habilitam pesca e não expiram. Não há multiplicadores de ganho por item.

| Ação                                      |  XP | Moedas | Bilhetes | Limite            |
| ----------------------------------------- | --: | -----: | -------: | ----------------- |
| Concluir uma ocorrência de tarefa         |  50 |      5 |        0 | 5 ocorrências/dia |
| Primeira tarefa elegível do dia           | +25 |    +10 |       +1 | Uma vez/dia       |
| Meta de 1 tarefa                          | +15 |     +5 |       +1 | Uma meta/dia      |
| Meta de 2 tarefas                         | +30 |     +7 |       +1 | Uma meta/dia      |
| Meta padrão de 3 tarefas                  | +50 |    +10 |       +1 | Uma meta/dia      |
| Sessão concluída com ≥25 minutos efetivos |  20 |      2 |        0 | 3 sessões/dia     |
| 4 dias ativos na semana                   | 100 |     20 |        0 | Uma vez/semana    |

Teto: **50 moedas por dia** para ganhos diários. O bônus semanal não consome
esse teto. Uma semana é segunda–domingo no fuso registrado. Um dia ativo
requer ao menos uma ocorrência de tarefa elegível concluída. Foco sem tarefa
gera sua recompensa própria, mas não o bônus de primeira tarefa.

A meta inicial é 3; alterações de meta e de dias planejados só valem no próximo
período diário. Não é possível cumprir metas 1, 2 e 3 no mesmo dia. Descanso
planejado não quebra a sequência de dias de rotina; a ausência não remove
saldo, XP, inventário ou conquistas. A conquista semanal exige quatro dias
ativos efetivos e não exige dias consecutivos.

### Conferência do balanceamento

| Meta | Tarefas | Focos ≥25 min |  XP | Moedas | Bilhetes |
| ---: | ------: | ------------: | --: | -----: | -------: |
|    3 |       0 |             0 |   0 |      0 |        0 |
|    3 |       1 |             0 |  75 |     15 |        1 |
|    1 |       1 |             0 |  90 |     20 |        2 |
|    2 |       2 |             0 | 155 |     27 |        2 |
|    3 |       3 |             0 | 225 |     35 |        2 |
|    3 |       3 |             1 | 245 |     37 |        2 |
|    3 |       5 |             3 | 385 |     50 |        2 |
|    3 |      12 |             8 | 385 |     50 |        2 |

14 dias corridos com 10 dias ativos seg–sex, três tarefas e um foco/dia:
**2.650 XP, 410 moedas e 20 bilhetes**, incluindo dois bônus semanais, sem gastos.
É simulação, não expectativa garantida de comportamento ou retenção.

Catálogo inicial da etapa 2: Sálvia (cor, 15), Bosque (tema, 80) e Horizonte
(moldura, 120). Sem gastos anteriores e no ritmo de 37 moedas/dia ativo,
desbloqueiam respectivamente em 1, 3 e 4 dias ativos. Preços das expansões:
acessório 90, decoração 150, segundo pet 300, tema especial 600. Um pet inicial
será gratuito. Tema claro/escuro e acessibilidade nunca são desbloqueios pagos
nem exigem moedas.

### Curva de níveis

Manter os primeiros marcos existentes: nível 1 em 0 XP, 2 em 250, 3 em 600,
4 em 1.200, 5 em 2.500. Para níveis `n >= 6`, XP mínimo:
`2500 + 750 × (n − 5) + 250 × (n − 5)²`.

Exemplos: nível 6 em 3.500, 7 em 5.000, 8 em 7.000, 9 em 9.500 e 10 em
12.500. A versão de regra será gravada nos recibos. Revisões futuras não
retiram nível já atingido, XP ou itens.

### Pesca: parâmetros para a etapa 4

Uma captura custa um bilhete e sempre entrega peixe. Primeiro lago: oito
espécies, sendo quatro comuns, duas incomuns, uma rara e uma lendária.
Probabilidades iniciais por raridade: 55%, 30%, 12%, 3%; distribuição uniforme
entre espécies da mesma raridade. A interface mostrará as chances por espécie.

Depois de cinco capturas seguidas sem novidade, a próxima escolhe entre as
espécies ainda ausentes do lago, com os mesmos pesos relativos renormalizados.
Quando o lago está completo, a garantia não se aplica. Repetidos não geram
moedas; registram coleção/maestria. Arte, minigame e calibração estatística
específica não são implementados nesta etapa.

## Elegibilidade e integridade

- Concluir uma tarefa inicia uma janela de cinco segundos para desfazer.
  Encerrada a janela, registrar a intenção e seu ID permanente. Desmarcar
  depois não remove o recibo nem gera nova recompensa ao concluir novamente.
- Cada ocorrência recorrente tem ID próprio, estável entre edições e
  dispositivos. Não usar apenas título, horário editável ou chave de clique.
- Abrir o app, iniciar tarefa, iniciar/pausar Pomodoro, criar subtarefa,
  alterar duração ou marcar atividade de data antiga não concede moedas.
- Uma sessão de foco tem ID único e duração efetiva registrada ao terminar;
  pausas não contam. Interromper e retomar preserva o ID. Marcar a tarefa
  associada é uma ação independente; não creditar tarefa pela abertura do foco.
- Excluir tarefa, trocar modelo, importar backup ou reinstalar não apaga
  recibos nem redefine os limites da conta.
- Bônus de meta, primeira tarefa e semana têm chaves próprias de crédito único,
  além do ID da atividade que os desencadeou.
- Compra confirma débito e entrega numa transação. Item já adquirido retorna
  o resultado anterior sem outro débito. Saldo insuficiente não muda nada.
- Pesca confirma bilhete e resultado numa transação. Reenvio retorna o mesmo
  peixe; nunca faz novo sorteio ou novo débito.

O usuário declara a conclusão. Controles não comprovam estudo/exercício no
mundo real. Autorização, validação de payload, limites e crédito único são os
controles apropriados para uma economia pessoal de cosméticos.

## Datas, offline e conta

O servidor mantém fuso IANA da conta, período diário e próximo instante de
virada. Mudança de fuso vale após encerrar o período vigente e não reabre bônus.
Usar a mesma chave de ocorrência da rotina em interface, SQLite e servidor.
Tarefas que atravessam meia-noite pertencem à ocorrência original e podem ser
concluídas até o fim planejado mais duas horas, sem receber outra recompensa
pela nova data. Correções fora da janela continuam válidas como estatística.

Offline: gravar tarefas normalmente e intenções numa fila SQLite. Mostrar
XP/moedas **pendentes**, fora do saldo disponível para compras. Ganhos offline
podem ser apresentados até sete dias depois, avaliados pelas mesmas regras e
períodos da ocorrência; não somar todo o lote no dia da reconexão. Depois do
prazo, registrar a atividade como estatística, explicar a inelegibilidade e
preservar a tarefa. Esse limite será reavaliado no teste com usuários offline.

Reenvio usa o mesmo ID; erros transitórios mantêm a fila. Rejeições definitivas
têm motivo legível e não alteram a conclusão. Nenhuma tentativa de sincronização
apaga dados. Itens confirmados podem ser equipados offline. Compras e pesca
exigem conexão na versão inicial.

Sem conta: XP e os três cosméticos iniciais funcionam localmente. A futura pesca
e o inventário sincronizado usam conta gratuita. Ao conectar conta:

- Conta nova: importar uma única vez o piso de XP e os cosméticos locais do
  catálogo inicial. Zerar a carteira local na transição; não conceder a nova
  carteira a partir do saldo arbitrário do dispositivo. Explicar isso antes
  da confirmação e manter uma cópia local para recuperação.
- Conta com recompensas existentes: preservar carteira confirmada; incorporar
  por união apenas cosméticos iniciais locais elegíveis e usar o maior piso
  de XP, sem somar históricos de dois dispositivos.
- Para todos: bilhetes locais não são importados. Sessões/ocorrências duplicadas
  continuam únicas. Troca de conta isola fila, recibos e inventário por dono;
  não remete eventos da conta A para B.

## Migração de usuários atuais

1. Antes de mudar a leitura de XP, guardar snapshot de tarefas, logs, perfil,
   estatísticas, conquistas e versão. Fazer isso no SQLite sem apagar tabelas.
2. Capturar o XP atual e o nível exibido. Piso de XP = maior entre XP calculado
   e mínimo necessário ao nível já exibido; manter nível mínimo histórico.
3. Preservar conquistas desbloqueadas. Quando a data histórica for desconhecida,
   indicar «preservada na migração», sem inventar uma data de obtenção.
4. Criar recibo `migration:v1:{ownerId}` uma vez. A migração de uma conta antiga
   sem carteira concede **15 moedas**; não há conversão retroativa nem bilhetes.
   Uma conta já migrada não recebe outro presente.
5. Conferir snapshot vs. novo estado, registrar versão concluída e só então
   apontar a interface para a nova progressão. Falha mantém a leitura anterior.
6. Importar backup antigo depois da migração não reabre o recibo. Moedas e itens
   confirmados não são sobrescritos por snapshots antigos do perfil.

Nome, foto, bio, preferências e dados das rotinas não participam de cálculos de
saldo. A prévia «Usuário atual» demonstra 1.800 XP/nível 4 e presente de 15 moedas.

## Contrato técnico para a etapa 2

Tipos previstos:

| Registro            | Campos principais                                                                            | Autoridade                                |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `RewardEvent`       | id, ownerId, occurrenceId/sessionId, kind, occurredAt, dayKey, deviceId, ruleVersion, status | Cliente envia intenção; servidor avalia   |
| `RewardReceipt`     | eventId, grantedXp/coins/tickets, bonusKeys, processedAt, ruleVersion, rejectionReason       | Servidor confirma                         |
| `Wallet`            | ownerId, xpTotal, levelFloor, coins, tickets, revision, nextResetAt                          | Servidor para conta; local para convidado |
| `DailyProgress`     | ownerId, dayKey, eligibleTasks, focusSessions, dailyCoins, goalSnapshot, bonusKeys           | Servidor                                  |
| `InventoryItem`     | ownerId, catalogId, acquiredAt, sourceReceiptId                                              | Servidor; equipamento local sincronizável |
| `AchievementUnlock` | ownerId, achievementId, unlockedAt ou preservedAt, receiptId                                 | Permanente                                |
| `RewardsMigration`  | ownerId, version, xpFloor, levelFloor, importedItemIds, completedAt                          | Uma vez por dono                          |

Backend proposto: endpoints autenticados para `submitRewardEvents`,
`purchaseCosmetic` e `migrateRewards`; `catchFish` somente na etapa 4. O
servidor ignora ganhos/saldo enviados pelo cliente, consulta catálogo/regras e
aplica limites em transações. Recibos, inventário e saldo confirmado são
somente leitura para o cliente. Regras genéricas de subcoleções deverão ser
alteradas; uma negação específica não vence uma permissão genérica no Firestore.

SQLite: tabelas novas para intenções/outbox, recibos, carteira cache, inventário
e migração. Integrar eventos em `taskSlice` e `pomodoroSlice`; usar serviço de
sincronização de recompensas separado do merge atual de snapshots. A identidade
de ocorrência será a primeira dependência a implementar.

Cloud Functions é a opção candidata para validação, mas não foi provisionada.
Antes da implementação em produção, confirmar requisitos de faturamento e
escolher a infraestrutura com custo conhecido. Desenvolvimento e verificações
usam emuladores; não ativar cobranças automaticamente nesta etapa.

## Critérios de revisão e próxima entrega

A revisão local deve percorrer ganho, desfazer, desmarcar/refazer, compra,
equipagem, catálogo sem saldo, pendências offline e reconexão, falha/recuperação,
carregamento, migração única, preferências e os temas claro/escuro.

Uma avaliação curta com pessoas reais deve verificar, sem orientação: «como
ganhar a primeira personalização», «diferença entre XP e moedas», «o que ocorre
ao faltar um dia» e «qual é o próximo objetivo». Essa compreensão não pode
ser declarada validada apenas por testes automatizados.

A etapa 2 entrega progresso real e persistente, catálogo inicial e sincronização.
Não inclui pet animado ou pesca. Seus testes precisam cobrir duas contas,
dois dispositivos, exclusão/importação, virada de dia e fuso, limite diário,
migração repetida e compras concorrentes. Nenhuma recompensa será publicada
como validada pelo servidor antes desses controles funcionarem.
