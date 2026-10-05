# Design do Flow

## Direção e processo

Aplicar a [ui-taste](design/ui-taste/SKILL.md) da Uizze em todo trabalho visual,
conforme a preferência do usuário. Para novas áreas do aplicativo, usar
`new-work`, `operate` e `craft`. Refinamentos usam `polish` e `craft`.

O Flow é uma ferramenta pessoal para organizar rotina e manter foco. Sua
interface deve facilitar concluir atividades, entender progresso e voltar à
próxima tarefa. O Refúgio amplia a expressão pessoal sem competir com o foco.

## Sistema existente

- Tipografia: Plus Jakarta Sans para texto; Space Grotesk para números e detalhes,
  com fontes de sistema como fallback. Não adicionar fontes nesta etapa.
- Bases: `--bg-primary`, `--bg-secondary`, `--bg-elevated`, `--bg-hover`.
- Texto: `--text-primary`, `--text-secondary`, `--text-muted`.
- Destaque: índigo `--accent-primary`; verde comunica confirmação; âmbar comunica
  moedas. Cores dos itens são amostras, não novos significados de estado.
- Superfícies: raios de 18–24 px, bordas discretas, elevação apenas para separar
  áreas interativas. Evitar contêineres repetidos para cada pequeno indicador.
- Ícones da aplicação: Lucide, já instalado. No protótipo portátil, SVGs locais
  sem dependências. Ícone acompanha texto em ações importantes.

Estes fatos derivam de `src/app/globals.css` e das interfaces existentes. Não
representam autorização para substituir os tokens globais do aplicativo.

## Direção da expansão aquática — definida em 2026-10-05

O usuário escolheu **2D pixel art** para os peixes e os ambientes de aquário e pesca. Os pets da expansão são os peixes capturados; a capivara pertence ao estudo inicial da etapa 1 e não deve ser ampliada como companheiro futuro.

As referências vigentes estão nos [estudos em pixel art](design/studies/fish-pixel-art-2026-10-05/README.md). A etapa 3 preparou onze sprites transparentes de 96×96 e dois ambientes de 480×288, documentados em [fish-assets-v1.json](design/fish-assets-v1.json). Preservar os controles, texto legível, tipografia e tokens existentes; a escolha de pixel art não substitui a interface inteira.

A composição proposta tem cena aquática predominante, ficha do peixe e coleção; a pesca mostra o lago, o custo em bilhete e uma saída para o aquário ou a rotina. Identificar raridade por texto e forma além da cor. Movimento e som são opcionais; nada abre durante o foco.

O [plano e roadmap atualizados](docs/plano-recompensas.md) definem as etapas seguintes. As etapas 3 e 4 foram implementadas e suas regras publicadas em produção após autorização do usuário; o percurso nativo ainda está pendente. A etapa 5 cobre piloto, equilíbrio e qualidade.

## Contrato visual de pesca e personalização — etapa 4

- Pesca mostra lançar linha, esperar 22 s e confirmar fisgada; a boia comunica
  o estado sem exigir reação rápida. Pausar e voltar à rotina ficam disponíveis.
  Modo simplificado e Revelar agora preservam chances e a tentativa persistida.
- Som começa desligado. Movimento reduzido, preferência estática e Pomodoro
  interrompem animações. O nado contínuo usa atualizações por quadro, limites
  da cena, variação de rota e virada nas bordas; a maestria 5 permite ritmo
  mais vivo. Sprites permanecem estáticos e nítidos, sem rotação ou escala
  fracionária durante o deslocamento.
- Placas ficam abaixo dos peixes: bronze em três exemplares, prata em cinco e
  ouro em dez. A ficha apresenta quantidade, próximo marco e confirmação.
- Aparências começa pelo aquário, seus controles e a loja aquática. Aparências
  antigas permanecem abaixo. Compra tem preço em moedas e confirmação explícita;
  itens adquiridos oferecem equipar/retirar. Recompensas de marco não têm preço.
- Três decorações transparentes de 96×96 e dois fundos de 480×288 preservam a
  direção pixel art; origens e prompts em [aquatic-assets-v1.json](design/aquatic-assets-v1.json).
  Fundos e decorações são arte; placas, formulários e títulos são elementos reais.
- Título e moldura equipados aparecem no aquário e na vitrine do companheiro.
  Nome, objetivo pessoal e escolha explícita de avatar continuam independentes.
- Desktop organiza cena e seleção na coluna principal e ficha à direita;
  abaixo de 750 px a ficha vem depois da cena. Controles de personalização
  se reorganizam sem depender de hover. A prévia da loja não cria alvos inertes
  na navegação por teclado.
- Peixes podem ser arrastados dentro do aquário ou reposicionados pelas setas
  do teclado. Posições salvas por espécie acompanham as preferências locais;
  a sincronização entre dispositivos aguarda a regra de produção específica.
  O botão do peixe não recebe fundo no hover; foco
  pelo teclado continua visível.

Inspeção visual em componentes reais com dados ilustrativos, temas claro/escuro,
1120 e 1024 px, perfil e contêiner de 390 px. As
[capturas da etapa 4](design/verification/fishing-stage4/README.md) e a
[revisão do nado](design/verification/aquarium-motion/README.md) registram
correções e limites. Interações foram testadas automaticamente; o percurso
interativo no executável Tauri e a avaliação com pessoas permanecem para a etapa 5.

## Contrato visual do aquário — etapa 3

- Refúgio abre em Meu aquário, com destinos Pescar, Coleção, Meu progresso,
  Aparências e Como funciona. Navegação e saldos mantêm os tokens do Flow.
- Cena aquática em proporção 5:3; até cinco espécies com botões por peixe.
  Ficha lateral no desktop e abaixo da cena em larguras menores que 750 px.
- Sprites e cenários usam `image-rendering: pixelated`; a arte contém somente
  o ambiente. Textos, ações e formulários são elementos reais da interface.
- Raridades têm nome, símbolo e cor. Espécies não descobertas mostram um ícone
  neutro e não permitem seleção no aquário ou perfil.
- Companheiro aparece no perfil com apelido e raridade. Transformá-lo em avatar
  exige ação explícita e a confirmação habitual em Salvar Alterações.
- Nado desativado por preferência, `prefers-reduced-motion` ou Pomodoro ativo.
  A etapa 4 acrescentou som opcional e fisgada. O refinamento posterior trocou
  os passos CSS por nado contínuo; sprites com quadros próprios de animação
  continuam fora desta entrega.
- Estados de primeira visita, falta de bilhete, captura pendente, revelação salva,
  repetido, coleção completa, conexão e importação têm ações e mensagens claras.
  Revelação leva foco ao título; formulários têm rótulos e controles foco-visível.

Inspeção visual em renderizações locais dos componentes reais, com dados
ilustrativos: desktop 1120×800, 1024×768, temas claro/escuro, perfil e contêiner
estreito de 390 px. As [capturas de revisão](design/verification/fishing-stage3/README.md)
não substituem o percurso interativo no executável Tauri; essa validação ainda
deve acontecer antes do lançamento.

## Contrato visual do Refúgio — etapa 1 (registro histórico)

**Propósito:** o usuário entende como sua rotina gera uma recompensa, escolhe
um item e enxerga o que equipou.

**Composição:** cabeçalho compacto; título à esquerda; cena ilustrada maior
ao lado da rotina do dia; catálogo e perfil como destinos próprios. XP,
moedas e bilhetes têm rótulos distintos. O próximo passo permanece legível.

**Ilustração:** 2D vetorial, formas orgânicas simples, cores de natureza pouco
saturadas, capivara como companheiro inicial. Cena contemplativa sem animação
contínua. A arte desta etapa é um estudo original; não é o sprite final do pet.

**Feedback:** confirmação discreta com ganho discriminado; nada abre
automaticamente durante foco. Erros mantêm os dados e oferecem tentativa
novamente. Não usar cor como única indicação.

**Movimento:** transições de estado de 160–220 ms, em opacidade/transformação;
sem entradas coreografadas, brilho pulsante ou confete obrigatório. Respeitar
`prefers-reduced-motion` e a preferência do usuário.

**Responsividade:** desktop com duas colunas; abaixo de 900 px a rotina vem
antes da cena; abaixo de 600 px navegação e indicadores se reorganizam. Nenhuma
função depende de hover. Cabeçalhos e nomes longos podem quebrar linha.

**Acessibilidade:** texto normal com contraste mínimo 4,5:1, alvo de ação com
44 px quando viável, foco visível, formulários rotulados, controles nativos,
status acessível e diálogos com saída por Escape. Claro/escuro e acessibilidade
permanecem gratuitos.

**Estados para revisar:** primeiro uso, tarefa concluída, desbloqueio/equipagem,
saldo insuficiente, usuário antigo, offline/retomada, falha/recuperação,
carregamento, metas para amanhã e personalização opcional.

**Condição de conclusão:** percorrer tarefa → saldo → compra → equipagem no
protótipo; inspecionar desktop e largura estreita, os temas e os estados acima;
registrar o que ainda depende de testes com usuários.

## Artefato e origem da skill

Protótipo: `design/prototypes/refugio/index.html`. É portátil e usa apenas dados
fictícios na memória. Abrir o arquivo no navegador ou servir a pasta localmente.

Fonte: `https://uizze.sh/.well-known/agent-skills/index.json`.
Skill: `ui-taste`, versão `0.2.0`, Apache-2.0, consultada em 2026-10-03.
SHA256 do pacote original:
`3b88468608bc7ceec66b8333fab1729590e7af62487fcdbdf79ef60ff626def7`.
O pacote original foi mantido com suas referências, licença e atribuições.
