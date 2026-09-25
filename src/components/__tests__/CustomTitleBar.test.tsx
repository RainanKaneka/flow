import React, { act } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomTitleBar } from '../CustomTitleBar';
import * as browserUtils from '../../utils/browser';

const mockAppWindow = {
  minimize: vi.fn(),
  toggleMaximize: vi.fn(),
  isMaximized: vi.fn().mockResolvedValue(false),
  close: vi.fn(),
  onResized: vi.fn().mockResolvedValue(() => {}),
};

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mockAppWindow,
}));

describe('CustomTitleBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar quando estiver em ambiente web (fora do Tauri)', () => {
    vi.spyOn(browserUtils, 'isTauri').mockReturnValue(false);
    const { container } = render(<CustomTitleBar />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar a barra com botões de controle e posição sticky fixa quando no Tauri', async () => {
    vi.spyOn(browserUtils, 'isTauri').mockReturnValue(true);

    await act(async () => {
      render(<CustomTitleBar />);
    });

    const titleBar = await screen.findByRole('complementary', {
      name: /Barra de Título do Aplicativo/i,
    });
    expect(titleBar).toBeInTheDocument();
    expect(titleBar).toHaveStyle({
      position: 'sticky',
      top: '0px',
    });

    // Botões de minimizar, maximizar e fechar
    const minimizeBtn = screen.getByTitle('Minimizar');
    const maximizeBtn = screen.getByTitle('Maximizar');
    const closeBtn = screen.getByTitle('Fechar');

    expect(minimizeBtn).toBeInTheDocument();
    expect(maximizeBtn).toBeInTheDocument();
    expect(closeBtn).toBeInTheDocument();

    // Ações de clique
    await act(async () => {
      fireEvent.click(minimizeBtn);
    });
    expect(mockAppWindow.minimize).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(maximizeBtn);
    });
    expect(mockAppWindow.toggleMaximize).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(mockAppWindow.close).toHaveBeenCalled();
  });
});
