# Verificação da etapa 1

Data: 2026-10-03. Escopo: protótipo portátil e especificação; não a economia
real do aplicativo. Dados fictícios, sem autenticação, Firebase ou SQLite.

## Verificação funcional no navegador

Usado Chrome headless com perfil isolado dentro de `build`, servindo o
protótipo em `127.0.0.1`. A integração de navegação da ferramenta CUA não
inicializou neste ambiente; inspeção e interação foram feitas no Chrome via
DevTools. Não foi utilizado o perfil pessoal do usuário.

Fluxos exercitados com controles reais da página e asserções de estado:

- Desfazer antes dos cinco segundos mantém saldo zerado.
- Primeira tarefa concede 75 XP, 15 moedas e um bilhete. Desmarcar e refazer
  não concede novamente.
- Desbloquear Sálvia debita 15 uma vez e inclui o item. Equipar/remover conserva
  o inventário. Saldo insuficiente oferece guardar como objetivo.
- Três tarefas e um foco dão 245 XP. Cinco tarefas e três focos dão 385 XP e
  50 moedas de ganho diário; a quarta sessão não concede novo ganho.
- Meta alterada permanece vigente até avançar o dia da demonstração.
- Offline/falha guardam ganho pendente fora da carteira. Reconexão confirma
  uma vez e esvazia as pendências.
- Prévia de migração mantém 1.800 XP/nível 4 e acrescenta 15 moedas com recibo
  único. O simulador não concede marcos semanais novos pelo histórico antigo.
- Carregamento possui saída de recuperação. Preferências fecham por Escape.
- Recompensas podem ser ocultadas, e preferência de movimento reduzido é aplicada.

Sem exceções JavaScript durante esse percurso. `node --check` passou. A
simulação dos valores em `simular-economia.mjs` conferiu os exemplos publicados.

## Inspeção visual

Renderizados tamanhos de 1280 × 940, 1024 × 768 e 390 × 844. As quatro áreas
foram percorridas em 1024 e 390 px sem rolagem horizontal. Inspecionadas
capturas completas de Refúgio, catálogo, perfil, migração e offline, além dos
temas claro/escuro e da composição estreita.

Correções após inspeção: riscado restrito ao título da tarefa para manter o
status pendente legível; XP existente aparece também no cabeçalho da prévia
de migração; marcos permanentes usam confirmação em vez de intenção pendente.

Capturas ficam em `previews/refugio`. São evidência do protótipo, não imagens
de recursos já integrados no aplicativo.

## Limites da verificação

- Não realizada pesquisa de compreensão/uso com pessoas reais.
- Contraste, leitura por tecnologia assistiva e controles de teclado precisam
  de auditoria completa na implementação; aqui foram aplicados tokens legíveis,
  labels, controles nativos, foco visível e verificação de Escape.
- Nenhuma persistência, sincronização entre dispositivos, regra Firestore ou
  transação de carteira real foi testada nesta etapa.
- Arte e animação final do pet, pesca e colecionáveis pertencem às próximas etapas.

O desenvolvimento da etapa 2 deve partir dos contratos e acrescentar verificações
de persistência, concorrência, propriedade da conta, migração e fuso.
