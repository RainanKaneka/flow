'use client';

import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import { ROUTINE_TEMPLATES } from '../data/routineTemplates';
import { sounds } from '../utils/audio';
import styles from './OnboardingWizard.module.css';
import {
  Sparkles,
  Zap,
  GraduationCap,
  HeartPulse,
  ArrowRight,
  ArrowLeft,
  Clock,
  Bell,
  Volume2,
  Moon,
  Sun,
  X,
  Target,
  Rocket,
  ShieldCheck,
} from 'lucide-react';

const OBJECTIVE_OPTIONS = [
  {
    id: 'focus',
    title: 'Foco & Deep Work',
    desc: 'Minimizar distrações e executar blocos de trabalho ininterrupto.',
    icon: Zap,
    templateHintId: 'deep_work',
  },
  {
    id: 'study',
    title: 'Estudos & Concursos',
    desc: 'Constância diária, resolução de questões e retenção de conteúdo.',
    icon: GraduationCap,
    templateHintId: 'study',
  },
  {
    id: 'balance',
    title: 'Equilíbrio & Bem-Estar',
    desc: 'Harmonizar hábitos saudáveis, foco profissional e noites restauradoras.',
    icon: HeartPulse,
    templateHintId: 'balance',
  },
  {
    id: 'projects',
    title: 'Empreendedorismo & Projetos',
    desc: 'Organizar entregas, ideias e acelerar o ritmo de execução.',
    icon: Rocket,
    templateHintId: 'deep_work',
  },
];

export const OnboardingWizard: React.FC = () => {
  const hasCompletedOnboarding = useFlowStore((s) => s.hasCompletedOnboarding);
  const isOnboardingModalOpen = useFlowStore((s) => s.isOnboardingModalOpen);
  const userProfile = useFlowStore((s) => s.userProfile);
  const googleUser = useFlowStore((s) => s.googleUser);
  const currentTheme = useFlowStore((s) => s.theme);
  const currentReminders = useFlowStore((s) => s.reminderSettings);
  const completeOnboarding = useFlowStore((s) => s.completeOnboarding);
  const closeOnboardingModal = useFlowStore((s) => s.closeOnboardingModal);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState<string>(
    userProfile?.name || googleUser?.name || ''
  );
  const [objective, setObjective] = useState<string>(
    userProfile?.objective || 'focus'
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('deep_work');
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(currentTheme || 'dark');
  const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(50);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(currentReminders?.enabled ?? true);
  const [reminderAdvanceMinutes, _setReminderAdvanceMinutes] = useState<number>(
    currentReminders?.advanceMinutes ?? 5
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    currentReminders?.soundEnabled ?? true
  );

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = ROUTINE_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setPomodoroMinutes(tmpl.recommendedPomodoroMinutes);
    }
    sounds.playTick();
  };

  // Se já concluiu e não está com modal explicitamente aberto, não renderiza
  if (hasCompletedOnboarding && !isOnboardingModalOpen) {
    return null;
  }

  const selectedTemplate =
    ROUTINE_TEMPLATES.find((t) => t.id === selectedTemplateId) || ROUTINE_TEMPLATES[0];

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    sounds.playTick();
    if (step < 4) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrev = () => {
    sounds.playTick();
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleFinish = () => {
    if (soundEnabled) {
      sounds.playGlassChime();
    }

    completeOnboarding({
      name: name.trim() || 'Usuário',
      objective,
      templateId: selectedTemplateId,
      theme: selectedTheme,
      pomodoroDurationMinutes: pomodoroMinutes,
      remindersEnabled,
      reminderAdvanceMinutes,
      soundEnabled,
    });
  };

  const handleSkip = () => {
    if (soundEnabled) {
      sounds.playGlassChime();
    }

    completeOnboarding({
      name: name.trim() || 'Usuário',
      objective: 'focus',
      templateId: 'deep_work',
      theme: selectedTheme,
      pomodoroDurationMinutes: 50,
      remindersEnabled: true,
      reminderAdvanceMinutes: 5,
      soundEnabled: true,
    });
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          {/* Header & Steps Indicator */}
          <div className={styles.wizardHeader}>
            <div className={styles.topBar}>
              <div className={styles.brandBadge}>
                <Sparkles size={16} />
                <span>Flow Setup</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSkip}
                  className={styles.skipButton}
                  title="Pular configuração inicial com valores recomendados"
                >
                  Pular configuração
                </button>

                {hasCompletedOnboarding && (
                  <button
                    type="button"
                    onClick={closeOnboardingModal}
                    className={styles.skipButton}
                    title="Fechar setup"
                    aria-label="Fechar setup"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Marcadores de passos */}
            <div className={styles.stepIndicators}>
              <span className={`${styles.stepBadge} ${step >= 1 ? styles.stepBadgeActive : ''}`}>
                1. Identidade
              </span>
              <span className={`${styles.stepBadge} ${step >= 2 ? styles.stepBadgeActive : ''}`}>
                2. Rotina
              </span>
              <span className={`${styles.stepBadge} ${step >= 3 ? styles.stepBadgeActive : ''}`}>
                3. Preferências
              </span>
              <span className={`${styles.stepBadge} ${step === 4 ? styles.stepBadgeActive : ''}`}>
                4. Conclusão
              </span>
            </div>
          </div>

          {/* Corpo do Step */}
          <div className={styles.stepBody}>
            {/* STEP 1: Nome & Objetivo */}
            {step === 1 && (
              <>
                <div className={styles.titleArea}>
                  <h2 id="wizard-title" className={styles.stepTitle}>
                    Bem-vindo ao Flow
                  </h2>
                  <p className={styles.stepSubtitle}>
                    O seu novo refúgio desktop para foco profundo, disciplina e rotina intencional.
                    Vamos personalizar sua experiência em poucos segundos.
                  </p>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="user-name-input" className={styles.inputLabel}>
                    <Target size={14} color="var(--accent-primary)" />
                    <span>Como devemos te chamar?</span>
                  </label>
                  <input
                    id="user-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) {
                        handleNext();
                      }
                    }}
                    placeholder="Digite seu nome ou apelido (ex: Alex)"
                    className={styles.textInput}
                    autoFocus
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Qual o seu objetivo principal?</span>
                  </label>
                  <div className={styles.objectiveGrid}>
                    {OBJECTIVE_OPTIONS.map((opt) => {
                      const IconComponent = opt.icon;
                      const isSelected = objective === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-label={`Selecionar objetivo ${opt.title}`}
                          onClick={() => {
                            setObjective(opt.id);
                            handleSelectTemplate(opt.templateHintId);
                          }}
                          className={`${styles.objectiveCard} ${
                            isSelected ? styles.objectiveCardSelected : ''
                          }`}
                        >
                          <div className={styles.objectiveCardHeader}>
                            <IconComponent
                              size={18}
                              color={isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                            />
                            <span className={styles.objectiveCardTitle}>{opt.title}</span>
                          </div>
                          <p className={styles.objectiveCardDesc}>{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Template de Rotina */}
            {step === 2 && (
              <>
                <div className={styles.titleArea}>
                  <h2 id="wizard-title" className={styles.stepTitle}>
                    Escolha seu ponto de partida
                  </h2>
                  <p className={styles.stepSubtitle}>
                    Selecione uma estrutura de rotina pré-configurada inspirada em métodos
                    comprovados. Você poderá editar cada atividade e horário quando quiser.
                  </p>
                </div>

                <div className={styles.templateGrid}>
                  {ROUTINE_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        aria-label={`Selecionar template ${tmpl.title}`}
                        onClick={() => {
                          handleSelectTemplate(tmpl.id);
                        }}
                        className={`${styles.templateCard} ${
                          isSelected ? styles.templateCardSelected : ''
                        }`}
                      >
                        <div className={styles.templateTopRow}>
                          <span className={styles.templateTitle}>{tmpl.title}</span>
                          <span className={styles.templateBadge}>{tmpl.badge}</span>
                        </div>
                        <p className={styles.templateSubtitle}>{tmpl.subtitle}</p>

                        <div className={styles.templateTasksPreview}>
                          {tmpl.tasks.slice(0, 4).map((task) => (
                            <span key={task.id} className={styles.taskTagBadge}>
                              {task.startTime} {task.title.split(':')[0]}
                            </span>
                          ))}
                          {tmpl.tasks.length > 4 && (
                            <span className={styles.taskTagBadge}>
                              +{tmpl.tasks.length - 4} atividades
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP 3: Preferências & Foco */}
            {step === 3 && (
              <>
                <div className={styles.titleArea}>
                  <h2 id="wizard-title" className={styles.stepTitle}>
                    Preferências de Foco & Ambiente
                  </h2>
                  <p className={styles.stepSubtitle}>
                    Configure seu estilo de trabalho, sons táteis e alertas nativos.
                  </p>
                </div>

                {/* Tema Visual */}
                <div className={styles.preferenceSection}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceTitle}>
                      {selectedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                      Tema da Interface
                    </span>
                    <span className={styles.preferenceSubtitle}>
                      {selectedTheme === 'dark'
                        ? 'OLED Minimalista com contraste refinado'
                        : 'Cerâmica Clara moderna e suave'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTheme('dark');
                        sounds.playTick();
                      }}
                      className={`${styles.switchButton} ${
                        selectedTheme === 'dark' ? styles.switchButtonActive : ''
                      }`}
                    >
                      <Moon size={14} /> Escuro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTheme('light');
                        sounds.playTick();
                      }}
                      className={`${styles.switchButton} ${
                        selectedTheme === 'light' ? styles.switchButtonActive : ''
                      }`}
                    >
                      <Sun size={14} /> Claro
                    </button>
                  </div>
                </div>

                {/* Duração do Pomodoro */}
                <div className={styles.preferenceSection}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceTitle}>
                      <Clock size={16} />
                      Ritmo de Foco (Pomodoro)
                    </span>
                    <span className={styles.preferenceSubtitle}>
                      Duração recomendada para cada bloco ininterrupto
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPomodoroMinutes(25);
                        sounds.playTick();
                      }}
                      className={`${styles.switchButton} ${
                        pomodoroMinutes === 25 ? styles.switchButtonActive : ''
                      }`}
                    >
                      25 min (Clássico)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPomodoroMinutes(50);
                        sounds.playTick();
                      }}
                      className={`${styles.switchButton} ${
                        pomodoroMinutes === 50 ? styles.switchButtonActive : ''
                      }`}
                    >
                      50 min (Deep Work)
                    </button>
                  </div>
                </div>

                {/* Lembretes Nativos */}
                <div className={styles.preferenceSection}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceTitle}>
                      <Bell size={16} />
                      Lembretes Nativos do Sistema
                    </span>
                    <span className={styles.preferenceSubtitle}>
                      Notificações do Windows para avisar o início de cada atividade
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRemindersEnabled(!remindersEnabled);
                        sounds.playTick();
                      }}
                      className={`${styles.switchButton} ${
                        remindersEnabled ? styles.switchButtonActive : ''
                      }`}
                    >
                      {remindersEnabled ? 'Ativados' : 'Desativados'}
                    </button>
                  </div>
                </div>

                {/* Feedback Sonoro Tátil */}
                <div className={styles.preferenceSection}>
                  <div className={styles.preferenceInfo}>
                    <span className={styles.preferenceTitle}>
                      <Volume2 size={16} />
                      Sons Táteis Sintetizados
                    </span>
                    <span className={styles.preferenceSubtitle}>
                      Tigela tibetana (528Hz) e cliques harmônicos sutis ao concluir tarefas
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        if (!soundEnabled) sounds.playTick();
                      }}
                      className={`${styles.switchButton} ${
                        soundEnabled ? styles.switchButtonActive : ''
                      }`}
                    >
                      {soundEnabled ? 'Ativado' : 'Mudo'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 4: Conclusão & Resumo */}
            {step === 4 && (
              <>
                <div className={styles.titleArea}>
                  <h2 id="wizard-title" className={styles.stepTitle}>
                    Tudo pronto, {name || 'Viajante'}!
                  </h2>
                  <p className={styles.stepSubtitle}>
                    Configuramos o seu santuário de produtividade. Veja o resumo do seu setup:
                  </p>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <Target size={16} color="var(--accent-primary)" />
                      Nome do Usuário
                    </span>
                    <span className={styles.summaryValue}>{name || 'Usuário'}</span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <Zap size={16} color="var(--accent-primary)" />
                      Template de Rotina
                    </span>
                    <span className={styles.summaryValue}>
                      {selectedTemplate.title} ({selectedTemplate.tasks.length} atividades)
                    </span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <Clock size={16} color="var(--accent-primary)" />
                      Sessão de Foco Padrão
                    </span>
                    <span className={styles.summaryValue}>{pomodoroMinutes} minutos</span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <Bell size={16} color="var(--accent-primary)" />
                      Lembretes & Notificações
                    </span>
                    <span className={styles.summaryValue}>
                      {remindersEnabled ? `Ativos (${reminderAdvanceMinutes} min antes)` : 'Desativados'}
                    </span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <ShieldCheck size={16} color="var(--accent-primary)" />
                      Armazenamento Seguro
                    </span>
                    <span className={styles.summaryValue}>SQLite Nativo Local</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer de Navegação */}
          <div className={styles.wizardFooter}>
            {step > 1 ? (
              <button type="button" onClick={handlePrev} className={styles.backButton}>
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !name.trim()}
                className={styles.primaryButton}
              >
                <span>Continuar</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className={styles.primaryButton}
              >
                <Sparkles size={16} />
                <span>Começar minha jornada no Flow</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
