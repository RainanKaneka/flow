import { GoogleUserProfile } from '../types/routine';

export interface GoogleAuthResult {
  success: boolean;
  user?: GoogleUserProfile;
  error?: string;
}

/**
 * Inicia o fluxo real de autenticação OAuth 2.0 do Google via Popup
 */
export const initiateGoogleOAuthPopup = ({
  clientId,
}: {
  clientId: string;
}): Promise<GoogleAuthResult> => {
  return new Promise((resolve) => {
    if (!clientId || clientId.trim().length < 10) {
      resolve({
        success: false,
        error: 'É necessário informar um Client ID do Google OAuth 2.0 válido.',
      });
      return;
    }

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent(
      'openid email profile https://www.googleapis.com/auth/generative-language'
    );
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId.trim()
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;

    const popup = window.open(
      authUrl,
      'google_oauth_popup',
      'width=500,height=650,left=250,top=120'
    );

    if (!popup) {
      resolve({
        success: false,
        error:
          'O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para continuar.',
      });
      return;
    }

    let isResolved = false;

    const cleanup = () => {
      clearInterval(pollTimer);
      window.removeEventListener('message', messageHandler);
    };

    const handleSuccessToken = async (accessToken: string) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      try {
        if (!popup.closed) popup.close();
      } catch {
        // Ignora
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
        const user: GoogleUserProfile = {
          id: userInfo.sub || `google_${Date.now()}`,
          name: userInfo.name || 'Usuário Google',
          email: userInfo.email || '',
          avatarUrl: userInfo.picture,
          accessToken,
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
        handleSuccessToken(event.data.token);
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
          if (accessToken) {
            handleSuccessToken(accessToken);
          }
        }
      } catch (err: any) {
        // Ignora erros momentâneos de polling
      }
    }, 400);
  });
};
