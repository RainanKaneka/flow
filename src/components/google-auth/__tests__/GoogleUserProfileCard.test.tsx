import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleUserProfileCard } from '../GoogleUserProfileCard';

describe('GoogleUserProfileCard', () => {
  const mockUser = {
    id: 'user_123',
    name: 'Rainan Silva',
    email: 'rainan@example.com',
    avatarUrl: 'https://example.com/avatar.png',
    connectedAt: '22/09/2026',
    accessToken: 'mock_token',
  };

  it('deve exibir informações do usuário conectado e chamar onDisconnect ao clicar', () => {
    const handleDisconnect = vi.fn();
    render(
      <GoogleUserProfileCard
        googleUser={mockUser}
        onDisconnect={handleDisconnect}
        isEditingManual={false}
        onToggleEditManual={vi.fn()}
        manualName=""
        manualEmail=""
        onManualNameChange={vi.fn()}
        onManualEmailChange={vi.fn()}
        onSaveManualProfile={vi.fn()}
      />
    );

    expect(screen.getByText('Rainan Silva')).toBeInTheDocument();
    expect(screen.getByText('rainan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Token Google OAuth 2.0 Ativo/i)).toBeInTheDocument();

    const disconnectBtn = screen.getByText('Desconectar');
    fireEvent.click(disconnectBtn);
    expect(handleDisconnect).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar o formulário manual quando isEditingManual for true', () => {
    const handleSave = vi.fn((e) => e.preventDefault());
    render(
      <GoogleUserProfileCard
        googleUser={mockUser}
        onDisconnect={vi.fn()}
        isEditingManual={true}
        onToggleEditManual={vi.fn()}
        manualName="Rainan Novo"
        manualEmail="novo@example.com"
        onManualNameChange={vi.fn()}
        onManualEmailChange={vi.fn()}
        onSaveManualProfile={handleSave}
      />
    );

    expect(
      screen.getByText('Preencha seus dados para personalizar a saudação do assistente:')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rainan Novo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('novo@example.com')).toBeInTheDocument();

    const saveBtn = screen.getByText('Salvar Perfil');
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('deve exibir o badge de auto-refresh e botão de renovar token quando conectado com token', () => {
    const handleRefreshToken = vi.fn();
    render(
      <GoogleUserProfileCard
        googleUser={{
          ...mockUser,
          expiresAt: Date.now() + 45 * 60 * 1000,
        }}
        onDisconnect={vi.fn()}
        onRefreshToken={handleRefreshToken}
        isRefreshingToken={false}
        isEditingManual={false}
        onToggleEditManual={vi.fn()}
        manualName=""
        manualEmail=""
        onManualNameChange={vi.fn()}
        onManualEmailChange={vi.fn()}
        onSaveManualProfile={vi.fn()}
      />
    );

    const badge = screen.getByTestId('token-refresh-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('Auto-Refresh Ativo');

    const refreshBtn = screen.getByTestId('refresh-google-token-btn');
    expect(refreshBtn).toBeInTheDocument();
    expect(refreshBtn).toHaveTextContent('Renovar Token');

    fireEvent.click(refreshBtn);
    expect(handleRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('deve desabilitar o botão e mostrar status de renovando quando isRefreshingToken for true', () => {
    render(
      <GoogleUserProfileCard
        googleUser={mockUser}
        onDisconnect={vi.fn()}
        onRefreshToken={vi.fn()}
        isRefreshingToken={true}
        isEditingManual={false}
        onToggleEditManual={vi.fn()}
        manualName=""
        manualEmail=""
        onManualNameChange={vi.fn()}
        onManualEmailChange={vi.fn()}
        onSaveManualProfile={vi.fn()}
      />
    );

    const refreshBtn = screen.getByTestId('refresh-google-token-btn');
    expect(refreshBtn).toBeDisabled();
    expect(refreshBtn).toHaveTextContent('Renovando...');
  });
});

