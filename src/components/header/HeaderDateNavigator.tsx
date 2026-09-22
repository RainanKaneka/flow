import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export interface HeaderDateNavigatorProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
}

export const HeaderDateNavigator: React.FC<HeaderDateNavigatorProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    onDateChange(`${newY}-${newM}-${newD}`);
  };

  const isToday = () => {
    const today = new Date();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return today.getFullYear() === y && today.getMonth() === m - 1 && today.getDate() === d;
  };

  const formatDateDisplay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayAndMonth = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
    return `${weekday.toUpperCase()}, ${dayAndMonth}`;
  };

  const handleSetToday = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '9999px',
        padding: '3px 6px',
        gap: '4px',
      }}
    >
      <button
        onClick={() => changeDateByDays(-1)}
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        title="Dia anterior"
        aria-label="Dia anterior"
      >
        <ChevronLeft size={15} />
      </button>

      <button
        onClick={handleSetToday}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '2px 8px',
        }}
        title="Ir para hoje"
      >
        <Calendar size={13} color="var(--accent-primary)" />
        <span>{formatDateDisplay()}</span>
        {isToday() && (
          <span
            style={{
              fontSize: '9px',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              padding: '1px 5px',
              borderRadius: '9999px',
              fontWeight: 700,
            }}
          >
            HOJE
          </span>
        )}
      </button>

      <button
        onClick={() => changeDateByDays(1)}
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        title="Próximo dia"
        aria-label="Próximo dia"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
};
