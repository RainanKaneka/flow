'use client';

import React, { useState, useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { cloudSyncService, CloudSyncPayload } from '../services/cloudSyncService';
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  FirebaseCustomConfig,
} from '../services/firebaseConfig';
import {
  X,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogOut,
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  Sparkles,
  Settings,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import styles from './AuthSyncModal.module.css';

export const AuthSyncModal: React.FC = () => {
  const isAuthSyncModalOpen = useFlowStore((s) => s.isAuthSyncModalOpen);
  const closeAuthSyncModal = useFlowStore((s) => s.closeAuthSyncModal);
  const firebaseUser = useFlowStore((s) => s.firebaseUser);
  const setFirebaseUser = useFlowStore((s) => s.setFirebaseUser);
  const cloudSyncStatus = useFlowStore((s) => s.cloudSyncStatus);
  const setCloudSyncStatus = useFlowStore((s) => s.setCloudSyncStatus);

  // Dados locais da store para sync
  const tasks = useFlowStore((s) => s.tasks);
  const routineTypes = useFlowStore((s) => s.routineTypes);
  const categories = useFlowStore((s) => s.categories);
  const logs = useFlowStore((s) => s.logs);
  const backlog = useFlowStore((s) => s.backlog);
  const notes = useFlowStore((s) => s.notes);
  const reminderSettings = useFlowStore((s) => s.reminderSettings);
  const backupSettings = useFlowStore((s) => s.backupSettings);

  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'settings'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Configuração Customizada do Firebase
  const [customApiKey, setCustomApiKey] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [customAuthDomain, setCustomAuthDomain] = useState('');

  useEffect(() => {
    if (isAuthSyncModalOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      const active = getActiveFirebaseConfig();
      if (active) {
        setCustomApiKey(active.apiKey || '');
        setCustomProjectId(active.projectId || '');
        setCustomAuthDomain(active.authDomain || '');
      }
    }
  }, [isAuthSyncModalOpen]);

  if (!isAuthSyncModalOpen) return null;

  const getPayload = (): CloudSyncPayload => ({
    tasks,
    routineTypes,
    categories,
    logs,
    backlog,
    notes,
    reminderSettings,
    backupSettings,
  });

  const handleManualSync = async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCloudSyncStatus({ isSyncing: true, error: null });

    try {
      const result = await cloudSyncService.syncBidirectional(firebaseUser.uid, getPayload());
      if (result.cloudData) {
        useFlowStore.setState({
          tasks: result.cloudData.tasks,
          routineTypes: result.cloudData.routineTypes,
          categories: result.cloudData.categories,
          logs: result.cloudData.logs,
          backlog: result.cloudData.backlog,
          notes: result.cloudData.notes,
        });
      }
      setCloudSyncStatus({
        isSyncing: false,
        lastSyncedAt: result.syncedAt,
        error: null,
      });
      setSuccessMessage('Sincronização concluída com sucesso!');
    } catch (err: any) {
      const msg = err.message || 'Erro durante a sincronização na nuvem.';
      setErrorMessage(msg);
      setCloudSyncStatus({ isSyncing: false, error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await firebaseAuthService.signInWithEmail(email, password);
      setFirebaseUser(user);
      setSuccessMessage(`Bem-vindo de volta, ${user.displayName || user.email}!`);
      // Trigger auto-sync initial
      cloudSyncService.syncBidirectional(user.uid, getPayload()).catch(console.error);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha no login com e-mail.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await firebaseAuthService.signUpWithEmail(email, password, displayName);
      setFirebaseUser(user);
      setSuccessMessage('Conta criada com sucesso! Seus dados foram sincronizados.');
      cloudSyncService.syncBidirectional(user.uid, getPayload()).catch(console.error);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await firebaseAuthService.signInWithGoogle();
      setFirebaseUser(user);
      setSuccessMessage(`Conectado como ${user.displayName}!`);
      cloudSyncService.syncBidirectional(user.uid, getPayload()).catch(console.error);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na autenticação Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await firebaseAuthService.signInAnonymously();
      setFirebaseUser(user);
      setSuccessMessage('Conectado como Convidado com sincronização em nuvem ativa!');
      cloudSyncService.syncBidirectional(user.uid, getPayload()).catch(console.error);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao iniciar sessão convidado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await firebaseAuthService.signOut();
      setFirebaseUser(null);
      setSuccessMessage('Sessão encerrada.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao deslogar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    if (!customApiKey.trim() || !customProjectId.trim()) {
      setErrorMessage('API Key e Project ID são obrigatórios.');
      return;
    }
    const config: FirebaseCustomConfig = {
      apiKey: customApiKey.trim(),
      projectId: customProjectId.trim(),
      authDomain: customAuthDomain.trim() || `${customProjectId.trim()}.firebaseapp.com`,
    };
    saveCustomFirebaseConfig(config);
    setSuccessMessage('Configuração do Firebase atualizada com sucesso!');
    setErrorMessage(null);
  };

  return (
    <div className={styles.overlay} onClick={closeAuthSyncModal} data-testid="auth-sync-modal">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Cloud size={18} color="var(--accent-primary)" />
            <span>Nuvem & Sincronização Firebase</span>
          </div>
          <button
            onClick={closeAuthSyncModal}
            className={styles.closeButton}
            title="Fechar"
            data-testid="close-auth-sync-modal-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {errorMessage && (
            <div className={styles.errorMessage} role="alert">
              <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                fontSize: '12px',
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '8px 12px',
                borderRadius: '8px',
              }}
            >
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '6px' }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Usuário Conectado */}
          {firebaseUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.profileCard}>
                <div className={styles.avatar}>
                  {firebaseUser.photoURL ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName || 'Avatar'}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{(firebaseUser.displayName || firebaseUser.email || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.profileInfo}>
                  <span className={styles.profileName}>
                    {firebaseUser.displayName || 'Usuário Conectado'}
                  </span>
                  <span className={styles.profileEmail}>
                    {firebaseUser.email || (firebaseUser.isAnonymous ? 'Sessão Convidado' : 'ID: ' + firebaseUser.uid.substring(0, 10) + '...')}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="btn-island"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  title="Encerrar sessão"
                  disabled={isLoading}
                >
                  <LogOut size={13} />
                  <span>Sair</span>
                </button>
              </div>

              {/* Status do Sync */}
              <div className={styles.syncStatusCard}>
                <div className={styles.syncStatusRow}>
                  <div className={styles.syncBadge}>
                    <CloudCheck size={16} />
                    <span>Sincronização em Nuvem Ativa</span>
                  </div>
                  <span className={styles.syncTime}>
                    {cloudSyncStatus.lastSyncedAt
                      ? `Último sync: ${new Date(cloudSyncStatus.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Aguardando primeiro sync'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {tasks.length} tarefas, {notes.length} notas e {backlog.length} pendências protegidas.
                  </span>
                  <button
                    onClick={handleManualSync}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', gap: '6px' }}
                    disabled={isLoading}
                  >
                    <RefreshCw size={13} className={cloudSyncStatus.isSyncing ? 'animate-spin' : ''} />
                    <span>{cloudSyncStatus.isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Formulário de Login / Cadastro / Config */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.tabSwitcher}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${authTab === 'signin' ? styles.tabBtnActive : ''}`}
                  onClick={() => setAuthTab('signin')}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${authTab === 'signup' ? styles.tabBtnActive : ''}`}
                  onClick={() => setAuthTab('signup')}
                >
                  Criar Conta
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${authTab === 'settings' ? styles.tabBtnActive : ''}`}
                  onClick={() => setAuthTab('settings')}
                >
                  Configurações
                </button>
              </div>

              {authTab === 'signin' && (
                <form onSubmit={handleEmailSignIn} className={styles.formSection}>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className={styles.btnGoogle}
                    disabled={isLoading}
                  >
                    <Sparkles size={15} color="#4285F4" />
                    <span>Continuar com Google</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ou com e-mail</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>E-mail</label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.inputField}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Senha</label>
                    <input
                      type="password"
                      placeholder="Sua senha secreta"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.inputField}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ height: '40px', marginTop: '4px' }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Conectando...' : 'Entrar no Flow Cloud'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    className={styles.btnGuest}
                    disabled={isLoading}
                  >
                    <User size={13} />
                    <span>Continuar como Convidado (Sync Imediato)</span>
                  </button>
                </form>
              )}

              {authTab === 'signup' && (
                <form onSubmit={handleEmailSignUp} className={styles.formSection}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Seu Nome</label>
                    <input
                      type="text"
                      placeholder="Como deseja ser chamado?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>E-mail</label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.inputField}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Senha</label>
                    <input
                      type="password"
                      placeholder="Mínimo de 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.inputField}
                      minLength={6}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ height: '40px', marginTop: '4px' }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando Conta...' : 'Criar Conta e Sincronizar'}
                  </button>
                </form>
              )}

              {authTab === 'settings' && (
                <div className={styles.formSection}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Insira as credenciais do seu projeto Firebase para sincronizar dados em seu próprio backend:
                  </span>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>API Key</label>
                    <input
                      type="text"
                      placeholder="AIzaSy..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Project ID</label>
                    <input
                      type="text"
                      placeholder="flow-routine-app"
                      value={customProjectId}
                      onChange={(e) => setCustomProjectId(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Auth Domain (Opcional)</label>
                    <input
                      type="text"
                      placeholder="flow-routine-app.firebaseapp.com"
                      value={customAuthDomain}
                      onChange={(e) => setCustomAuthDomain(e.target.value)}
                      className={styles.inputField}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="btn-primary"
                    style={{ height: '40px', marginTop: '6px' }}
                  >
                    Salvar Configurações do Firebase
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
