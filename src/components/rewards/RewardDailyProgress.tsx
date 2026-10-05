'use client';
import React, { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { emptyDay, localDay } from '../../services/rewards/engine';
import styles from '../RewardsView.module.css';

export function RewardDailyProgress({ expanded = false }: { expanded?: boolean }) {
  const rewards = useFlowStore((s) => s.rewards);
  const setView = useFlowStore((s) => s.setActiveView);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  if (!rewards || (!expanded && !rewards.preferences.visible)) return null;
  const day = localDay(clock, rewards.wallet.offset);
  const daily = rewards.days[day] || emptyDay(rewards.wallet, day);
  const pending = rewards.pending.filter((event) => event.kind === 'task' && event.day === day).length;
  const complete = daily.tasks >= daily.goal;
  const last = Object.values(rewards.receipts).filter((receipt) => receipt.day === day && ['task', 'focus'].includes(receipt.kind) && receipt.xp > 0).sort((a,b) => b.revision-a.revision)[0];
  return <div className={`${styles.daily} ${expanded ? '' : styles.dailyCompact}`}>
    <div><span className={styles.eyebrow}><Leaf size={14} /> SEU PROGRESSO DE HOJE</span><h3>{daily.planned ? complete ? 'Meta concluída. Bom trabalho.' : `${Math.min(daily.tasks, daily.goal)}/${daily.goal} tarefas da sua meta` : 'Hoje é um dia sem meta planejada.'}</h3>
      <p aria-live="polite">{pending > 0 ? `${pending} ${pending === 1 ? 'conclusão aguardando confirmação' : 'conclusões aguardando confirmação'}.` : last ? `Último ganho: +${last.xp} XP · +${last.coins} moedas${last.tickets ? ` · +${last.tickets} ${last.tickets === 1 ? 'bilhete' : 'bilhetes'}` : ''}.` : daily.planned ? complete ? 'Seu bônus diário foi guardado.' : 'Conclua tarefas da sua rotina para avançar.' : 'As tarefas ainda geram XP e moedas, sem bônus de meta.'}</p></div>
    {expanded ? <><progress value={Math.min(daily.tasks, daily.goal)} max={daily.goal} aria-label="Meta diária de tarefas" /><small>{daily.focus}/3 sessões de foco · {daily.coins}/50 moedas diárias</small></> : <button onClick={() => setView('rewards')}>Ver Refúgio →</button>}
  </div>;
}
