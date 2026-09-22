import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Zap, ChevronDown, Check, RefreshCw } from 'lucide-react';
import { GeminiModelOption } from '../../services/geminiService';
import { sounds } from '../../utils/audio';

export interface GeminiModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  availableModels: GeminiModelOption[];
  onRefreshModels?: () => void;
  showRefreshButton?: boolean;
}

export const GeminiModelSelector: React.FC<GeminiModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  availableModels,
  onRefreshModels,
  showRefreshButton = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const selectedModelObj = availableModels.find((m) => m.id === selectedModel);
  const selectedTitle = selectedModelObj
    ? selectedModelObj.displayName.split('(')[0].trim()
    : selectedModel;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Modelo do Gemini:</label>
        {showRefreshButton && onRefreshModels && (
          <button
            type="button"
            onClick={() => {
              onRefreshModels();
              sounds.playTick();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366F1',
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={11} /> Atualizar modelos
          </button>
        )}
      </div>

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
          onClick={() => {
            setIsDropdownOpen((prev) => !prev);
            sounds.playTick();
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '11px 14px',
            borderRadius: '12px',
            border: isDropdownOpen ? '1px solid #6366F1' : '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.88rem',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: isDropdownOpen ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
            transition: 'all 0.2s ease',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: selectedModel.includes('pro')
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(99, 102, 241, 0.15)',
                color: selectedModel.includes('pro') ? '#A855F7' : '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {selectedModel.includes('pro') ? <Sparkles size={15} /> : <Zap size={15} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTitle}
                </span>
                {selectedModel === 'gemini-2.5-flash' && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10B981',
                      fontWeight: 600,
                    }}
                  >
                    Recomendado
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {selectedModel.includes('pro')
                  ? 'Raciocínio Analítico Avançado'
                  : 'Nova Geração Ultra-Rápida'}
              </span>
            </div>
          </div>

          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-muted)',
              transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          />
        </button>

        {/* Menu Flutuante */}
        {isDropdownOpen && (
          <div
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 60,
              backgroundColor: 'var(--bg-elevated, #18181B)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '8px',
              maxHeight: '280px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                padding: '4px 8px 6px',
              }}
            >
              Modelos de IA Disponíveis
            </div>

            {availableModels.map((m) => {
              const isSelected = selectedModel === m.id;
              const isPro = m.id.includes('pro');
              const isRecommended = m.id === 'gemini-2.5-flash';
              const cleanTitle = m.displayName.split('(')[0].trim();
              const subtitle = m.displayName.includes('(')
                ? m.displayName.split('(')[1].replace(')', '').trim()
                : isPro
                  ? 'Raciocínio Avançado'
                  : 'Ultra-Rápido';

              return (
                <div
                  key={m.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsDropdownOpen(false);
                    sounds.playTick();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    marginBottom: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: isPro
                          ? 'rgba(168, 85, 247, 0.15)'
                          : 'rgba(99, 102, 241, 0.15)',
                        color: isPro ? '#A855F7' : '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isPro ? <Sparkles size={14} /> : <Zap size={14} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {cleanTitle}
                        </span>
                        {isRecommended && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              fontWeight: 600,
                            }}
                          >
                            Recomendado
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: '1px',
                        }}
                      >
                        {subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check size={16} style={{ color: '#6366F1', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
