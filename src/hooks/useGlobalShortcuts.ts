'use client';

import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

export const useGlobalShortcuts = () => {
  const activeView = useFlowStore((s) => s.activeView);
  const setActiveView = useFlowStore((s) => s.setActiveView);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const closeTaskModal = useFlowStore((s) => s.closeTaskModal);
  const closeTaskDetail = useFlowStore((s) => s.closeTaskDetail);
  const closeNotificationModal = useFlowStore((s) => s.closeNotificationModal);
  const closeManageRoutinesModal = useFlowStore((s) => s.closeManageRoutinesModal);
  const closeManageCategoriesModal = useFlowStore((s) => s.closeManageCategoriesModal);
  
  const pomodoro = useFlowStore((s) => s.pomodoro);
  const startPomodoro = useFlowStore((s) => s.startPomodoro);
  const pausePomodoro = useFlowStore((s) => s.pausePomodoro);

  const isTaskModalOpen = useFlowStore((s) => s.isTaskModalOpen);
  const selectedTaskIdForDetail = useFlowStore((s) => s.selectedTaskIdForDetail);
  const isNotificationModalOpen = useFlowStore((s) => s.isNotificationModalOpen);
  const isManageRoutinesModalOpen = useFlowStore((s) => s.isManageRoutinesModalOpen);
  const isManageCategoriesModalOpen = useFlowStore((s) => s.isManageCategoriesModalOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos de navegação simples se o usuário estiver digitando em campos de texto
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Atalho de fechar modal (Escape) - sempre funciona
      if (e.key === 'Escape') {
        if (isTaskModalOpen) closeTaskModal();
        if (selectedTaskIdForDetail) closeTaskDetail();
        if (isNotificationModalOpen) closeNotificationModal();
        if (isManageRoutinesModalOpen) closeManageRoutinesModal();
        if (isManageCategoriesModalOpen) closeManageCategoriesModal();
        return;
      }

      // Atalho Ctrl+N / Cmd+N para Nova Atividade
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        openTaskModal(null);
        return;
      }

      // Se o usuário estiver digitando em um input, não dispara teclas alfanuméricas simples
      if (isInputFocused) return;

      // Atalho de alternância do Pomodoro com Barra de Espaço
      if (e.code === 'Space' && activeView === 'pomodoro') {
        e.preventDefault();
        if (pomodoro.isActive) {
          pausePomodoro();
        } else {
          startPomodoro(pomodoro.linkedTaskId || undefined);
        }
        return;
      }

      // Navegação rápida numérica entre abas (1 a 5)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveView('routine');
            break;
          case '2':
            e.preventDefault();
            setActiveView('pomodoro');
            break;
          case '3':
            e.preventDefault();
            setActiveView('notes');
            break;
          case '4':
            e.preventDefault();
            setActiveView('backlog');
            break;
          case '5':
            e.preventDefault();
            setActiveView('dashboard');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeView,
    pomodoro,
    isTaskModalOpen,
    selectedTaskIdForDetail,
    isNotificationModalOpen,
    isManageRoutinesModalOpen,
    isManageCategoriesModalOpen,
    setActiveView,
    openTaskModal,
    closeTaskModal,
    closeTaskDetail,
    closeNotificationModal,
    closeManageRoutinesModal,
    closeManageCategoriesModal,
    startPomodoro,
    pausePomodoro,
  ]);
};
