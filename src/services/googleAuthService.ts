import { GoogleUserProfile } from '../types/routine';
import { useFlowStore } from '../store/useFlowStore';
import { getFirebaseAuthInstance } from './firebaseConfig';
import { isTauri, openExternalUrl } from '../utils/browser';

export interface GoogleAuthResult {
  success: boolean;
  user?: GoogleUserProfile;
  error?: string;
  isExternalBrowser?: boolean;
  authUrl?: string;
}

/**
 * Client ID Placeholder fictício utilizado como modelo
 */
export const PLACEHOLDER_CLIENT_ID =
  '983421832049-flow-official-client.apps.googleusercontent.com';

/**
 * Client ID Oficial do Flow (Zero-Config para usuários finais caso definido via variável de ambiente)
 */
export const FLOW_OFFICIAL_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  PLACEHOLDER_CLIENT_ID;

/**
 * Valida se um Client ID do Google OAuth 2.0 possui formato autêntico e não é um placeholder não registrado
 */
export const isValidGoogleClientId = (clientId?: string | null): boolean => {
  if (!clientId) return false;
  const trimmed = clientId.trim();
  if (trimmed.length < 20) return false;
  if (
    trimmed === PLACEHOLDER_CLIENT_ID ||
    trimmed.includes('flow-official-client') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('seu-client-id')
  ) {
    return false;
  }
  return (
    trimmed.endsWith('.apps.googleusercontent.com') &&
    /^\d+-[a-zA-Z0-9_\-.]+\.apps\.googleusercontent\.com$/.test(trimmed)
  );
};

/**
 * Retorna o Client ID efetivo a ser utilizado (custom do usuário > env > oficial do Flow)
 */
export const getEffectiveGoogleClientId = (customClientId?: string): string => {
  if (customClientId !== undefined && customClientId.trim().length > 0) {
    return customClientId.trim();
  }
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || FLOW_OFFICIAL_CLIENT_ID;
};

/**
 * Verifica se a aplicação está usando o Client ID Oficial do Flow
 */
export const isUsingOfficialClientId = (clientId?: string): boolean => {
  const effective = getEffectiveGoogleClientId(clientId);
  return effective === FLOW_OFFICIAL_CLIENT_ID;
};

/**
 * Verifica se o token de acesso do Google está expirado ou prestes a expirar
 * @param user Perfil do usuário Google
 * @param bufferMinutes Minutos de margem de segurança antes do vencimento (padrão: 5 minutos)
 */
export const isTokenExpired = (
  user: GoogleUserProfile | null,
  bufferMinutes = 5
): boolean => {
  if (!user || !user.accessToken) return true;
  if (!user.expiresAt) return false;
  return Date.now() >= user.expiresAt - bufferMinutes * 60 * 1000;
};

/**
 * Retorna os minutos restantes até o token expirar
 */
export const getTimeUntilExpiryMinutes = (user: GoogleUserProfile | null): number => {
  if (!user || !user.expiresAt) return 60;
  const remainingMs = user.expiresAt - Date.now();
  return Math.max(0, Math.round(remainingMs / (60 * 1000)));
};

/**
 * Renova o token de acesso do Google automaticamente (Auto-Refresh)
 * Suporta refresh token OAuth 2.0, Firebase STS token e verificação ativa
 */
export const refreshGoogleAccessToken = async (
  user: GoogleUserProfile,
  clientId?: string
): Promise<GoogleAuthResult> => {
  if (!user || !user.accessToken) {
    return { success: false, error: 'Nenhum usuário Google conectado para renovação.' };
  }

  const effectiveClientId = getEffectiveGoogleClientId(clientId);

  try {
    // 1. Se possuir refresh_token OAuth 2.0 direto
    if (user.refreshToken) {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: effectiveClientId,
          grant_type: 'refresh_token',
          refresh_token: user.refreshToken,
        }),
      });

      if (response.ok) {
        const tokenData = await response.json();
        const newAccessToken = tokenData.access_token;
        const expiresIn = Number(tokenData.expires_in) || 3600;
        const newExpiresAt = Date.now() + expiresIn * 1000;
        const lastRefreshedAt = new Date().toISOString();

        const updatedUser: GoogleUserProfile = {
          ...user,
          accessToken: newAccessToken,
          refreshToken: tokenData.refresh_token || user.refreshToken,
          expiresAt: newExpiresAt,
          lastRefreshedAt,
          isAutoRefreshEnabled: true,
        };

        useFlowStore.getState().updateGoogleTokens({
          accessToken: newAccessToken,
          refreshToken: updatedUser.refreshToken,
          expiresAt: newExpiresAt,
          lastRefreshedAt,
        });

        return { success: true, user: updatedUser };
      }
    }

    // 2. Se houver sessão de autenticação ativa no Firebase
    const firebaseAuth = getFirebaseAuthInstance();
    if (firebaseAuth?.currentUser) {
      try {
        const freshToken = await firebaseAuth.currentUser.getIdToken(true);
        if (freshToken) {
          const newExpiresAt = Date.now() + 3600 * 1000;
          const lastRefreshedAt = new Date().toISOString();

          const updatedUser: GoogleUserProfile = {
            ...user,
            accessToken: freshToken,
            expiresAt: newExpiresAt,
            lastRefreshedAt,
            isAutoRefreshEnabled: true,
          };

          useFlowStore.getState().updateGoogleTokens({
            accessToken: freshToken,
            expiresAt: newExpiresAt,
            lastRefreshedAt,
          });

          return { success: true, user: updatedUser };
        }
      } catch {
        // Fallback para validação direta
      }
    }

    // 3. Validação do token existente com renovação de ciclo
    const verifyRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    if (verifyRes.ok) {
      const newExpiresAt = Date.now() + 3600 * 1000;
      const lastRefreshedAt = new Date().toISOString();

      const updatedUser: GoogleUserProfile = {
        ...user,
        expiresAt: newExpiresAt,
        lastRefreshedAt,
        isAutoRefreshEnabled: true,
      };

      useFlowStore.getState().updateGoogleTokens({
        accessToken: user.accessToken,
        expiresAt: newExpiresAt,
        lastRefreshedAt,
      });

      return { success: true, user: updatedUser };
    }

    return {
      success: false,
      error: 'Token do Google expirado e não foi possível renovar automaticamente. Reconecte a conta.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Falha ao renovar token do Google: ${err?.message || 'Erro desconhecido.'}`,
    };
  }
};

/**
 * Obtém um token de acesso válido, renovando automaticamente caso esteja próximo da expiração
 */
export const getValidGoogleAccessToken = async (): Promise<string | null> => {
  const state = useFlowStore.getState();
  const user = state.googleUser;
  if (!user || !user.accessToken) return null;

  // Se o token estiver a menos de 5 minutos da expiração, renova transparentemente
  if (isTokenExpired(user, 5)) {
    const res = await refreshGoogleAccessToken(user, state.geminiConfig.clientId);
    if (res.success && res.user?.accessToken) {
      return res.user.accessToken;
    }
  }

  return user.accessToken;
};

/**
 * Conecta e valida diretamente com um Access Token do Google OAuth (útil para fluxo Desktop / Navegador Externo)
 */
export const verifyAndConnectGoogleToken = async (
  rawTokenOrUrl: string,
  clientId?: string
): Promise<GoogleAuthResult> => {
  if (!rawTokenOrUrl || !rawTokenOrUrl.trim()) {
    return { success: false, error: 'Insira ou cole um token válido do Google.' };
  }

  let token = rawTokenOrUrl.trim();
  let expiresIn = 3600;

  // Se o usuário colou a URL inteira de redirecionamento ou a hash contendo access_token=
  if (token.includes('access_token=')) {
    try {
      const hashPart = token.includes('#') ? token.split('#')[1] : token;
      const params = new URLSearchParams(hashPart);
      const parsedToken = params.get('access_token');
      if (parsedToken) {
        token = parsedToken;
      }
      const exp = params.get('expires_in');
      if (exp) {
        expiresIn = parseInt(exp, 10);
      }
    } catch {
      // Ignora erro e tenta o token original
    }
  }

  // Remove eventuais prefixos 'Bearer ' ou 'token='
  token = token.replace(/^(Bearer\s+|token=)/i, '').trim();

  if (token.length < 15) {
    return {
      success: false,
      error: 'Formato de token do Google inválido. Copie o token de acesso completo.',
    };
  }

  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userInfoRes.ok) {
      return {
        success: false,
        error: `O token informado é inválido ou expirou (HTTP ${userInfoRes.status}). Conclua o login no navegador e copie um token recente.`,
      };
    }

    const userInfo = await userInfoRes.json();
    const now = Date.now();
    const expiresAt = now + (Number(expiresIn) || 3600) * 1000;
    const lastRefreshedAt = new Date().toISOString();

    const user: GoogleUserProfile = {
      id: userInfo.sub || `google_${Date.now()}`,
      name: userInfo.name || 'Usuário Google',
      email: userInfo.email || '',
      avatarUrl: userInfo.picture,
      accessToken: token,
      expiresAt,
      isAutoRefreshEnabled: true,
      lastRefreshedAt,
      connectedAt: new Date().toLocaleDateString('pt-BR'),
    };

    const effectiveClientId = getEffectiveGoogleClientId(clientId);
    useFlowStore.getState().setGoogleUser(user);
    useFlowStore.getState().setGeminiConfig({
      clientId: effectiveClientId,
      isConnected: true,
    });

    return { success: true, user };
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao validar token do Google: ${err?.message || 'Falha de conexão.'}`,
    };
  }
};

/**
 * Inicia o fluxo real de autenticação OAuth 2.0 do Google via Popup ou Navegador Externo
 * Utiliza o Client ID Oficial do Flow por padrão ou o Client ID customizado informado.
 */
export const initiateGoogleOAuthPopup = ({
  clientId,
}: {
  clientId?: string;
} = {}): Promise<GoogleAuthResult> => {
  return new Promise((resolve) => {
    const effectiveClientId = getEffectiveGoogleClientId(clientId);

    if (!isValidGoogleClientId(effectiveClientId)) {
      resolve({
        success: false,
        error:
          'É necessário cadastrar um Client ID do Google Cloud Console válido nas configurações antes de fazer login.',
      });
      return;
    }

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent(
      'openid email profile https://www.googleapis.com/auth/generative-language'
    );
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      effectiveClientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&prompt=select_account`;

    // Se estiver no ambiente Desktop (Tauri), abre no navegador padrão do SO
    // Isso evita bloqueios de pop-up do WebView2 e o bloqueio de disallowed_useragent do Google
    if (isTauri()) {
      openExternalUrl(authUrl);
      resolve({
        success: false,
        isExternalBrowser: true,
        authUrl,
        error:
          'O login foi aberto no seu navegador padrão (Chrome/Edge). Conclua a autorização e cole o token gerado para conectar.',
      });
      return;
    }

    let popup: Window | null = null;
    try {
      popup = window.open(
        authUrl,
        'google_oauth_popup',
        'width=500,height=650,left=250,top=120'
      );
    } catch {
      popup = null;
    }

    if (!popup) {
      openExternalUrl(authUrl);
      resolve({
        success: false,
        isExternalBrowser: true,
        authUrl,
        error:
          'O navegador bloqueou a janela pop-up do Google. Abrimos o login no seu navegador padrão para você continuar.',
      });
      return;
    }

    let isResolved = false;

    const cleanup = () => {
      clearInterval(pollTimer);
      window.removeEventListener('message', messageHandler);
    };

    const handleSuccessToken = async (
      accessToken: string,
      expiresIn = 3600,
      refreshToken?: string
    ) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      try {
        if (!popup.closed) popup.close();
      } catch {
        // Ignora erro ao fechar popup
      }

      // Busca dados do perfil com o token recebido
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoRes.ok) {
          resolve({
            success: false,
            error: `Falha ao obter perfil do Google (HTTP ${userInfoRes.status}).`,
          });
          return;
        }

        const userInfo = await userInfoRes.json();
        const now = Date.now();
        const expiresAt = now + (Number(expiresIn) || 3600) * 1000;
        const lastRefreshedAt = new Date().toISOString();

        const user: GoogleUserProfile = {
          id: userInfo.sub || `google_${Date.now()}`,
          name: userInfo.name || 'Usuário Google',
          email: userInfo.email || '',
          avatarUrl: userInfo.picture,
          accessToken,
          refreshToken,
          expiresAt,
          isAutoRefreshEnabled: true,
          lastRefreshedAt,
          connectedAt: new Date().toLocaleDateString('pt-BR'),
        };

        resolve({ success: true, user });
      } catch (fetchErr: any) {
        resolve({
          success: false,
          error: `Erro ao buscar perfil: ${fetchErr?.message || 'Falha de rede.'}`,
        });
      }
    };

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_OAUTH_TOKEN' && event.data?.token) {
        const expiresIn = event.data?.expiresIn ? Number(event.data.expiresIn) : 3600;
        handleSuccessToken(event.data.token, expiresIn, event.data?.refreshToken);
      }
    };

    window.addEventListener('message', messageHandler);

    const pollTimer = window.setInterval(async () => {
      try {
        if (popup.closed) {
          if (!isResolved) {
            cleanup();
            resolve({
              success: false,
              error: 'Autenticação cancelada: a janela do Google foi fechada.',
            });
          }
          return;
        }

        let hash = '';
        try {
          hash = popup.location.hash;
        } catch {
          // Cross-origin até o redirecionamento
          return;
        }

        if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const expiresIn = params.get('expires_in')
            ? parseInt(params.get('expires_in')!, 10)
            : 3600;
          const refreshToken = params.get('refresh_token') || undefined;

          if (accessToken) {
            handleSuccessToken(accessToken, expiresIn, refreshToken);
          }
        }
      } catch {
        // Ignora erros momentâneos de cross-origin durante polling
      }
    }, 400);
  });
};
