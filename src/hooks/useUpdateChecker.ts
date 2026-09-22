'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { checkForUpdates, CURRENT_APP_VERSION } from '../services/updateService';

export const useUpdateChecker = () => {
  const setAvailableUpdate = useFlowStore((s) => s.setAvailableUpdate);
  const openUpdateModal = useFlowStore((s) => s.openUpdateModal);
  const availableUpdate = useFlowStore((s) => s.availableUpdate);

  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  // Verificação automática não intrusiva ao inicializar o app
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await checkForUpdates();
        if (update && update.hasUpdate) {
          setAvailableUpdate(update);
        }
      } catch (e) {
        console.warn('Erro ao verificar atualizações automáticas:', e);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [setAvailableUpdate]);

  // Função para verificação manual com feedback imediato
  const checkManually = useCallback(async () => {
    setIsChecking(true);
    setLastCheckMessage(null);
    try {
      const update = await checkForUpdates();
      if (update && update.hasUpdate) {
        setAvailableUpdate(update);
        openUpdateModal();
        setLastCheckMessage(`Nova versão v${update.latestVersion} disponível!`);
      } else {
        setLastCheckMessage(`Você já está na versão mais recente (v${CURRENT_APP_VERSION})!`);
        setTimeout(() => setLastCheckMessage(null), 5000);
      }
    } catch (e) {
      setLastCheckMessage('Não foi possível verificar atualizações no momento.');
      setTimeout(() => setLastCheckMessage(null), 5000);
    } finally {
      setIsChecking(false);
    }
  }, [setAvailableUpdate, openUpdateModal]);

  return {
    isChecking,
    lastCheckMessage,
    checkManually,
    availableUpdate,
  };
};
