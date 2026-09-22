'use client';

/**
 * Utilitário universal para abertura de links externos e downloads no navegador padrão do sistema operacional
 * Suporta tanto o ambiente Desktop (Tauri v2 / WebView2 no Windows) quanto navegadores convencionais (Chrome, Edge, Firefox).
 */

export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_METADATA__
  );
};

/**
 * Abre uma URL no navegador padrão do sistema operacional (Chrome, Edge, etc.)
 */
export const openExternalUrl = async (url: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !url) return false;

  // 1. Tenta abrir via plugin nativo do Tauri (opener) se estiver no desktop
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      if (typeof openUrl === 'function') {
        await openUrl(url);
        return true;
      }
    } catch (e) {
      console.warn('Tauri openUrl plugin falhou ou não registrado na versão nativa atual:', e);
    }
  }

  // 2. Fallback via criação programática de elemento âncora
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch (e) {
    console.warn('Fallback de clique em âncora falhou:', e);
  }

  // 3. Fallback via window.open tradicional
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) return true;
  } catch (e) {
    console.warn('Fallback window.open falhou:', e);
  }

  // 4. Último recurso se for download direto
  try {
    window.location.assign(url);
    return true;
  } catch (e) {
    console.error('Todos os métodos de abertura de URL falharam:', e);
    return false;
  }
};

/**
 * Copia um texto para a área de transferência de forma compatível
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Falha ao copiar para o clipboard:', err);
    return false;
  }
};
