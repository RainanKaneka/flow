import { useEffect } from 'react';
import { backupService } from '../services/backupService';
import { useFlowStore } from '../store/useFlowStore';

/**
 * Hook para gerenciar a rotina de backup diário automático do SQLite.
 * Executa ao inicializar o app e checa periodicamente caso o aplicativo
 * continue aberto durante a virada do dia.
 */
export function useDailyBackupScheduler(isDbReady = true) {
  const isEnabled = useFlowStore((s) => s.backupSettings?.enabled);

  useEffect(() => {
    if (!isDbReady || !isEnabled) return;

    // 1. Executa verificação inicial após a inicialização do DB
    backupService.checkAndRunDailyBackup().catch((err) => {
      console.warn('[useDailyBackupScheduler] Falha no backup automático inicial:', err);
    });

    // 2. Intervalo leve a cada 1 hora para cobrir virada do dia com app aberto
    const interval = setInterval(() => {
      backupService.checkAndRunDailyBackup().catch((err) => {
        console.warn('[useDailyBackupScheduler] Falha na checagem horária de backup:', err);
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isDbReady, isEnabled]);
}
