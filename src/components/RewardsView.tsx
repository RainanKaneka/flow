'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Coins, Leaf, RefreshCw, Ticket, Timer, X } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import type { RewardAccount, RewardAppearanceId, RewardGoal, RewardItemId } from '../types/rewards';
import { dayLabel, goalForDay, localDay, REWARD_APPEARANCES, REWARD_ITEMS, rewardLevel, weekStart } from '../services/rewards/engine';
import { getGuestImportPreview } from '../services/rewards/runtime';
import { RewardDailyProgress } from './rewards/RewardDailyProgress';
import { AquaticView } from './rewards/AquaticView';
import { AquaticCustomization } from './rewards/AquaticCustomization';
import styles from './RewardsView.module.css';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function RewardsView() {
  const owner = useFlowStore((s) => s.rewardOwner);
  const loaded = useFlowStore((s) => !!s.rewards);
  return <RewardsViewContent key={`${owner}:${loaded}`} />;
}
function RewardsViewContent() {
  const rewards = useFlowStore((s) => s.rewards);
  const status = useFlowStore((s) => s.rewardStatus);
  const error = useFlowStore((s) => s.rewardError);
  const owner = useFlowStore((s) => s.rewardOwner);
  const buy = useFlowStore((s) => s.buyReward);
  const equip = useFlowStore((s) => s.equipReward);
  const configure = useFlowStore((s) => s.configureRewardGoal);
  const flush = useFlowStore((s) => s.flushRewards);
  const importGuest = useFlowStore((s) => s.importGuestRewards);
  const setVisible = useFlowStore((s) => s.setRewardsVisible);
  const setView = useFlowStore((s) => s.setActiveView);
  const openProfile = useFlowStore((s) => s.openProfileModal);
  const name = useFlowStore((s) => s.userProfile?.name || 'Seu');
  const tab = useFlowStore((s) => s.rewardTab);
  const setTab = useFlowStore((s) => s.setRewardTab);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<RewardItemId | null>(null);
  const [goal, setGoal] = useState<RewardGoal>(() => rewards?.wallet.goals[0].target || 3);
  const [weekdays, setWeekdays] = useState(() => rewards?.wallet.goals[0].weekdays || [0, 1, 2, 3, 4, 5, 6]);
  const [guest, setGuest] = useState<RewardAccount | null>(null);
  const [importPreview, setImportPreview] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [catalogSection, setCatalogSection] = useState<'aquarium' | 'profile'>('aquarium');
  const [appearance, setAppearance] = useState<RewardAppearanceId>('moss');
  const dialog = useRef<HTMLDivElement>(null);
  const wallet = rewards?.wallet;
  useEffect(() => {
    if (owner && owner !== 'guest') void getGuestImportPreview().then(setGuest).catch(() => undefined);
  }, [owner]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!confirm && !importPreview) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [confirm, importPreview]);
  const operation = async (action: () => Promise<void>, success: string) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try { await action(); setNotice(success); setConfirm(null); setImportPreview(false); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setBusy(false); }
  };
  if (!wallet || !rewards) return <section className={styles.root} aria-busy={status === 'loading'}><h1>Refúgio</h1><p>{error || 'Carregando seu progresso…'}</p>{error && <button onClick={() => window.location.reload()}>Tentar novamente</button>}</section>;
  const today = localDay(clock, wallet.offset);
  const week = rewards.weeks[weekStart(today)];
  const level = rewardLevel(wallet.xp);
  const todayGoal = goalForDay(wallet, today);
  const selected = REWARD_ITEMS.find((item) => item.id === confirm);
  const readyCloud = owner === 'guest' || status === 'synced';
  return <section className={styles.root}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>SEU ESPAÇO NO FLOW</p><h1>Refúgio</h1><p>Pequenos passos. Um lugar cada vez mais seu.</p></div>
      <div className={styles.balances} aria-label="Seus saldos">
        <span><Leaf size={17} /><strong>{wallet.xp.toLocaleString('pt-BR')}</strong> XP</span>
        <span className={styles.coins}><Coins size={17} /><strong>{wallet.coins}</strong> {wallet.coins === 1 ? 'moeda' : 'moedas'}</span>
        <span><Ticket size={17} /><strong>{wallet.tickets}</strong> {wallet.tickets === 1 ? 'bilhete' : 'bilhetes'}</span>
      </div>
    </header>
    <div className={styles.syncLine} role="status">
      <span>{owner === 'guest' ? 'Progresso salvo neste dispositivo' : status === 'synced' ? 'Saldo confirmado na nuvem' : status === 'syncing' ? 'Confirmando na nuvem…' : 'Aguardando conexão com a nuvem'}{rewards.pending.length > 0 && ` · ${rewards.pending.length} ${rewards.pending.length === 1 ? 'atividade pendente' : 'atividades pendentes'}`}</span>
      {owner !== 'guest' && <button disabled={busy || status === 'syncing'} onClick={() => operation(flush, 'Sincronização solicitada.')}><RefreshCw size={14} /> Sincronizar</button>}
    </div>
    {error && <p className={styles.alert} role="alert">{error}</p>}
    {rewards.rejected.length > 0 && <details className={styles.alert}><summary>Atividades sem recompensa ({rewards.rejected.length})</summary>{rewards.rejected.map((item) => <p key={item.id}>{item.reason}</p>)}</details>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <nav className={styles.tabs} aria-label="Refúgio">
      {([['aquarium', 'Meu aquário'], ['fishing', 'Pescar'], ['collection', 'Coleção'], ['refuge', 'Meu progresso'], ['catalog', 'Aparências'], ['rules', 'Como funciona']] as const).map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    {(['aquarium', 'fishing', 'collection'] as const).some((id) => id === tab) && rewards.fishing && <AquaticView tab={tab as 'aquarium' | 'fishing' | 'collection'} navigate={setTab} />}
    {tab === 'refuge' && <>
      <div className={styles.overview}>
        <div className={styles.scene}>
          <RefugeScene />
          <div className={styles.sceneCaption}><span>UM PASSO POR VEZ</span><h2>{name === 'Seu' ? 'Seu ritmo tem valor.' : `${name.split(' ')[0]}, seu ritmo tem valor.`}</h2><p>Conclua uma tarefa e volte para ver seu progresso.</p><button onClick={() => setView('routine')}>Ir para minha rotina</button></div>
        </div>
        <div className={styles.progressColumn}>
          <div className={styles.level}><span>Nível {level.levelNumber}</span><h2>{level.title}</h2><p>{wallet.xp} / {level.nextLevelPoints} XP</p><progress aria-label="Progresso para o próximo nível" value={level.progressPercentage} max={100} /><small>O XP conquistado permanece com você.</small></div>
          <RewardDailyProgress expanded />
          <div className={styles.week}><h3>Sua semana</h3><div aria-label={`${week?.days.length || 0} dias ativos nesta semana`}>{Array.from({ length: 7 }, (_, index) => <span key={index} className={week?.days.includes(weekStart(today) + index) ? styles.activeDay : ''} title={dayLabel(weekStart(today) + index)}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][index]}</span>)}</div><p>{week?.rewarded ? 'Bônus recebido: 100 XP e 20 moedas.' : `${week?.days.length || 0}/4 dias com tarefas concluídas · +100 XP e +20 moedas`}</p></div>
        </div>
      </div>
      {guest && !rewards.importDone && <div className={styles.importBox}><div><h3>Seu progresso local pode vir com você</h3><p>Importe o XP e os itens deste dispositivo para sua conta.</p></div><button disabled={busy || !readyCloud} onClick={() => setImportPreview(true)}>Revisar importação</button></div>}
      <div className={styles.settings}>
        <div><h2>Uma meta que cabe no seu dia</h2><p>Alterações valem a partir de amanhã. Hoje: {todayGoal.target} {todayGoal.target === 1 ? 'tarefa' : 'tarefas'}.</p><small>O ciclo vira à meia-noite no fuso da sua conta: UTC{wallet.offset >= 0 ? '+' : ''}{wallet.offset / 60} ({wallet.timezone}).</small></div>
        <form onSubmit={(event) => { event.preventDefault(); void operation(() => configure(goal, weekdays), 'Meta salva para amanhã.'); }}>
          <label htmlFor="reward-goal">Meta diária</label><select id="reward-goal" value={goal} onChange={(event) => setGoal(Number(event.target.value) as RewardGoal)}>{[1, 2, 3].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'tarefa' : 'tarefas'}</option>)}</select>
          <fieldset><legend>Dias planejados</legend><div className={styles.dayChoices}>{DAYS.map((day, index) => <label key={day}><input type="checkbox" checked={weekdays.includes(index)} onChange={() => setWeekdays((days) => days.includes(index) ? days.filter((day) => day !== index) : [...days, index])} />{day}</label>)}</div></fieldset>
          <button type="submit" disabled={busy || !weekdays.length || !readyCloud}>Salvar para amanhã</button>
        </form>
      </div>
      <label className={styles.visibility}><input type="checkbox" checked={rewards.preferences.visible} onChange={(event) => void operation(() => setVisible(event.target.checked), 'Preferência salva.')} /> Mostrar progresso de recompensas na rotina</label>
    </>}
    {tab === 'catalog' && <>
      <div className={styles.catalogSections} role="group" aria-label="Tipo de aparência">
        <button aria-pressed={catalogSection === 'aquarium'} onClick={() => setCatalogSection('aquarium')}>Aquário</button>
        <button aria-pressed={catalogSection === 'profile'} onClick={() => setCatalogSection('profile')}>Aplicativo e perfil</button>
      </div>
      {catalogSection === 'aquarium' && rewards.fishing && <AquaticCustomization />}
      {catalogSection === 'profile' && <section className={styles.profileCatalog} data-appearance={appearance}>
      <div className={styles.sectionHeading}><div><h2>Aparências do aplicativo e perfil</h2><p>Escolha uma coleção. Cada cor, tema e moldura é desbloqueado e usado separadamente.</p></div><button onClick={openProfile}>Ver meu perfil</button></div>
      <div className={styles.appearanceChoices} role="group" aria-label="Coleções de aparência">{REWARD_APPEARANCES.map((set) => <button key={set.id} aria-pressed={appearance === set.id} onClick={() => setAppearance(set.id)}><span className={`${styles.appearanceSwatch} ${styles[set.id]}`} aria-hidden="true" /><span><strong>{set.name}</strong><small>{set.description}</small></span></button>)}</div>
      <div className={styles.appearanceIntro}><div><p className={styles.eyebrow}>COLEÇÃO {REWARD_APPEARANCES.find((set) => set.id === appearance)?.name.toUpperCase()}</p><h3>Três detalhes para combinar do seu jeito</h3></div><span>{REWARD_ITEMS.filter((item) => item.appearance === appearance && wallet.owned.includes(item.id)).length} de 3 desbloqueados</span></div>
      <div className={styles.catalog}>{REWARD_ITEMS.filter((item) => item.appearance === appearance).map((item) => {
        const owned = wallet.owned.includes(item.id);
        const active = rewards.preferences.equipped[item.slot] === item.id;
        const affordable = wallet.coins >= item.price;
        return <article key={item.id} className={styles.item}>
          <div className={`${styles.preview} ${styles[item.slot]}`} role="img" aria-label={`Prévia de ${item.name}`}>{item.slot === 'frame' ? <span>R</span> : item.slot === 'accent' ? <span><Check size={20} /> Uma tarefa por vez</span> : <div><i /><i /><i /></div>}</div>
          <div className={styles.itemBody}><p className={styles.eyebrow}>{item.slot === 'accent' ? 'COR DE DESTAQUE' : item.slot === 'theme' ? 'TEMA' : 'MOLDURA DE PERFIL'}</p><h3>{item.name}</h3><p>{item.description}</p>
            {owned ? <button disabled={busy} onClick={() => void operation(() => equip(active ? null : item.id, item.slot), active ? 'Aparência padrão restaurada.' : `${item.name} equipado.`)}>{active ? <><Check size={15} /> Usando · remover</> : 'Usar item'}</button>
              : <><button disabled={busy || !affordable || !readyCloud} onClick={() => setConfirm(item.id)}><Coins size={15} /> Desbloquear · {item.price}</button><small>{!readyCloud ? 'Confirme o saldo para desbloquear.' : !affordable ? `Faltam ${item.price - wallet.coins} moedas.` : 'Disponível com seu saldo.'}</small></>}
          </div>
        </article>;
      })}</div><p className={styles.catalogNote}>Cor, tema e moldura podem ser misturados entre coleções. Claro e escuro continuam disponíveis nas configurações.</p>
      </section>}
    </>}
    {tab === 'rules' && <div className={styles.rules}>
      <h2>Faça sua rotina. O progresso vem junto.</h2>
      <dl><div><dt><CheckCircle2 size={18} /> Tarefa concluída</dt><dd>50 XP e 5 moedas por tarefa, até cinco por dia. A primeira acrescenta 25 XP, 10 moedas e um bilhete. Você tem cinco segundos para desfazer antes da confirmação.</dd></div><div><dt><Timer size={18} /> Foco completo</dt><dd>20 XP e 2 moedas por sessão de pelo menos 25 minutos de foco, até três por dia. Descansos não geram recompensas. Você pode pausar e retomar o foco; reiniciar a sessão descarta o progresso dela.</dd></div><div><dt><Leaf size={18} /> Meta diária e semana</dt><dd>Nos dias planejados, metas de 1, 2 ou 3 tarefas acrescentam, respectivamente, 15/30/50 XP, 5/7/10 moedas e um bilhete. Quatro dias ativos na semana acrescentam 100 XP e 20 moedas.</dd></div><div><dt><Coins size={18} /> Seus saldos</dt><dd>Até 50 moedas diárias, além do bônus semanal. Compras usam o saldo confirmado. O XP nunca é gasto. Desfazer, excluir ou importar tarefas não rende a mesma recompensa duas vezes.</dd></div><div><dt><Ticket size={18} /> Bilhetes e pesca</dt><dd>Uma captura custa um bilhete e sempre entrega um peixe. O douradinho inicial é gratuito. Bilhetes não expiram, e pausas preservam a coleção e as garantias de raridade. Consulte as chances na aba Pescar.</dd></div></dl>
      <p>Sem conexão, suas atividades ficam pendentes por até sete dias. Ajustes de tarefas de datas antigas continuam disponíveis, mas não geram novas recompensas.</p>
    </div>}
    {(selected || importPreview) && <div className={styles.dialogBackdrop} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { setConfirm(null); setImportPreview(false); } }}>
      <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="reward-confirm-title">
        <button className={styles.close} aria-label="Fechar confirmação" disabled={busy} onClick={() => { setConfirm(null); setImportPreview(false); }}><X size={18} /></button>
        <h2 id="reward-confirm-title">{selected ? `Desbloquear ${selected.name}?` : 'Trazer progresso para a conta?'}</h2>
        <p>{selected ? `${selected.price} moedas serão usadas. Você ficará com ${wallet.coins - selected.price} moedas e poderá equipar o item quando quiser.` : `Seu XP ficará em ${Math.max(wallet.xp, guest?.wallet.xp || 0)}. Os ${guest?.wallet.owned.length || 0} itens locais serão preservados. Moedas e bilhetes locais não serão somados; você recebe 15 moedas de boas-vindas, uma única vez.`}</p>
        <div><button disabled={busy} onClick={() => { setConfirm(null); setImportPreview(false); }}>Cancelar</button><button autoFocus disabled={busy} onClick={() => void operation(selected ? () => buy(selected.id) : importGuest, selected ? `${selected.name} desbloqueado. Escolha “Usar item” para equipar.` : 'Progresso importado para sua conta.')}>{busy ? 'Confirmando…' : selected ? 'Confirmar desbloqueio' : 'Confirmar importação'}</button></div>
      </div>
    </div>}
  </section>;
}

function RefugeScene() {
  return <svg className={styles.illustration} viewBox="0 0 720 410" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="720" height="410" fill="#dbe6dc" /><circle cx="533" cy="102" r="42" fill="#e8d7aa" /><path d="M0 225Q125 145 238 223T460 217T720 170V410H0Z" fill="#adc4b5" /><path d="M0 285Q110 203 232 280T485 254T720 273V410H0Z" fill="#729b83" /><path d="M85 349Q250 258 527 311T720 354V410H85Z" fill="#9cb9bc" /><path d="M332 352q95-20 195-4M399 371q71-11 139-3" stroke="#d1e0d9" strokeWidth="3" fill="none" strokeLinecap="round" /><g fill="#456c57"><path d="M66 295V143l-54 133h108Z" /><path d="M646 295V117l-58 157h116Z" /><path d="M594 278V163l-36 99h72Z" /></g><path d="M160 410q22-58 92-68" fill="none" stroke="#d0c3a4" strokeWidth="26" /><g fill="#527660"><ellipse cx="38" cy="358" rx="67" ry="36" /><ellipse cx="702" cy="372" rx="64" ry="48" /></g></svg>;
}
