import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeminiModelSelector } from '../GeminiModelSelector';

describe('GeminiModelSelector', () => {
  const mockModels = [
    {
      id: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash (Ultra-Rápido)',
      description: 'Velocidade máxima',
    },
    {
      id: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro (Raciocínio Avançado)',
      description: 'Maior capacidade',
    },
  ];

  it('deve renderizar o modelo atualmente selecionado', () => {
    render(
      <GeminiModelSelector
        selectedModel="gemini-2.5-flash"
        onSelectModel={vi.fn()}
        availableModels={mockModels}
      />
    );

    expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
  });

  it('deve abrir o dropdown ao clicar e selecionar um novo modelo', () => {
    const handleSelectModel = vi.fn();
    render(
      <GeminiModelSelector
        selectedModel="gemini-2.5-flash"
        onSelectModel={handleSelectModel}
        availableModels={mockModels}
      />
    );

    const trigger = screen.getByRole('button', { expanded: false });
    fireEvent.click(trigger);

    expect(screen.getByText('Modelos de IA Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Gemini 2.5 Pro')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Gemini 2.5 Pro'));
    expect(handleSelectModel).toHaveBeenCalledWith('gemini-2.5-pro');
  });

  it('deve chamar onRefreshModels ao clicar no botão de atualizar quando visível', () => {
    const handleRefresh = vi.fn();
    render(
      <GeminiModelSelector
        selectedModel="gemini-2.5-flash"
        onSelectModel={vi.fn()}
        availableModels={mockModels}
        onRefreshModels={handleRefresh}
        showRefreshButton={true}
      />
    );

    const refreshBtn = screen.getByText('Atualizar modelos');
    fireEvent.click(refreshBtn);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});
