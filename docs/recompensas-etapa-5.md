# Etapa 5 — piloto, equilíbrio e qualidade

Trabalho técnico executado em 2026-10-05. O piloto com pessoas e a validação
interativa com conta Google real ainda precisam acontecer antes de considerar
esta etapa concluída. Não houve publicação de instalador ou release.

## Recuperação de progresso local

A auditoria encontrou um risco de perda para convidados: o backup diário antigo
copiava apenas `flow.db`, enquanto bilhetes, peixes, recibos e preferências ficam
em `flow-rewards.db`. Copiar um SQLite aberto também podia omitir transações em WAL.

O comando nativo agora cria uma pasta `.flowbackup` com cópias consistentes dos
dois bancos por `VACUUM INTO`, verifica cada cópia com `PRAGMA quick_check` e só
publica a pasta depois de ambas estarem prontas. Se o Refúgio ainda não terminou
de iniciar, o backup falha e pode ser tentado novamente; não anuncia uma cópia
incompleta como sucesso. Uma segunda execução com o mesmo nome recebe sufixo,
preservando a primeira. Backups `.db` antigos continuam listados, marcados
“Somente rotina”. O navegador não simula mais um backup SQLite bem-sucedido.

O teste Rust cria os dois bancos em WAL, mantém as conexões abertas durante a
cópia, recupera uma tarefa e um peixe em uma pasta isolada e verifica a
serialização que a interface recebe. A cópia dos dois bancos é sequencial, não
uma transação única entre arquivos; ainda será preciso exercitar um backup e
restauração manual no desktop com o app fechado antes de divulgar.

Para guardar progresso do convidado, preserve a pasta `.flowbackup` inteira.
O JSON/CSV da aba Exportar Dados contém a rotina, mas não substitui o backup dos
peixes. A recuperação manual dos bancos exige fechar o Flow e conservar cópia
dos bancos atuais antes de colocar `flow.db` e `flow-rewards.db` da mesma pasta
de backup no diretório de dados do aplicativo. O app ainda não oferece um botão
de restauração dos bancos.

## Equilíbrio observado em simulação

O [relatório reproduzível](../design/fishing-balance-stage5.json) simulou 2.000
coleções, com semente fixa e até 300 capturas normais por coleção. A primeira
captura rara ou melhor ocorreu na mediana após 5 pescas e, no máximo, após 10.
A primeira lendária ocorreu na mediana após 20 e, no máximo, após 30. As dez
espécies sorteáveis foram descobertas na mediana após 30 pescas, percentil 90
após 37; todas as simulações completaram a coleção até 80. Esses resultados
atestam as garantias e descrevem o ritmo matemático, não satisfação ou retenção.
**Nenhuma chance foi alterada sem observar o piloto.** Capturas já confirmadas
mantêm sua espécie e `rulesVersion`.

## Roteiro do piloto voluntário

Convidar aproximadamente 5–10 pessoas por uma semana. Identificar respostas
apenas por código escolhido para o estudo; não coletar título de tarefa, e-mail,
senha ou conteúdo pessoal. Sem telemetria automática. Observar ou pedir relato
voluntário nos momentos abaixo:

1. **Primeiro uso:** criar uma tarefa, concluí-la, encontrar o bilhete, receber o
   douradinho e fazer uma pesca normal. Registrar onde a pessoa precisou de ajuda.
2. **Personalização:** identificar a raridade, escolher um peixe favorito,
   reposicionar um peixe e explicar o que uma captura repetida acrescentou.
3. **Retorno:** depois de alguns dias, verificar se voltou a cumprir tarefas,
   pescou novamente e encontrou coleção, saldo e aquário ao reabrir.
4. **Recuperação:** em instalação de teste, fechar/reabrir e atualizar sem perder
   progresso; conferir separadamente convidado e conta Google com a pessoa no
   controle da própria autenticação.

Perguntas curtas ao fim: “De onde veio o bilhete?”, “O que você espera ganhar
com um repetido?”, “A garantia de peixe raro ficou clara?”, “A pesca ajudou a
voltar à rotina ou desviou sua atenção?”, “O que faria você usar o Flow amanhã?”.
Registrar clareza de 1 a 5 e exemplos concretos de dificuldade, sem supor
significância estatística com uma amostra tão pequena. Comparar tarefas
concluídas e retorno com tempo de pesca; mais tempo no minigame não é sucesso
por si só. Reavaliar chances, preço e explicações somente após esses relatos.

## Verificação técnica e pendências

- Aplicativo: 69 arquivos e 556 testes passaram após a mudança no backup.
  Cinco testes Rust passaram, incluindo duas provas novas de backup. Build Next
  e build Tauri de release sem instalador passaram. Lint sem erros, com avisos
  antigos.
- Firebase Auth/Firestore no emulador: 29 testes passaram, incluindo concorrência,
  reenvio, isolamento e posições válidas/inválidas.
- Interface do backup: [capturas e limites](../design/verification/rewards-stage5-backup/README.md)
  em escuro 1120 px, claro 1024 px e contêiner de 390 px. Os testes de interface
  exercitam a criação e o estado de erro.
- Executável Tauri: compilado; a tentativa de inspeção interativa em perfil
  isolado não produziu uma página WebView2 utilizável neste ambiente. O percurso
  instalado, reinício, atualização e login Google real continuam pendentes.
- Produção: depois de autorização explícita, a extensão opcional `positions` foi
  publicada em `flow-rainan-prod` pelo MCP Firebase, job `1791232789279` com
  estado `success`. A leitura das regras ativas confirmou o campo e sua validação.
  O comportamento entre dispositivos ainda depende de um teste com contas reais.

Critério para avançar à etapa 6: piloto registrado, nenhum caso conhecido de
perda de progresso sem correção, percurso nativo e conta real confirmados, além
da decisão de balanceamento baseada nos relatos e na simulação. Esta etapa não
altera a versão pública por si só.
