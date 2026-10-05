# Plano de implementação e roadmap — pesca e aquário do Flow

Atualizado em 2026-10-05. **Estado: etapas 3 e 4 implementadas, verificadas localmente e com regras publicadas no Firebase de produção após autorização do usuário.** Contas sincronizadas podem persistir pesca, coleção, maestria e personalização usando a versão atual do aplicativo. As etapas 5–7 permanecem planejadas e aguardam instrução do usuário. Registros: [etapa 3](recompensas-etapa-3.md), [etapa 4](recompensas-etapa-4.md) e [publicação das regras](firebase-etapas-3-4-publicacao.md).

Este documento substitui as partes futuras do plano anterior: o companheiro passa a ser um peixe capturado, a capivara sai da expansão e peixes e cenários seguem **2D pixel art**. As etapas 1 e 2 permanecem concluídas. A numeração das etapas seguintes foi reorganizada para acompanhar essa direção.

## 1. Objetivo e base já disponível

O Flow continua sendo um aplicativo para organizar a rotina e manter foco. A coleção aquática dá um motivo agradável para voltar e perceber progresso:

**Concluir tarefas → ganhar bilhetes → pescar → descobrir espécies → montar o aquário → escolher um companheiro → voltar à rotina.**

| Frente | Estado atual |
| --- | --- |
| Etapa 1: definição, protótipo e regras iniciais | Concluída; registro em [recompensas-etapa-1.md](recompensas-etapa-1.md). |
| Etapa 2: economia e persistência | Implementada; XP permanente, moedas, metas, bilhetes, catálogo, SQLite e sincronização. Detalhes em [recompensas-etapa-2.md](recompensas-etapa-2.md). |
| Direção de arte | Pixel art escolhida pelo usuário; dez espécies e duas interfaces em [estudos de design](../design/studies/fish-pixel-art-2026-10-05/README.md). |
| Etapa 3: pesca, raridades, aquário e peixe como pet | Implementados: onze sprites, dois ambientes, captura, garantias, coleção, aquário e favorito. Nuvem verificada em emuladores e regras publicadas em produção. |
| Etapa 4: minigame e personalização | Implementados: espera de 22 s, modo simplificado, pausa, maestria 3/5/10, loja aquática, títulos e marcos. Nuvem verificada em emuladores e regras publicadas em produção. |

Manter a economia já implementada nesta primeira expansão: a primeira tarefa elegível do dia dá um bilhete; atingir a meta em um dia planejado dá outro. Assim, é possível receber **até dois bilhetes por dia**, conforme a rotina, sem elevar os ganhos só para alimentar o minigame. Bilhetes acumulam e não expiram. XP não é gasto; moedas servem para cosméticos.

Toda a experiência permanece gratuita, sem venda de bilhetes, peixes ou moedas. Faltar um dia não remove itens, saldo, nível ou progresso das garantias de captura. As recompensas são opcionais e não substituem o valor de cumprir as atividades.

## 2. Primeira versão jogável

Entregar um lago, um aquário, os dez peixes dos estudos e o douradinho como companheiro inicial: **onze espécies no total**, sendo dez no sorteio normal e uma na apresentação inicial.

- O douradinho é obtido em uma captura guiada gratuita, única por progresso. Ela não gasta bilhetes guardados, não dá moedas ou XP e não altera as garantias do sorteio normal.
- Uma pesca normal custa um bilhete e sempre entrega um peixe. A etapa 4 oferece espera interativa de 22 s e revelação simplificada, com as mesmas chances; o bilhete só é usado na confirmação.
- A coleção registra descoberta, raridade, primeira captura, quantidade e progresso cosmético da espécie.
- O aquário permite escolher até cinco espécies descobertas para exibir inicialmente, dar apelidos e selecionar um peixe favorito.
- O peixe favorito vira o companheiro na vitrine do perfil. Usá-lo como avatar deve ser uma escolha explícita.
- A experiência nunca abre automaticamente durante o Pomodoro; após uma captura há saídas claras para aquário ou rotina.

O primeiro lago é um cenário de jogo, com espécies estilizadas. Não apresentar sua composição como orientação para montar um aquário real.

## 3. Raridades e progressão da coleção

A raridade já existia como proposta no plano inicial. Agora ela tem um papel explícito: criar descobertas frequentes, objetivos de médio prazo e uma captura especial que reconhece a continuidade da rotina.

### Classificação implementada — regras de pesca v1

| Raridade | Chance base da categoria | Espécies no sorteio inicial | Identificação |
| --- | ---: | --- | --- |
| Comum | 55% | Carpa Koi, Tetra Néon, Peixe-palhaço, Bagre Mel | Nome da categoria e detalhe neutro. |
| Incomum | 30% | Guppy Aurora, Acará-bandeira, Baiacu Limão | Nome da categoria e detalhe verde. |
| Raro | 12% | Betta Azul, Peixe-mandarim | Nome da categoria e detalhe azul. |
| Lendário | 3% | Disco Rubi | Nome da categoria e moldura âmbar. |

Sortear primeiro a raridade e depois a espécie entre as disponíveis naquela categoria. Na proposta inicial, as espécies da mesma categoria têm pesos iguais. Portanto, os 12% são a chance de **qualquer raro**, não de cada peixe raro. O douradinho é comum, mas fica fora dessa tabela por pertencer à apresentação inicial.

Com apenas dez peixes sorteáveis, quatro categorias são suficientes. Uma categoria épica pode ser avaliada quando o catálogo crescer, sem aumentar a complexidade da primeira entrega.

A raridade é cosmética: não aumenta XP, moedas, produtividade nem chance de pesca. Peixes comuns também devem ser atraentes. A identificação usa texto e forma além da cor; efeitos de descoberta são breves, com versão sem movimento.

### Garantias implementadas contra azar e repetição

1. **Raro ou melhor em até dez capturas:** depois de nove capturas seguidas abaixo de raro, a décima sorteia entre raro e lendário. Na ausência da garantia lendária, usar os pesos condicionais 12:3, isto é, 80% raro e 20% lendário.
2. **Lendário em até trinta capturas:** depois de 29 capturas seguidas sem lendário, a trigésima é lendária. Encontrar um lendário reinicia esse contador e também o contador de raro ou melhor.
3. **Espécie nova dentro da raridade:** depois de três capturas repetidas de uma categoria sem descobrir uma espécie daquela categoria, a próxima captura dessa mesma raridade escolhe uma das espécies ainda faltantes. Não altera a raridade sorteada. A proteção deixa de atuar quando todas as espécies daquela categoria já foram descobertas.
4. **Prioridade:** garantia lendária → garantia de raro ou melhor → sorteio normal → escolha da espécie e proteção de repetição. Um resultado raro reinicia somente a espera por raro ou melhor; resultados inferiores incrementam os dois contadores aplicáveis.
5. Contar apenas capturas normais confirmadas. Captura guiada, falha, animação, clique repetido, reenvio e importação não avançam nem reiniciam garantias. Contadores persistem entre sessões, dispositivos e pausas na rotina.

As chances da tabela são **chances base**. As garantias mudam a distribuição efetiva; a interface explica ambas, incluindo quantas capturas faltam para a próxima garantia. Na simulação de 2.000 coleções, as medianas foram cinco capturas até raro ou melhor, vinte até lendário e trinta até as dez espécies sorteáveis. Os números e limites estão no [registro da etapa 3](recompensas-etapa-3.md); avaliação com pessoas continua na etapa 5.

Exemplo de ritmo: com dois bilhetes ganhos por dia de meta cumprida, dez capturas correspondem a cinco desses dias; trinta correspondem a quinze. Não são prazos em dias corridos nem uma obrigação de jogar diariamente. Bilhetes guardados podem ser usados depois.

Duplicados contam para quantidade e maestria cosmética da espécie. A etapa 4 implementou marcos de 3, 5 e 10 exemplares: placas de bronze, prata e ouro; cinco exemplares também permitem equipar nado especial. Não transformam duplicados em moedas ou novos bilhetes. Títulos são concedidos com 1, 5 e 11 espécies descobertas; onze também desbloqueiam a moldura da coleção.

## 4. Roadmap de entrega

O roadmap usa marcos de conclusão, sem fixar datas antes de começar. Cada etapa depende da anterior; a expansão de conteúdo só vem depois de avaliar a primeira versão com usuários.

| Etapa | Entrega principal | Dependência e condição para avançar |
| --- | --- | --- |
| **3 — Primeira pesca, aquário e companheiro** | Artes para uso no app, catálogo de onze espécies, captura guiada, um lago, bilhetes, raridades, garantias, coleção, aquário e favorito no perfil. | Reutilizar a etapa 2. O ciclo tarefa → bilhete → captura → aquário → perfil funciona e persiste sem cobrança ou captura duplicadas. |
| **4 — Minigame e personalização** | Interação de pesca de 20–40 segundos, modo simplificado, animações discretas, maestria, decorações, títulos e marcos de coleção. | Mesmas chances nos modos de interação; acessibilidade e movimento reduzido; cosméticos têm valor sem gerar mais moeda ou bilhetes. |
| **5 — Piloto, equilíbrio e qualidade** | Teste com um grupo pequeno, ajuste de chances e garantias, revisão de sincronização, desempenho e experiência real do desktop. | Sem perda de progresso conhecida; retorno com tarefas cumpridas é avaliado; pesca não toma o lugar da rotina. |
| **6 — Lançamento** | Instalador e release, site atualizado, capturas reais, vídeo curto, guia inicial e suporte básico. | Fluxos reais verificados, restauração testada e materiais coerentes com o que foi entregue. Publicar quando o usuário pedir. |
| **7 — Expansão aquática** | Novos ambientes, 20–30 espécies, novas coleções e aparências; compartilhamento opcional posteriormente. | Evidência de interesse, capacidade de produzir arte e manter a base. Reavaliar integridade antes de recursos públicos ou trocas. |

### Etapa 3, dividida para execução

**3A — Preparar arte e catálogo**

Usar os conceitos escolhidos como referência, não como uma interface inteira embutida em imagem. Preparar sprites com fundo transparente, grade coerente, tamanhos lógicos definidos, IDs estáveis, pontos de referência e paleta consistente. Testar duas espécies de silhuetas diferentes no tamanho real antes de produzir as onze.

Organizar versões estáticas e pequenas sequências de nado; cenário inicialmente estático ou com movimento mínimo. Garantir ampliação nítida por pixels. A ferramenta de edição de sprites pode ser escolhida quando essa frente começar; nenhuma instalação é exigida pelo planejamento.

**Saída:** catálogo documentado com nomes, raridades e assets; primeira cena utilizável nos tamanhos reais do Flow. Não é preciso Blender ou um ambiente 3D.

**3B — Persistência, captura e regras**

Adicionar uma configuração de pesca versionada, histórico de captura, inventário por espécie, contadores de garantias e preferências do aquário. Migrar as carteiras existentes preservando XP, moedas, bilhetes e cosméticos. A configuração antiga de [regras v1](../design/rewards-rules.v1.json) é referência histórica da etapa 1; seus oito peixes e pets anteriores não definem esta expansão.

Uma operação de captura tem identificador estável e registra o gasto do bilhete, resultado, inventário e contadores na mesma confirmação. Persistir a intenção antes da animação e reutilizar o resultado confirmado em reenvios. Se a aplicação fechar depois da confirmação, o peixe continua disponível e a revelação pode ser retomada. O sorteio não é repetido por um retry de transação.

**Saída:** capturas, garantias e migrações verificadas em SQLite e emuladores, com isolamento por conta, tratamento de concorrência e saldo insuficiente.

**3C — Interfaces e apresentação inicial**

Implementar as áreas Meu aquário, Pescar, Coleção e Meu progresso dentro do Refúgio, seguindo os conceitos e o sistema existente do Flow. Criar a apresentação do douradinho e a primeira pesca normal, ficha de espécie, apelido, seleção do aquário e favorito no perfil.

Cobrir carregamento, primeira visita, ausência de bilhetes, confirmação pendente, falha, recuperação, nova descoberta, repetido, coleção completa e funcionamento sem conexão. A seleção fica utilizável por teclado, com foco visível e rótulos. Oferecer versão estática, controles de som/movimento e comportamento tranquilo durante foco.

**Saída:** primeira entrega jogável completa. O usuário consegue ganhar um bilhete na rotina, pescar, consultar a captura, montar o aquário, escolher o companheiro e reencontrar tudo após reabrir.

### Etapa 4 — Dar personalidade à coleção

**Implementada localmente:** pesca com lançar linha, esperar 22 segundos e confirmar a fisgada, sem limite de reação. O modo simplificado revela diretamente com as mesmas chances; pausa e retomada preservam a intenção. Som e movimento são opcionais, e o Pomodoro pausa a espera.

Três decorações, dois fundos e uma moldura comprados com moedas; três títulos, moldura de coleção completa e maestria 3/5/10. Aquário e vitrine do companheiro recebem a personalização. Marcos e compras têm confirmação única, persistência local e transações/regras verificadas em emuladores. Nenhum desbloqueio dá vantagem econômica.

**Saída:** minigame curto, acessível e interrompível, personalização persistente e recompensas de marcos concedidas uma vez. Detalhes e limites em [recompensas-etapa-4.md](recompensas-etapa-4.md); regras publicadas, percurso nativo ainda pendente.

### Etapa 5 — Validar e ajustar antes de divulgar

Testar com aproximadamente 5–10 pessoas em uma primeira rodada. Observar compreensão de bilhetes, escolha de favorito, reconhecimento das raridades, satisfação com repetidos e reação às garantias. Comparar retorno com tarefas concluídas e tempo gasto pescando, sem assumir que mais tempo no jogo significa sucesso.

Executar simulações do catálogo e testes de falha/concorrência. Inspecionar desktop em 1120×800, 1024×768 e resolução maior, além de largura estreita de desenvolvimento; temas claro/escuro, teclado e movimento reduzido. Percorrer também o executável Tauri instalado, reinício, atualização e Google com uma conta real.

Coletar feedback voluntário. Qualquer telemetria é mínima e opcional; não incluir títulos de tarefas ou conteúdo pessoal. Registrar a versão das regras de cada captura; mudanças valem para capturas futuras e não retiram espécies ou itens obtidos.

**Saída:** critérios de estabilidade atendidos e decisão de balanceamento baseada em simulações e uso observado.

### Etapa 6 — Preparar o lançamento

Atualizar o site para mostrar organização de rotina, foco, pesca e coleção em pixel art. Retirar referências visuais antigas à capivara das novas áreas, preservar a apresentação gratuita e usar capturas do app funcionando.

Produzir demonstração curta do ciclo completo, notas da versão, instalador para download e instruções de atualização/backup. Definir a próxima versão nesse momento; não assumir agora um número nem publicar uma release de planejamento.

**Saída:** pacote pronto para publicação, material fiel ao app e caminho de recuperação documentado. A publicação aguarda instrução do usuário.

### Etapa 7 — Expandir com base no que funcionou

Adicionar um ambiente por vez, com espécies, cenários e objetivos próprios. Coleções permanecem disponíveis e podem ser retomadas; evitar peixes que desapareçam para sempre por uma ausência. Reavaliar uma categoria épica quando houver espécies suficientes.

Cartões compartilháveis podem mostrar o peixe favorito e um marco escolhido, sem tarefas ou e-mail. Visitas públicas, trocas, rankings e novos minigames ficam fora da primeira versão e dependem de uma decisão posterior.

**Saída:** expansão com conteúdo sustentável e uso observado, mantendo o foco do produto na rotina.

## 5. Decisões técnicas para a etapa 3

A base permanece em React/Zustand, Tauri, SQLite e Firebase. Estender a infraestrutura existente antes de adicionar motor de jogo ou biblioteca de animação. Usar os dados de recompensas separados do snapshot de sincronização da rotina.

| Dados propostos | Responsabilidade |
| --- | --- |
| Catálogo de espécies | ID, nome, raridade, assets, ambiente e disponibilidade por versão. |
| Recibo de captura | ID da operação, proprietário, espécie, versão das regras, custo e confirmação. |
| Coleção por espécie | Quantidade, primeira descoberta, maestria e apelido. |
| Estado de pesca | Contadores de raro/lendário e repetição por categoria. |
| Preferências do aquário | Espécies exibidas, favorito e cosméticos equipados. |

Uma descoberta é da espécie; duplicados ampliam quantidade e maestria. Na primeira entrega, o apelido é por espécie, evitando introduzir criação e cuidado de vários exemplares individuais.

### Conexão, migração e limite de confiança

Convidados podem jogar com progresso local. Em contas sincronizadas, a proposta inicial mantém novas capturas dependentes de conexão e saldo confirmado, como as compras atuais. Aquário e itens já obtidos continuam visíveis sem conexão, e tarefas continuam acumulando recompensas pendentes. As [transações do Firestore falham offline](https://firebase.google.com/docs/firestore/manage-data/transactions); pesca offline entre dispositivos exige um protocolo adicional e não deve ser prometida para essa primeira entrega.

Planejar uma migração de peixes independente da migração de XP já feita: importar descobertas e preferências locais uma vez, usar o maior contador por espécie em vez de somar históricos duplicados e manter os contadores de garantia da conta. Não somar novamente moedas, bilhetes ou recompensas antigas. Explicar a prévia antes de vincular progresso local; a origem local continua registrada.

A etapa 2 foi construída sem faturamento no Firebase. Seu protocolo verifica valores e revisões, mas não inclui um serviço de sorteio. **Persistir um resultado sorteado no cliente não transforma sua aleatoriedade em uma escolha confiável do servidor.**

Na etapa 3B foi escolhida a primeira alternativa abaixo, preservando a infraestrutura sem faturamento. A segunda permanece uma possibilidade futura:

- **Primeira experiência pessoal no modelo atual:** sorteio no aplicativo, resultado persistido uma vez e regras validando catálogo, gasto, inventário e contadores. Protege os fluxos normais de duplicação e perda; não promete impedir um dono do dispositivo de adulterar o sorteio.
- **Sorteio controlado por serviço de backend:** resultado produzido fora do cliente e gravado com a captura. Avaliar infraestrutura e custos antes de habilitar. Publicar Cloud Functions for Firebase exige [plano Blaze](https://firebase.google.com/docs/functions/get-started). Essa ativação não está autorizada por este planejamento.

A versão entregue usa coleção pessoal, sem valor financeiro, troca ou ranking. Se a exigência futura for impedir escolha de raridade por um cliente adulterado, um sorteio controlado por backend vira requisito; as regras atuais não oferecem essa garantia.

## 6. Critérios de qualidade e conclusão

A implementação visual usa [ui-taste](../design/ui-taste/SKILL.md), os playbooks pertinentes e [DESIGN.md](../DESIGN.md). Preservar tipografia, tokens e navegação existentes; pixel art entra nos peixes e ambientes, com arte estática e ampliada de forma nítida. Não trocar toda a identidade do produto.

Verificar os fluxos de maior risco: bilhete gasto uma vez, captura retomada após fechamento, mesma resposta em reenvio, dois dispositivos concorrentes, troca de conta, backup/restauração, migração, garantias acumuladas e coleção persistente. Validar chance base e prioridade das garantias com testes de regra e simulação, não apenas cliques na UI.

Nenhuma etapa está concluída somente porque compila ou se parece com o conceito. Conferir uso real, estado de erro e recuperação. Depois de testes adequados, validar o instalador e os fluxos do desktop.

## 7. Próximo ponto de partida

As regras originais das etapas 3 e 4 foram publicadas em `flow-rainan-prod` após
autorização explícita do usuário. A extensão local posterior que salva posições
dos peixes ainda não está na versão ativa; a revisão automática recusou sua
publicação sem autorização específica. Nenhuma infraestrutura paga foi ativada.
Detalhes no [registro de publicação](firebase-etapas-3-4-publicacao.md).

A [etapa 5](recompensas-etapa-5.md) iniciou a auditoria técnica e corrigiu o
backup local para incluir o Refúgio. O piloto com pessoas, a inspeção interativa
do desktop e a conta real ainda são condições para concluí-la. Não publicar
instalador ou release por consequência automática desta etapa.
