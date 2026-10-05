# Etapa 4 — minigame, maestria e personalização

Implementada em 2026-10-05. A etapa funciona no código e no modo convidado;
as regras das etapas 3 e 4 foram publicadas no Firebase de produção em 2026-10-05,
após autorização explícita do usuário e conferência da versão ativa pelo MCP.
O próximo trabalho do roadmap é a etapa 5, quando solicitado pelo usuário.

## Pesca curta e interrompível

No modo interativo, o usuário lança a linha, aguarda 22 segundos e confirma
a fisgada quando quiser. O peixe não escapa por demora de reação. Pausar,
trocar de área ou esconder a janela guarda a tentativa; voltar permite retomar
o tempo restante ou revelar diretamente. Iniciar um Pomodoro pausa a pesca.

O modo simplificado revela diretamente. Também é possível escolher Revelar
agora durante uma espera. Os dois modos usam a mesma intenção persistida,
sorteio e garantias da etapa 3. Mudar de modo ou reabrir o aplicativo não cria
outra tentativa. O bilhete é descontado somente na confirmação bem-sucedida;
o douradinho inicial continua gratuito e único.

Som é opcional e começa desligado. A boia usa animação CSS discreta. Após o
refinamento do aquário, os peixes nadam continuamente, variam rota e viram nas
bordas. Movimento reduzido, preferência estática e foco ativo pausam o nado.
Os sprites permanecem estáticos: não há sequências de quadros de nadadeiras.
Arrastar ou usar setas reposiciona um peixe e salva sua posição por espécie;
o botão não mostra fundo ao passar o mouse. O deslocamento é arredondado para
pixels inteiros, preservando a nitidez da pixel art.
Controles são elementos reais, com teclado, foco visível e mensagens de estado.

## Maestria e coleção

Duplicados contam para a maestria de cada espécie, sem produzir moedas,
XP, bilhetes ou aumento de chance de captura.

| Quantidade da espécie | Desbloqueio |
| ---: | --- |
| 3 | Placa de bronze com nome ou apelido. |
| 5 | Placa de prata e opção de nado especial. |
| 10 | Placa de ouro. |

As placas podem ser ocultadas. O nado especial precisa ser equipado e continua
dependendo da preferência de movimento. A maestria acompanha os dez peixes do
sorteio normal. O douradinho inicial tem captura única e sua ficha explica sua
contribuição aos marcos da coleção, sem apresentar uma meta de duplicados
impossível. O catálogo técnico aceita 33 IDs de maestria (incluindo douradinho,
reservados para eventual expansão) e três marcos de descoberta; cada marco é
concedido uma vez. O progresso existente também é reconhecido.

| Espécies descobertas | Recompensa |
| ---: | --- |
| 1 | Título Primeira maré. |
| 5 | Título Explorador das águas. |
| 11 | Título Guardião do lago e moldura da coleção completa. |

O título escolhido aparece no aquário e na vitrine do companheiro no perfil.
A moldura equipa o aquário e essa vitrine. O objetivo pessoal e o avatar do
usuário continuam sendo escolhas independentes.

## Catálogo do aquário

A aba Aparências começa pela prévia do aquário e seus controles. As aparências
da etapa 2 continuam abaixo. Uma compra pede confirmação, concede propriedade
permanente e permite equipar ou retirar o item depois.

| Item | Preço em moedas |
| --- | ---: |
| Lanterna de âmbar | 40 |
| Arco de musgo | 60 |
| Jardim de nenúfares | 80 |
| Águas do entardecer | 100 |
| Jardim sob a lua | 120 |
| Moldura de marés | 60 |

Até três decorações ocupam posições fixas na cena; um fundo e uma moldura podem
ser equipados. A economia diária permanece igual. Não há dinheiro real,
monetização, item temporário ou vantagem de produtividade.

Cinco novas artes foram geradas com a ferramenta integrada de imagem, usando
o aquário existente como referência: três sprites transparentes de 96×96 e dois
fundos de 480×288. Prompts, origem e exportação estão em
[aquatic-assets-v1.json](../design/aquatic-assets-v1.json). A moldura é CSS;
texto e controles não fazem parte das imagens. Não foi necessário instalar
Blender, editor de sprites ou outra dependência para esta etapa.

## Persistência e nuvem

O snapshot de recompensas guarda intenção, pausa, inventário, preferências e
operações pendentes. No desktop, o upsert SQLite mantém saldo e propriedade
juntos; em contas sincronizadas, a compra é uma transação Firestore com recibo
imutável e ID estável por item. Reenvios reconhecem a propriedade existente.
Uma resposta perdida pode ser retomada mesmo que o saldo já tenha diminuído.
Respostas de outra sessão não atualizam a conta ativa.

Os novos documentos privados em `users/{uid}` são:

- `aquaticInventory/main`: itens possuídos e IDs dos marcos concedidos.
- `aquaticStyle/main`: preferências de apresentação e modo de pesca.
- `aquaticMilestones/{id}`: confirmação imutável de cada marco.
- `aquaticImports/guest_v1`: importação única das decorações do convidado.

As regras validam dono, catálogo, preço exato, saldo, revisão, compra atômica,
quantidade necessária para cada marco e propriedade antes de equipar. Marcos
não alteram a carteira. Importar decorações reúne itens uma vez, com confirmação,
sem somar moedas, bilhetes ou marcos locais; a importação de peixes permanece separada.

Contas precisam de conexão e saldo confirmado para comprar. Aquário, itens
adquiridos e preferências continuam disponíveis offline; preferências alteradas
ficam pendentes. A sincronização cosmética tem estado e retomada próprios,
preservando o funcionamento das tarefas se ela falhar. Migrações fazem backup
antes de acrescentar os dados novos e preservam saldos e itens antigos.

O sorteio continua no cliente, para coleção pessoal gratuita. As regras não
comprovam aleatoriedade de um cliente adulterado. Não foram adicionados trocas,
ranking, infraestrutura paga ou serviço de sorteio autoritativo.

## Verificação

- Suíte completa após o refinamento do aquário: 69 arquivos, 554 testes aprovados com quatro workers.
- Firebase Auth/Firestore emulados: 29 testes em três arquivos aprovados.
  Incluem concorrência, preço adulterado, compra sem saldo, marco antecipado,
  recibos imutáveis, importação única e isolamento entre contas.
- Testes de runtime cobrem pausa/reabertura, mesma intenção, compra concorrente,
  falha de escrita local, resposta perdida e troca de conta durante a compra.
- Testes de interface usam ações reais do convidado: espera, confirmação por
  teclado, pausa ao esconder a página, modo simplificado, compra e equipagem.
- `npm run build`: compilação, tipos da aplicação e exportação Next aprovados.
- `npm run lint`: zero erros; 86 avisos preexistentes.
- Regras validadas pelo MCP Firebase: sem erros, dois avisos preexistentes.

Comandos: `npm test -- --maxWorkers=4`, `npm run build`, `npm run lint`.
Para integração, iniciar Auth/Firestore com projeto `demo-flow-rewards` e
executar `npm run test:rewards:firebase`. Os testes não escrevem em produção.

A inspeção visual usou os componentes reais renderizados localmente com dados
ilustrativos, em temas claro e escuro, desktop e contêiner de 390 px. As
[capturas e limites da inspeção](../design/verification/fishing-stage4/README.md)
documentam aquário, pesca, personalização e perfil. Não havia navegador
interativo disponível; o executável Tauri e login Google real ainda precisam
ser percorridos antes do lançamento.

O [refinamento do nado](../design/verification/aquarium-motion/README.md)
registra capturas locais em dois momentos do movimento e em largura estreita.
Posições manuais são um campo opcional nas preferências do aquário, validado
entre 0 e 100 por espécie descoberta; documentos antigos seguem aceitos.

As regras originais das etapas 3 e 4 estão ativas em `flow-rainan-prod`, conforme
o [registro de publicação](firebase-etapas-3-4-publicacao.md). A extensão local
posterior para posições dos peixes ainda não foi publicada; sua sincronização
depende dessa atualização específica das regras.
Instalador, release e teste com pessoas pertencem às próximas etapas.
