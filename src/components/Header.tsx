'use client';

import React from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { HeaderBrand } from './header/HeaderBrand';
import { HeaderNavTabs } from './header/HeaderNavTabs';
import { HeaderActionToolbar } from './header/HeaderActionToolbar';
import { HeaderRoutineSelector } from './header/HeaderRoutineSelector';
import { HeaderDateNavigator } from './header/HeaderDateNavigator';

export const Header: React.FC = () => {
  const activeView = useFlowStore((s) => s.activeView);
  const setActiveView = useFlowStore((s) => s.setActiveView);

  const routineTypes = useFlowStore((s) => s.routineTypes);
  const selectedRoutineTypeId = useFlowStore((s) => s.selectedRoutineTypeId);
  const selectRoutineType = useFlowStore((s) => s.selectRoutineType);
  const openManageRoutinesModal = useFlowStore((s) => s.openManageRoutinesModal);

  const theme = useFlowStore((s) => s.theme);
  const toggleTheme = useFlowStore((s) => s.toggleTheme);
  const selectedDate = useFlowStore((s) => s.selectedDate);
  const setDate = useFlowStore((s) => s.setDate);
  const openTaskModal = useFlowStore((s) => s.openTaskModal);
  const backlog = useFlowStore((s) => s.backlog);
  const notes = useFlowStore((s) => s.notes);
  const pomodoro = useFlowStore((s) => s.pomodoro);
  const reminderSettings = useFlowStore((s) => s.reminderSettings);
  const openNotificationModal = useFlowStore((s) => s.openNotificationModal);
  const availableUpdate = useFlowStore((s) => s.availableUpdate);
  const openUpdateModal = useFlowStore((s) => s.openUpdateModal);

  const googleUser = useFlowStore((s) => s.googleUser);
  const geminiConfig = useFlowStore((s) => s.geminiConfig);
  const openGoogleAuthModal = useFlowStore((s) => s.openGoogleAuthModal);

  const pomodoroMinutes = Math.floor(pomodoro.timeLeftSeconds / 60);
  const pomodoroSeconds = pomodoro.timeLeftSeconds % 60;
  const liveTimeStr = `${String(pomodoroMinutes).padStart(2, '0')}:${String(pomodoroSeconds).padStart(2, '0')}`;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        backgroundColor: theme === 'dark' ? 'rgba(8, 8, 10, 0.85)' : 'rgba(248, 249, 250, 0.88)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top Bar: Brand, Views Switcher, Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Brand & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <HeaderBrand />
          <HeaderNavTabs
            activeView={activeView}
            onSelectView={setActiveView}
            pomodoroActive={pomodoro.isActive}
            pomodoroTimeStr={liveTimeStr}
            notesCount={notes.length}
            backlogCount={backlog.length}
          />
        </div>

        {/* Right Controls */}
        <HeaderActionToolbar
          activeView={activeView}
          pomodoroActive={pomodoro.isActive}
          pomodoroTimeStr={liveTimeStr}
          onOpenPomodoro={() => setActiveView('pomodoro')}
          availableUpdate={availableUpdate}
          onOpenUpdateModal={openUpdateModal}
          googleUser={googleUser}
          geminiConfig={geminiConfig}
          onOpenGoogleAuthModal={openGoogleAuthModal}
          reminderEnabled={reminderSettings.enabled}
          onOpenNotificationModal={openNotificationModal}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenNewTaskModal={() => openTaskModal(null)}
        />
      </div>

      {/* Sub-bar: Visível para selecionar Tipos de Rotina e Data */}
      {(activeView === 'routine' || activeView === 'dashboard') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '4px',
          }}
        >
          <HeaderRoutineSelector
            routineTypes={routineTypes}
            selectedRoutineTypeId={selectedRoutineTypeId}
            onSelectRoutineType={selectRoutineType}
            onOpenManageModal={openManageRoutinesModal}
          />
          <HeaderDateNavigator selectedDate={selectedDate} onDateChange={setDate} />
        </div>
      )}
    </header>
  );
};
