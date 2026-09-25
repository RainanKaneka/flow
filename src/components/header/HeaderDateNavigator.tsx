import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

export interface HeaderDateNavigatorProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const HeaderDateNavigator: React.FC<HeaderDateNavigatorProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [y, m] = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState(y || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(m ? m - 1 : new Date().getMonth());

  useEffect(() => {
    const [currY, currM] = selectedDate.split('-').map(Number);
    if (currY && currM) {
      setViewYear(currY);
      setViewMonth(currM - 1);
    }
  }, [selectedDate]);

  // Fechar popover ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!isCalendarOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCalendarOpen]);

  const changeDateByDays = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    dateObj.setDate(dateObj.getDate() + days);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    onDateChange(`${newY}-${newM}-${newD}`);
  };

  const getTodayStr = () => {
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = String(today.getMonth() + 1).padStart(2, '0');
    const todayD = String(today.getDate()).padStart(2, '0');
    return `${todayY}-${todayM}-${todayD}`;
  };

  const isToday = () => {
    return selectedDate === getTodayStr();
  };

  const formatDateDisplay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayAndMonth = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
    return `${weekday.toUpperCase()}, ${dayAndMonth}`;
  };

  const handleSetToday = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const todayStr = getTodayStr();
    onDateChange(todayStr);
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsCalendarOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear((prevY) => prevY - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prevM) => prevM - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear((prevY) => prevY + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prevM) => prevM + 1);
    }
  };

  // Gerar dias para a matriz do calendário
  const todayStr = getTodayStr();
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Dom) - 6 (Sab)
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  // Dias do mês anterior
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  // Dias do próximo mês para fechar a grade de 7 colunas
  const remainder = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remainder; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Barra de Navegação Compacta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '9999px',
          padding: '3px 6px',
          gap: '4px',
          transition: 'all 0.15s ease',
          boxShadow: isCalendarOpen ? '0 0 0 2px var(--accent-primary)' : 'none',
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
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          aria-label="Abrir seletor de data"
          aria-expanded={isCalendarOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isCalendarOpen ? 'var(--bg-elevated)' : 'transparent',
            border: 'none',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '3px 8px',
            transition: 'background 0.15s ease',
          }}
          title="Clique para abrir o calendário"
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

      {/* Popover Mini Calendário Interativo */}
      {isCalendarOpen && (
        <div
          data-testid="mini-calendar-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '276px',
            background: 'var(--bg-elevated)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            userSelect: 'none',
          }}
        >
          {/* Cabeçalho do Popover */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {MONTH_NAMES_PT[viewMonth]} {viewYear}
            </span>

            {/* Botão rápido: Voltar para Hoje */}
            <button
              type="button"
              onClick={handleSetToday}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
                background: isToday() ? 'var(--success-bg)' : 'var(--bg-primary)',
                color: isToday() ? 'var(--success)' : 'var(--text-secondary)',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Voltar para a data de hoje"
            >
              <RotateCcw size={10} />
              <span>Hoje</span>
            </button>
          </div>

          {/* Dias da Semana */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              textAlign: 'center',
              marginBottom: '6px',
            }}
          >
            {WEEKDAYS_SHORT_PT.map((dayName, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: idx === 0 || idx === 6 ? 'var(--text-muted)' : 'var(--text-secondary)',
                  padding: '2px 0',
                }}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Grade de Dias */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '3px',
            }}
          >
            {calendarDays.map((day) => {
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => {
                    onDateChange(day.dateStr);
                    setIsCalendarOpen(false);
                  }}
                  style={{
                    height: '30px',
                    borderRadius: '8px',
                    border: day.isSelected
                      ? 'none'
                      : day.isToday
                        ? '1px solid var(--success)'
                        : '1px solid transparent',
                    background: day.isSelected
                      ? 'var(--accent-primary)'
                      : day.isToday
                        ? 'var(--success-bg)'
                        : 'transparent',
                    color: day.isSelected
                      ? '#FFFFFF'
                      : day.isToday
                        ? 'var(--success)'
                        : day.isCurrentMonth
                          ? 'var(--text-primary)'
                          : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: day.isSelected || day.isToday ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: day.isCurrentMonth ? 1 : 0.4,
                    transition: 'all 0.12s ease',
                    boxShadow: day.isSelected ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                  }}
                  title={day.dateStr}
                >
                  {day.dayNum}
                </button>
              );
            })}
          </div>

          {/* Rodapé com atalho direto */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {selectedDate.split('-').reverse().join('/')}
            </span>
            <button
              type="button"
              onClick={handleSetToday}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={11} />
              <span>Voltar para hoje</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

