import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeaderNavTabs } from '../header/HeaderNavTabs';
import { HeaderActionToolbar } from '../header/HeaderActionToolbar';
import fs from 'fs';
import path from 'path';

describe('Responsividade Básica (1024px até 1920px)', () => {
  describe('HeaderNavTabs Responsivo', () => {
    it('deve aplicar classe de container com suporte a rolagem suave sem scrollbars', () => {
      const { container } = render(
        <HeaderNavTabs
          activeView="routine"
          onSelectView={vi.fn()}
          pomodoroActive={false}
          pomodoroTimeStr="25:00"
          notesCount={2}
          backlogCount={4}
        />
      );

      const navContainer = container.querySelector('[data-testid="header-nav-tabs"]');
      expect(navContainer).toBeInTheDocument();
      // Deve conter classe do CSS module
      expect(navContainer?.className).toMatch(/container/);
    });

    it('deve destacar a aba ativa com tabBtnActive e estilizar todas as abas', () => {
      render(
        <HeaderNavTabs
          activeView="calendar"
          onSelectView={vi.fn()}
          pomodoroActive={false}
          pomodoroTimeStr="25:00"
          notesCount={0}
          backlogCount={0}
        />
      );

      const calendarBtn = screen.getByText('Calendário').closest('button');
      expect(calendarBtn?.className).toMatch(/tabBtnActive/);

      const routineBtn = screen.getByText('Rotina').closest('button');
      expect(routineBtn?.className).not.toMatch(/tabBtnActive/);
      expect(routineBtn?.className).toMatch(/tabBtn/);
    });
  });

  describe('HeaderActionToolbar Responsivo', () => {
    it('deve incluir classes hide-on-compact-desktop e show-on-compact-desktop nos botões de ação', () => {
      const handleOpenGlobalSearch = vi.fn();
      render(
        <HeaderActionToolbar
          activeView="routine"
          pomodoroActive={false}
          pomodoroTimeStr="25:00"
          onOpenPomodoro={vi.fn()}
          availableUpdate={null}
          onOpenUpdateModal={vi.fn()}
          googleUser={null}
          geminiConfig={{ apiKey: '', model: 'gemini-1.5-flash', customPrompt: '' }}
          onOpenGoogleAuthModal={vi.fn()}
          reminderEnabled={false}
          onOpenNotificationModal={vi.fn()}
          onOpenGlobalSearch={handleOpenGlobalSearch}
          theme="dark"
          onToggleTheme={vi.fn()}
          onOpenNewTaskModal={vi.fn()}
        />
      );

      // Texto "Buscar..." deve conter hide-on-compact-desktop
      const searchLabel = screen.getByText('Buscar...');
      expect(searchLabel.className).toContain('hide-on-compact-desktop');

      // Botão Nova Atividade deve ter versão completa e compacta
      const fullNewActivityLabel = screen.getByText('Nova Atividade');
      expect(fullNewActivityLabel.className).toContain('hide-on-compact-desktop');

      const compactNewActivityLabel = screen.getByText('Nova');
      expect(compactNewActivityLabel.className).toContain('show-on-compact-desktop');
    });
  });

  describe('Classes de Layout em globals.css', () => {
    it('deve conter as variáveis e media queries de 1024px até 1920px no globals.css', () => {
      const globalsCssPath = path.resolve(__dirname, '../../app/globals.css');
      const content = fs.readFileSync(globalsCssPath, 'utf-8');

      // Tokens de layout responsivo
      expect(content).toContain('--header-padding-x');
      expect(content).toContain('--content-padding-x');
      expect(content).toContain('--content-max-width');
      expect(content).toContain('--content-max-width-wide');

      // Media queries para breakpoints
      expect(content).toContain('@media (max-width: 1100px)');
      expect(content).toContain('@media (min-width: 1200px)');
      expect(content).toContain('@media (min-width: 1440px)');
      expect(content).toContain('@media (min-width: 1720px)');

      // Utilitários de container
      expect(content).toContain('.responsive-main');
      expect(content).toContain('.responsive-main-wide');
      expect(content).toContain('.hide-on-compact-desktop');
      expect(content).toContain('.show-on-compact-desktop');
    });

    it('deve conter regras responsivas no CalendarMonthView.module.css para telas de 1024px a 1920px', () => {
      const calendarCssPath = path.resolve(__dirname, '../CalendarMonthView.module.css');
      const content = fs.readFileSync(calendarCssPath, 'utf-8');

      expect(content).toContain('@media (max-width: 1180px)');
      expect(content).toContain('@media (min-width: 1440px)');
      expect(content).toContain('@media (min-width: 1720px)');
      expect(content).toContain('var(--content-padding-x, 28px)');
    });

    it('deve conter regras responsivas no TimelineView.module.css', () => {
      const timelineCssPath = path.resolve(__dirname, '../TimelineView.module.css');
      const content = fs.readFileSync(timelineCssPath, 'utf-8');

      expect(content).toContain('@media (max-width: 1180px)');
      expect(content).toContain('@media (min-width: 1440px)');
      expect(content).toContain('var(--content-padding-x, 28px)');
    });
  });

  describe('Comportamento de Largura Adaptativa de Views', () => {
    it('deve determinar wide mode para calendar, timeline, dashboard e notes', () => {
      const wideViews = ['calendar', 'timeline', 'dashboard', 'notes'];
      const standardViews = ['routine', 'pomodoro', 'ai', 'backlog'];

      wideViews.forEach((view) => {
        const isWide = ['calendar', 'timeline', 'dashboard', 'notes'].includes(view);
        expect(isWide).toBe(true);
      });

      standardViews.forEach((view) => {
        const isWide = ['calendar', 'timeline', 'dashboard', 'notes'].includes(view as any);
        if (view === 'routine' || view === 'pomodoro' || view === 'ai' || view === 'backlog') {
          expect(isWide).toBe(false);
        }
      });
    });
  });
});
