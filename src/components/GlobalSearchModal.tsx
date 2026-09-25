'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { sounds } from '../utils/audio';
import styles from './GlobalSearchModal.module.css';
import {
  Search,
  X,
  CheckSquare,
  FileText,
  Settings,
  Bell,
  Database,
  Download,
  Upload,
  Sparkles,
  Layers,
  Tag,
  Moon,
  Sun,
  Plus,
  Compass,
  Clock,
  Calendar,
  Timer,
  Archive,
  BarChart2,
  Bot,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import { AppView, Task, Note, BacklogItem, Category, RoutineType } from '../types/routine';

type SearchCategory = 'all' | 'tasks' | 'notes' | 'settings' | 'actions';

interface SearchItem {
  id: string;
  category: 'tasks' | 'notes' | 'settings' | 'actions' | 'backlog';
  title: string;
  subtitle?: string;
  searchKeywords?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  shortcut?: string;
  onSelect: () => void;
}

const normalize = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const GlobalSearchModal: React.FC = () => {
  const isOpen = useFlowStore((s) => s.isGlobalSearchOpen);
  const closeGlobalSearch = useFlowStore((s) => s.closeGlobalSearch);

  const tasks = useFlowStore((s) => s.tasks);
  const notes = useFlowStore((s) => s.notes);
  const backlog = useFlowStore((s) => s.backlog);
  const categories = useFlowStore((s) => s.categories);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const theme = useFlowStore((s) => s.theme);

  const setActiveView = useFlowStore((s) => s.setActiveView);
  const setDate = useFlowStore((s) => s.setDate);
  const openTaskDetail = useFlowStore((s) => s.openTaskDetail);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const openNotificationModal = useFlowStore((s) => s.openNotificationModal);
  const openBackupModal = useFlowStore((s) => s.openBackupModal);
  const openOnboardingModal = useFlowStore((s) => s.openOnboardingModal);
  const openManageRoutinesModal = useFlowStore((s) => s.openManageRoutinesModal);
  const openManageCategoriesModal = useFlowStore((s) => s.openManageCategoriesModal);
  const openGoogleAuthModal = useFlowStore((s) => s.openGoogleAuthModal);
  const openUpdateModal = useFlowStore((s) => s.openUpdateModal);
  const toggleTheme = useFlowStore((s) => s.toggleTheme);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Limpa busca e foca o input ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Mapas auxiliares para categorização e nomes
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const routineTypesMap = useMemo(() => {
    const map = new Map<string, RoutineType>();
    routineTypes.forEach((rt) => map.set(rt.id, rt));
    return map;
  }, [routineTypes]);

  // Lista de itens disponíveis
  const allItems: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = [];

    // 1. Ações & Navegação (Atalhos rápidos)
    list.push({
      id: 'action-new-task',
      category: 'actions',
      title: 'Nova Atividade',
      subtitle: 'Criar uma nova tarefa ou hábito na rotina',
      icon: <Plus size={16} />,
      badge: 'Ação',
      badgeColor: 'rgba(99, 102, 241, 0.2)',
      shortcut: 'Ctrl+N',
      onSelect: () => {
        openTaskModal(null);
      },
    });

    list.push({
      id: 'nav-routine',
      category: 'actions',
      title: 'Rotina Diária (Lista)',
      subtitle: 'Ver tarefas do dia em fluxo contínuo',
      icon: <CheckSquare size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(59, 130, 246, 0.2)',
      shortcut: '1',
      onSelect: () => {
        setActiveView('routine');
      },
    });

    list.push({
      id: 'nav-timeline',
      category: 'actions',
      title: 'Cronograma Visual (Timeline)',
      subtitle: 'Visualizar cronograma no estilo Structured',
      icon: <Clock size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(16, 185, 129, 0.2)',
      shortcut: '7',
      onSelect: () => {
        setActiveView('timeline');
      },
    });

    list.push({
      id: 'nav-calendar',
      category: 'actions',
      title: 'Calendário Mensal',
      subtitle: 'Ver calendário de tarefas e completude por mês',
      icon: <Calendar size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(168, 85, 247, 0.2)',
      shortcut: '8',
      onSelect: () => {
        setActiveView('calendar');
      },
    });

    list.push({
      id: 'nav-pomodoro',
      category: 'actions',
      title: 'Temporizador Pomodoro',
      subtitle: 'Foco total com áudio binaural e sessões vinculadas',
      icon: <Timer size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(239, 68, 68, 0.2)',
      shortcut: '2',
      onSelect: () => {
        setActiveView('pomodoro');
      },
    });

    list.push({
      id: 'nav-notes',
      category: 'actions',
      title: 'Bloco de Notas',
      subtitle: 'Anotações livres, ideias e scratchpad com conversão em tarefa',
      icon: <FileText size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(245, 158, 11, 0.2)',
      shortcut: '3',
      onSelect: () => {
        setActiveView('notes');
      },
    });

    list.push({
      id: 'nav-backlog',
      category: 'actions',
      title: 'Lista de Pendências (Backlog)',
      subtitle: 'Repositório de tarefas guardadas para quando houver tempo',
      icon: <Archive size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(107, 114, 128, 0.2)',
      shortcut: '4',
      onSelect: () => {
        setActiveView('backlog');
      },
    });

    list.push({
      id: 'nav-dashboard',
      category: 'actions',
      title: 'Painel de Métricas (Dashboard)',
      subtitle: 'Estatísticas, taxa de conclusão e histórico de hábitos',
      icon: <BarChart2 size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(14, 165, 233, 0.2)',
      shortcut: '5',
      onSelect: () => {
        setActiveView('dashboard');
      },
    });

    list.push({
      id: 'nav-ai',
      category: 'actions',
      title: 'Assistente Inteligente (Gemini IA)',
      subtitle: 'Chat contextual, replanning de horários e criação por texto',
      icon: <Bot size={16} />,
      badge: 'Navegação',
      badgeColor: 'rgba(99, 102, 241, 0.2)',
      shortcut: '6',
      onSelect: () => {
        setActiveView('ai');
      },
    });

    // 2. Configurações & Preferências
    list.push({
      id: 'setting-notifications',
      category: 'settings',
      title: 'Lembretes & Configurações de Notificação',
      subtitle: 'Avisos sonoros e notificações de desktop para atividades',
      icon: <Bell size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(16, 185, 129, 0.2)',
      onSelect: () => {
        openNotificationModal();
      },
    });

    list.push({
      id: 'setting-backup',
      category: 'settings',
      title: 'Backup do Banco de Dados SQLite',
      subtitle: 'Gerenciar pastas, retenção automática e histórico de backups',
      icon: <Database size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(99, 102, 241, 0.2)',
      onSelect: () => {
        openBackupModal('backup');
      },
    });

    list.push({
      id: 'setting-export',
      category: 'settings',
      title: 'Exportar Dados (JSON / CSV / SQL Dump)',
      subtitle: 'Exportação completa da rotina e histórico para backup externo',
      icon: <Download size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(14, 165, 233, 0.2)',
      onSelect: () => {
        openBackupModal('export');
      },
    });

    list.push({
      id: 'setting-import',
      category: 'settings',
      title: 'Importar Dados (JSON / CSV)',
      subtitle: 'Restaurar ou mesclar dados a partir de arquivo de backup',
      icon: <Upload size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(245, 158, 11, 0.2)',
      onSelect: () => {
        openBackupModal('import');
      },
    });

    list.push({
      id: 'setting-onboarding',
      category: 'settings',
      title: 'Setup Inicial & Templates de Rotina',
      subtitle: 'Ajustar perfil, objetivo e carregar rotinas prontas no Onboarding',
      icon: <Sparkles size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(236, 72, 153, 0.2)',
      onSelect: () => {
        openOnboardingModal();
      },
    });

    list.push({
      id: 'setting-manage-routines',
      category: 'settings',
      title: 'Gerenciar Tipos de Rotina & Filosofias',
      subtitle: 'Criar ou editar rotinas (Trabalho, Fim de Semana, Estudos)',
      icon: <Compass size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(99, 102, 241, 0.2)',
      onSelect: () => {
        openManageRoutinesModal();
      },
    });

    list.push({
      id: 'setting-manage-categories',
      category: 'settings',
      title: 'Gerenciar Categorias & Cores',
      subtitle: 'Personalizar categorias, cores visuais e tags',
      icon: <Tag size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(168, 85, 247, 0.2)',
      onSelect: () => {
        openManageCategoriesModal();
      },
    });

    list.push({
      id: 'setting-google-auth',
      category: 'settings',
      title: 'Conexão Google & Gemini IA',
      subtitle: 'Configurar conta Google, chave de API Gemini e modelos de IA',
      icon: <Bot size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(59, 130, 246, 0.2)',
      onSelect: () => {
        openGoogleAuthModal();
      },
    });

    list.push({
      id: 'setting-updates',
      category: 'settings',
      title: 'Verificar Atualizações do Flow',
      subtitle: 'Consultar releases e novidades disponíveis',
      icon: <Sparkles size={16} />,
      badge: 'Configuração',
      badgeColor: 'rgba(16, 185, 129, 0.2)',
      onSelect: () => {
        openUpdateModal();
      },
    });

    list.push({
      id: 'setting-theme',
      category: 'settings',
      title: `Alternar Tema: Mudar para Modo ${theme === 'dark' ? 'Claro' : 'Escuro'}`,
      subtitle: 'Alternar entre interface OLED escura e modo claro suave',
      icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      badge: 'Preferência',
      badgeColor: 'rgba(234, 179, 8, 0.2)',
      onSelect: () => {
        toggleTheme();
      },
    });

    // 3. Tarefas
    tasks.forEach((t) => {
      const cat = categoriesMap.get(t.categoryId);
      const rt = routineTypesMap.get(t.routineTypeId);
      const dateInfo = t.specificDate ? ` • Data: ${t.specificDate}` : '';
      const goldenInfo = t.isGoldenRule ? ' • ⭐ Regra de Ouro' : '';
      const subtitle = `${cat?.name || 'Geral'} • ${t.startTime} - ${t.endTime}${goldenInfo}${dateInfo}`;
      const searchKeywords = `${t.description || ''} ${t.notes || ''} ${(t.tags || []).join(' ')} ${rt?.name || ''} ${cat?.name || ''}`;

      list.push({
        id: `task-${t.id}`,
        category: 'tasks',
        title: t.title,
        subtitle,
        searchKeywords,
        icon: <CheckSquare size={16} color={cat?.color || 'var(--accent-primary)'} />,
        badge: cat?.name || 'Tarefa',
        badgeColor: cat?.color ? `${cat.color}25` : 'rgba(99, 102, 241, 0.2)',
        onSelect: () => {
          if (t.specificDate) {
            setDate(t.specificDate);
          }
          setActiveView('routine');
          openTaskDetail(t.id);
        },
      });
    });

    // 4. Notas
    notes.forEach((n) => {
      const preview = n.content.replace(/[\n\r]+/g, ' ').slice(0, 75);
      const tagsStr = n.tags && n.tags.length > 0 ? ` [${n.tags.join(', ')}]` : '';
      const subtitle = preview ? `${preview}...${tagsStr}` : `Nota vazia${tagsStr}`;
      const searchKeywords = `${n.content || ''} ${(n.tags || []).join(' ')}`;

      list.push({
        id: `note-${n.id}`,
        category: 'notes',
        title: n.title || 'Nota sem título',
        subtitle,
        searchKeywords,
        icon: <FileText size={16} color="#F59E0B" />,
        badge: 'Nota',
        badgeColor: 'rgba(245, 158, 11, 0.2)',
        onSelect: () => {
          setActiveView('notes');
        },
      });
    });

    // 5. Pendências (Backlog)
    backlog.forEach((b) => {
      const cat = categoriesMap.get(b.categoryId);
      const subtitle = `Pendência • ${b.targetMinutes} min • ${b.description || 'Sem descrição'}`;
      const searchKeywords = `${b.description || ''} ${b.notes || ''} ${(b.tags || []).join(' ')} ${cat?.name || ''}`;

      list.push({
        id: `backlog-${b.id}`,
        category: 'backlog',
        title: b.title,
        subtitle,
        searchKeywords,
        icon: <Archive size={16} color="#9CA3AF" />,
        badge: 'Backlog',
        badgeColor: 'rgba(156, 163, 175, 0.2)',
        onSelect: () => {
          setActiveView('backlog');
        },
      });
    });

    return list;
  }, [
    tasks,
    notes,
    backlog,
    categoriesMap,
    routineTypesMap,
    theme,
    openTaskModal,
    setActiveView,
    openNotificationModal,
    openBackupModal,
    openOnboardingModal,
    openManageRoutinesModal,
    openManageCategoriesModal,
    openGoogleAuthModal,
    openUpdateModal,
    toggleTheme,
    setDate,
    openTaskDetail,
  ]);

  // Filtragem dinâmica por termo e aba selecionada
  const filteredResults = useMemo(() => {
    let items = allItems;

    // Filtro por categoria da aba
    if (activeCategory === 'tasks') {
      items = items.filter((i) => i.category === 'tasks');
    } else if (activeCategory === 'notes') {
      items = items.filter((i) => i.category === 'notes');
    } else if (activeCategory === 'settings') {
      items = items.filter((i) => i.category === 'settings');
    } else if (activeCategory === 'actions') {
      items = items.filter((i) => i.category === 'actions');
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return items;
    }

    const normQuery = normalize(trimmed);
    const searchTerms = normQuery.split(/\s+/).filter(Boolean);

    return items.filter((item) => {
      const searchTarget = normalize(
        `${item.title} ${item.subtitle || ''} ${item.searchKeywords || ''} ${item.badge || ''} ${item.category}`
      );
      return searchTerms.every((term) => searchTarget.includes(term));
    });
  }, [allItems, activeCategory, query]);

  // Contadores para os chips
  const counts = useMemo(() => {
    const trimmed = query.trim();
    const normQuery = normalize(trimmed);
    const searchTerms = normQuery.split(/\s+/).filter(Boolean);

    const matchesQuery = (item: SearchItem) => {
      if (!trimmed) return true;
      const target = normalize(
        `${item.title} ${item.subtitle || ''} ${item.searchKeywords || ''} ${item.badge || ''} ${item.category}`
      );
      return searchTerms.every((term) => target.includes(term));
    };

    return {
      all: allItems.filter(matchesQuery).length,
      tasks: allItems.filter((i) => i.category === 'tasks' && matchesQuery(i)).length,
      notes: allItems.filter((i) => i.category === 'notes' && matchesQuery(i)).length,
      settings: allItems.filter((i) => i.category === 'settings' && matchesQuery(i)).length,
      actions: allItems.filter((i) => i.category === 'actions' && matchesQuery(i)).length,
    };
  }, [allItems, query]);

  // Ajusta o índice selecionado caso a lista diminua
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, activeCategory]);

  // Scroll automático do item selecionado para a visão
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Executa o item selecionado
  const handleExecute = (item?: SearchItem) => {
    const target = item || filteredResults[selectedIndex] || filteredResults[0];
    if (!target) return;
    try {
      sounds.playGlassChime();
    } catch {
      // Audio fallback
    }
    closeGlobalSearch();
    target.onSelect();
  };

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0));
      sounds.playTick();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredResults.length > 0 ? (prev - 1 + filteredResults.length) % filteredResults.length : 0
      );
      sounds.playTick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeGlobalSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={() => closeGlobalSearch()}
      data-testid="global-search-backdrop"
    >
      <div
        className={`double-bezel-outer ${styles.modalOuter}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={`double-bezel-inner ${styles.modalInner}`}>
          {/* Header com Input de Busca */}
          <div className={styles.searchHeader}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Buscar tarefas, notas, configurações ou ações... (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="global-search-input"
            />
            <div className={styles.headerActions}>
              {query && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  title="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
              <kbd className={styles.escBadge} title="Fechar modal">
                ESC
              </kbd>
            </div>
          </div>

          {/* Barra de Filtros / Chips */}
          <div className={styles.filterBar}>
            <button
              type="button"
              className={`${styles.filterChip} ${activeCategory === 'all' ? styles.filterChipActive : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <span>Tudo</span>
              <span className={styles.filterCount}>{counts.all}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${activeCategory === 'tasks' ? styles.filterChipActive : ''}`}
              onClick={() => setActiveCategory('tasks')}
            >
              <span>Tarefas</span>
              <span className={styles.filterCount}>{counts.tasks}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${activeCategory === 'notes' ? styles.filterChipActive : ''}`}
              onClick={() => setActiveCategory('notes')}
            >
              <span>Notas</span>
              <span className={styles.filterCount}>{counts.notes}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${activeCategory === 'settings' ? styles.filterChipActive : ''}`}
              onClick={() => setActiveCategory('settings')}
            >
              <span>Configurações</span>
              <span className={styles.filterCount}>{counts.settings}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${activeCategory === 'actions' ? styles.filterChipActive : ''}`}
              onClick={() => setActiveCategory('actions')}
            >
              <span>Ações & Navegação</span>
              <span className={styles.filterCount}>{counts.actions}</span>
            </button>
          </div>

          {/* Lista de Resultados */}
          <div className={styles.resultsList} data-testid="global-search-results">
            {filteredResults.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconBox}>
                  <Inbox size={24} />
                </div>
                <div className={styles.emptyTitle}>Nenhum resultado encontrado</div>
                <div className={styles.emptySubtitle}>
                  Não encontramos nada para &ldquo;{query}&rdquo;. Tente buscar por tarefas, anotações,
                  configurações ou termos como &ldquo;backup&rdquo;, &ldquo;pomodoro&rdquo;, ou
                  &ldquo;tema&rdquo;.
                </div>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={`${styles.resultItem} ${isSelected ? styles.resultItemSelected : ''}`}
                    onClick={() => handleExecute(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    data-testid={`search-item-${item.id}`}
                  >
                    <div className={styles.itemLeft}>
                      <div className={styles.itemIconBox}>{item.icon}</div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemTitleRow}>
                          <span className={styles.itemTitle}>{item.title}</span>
                          {item.badge && (
                            <span
                              className={styles.itemBadge}
                              style={{
                                background: item.badgeColor || 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <div className={styles.itemSubtitle}>{item.subtitle}</div>
                        )}
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      {item.shortcut && (
                        <kbd className={styles.shortcutBadge}>{item.shortcut}</kbd>
                      )}
                      <ArrowRight size={14} style={{ opacity: isSelected ? 0.8 : 0.2 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Atalhos de Navegação */}
          <div className={styles.searchFooter}>
            <div className={styles.footerHints}>
              <div className={styles.hintItem}>
                <kbd className={styles.hintKbd}>↑</kbd>
                <kbd className={styles.hintKbd}>↓</kbd>
                <span>Navegar</span>
              </div>
              <div className={styles.hintItem}>
                <kbd className={styles.hintKbd}>↵</kbd>
                <span>Selecionar</span>
              </div>
              <div className={styles.hintItem}>
                <kbd className={styles.hintKbd}>Esc</kbd>
                <span>Fechar</span>
              </div>
            </div>
            <div>
              {filteredResults.length}{' '}
              {filteredResults.length === 1 ? 'resultado' : 'resultados'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
