'use client';

import { PRODUCT_FEATURES } from '../config/productFeatures';
import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { isTokenExpired, refreshGoogleAccessToken } from '../services/googleAuthService';

/**
 * Hook para monitoramento contínuo e renovação automática do Token do Google OAuth
 * Garante que o usuário nunca seja desconectado silenciosamente por expiração de token.
 */
export const useGoogleTokenRefresh = (
  intervalMs = 60000,
  enabled: boolean = PRODUCT_FEATURES.aiAssistant
) => {
  const googleUser = useFlowStore((s) => s.googleUser);
  const geminiConfig = useFlowStore((s) => s.geminiConfig);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !googleUser || !googleUser.accessToken) return;

    const checkAndRefreshToken = async () => {
      if (isRefreshingRef.current) return;

      const currentUser = useFlowStore.getState().googleUser;
      if (!currentUser || !currentUser.accessToken) return;

      // Se expira em menos de 10 minutos ou já expirou
      if (isTokenExpired(currentUser, 10)) {
        isRefreshingRef.current = true;
        try {
          await refreshGoogleAccessToken(currentUser, geminiConfig.clientId);
        } catch (error) {
          console.warn('Tentativa de auto-refresh de token Google falhou:', error);
        } finally {
          isRefreshingRef.current = false;
        }
      }
    };

    // Verificação inicial imediata
    checkAndRefreshToken();

    // Verificação periódica em intervalo configurado
    const timer = setInterval(checkAndRefreshToken, intervalMs);

    // Verificação ao retornar o foco na janela / visibilidade
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshToken();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [enabled, googleUser, geminiConfig.clientId, intervalMs]);
};
