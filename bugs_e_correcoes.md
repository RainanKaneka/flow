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

## Atualizações para a versão 0.3.0 (Fase 2: Persistência Real & Backup) (Concluído)

- [x] **Persistência Relacional com SQLite Real via Tauri (`@tauri-apps/plugin-sql`)**: Substituição da dependência exclusiva do localStorage por banco de dados relacional nativo `flow.db` no filesystem. Arquitetura híbrida reativa com Zustand em memória para máxima fluidez da UI síncrona e sincronização assíncrona debounced de 1s para o SQLite.
- [x] **Migração One-Time Transparente (localStorage → SQLite)**: Script de migração que detecta dados legados existentes no `flow-app-v1-clean` do navegador e migra automaticamente tarefas, tipos de rotina, categorias, notas, backlog e histórico de conclusões direto para as tabelas relacionais do SQLite no primeiro carregamento.
- [x] **Backup Automático Diário do Banco SQLite**: Rotina diária que verifica na inicialização do aplicativo (ou virada do dia) se já existe backup na data atual. Caso não exista, gera uma cópia de segurança atômica do banco `flow.db` no formato `flow_backup_YYYY-MM-DD.db`.
- [x] **Pasta Local Configurável para Backups**: Comandos nativos em Rust (`get_default_backup_dir`, `pick_backup_folder`, `create_database_backup`, `list_database_backups`, `open_backup_folder`) com diálogo nativo de seleção de pastas do Windows, botão para abrir diretamente no Windows Explorer e valor padrão seguro em `Documentos/FlowBackups`.
- [x] **Interface Dedicada de Gerenciamento (`BackupModal.tsx`)**: Modal com visual contemporâneo seguindo o design system do Flow para ativar/desativar backup automático, alterar pasta de destino, disparar snapshots manuais instantâneos ("Fazer Backup Agora") e inspecionar lista de backups encontrados com cálculo de tamanho de arquivo.
- [x] **Suite de Testes Ampliada (169 Testes - 100% Verde)**: 19 novos testes automatizados no Vitest cobrindo `backupService`, `BackupModal` e actions da store com 0 erros de linting e compilação de produção validada.

## Atualizações da Fase 2, Parte 4: Portabilidade de Dados (Export/Import em JSON, CSV e SQL) (Concluído)

- [x] **Exportação Completa em JSON Estruturado**: Serviço [exportImportService.ts](file:///c:/Users/Rainan/Desktop/Rotina/flow-app/src/services/exportImportService.ts) com função `generateJsonExport` e `downloadJsonExport` que exporta todo o ecossistema do Flow (tarefas, histórico de conclusões, notas, backlog, categorias, tipos de rotina e preferências) em um único pacote `.json` com metadados de versão e estatísticas.
- [x] **Exportação Analítica em Planilhas CSV (Excel / Google Sheets)**: Geradores dedicados com codificação UTF-8 BOM (`\uFEFF`) e conformidade com RFC 4180 para exportação de 4 planilhas distintas:
  - 📋 **Tarefas (`flow_tarefas_*.csv`)**: Mapeamento de rotinas, categorias, dias da semana legíveis e hábito âncora.
  - 📊 **Histórico de Conclusões (`flow_historico_*.csv`)**: Título da tarefa resolvido, data, status de conclusão e tempo focado em minutos.
  - 📝 **Bloco de Notas (`flow_notas_*.csv`)**: Título, conteúdo, tags, cor e timestamps.
  - 📥 **Backlog (`flow_backlog_*.csv`)**: Itens do backlog com categoria e minutos alvo.
  - 📦 **Download em Lote**: Botão para baixar todas as 4 planilhas CSV simultaneamente.
- [x] **Exportação de Dump SQL Relacional**: Integração direta com `generateSqlDump` para download instantâneo de script `.sql` compatível com SQLite v3.
- [x] **Importação Inteligente com Modos Mesclar (Merge) e Substituir (Restore)**:
  - **Validação Antecipada**: Validação sintática e estrutural com exibição de pré-visualização (contadores de tarefas, notas e conclusões detectadas).
  - **Modo Mesclar (Merge)**: Combina itens preservando o histórico existente e atualizando por ID (seguro).
  - **Modo Substituir (Restore)**: Sobrescreve o banco com snapshot de segurança gerado automaticamente antes da substituição.
  - **Importação de Tarefas via CSV**: Parser que aceita cabeçalhos em português e inglês para importar rotinas de planilhas externas.
- [x] **Interface Unificada em Abas na Central de Dados (`BackupModal.tsx`)**: Reorganização do modal com 3 abas temáticas (`Backup SQLite`, `Exportar Dados` e `Importar Dados`) e atalho direto a partir do card no Dashboard.
- [x] **Suite de Testes Ampliada (201 Testes - 100% Verde)**: 32 novos testes automatizados no Vitest cobrindo `exportImportService`, `BackupModal` e `DashboardSqlBackupCard`, garantindo integridade de parsing, escaping, exportação e gravação no SQLite.



