import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useFlowStore } from '../../store/useFlowStore';

// Componente auxiliar que lança erro sob demanda
const ProblematicChild: React.FC<{ shouldThrow?: boolean; message?: string }> = ({
  shouldThrow = false,
  message = 'Erro de renderização simulado',
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Conteúdo renderizado com sucesso</div>;
};

// Componente com estado para testar recuperação
const RecoverableComponent: React.FC = () => {
  const [hasFailed, setHasFailed] = useState(true);

  return (
    <ErrorBoundary viewName="View Recuperável" onReset={() => setHasFailed(false)}>
      {hasFailed ? (
        <ProblematicChild shouldThrow={true} message="Falha temporária" />
      ) : (
        <div>Recuperado com sucesso!</div>
      )}
    </ErrorBoundary>
  );
};

describe('ErrorBoundary Component', () => {
  // Suprimir console.error durante os testes de erro do React para manter output limpo
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
    useFlowStore.setState({ activeView: 'dashboard' });
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('deve renderizar o conteúdo filho normalmente quando não houver erros', () => {
    render(
      <ErrorBoundary viewName="Teste Sem Erro">
        <ProblematicChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Conteúdo renderizado com sucesso')).toBeInTheDocument();
  });

  it('deve capturar exceção do filho e exibir a interface de fallback do Flow', () => {
    render(
      <ErrorBoundary viewName="Painel de Métricas">
        <ProblematicChild shouldThrow={true} message="Falha de cálculo Recharts" />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Painel de Métricas')).toBeInTheDocument();
    expect(screen.getByText('Falha ao carregar Painel de Métricas')).toBeInTheDocument();
    expect(
      screen.getByText(/O Flow isolou este problema para garantir que seus dados/)
    ).toBeInTheDocument();
    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    expect(screen.getByText('Voltar para a Rotina')).toBeInTheDocument();
  });

  it('deve permitir expandir e ocultar os detalhes técnicos do erro', () => {
    render(
      <ErrorBoundary viewName="Teste Detalhes">
        <ProblematicChild shouldThrow={true} message="Erro com stacktrace" />
      </ErrorBoundary>
    );

    const toggleBtn = screen.getByText('Ver Detalhes Técnicos');
    expect(toggleBtn).toBeInTheDocument();

    // Clicar para expandir
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Ocultar Detalhes Técnicos')).toBeInTheDocument();
    expect(screen.getAllByText(/Error: Erro com stacktrace/).length).toBeGreaterThan(0);
    expect(screen.getByText('Copiar')).toBeInTheDocument();
  });

  it('deve mudar a visualização para "routine" ao clicar em "Voltar para a Rotina"', () => {
    render(
      <ErrorBoundary viewName="Visualização com Falha">
        <ProblematicChild shouldThrow={true} message="Falha grave" />
      </ErrorBoundary>
    );

    expect(useFlowStore.getState().activeView).toBe('dashboard');

    const backBtn = screen.getByText('Voltar para a Rotina');
    fireEvent.click(backBtn);

    expect(useFlowStore.getState().activeView).toBe('routine');
  });

  it('deve recuperar a exibição do componente após clicar em "Tentar Novamente"', () => {
    render(<RecoverableComponent />);

    expect(screen.getByText('Falha ao carregar View Recuperável')).toBeInTheDocument();

    const retryBtn = screen.getByText('Tentar Novamente');
    fireEvent.click(retryBtn);

    expect(screen.getByText('Recuperado com sucesso!')).toBeInTheDocument();
  });

  it('deve suportar fallback customizado quando fornecido', () => {
    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>Custom Fallback: {error.message}</span>
            <button onClick={reset}>Reset Custom</button>
          </div>
        )}
      >
        <ProblematicChild shouldThrow={true} message="Custom Error Message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Fallback: Custom Error Message')).toBeInTheDocument();
    expect(screen.getByText('Reset Custom')).toBeInTheDocument();
  });
});
