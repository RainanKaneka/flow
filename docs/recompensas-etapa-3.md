# Etapa 3 — primeira pesca, aquário e companheiro

Implementação em 2026-10-05. A pesca local está pronta. A integração de contas
foi verificada em emuladores. **As regras foram publicadas em `flow-rainan-prod`
em 2026-10-05**, junto à etapa 4, após autorização explícita do usuário que
resolveu o bloqueio anterior da revisão automática. A versão ativa foi conferida
pelo MCP. Não foi criada release, alterada a versão 5.0.0 ou ativado faturamento.
Detalhes no [registro de publicação](firebase-etapas-3-4-publicacao.md).

## Experiência entregue

O Refúgio abre em **Meu aquário**. O usuário recebe um douradinho numa captura
gratuita única, sem gastar bilhetes ou alterar garantias. Depois pode usar um
bilhete por captura normal: sempre recebe um peixe, novo ou repetido.

A coleção tem onze espécies, incluindo dez no sorteio normal. Permite filtrar
raridade e consultar quantidade e primeira descoberta. O aquário exibe até
cinco espécies descobertas, com apelidos por espécie de até 40 caracteres.
O favorito aparece como companheiro no perfil; usá-lo como avatar é uma escolha
explícita, confirmada em Salvar Alterações. O botão do perfil abre diretamente
Meu aquário.

XP, moedas, metas e ganhos de bilhetes da etapa 2 foram preservados. Duplicados
aumentam a quantidade da espécie, sem conceder dinheiro, moedas ou bilhetes.
Maestria, decorações e minigame de fisgada ficam para a etapa 4.

## Arte e interface

Aplicadas [ui-taste](../design/ui-taste/SKILL.md) e as decisões de [DESIGN.md](../DESIGN.md).
Os conceitos aprovados orientaram a geração por `image_gen`: onze PNGs RGBA
de 96×96 e dois ambientes de 480×288. Douradinho e acará-bandeira foram
inspecionados no tamanho de uso antes da produção das demais espécies.

[Manifesto e prompts](../design/fish-assets-v1.json),
[prova dos onze sprites](../design/fish-sprites-size-check.png) e
[capturas de revisão](../design/verification/fishing-stage3/README.md).
O script [export-fish-assets.mjs](../scripts/export-fish-assets.mjs) exporta
dimensões por vizinho mais próximo, preservando transparência. Os caminhos
dos originais no manifesto pertencem a esta máquina; os PNGs finais ficam
versionáveis em `public/rewards/` e não dependem desses originais para executar.

Controles e tipografia mantêm a identidade do Flow. Pixel art é aplicada aos
peixes e cenários. Movimento pode ser desligado e pausa durante Pomodoro ou
preferência de movimento reduzido; não há áudio automático. A interface tem
rótulos, foco visível, identificação de raridade por texto e símbolo e foco no
título ao revelar uma captura.

## Regras de pesca v1

| Raridade | Chance base | Espécies |
| --- | ---: | --- |
| Comum | 55% | Carpa Koi, Tetra Néon, Peixe-palhaço, Bagre Mel |
| Incomum | 30% | Guppy Aurora, Acará-bandeira, Baiacu Limão |
| Raro | 12% | Betta Azul, Peixe-mandarim |
| Lendário | 3% | Disco Rubi |

Primeiro sorteia-se a categoria; dentro dela as espécies têm pesos iguais.
Douradinho pertence à apresentação gratuita e fica fora do sorteio normal.

- Raro ou melhor até a décima captura seguida abaixo de raro. Na garantia,
  o resultado é raro em 80% ou lendário em 20%.
- Lendário até a trigésima captura sem lendário; tem prioridade sobre a outra
  garantia e reinicia os dois contadores.
- Após três repetidos numa categoria, a próxima captura dessa categoria escolhe
  uma espécie faltante, quando houver. A raridade não é promovida.
- Somente capturas normais confirmadas alteram contadores. Pausas, tutorial,
  falhas, importações e reenvios não avançam nem reiniciam garantias.

Simulação determinística com semente 20261005, 2.000 coleções e limite de
300 capturas por coleção, usando a mesma função de confirmação do aplicativo:

| Marco | Mediana de capturas | Percentil 90 | Maior espera observada |
| --- | ---: | ---: | ---: |
| Primeiro raro ou melhor | 5 | 10 | 10 |
| Primeiro lendário | 20 | 30 | 30 |
| Dez espécies sorteáveis | 30 | 37 | 80 |

Todas as 2.000 coleções foram completadas. Isso mede ritmo em capturas, não em
dias corridos, e não substitui o piloto com pessoas. A simulação encerra cada
jogador ao completar a coleção; suas contagens agregadas por raridade não são
uma estimativa da distribuição de longo prazo.

## Persistência e sincronização

Cada intenção recebe ID estável e dois valores aleatórios, persistidos antes
de enviar a captura. O recibo, desconto de bilhete, inventário e contadores são
confirmados juntos: um upsert SQLite no desktop, ou uma transação Firestore na
conta. A revelação é salva antes de aparecer e pode ser retomada após fechar.
Reenvio reutiliza a mesma operação; cliques simultâneos compartilham a tentativa.
Respostas de sessões antigas não atualizam a conta atual.

A migração acrescenta pesca às carteiras antigas após backup, preservando
saldos e cosméticos. Dados inválidos são recusados sem apagar o payload.
Convidados jogam localmente sem conexão. Contas precisam de conexão e saldo
confirmado para novas capturas; itens existentes continuam disponíveis offline.
Preferências locais pendentes são preservadas para sincronização posterior.

A importação de peixes é independente da importação de XP: tem revisão e
confirmação, ocorre uma vez por conta e registra origem. Usa o maior contador
por espécie e a primeira data válida, preserva garantias e moedas da conta,
e mantém suas preferências existentes. Não soma saldos nem repete importações.

Documentos privados abaixo de `users/{uid}`: `fishingProgress/main`,
`aquariumPreferences/main`, `fishCaptures/{id}` e `fishImports/guest_v1`.
As regras exigem propriedade, catálogo conhecido, recibos imutáveis, desconto
atômico de um bilhete e transições válidas. A lógica anterior de perfil,
sincronização e economia permanece semanticamente igual à produção.

**Limite de confiança:** sorteio executado no cliente para coleção pessoal,
gratuita, sem trocas ou ranking. As regras não provam que um cliente adulterado
respeitou as probabilidades. A importação também confia na origem local uma
vez, com valores limitados. Sorteio autoritativo exige outra decisão de backend.

## Verificação e limites

- Suíte completa: 66 arquivos e 535 testes, com quatro workers.
- Firebase Auth/Firestore emulados: 23 testes, incluindo concorrência no último
  bilhete, reenvio, isolamento de contas, garantias, importação e escritas hostis.
- SQLite real nos testes de armazenamento, com ponte do plugin substituída:
  erro forçado de escrita preserva bilhete e inventário juntos.
- `npm run build`: compilação, checagem de tipos da aplicação e exportação Next.
- `npm run lint`: zero erros; 86 avisos preexistentes.
- Validação de regras pelo MCP Firebase: sem erros, dois avisos preexistentes.

Comandos: `npm test -- --maxWorkers=4`, `npm run lint`, `npm run build`.
Para integração, iniciar Auth/Firestore com projeto `demo-flow-rewards` e
executar `npm run test:rewards:firebase`; os testes não gravam em produção.
Para gerar o relatório de simulação em PowerShell:

```powershell
$env:FLOW_FISHING_REPORT='build/fishing-balance.json'
npx.cmd vitest run src/services/rewards/__tests__/fishingBalance.test.ts
```

A inspeção visual usou renderização local dos componentes reais com dados
ilustrativos, sem navegador interativo disponível. Os testes de interface
exercitam as ações reais do modo convidado. **Não foi percorrido o executável
Tauri nem o login Google real nesta etapa**. A checagem TypeScript isolada de
todo o repositório ainda encontra fixtures de testes antigas incompatíveis;
a checagem da aplicação no build passou.

Antes do lançamento: conferir o ciclo com conta real no desktop, reinício,
atualização e restauração. As regras já foram publicadas. A etapa 5 cobre
piloto, desempenho e ajustes de equilíbrio. Este registro documenta a etapa 3;
a entrega seguinte está em [recompensas-etapa-4.md](recompensas-etapa-4.md).
