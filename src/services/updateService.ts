// Serviço de verificação automática de novas versões do Flow no GitHub Releases

export const CURRENT_APP_VERSION = '0.1.3';
export const GITHUB_REPO = 'RainanKaneka/flow';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  releaseUrl: string;
}

/**
 * Compara duas versões semver (ex: "0.1.1" > "0.1.0")
 */
export const isNewerVersion = (latest: string, current: string): boolean => {
  const cleanLatest = latest.replace(/^v/, '').trim();
  const cleanCurrent = current.replace(/^v/, '').trim();

  const latestParts = cleanLatest.split('.').map((p) => parseInt(p, 10) || 0);
  const currentParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(latestParts.length, currentParts.length);

  for (let i = 0; i < maxLen; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
};

/**
 * Consulta a API pública do GitHub Releases para checar novas versões disponíveis
 */
export const checkForUpdates = async (): Promise<UpdateInfo | null> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Nenhuma release pública encontrada ainda
        return null;
      }
      console.warn(`Erro ao checar atualizações no GitHub: status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const tagName = data.tag_name || '';
    const cleanTag = tagName.replace(/^v/, '');

    const hasUpdate = isNewerVersion(cleanTag, CURRENT_APP_VERSION);

    // Procura o asset do instalador .exe do Windows
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const exeAsset = assets.find((a: { name: string; browser_download_url: string }) =>
      a.name.toLowerCase().endsWith('.exe')
    );
    const msiAsset = assets.find((a: { name: string; browser_download_url: string }) =>
      a.name.toLowerCase().endsWith('.msi')
    );

    const downloadUrl =
      exeAsset?.browser_download_url ||
      msiAsset?.browser_download_url ||
      data.html_url ||
      `https://github.com/${GITHUB_REPO}/releases/latest`;

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: cleanTag,
      releaseName: data.name || `Flow v${cleanTag}`,
      releaseNotes: data.body || 'Melhorias de desempenho e correções gerais.',
      publishedAt: data.published_at || '',
      downloadUrl,
      releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
    };
  } catch (error) {
    console.warn('Falha ao conectar com o serviço de atualizações do GitHub:', error);
    return null;
  }
};
