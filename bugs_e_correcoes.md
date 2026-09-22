# Esse documento terá anotações de bugs e correções a serem feitas.


## Atualizações para a versão 0.1.4 (Concluído)

- [x] **Notificação nativa no Windows**: Corrigido fluxo de permissões ativas via `@tauri-apps/plugin-notification` (`isPermissionGranted` e `requestPermission` antes de invocar `sendNotification`), garantindo que o Windows Notification Service registre e apresente os toasts nativos da aplicação além do toast in-app e do chime suave.
- [x] **Botão verde de atualizar indevido**: Corrigido problema de reidratação do Zustand adicionando `partialize` para não persistir o estado efêmero `availableUpdate` no `localStorage`, e adicionada checagem estrita de versão com `isNewerVersion(update.latestVersion, CURRENT_APP_VERSION)` tanto no `Header` quanto no `useUpdateChecker`.
- [x] **Barra de título customizada e minimalista (Frameless)**: Removida a barra de título padrão do Windows/Tauri (`decorations: false`), removido o título poluído "Flow - Rotina & Alta Performance", e criado o componente `CustomTitleBar` com a mesma cor de fundo do app (`var(--bg-primary)`), área de arrasto nativa (`data-tauri-drag-region`) e botões elegantes e minimalistas de minimizar, maximizar/restaurar e fechar com hover styling refinado.

## Atualizações para a versão 0.1.5 (Concluído)

- [x] **Auto-Updater In-App com Barra de Progresso**: O botão de atualização agora abre a tela integrada "Atualizando o Flow...", com barra de progresso animada, etapas de download e status em tempo real. O executável é baixado em segundo plano e executado silenciosamente via NSIS (`/S /R`), reiniciando o Flow já na versão nova sem que o usuário precise abrir manualmente instaladores no navegador.
- [x] **Renderização Rica de Markdown na IA**: Criado o componente `MarkdownRenderer` integrado ao `react-markdown`, que formata perfeitamente títulos (h1, h2, h3), listas ordenadas/não-ordenadas, destaques em negrito, itálico e blocos de código com tema escuro elegante, eliminando completamente a exibição de tags brutas como "###" ou "* **".
- [x] **Notificações Nativa no Windows sobrepondo outros apps**: Implementado o comando nativo Rust `show_windows_toast`, disparado via WinRT diretamente para o Windows Shell com flag `CREATE_NO_WINDOW`. O toast do sistema operacional é emitido no canto da tela do Windows mesmo com o Flow minimizado ou com outros programas (jogos, navegadores, editores) abertos por cima.

## Atualizações para a versão 0.1.6 (Concluído)

- [x] **Dropdowns Customizados Ultra-Refinados**: Redesenhados os seletores nativos `<select>` tanto no Pomodoro (`PomodoroView.tsx` para vinculação de atividades com badges coloridos de categoria, horários, duração estimada e opção rápida de desvincular) quanto no seletor de modelos de inteligência artificial Gemini (`GoogleAuthModal.tsx` com visual dark contemporâneo, badges visuais "Recomendado" / "Ultra-Rápido", animação de abertura, fechamento por clique fora e feedback tátil sonoro).
- [x] **Modal In-App para Mover ao Backlog**: Removido o alerta padrão e invasivo do navegador (`window.confirm`) no `TaskCard.tsx`. Criado o componente dedicado `MoveToBacklogModal.tsx` com overlay em desfoque (`backdrop-filter`), card double-bezel, ícone temático de caixa de entrada (`Inbox`), destaque da tarefa selecionada, fechamento com tecla `Esc` e confirmação fluida com som nativo.
- [x] **Filtro de Intervalos Temporais no Dashboard**: Adicionada barra de filtros dinâmicos no `DashboardView.tsx` permitindo alternar facilmente entre 7 Dias, 14 Dias (padrão), 30 Dias, 90 Dias ou um período totalmente personalizado com campos de data Início e Fim, recalculando instantaneamente streak, taxas de adesão e horas focadas.
- [x] **Gráfico de Pizza / Donut de Categorias no Dashboard**: Implementado novo gráfico Donut (`PieChart` / `Pie` com `recharts`) no Dashboard exibindo a distribuição e proporção das categorias mais trabalhadas e concluídas pelo usuário no período selecionado, respeitando as cores reais cadastradas, com tooltips detalhados (tarefas e horas) e lista lateral de legendas informativas.

## Atualizações para a versão 0.2.0 (Fase 1: Fundação Sólida) (Concluído)

- [x] **Testes Automatizados (Vitest + React Testing Library)**: Configuração completa da suíte de testes com cobertura estrita (>60% em store e serviços críticos), cobrindo Zustand store, serviços SQLite, notificações, IA Gemini, Google Auth, utilitários de replanejamento e componentes essenciais da interface (150 testes passando em 21 arquivos de teste).
- [x] **Linting & Formatação de Código Estritos (ESLint Flat Config + Prettier)**: Implementação de pipeline estrito de análise estática e formatação de código com ESLint 9 Flat Config (`eslint.config.mjs`) e Prettier (`.prettierrc`), garantindo 0 erros no projeto e scripts padronizados de validação contínua (`npm run lint`, `npm run format:check`).
- [x] **Decomposição Modular de Componentes Complexos**: Refatoração arquitetural dos 3 componentes mais monolíticos em submódulos desacoplados e de responsabilidade única:
  - `Header`: Decomposto em `HeaderDateNavigator`, `HeaderNavTabs` e `HeaderActions`.
  - `DashboardView`: Decomposto em `DashboardStatCards`, `DashboardRangeFilter`, `DashboardDailyChart` e `DashboardCategoryPie`.
  - `GoogleAuthModal`: Decomposto em `GoogleUserProfileCard`, `GeminiModelSelector` e `ApiKeyConfigSection`.
- [x] **Arquitetura de Estado Modularizada (Store Slices)**: Desacoplamento da `useFlowStore` de 815 linhas em 7 slices independentes, coesos e fortemente tipados (`taskSlice`, `routineSlice`, `notepadSlice`, `uiSlice`, `authSlice`, `updateSlice` e `backlogSlice`), mantendo 100% de retrocompatibilidade com a API de estado original.
- [x] **Migração para CSS Modules com Estilos Scoped**: Substituição de extensos estilos inline por CSS Modules otimizados e organizados com variáveis de tema e animações suaves nos 4 componentes principais de visualização: `PomodoroView.module.css`, `NotepadView.module.css`, `BacklogView.module.css` e `TaskDetailModal.module.css`.
- [x] **Resiliência com Error Boundaries em Todas as Views**: Criação do componente `ErrorBoundary.tsx` estilizado com a identidade visual do Flow (glassmorphism dark, ícone de alerta temático, relatório amigável do erro e botão para recarregar ou tentar novamente), blindando todas as views principais (`Timeline`, `Pomodoro`, `Backlog`, `Dashboard`, `Notepad` e `Assistente IA`) contra travamentos inesperados.

