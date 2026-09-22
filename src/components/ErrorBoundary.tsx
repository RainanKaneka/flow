'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { AlertTriangle, RefreshCw, ArrowLeft, ChevronDown, Copy, Check } from 'lucide-react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  viewName?: string;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDetailsOpen: boolean;
  isCopied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
      isCopied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error(`[Flow ErrorBoundary: ${this.props.viewName || 'Geral'}]`, error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
      isCopied: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoToRoutine = (): void => {
    useFlowStore.getState().setActiveView('routine');
    this.handleReset();
  };

  handleCopyReport = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const { viewName } = this.props;

    const report = [
      `=== Relatório de Erro Flow ===`,
      `Visualização: ${viewName || 'Não especificada'}`,
      `Data: ${new Date().toISOString()}`,
      `Mensagem: ${error?.message || 'Sem mensagem'}`,
      `Nome: ${error?.name || 'Error'}`,
      `Stack Trace:`,
      error?.stack || 'Indisponível',
      `Component Stack:`,
      errorInfo?.componentStack || 'Indisponível',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      this.setState({ isCopied: true });
      setTimeout(() => this.setState({ isCopied: false }), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ isDetailsOpen: !prev.isDetailsOpen }));
  };

  render(): ReactNode {
    const { hasError, error, isDetailsOpen, isCopied } = this.state;
    const { children, viewName, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error || new Error('Unknown Error'), this.handleReset);
      }
      return fallback;
    }

    const title = viewName
      ? `Falha ao carregar ${viewName}`
      : 'Ocorreu um erro inesperado nesta visualização';

    return (
      <div className={styles.container} role="alert">
        <div className={`double-bezel-outer ${styles.outerCard}`}>
          <div className={`double-bezel-inner ${styles.innerCard}`}>
            <div className={styles.iconBox}>
              <AlertTriangle size={24} strokeWidth={2.4} />
            </div>

            {viewName && <span className={styles.badge}>{viewName}</span>}

            <h3 className={styles.title}>{title}</h3>

            <p className={styles.description}>
              O Flow isolou este problema para garantir que seus dados e o restante da aplicação
              continuem seguros. Você pode tentar recarregar esta tela ou voltar para a rotina.
            </p>

            <div className={styles.actionsRow}>
              <button
                onClick={this.handleReset}
                className={`btn-island btn-island-primary ${styles.retryBtn}`}
              >
                <span>Tentar Novamente</span>
                <div className="btn-circle-icon">
                  <RefreshCw size={13} strokeWidth={2.4} />
                </div>
              </button>

              <button onClick={this.handleGoToRoutine} className={styles.routineBtn}>
                <ArrowLeft size={14} />
                <span>Voltar para a Rotina</span>
              </button>
            </div>

            {error && (
              <div className={styles.detailsSection}>
                <button type="button" onClick={this.toggleDetails} className={styles.detailsToggle}>
                  <span>
                    {isDetailsOpen ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos'}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: isDetailsOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 150ms ease',
                    }}
                  />
                </button>

                {isDetailsOpen && (
                  <div className={styles.detailsBox}>
                    <div className={styles.detailsHeader}>
                      <span className={styles.detailsErrorName}>
                        {error.name}: {error.message}
                      </span>
                      <button
                        type="button"
                        onClick={this.handleCopyReport}
                        className={styles.copyBtn}
                        title="Copiar relatório para suporte"
                      >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    {error.stack && <pre className={styles.stackTrace}>{error.stack}</pre>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
