'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Fish, Pause, Play, Ticket } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { CAST_WAIT_MS } from '../../services/rewards/aquaticCatalog';
import { createAquaticStyle } from '../../services/rewards/aquatic';
import { sounds } from '../../utils/audio';
import styles from './AquaticView.module.css';

export function FishingGame({ busy, ready, operation }: { busy: boolean; ready: boolean; operation: (action: () => Promise<unknown>, success?: string) => Promise<void> }) {
  const fishing = useFlowStore((s) => s.rewards!.fishing!);
  const tickets = useFlowStore((s) => s.rewards!.wallet.tickets);
  const focused = useFlowStore((s) => s.pomodoro.isActive);
  const owner = useFlowStore((s) => s.rewardOwner);
  const style = fishing.style || createAquaticStyle();
  const cast = fishing.cast;
  const [now, setNow] = useState(Date.now);
  const heading = useRef<HTMLHeadingElement>(null);
  const announcedBite = useRef<string | null>(null);
  const currentId = cast?.captureId;
  const waiting = cast?.phase === 'waiting';
  const remaining = waiting ? Math.max(0, cast.dueAt - now) : cast?.remainingMs || 0;
  const starter = !fishing.progress.starterClaimed;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [waiting]);
  useEffect(() => {
    if (waiting && remaining === 0 && !focused) void useFlowStore.getState().changeFishCast(cast.captureId, 'bite').catch(() => undefined);
  }, [waiting, remaining, focused, cast?.captureId]);
  useEffect(() => {
    if (cast?.phase !== 'bite' || announcedBite.current === cast.captureId) return;
    announcedBite.current = cast.captureId;
    heading.current?.focus();
    if (style.sound && !focused && !document.hidden) sounds.playCheck();
  }, [cast?.phase, cast?.captureId, style.sound, focused]);
  useEffect(() => {
    const pause = () => {
      const s = useFlowStore.getState();
      if (s.rewardOwner === owner && s.rewards?.fishing?.cast?.captureId === currentId && currentId) void s.changeFishCast(currentId, 'pause').catch(() => undefined);
    };
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); pause(); };
  }, [currentId, owner]);
  useEffect(() => { if (focused && currentId) void useFlowStore.getState().changeFishCast(currentId, 'pause').catch(() => undefined); }, [focused, currentId]);
  const start = async () => {
    if (starter) { await useFlowStore.getState().catchFish(true); return; }
    await useFlowStore.getState().prepareFishCast();
    if (style.sound) sounds.playTick();
    if (style.mode === 'simple') await useFlowStore.getState().catchFish();
    else setNow(Date.now());
  };
  return <div>
    <div className={`${styles.scene} ${styles.lakeScene}`}>
      <Image unoptimized className={styles.environment} src="/rewards/environments/lake.png" width={480} height={288} alt="Lago em pixel art com floresta, píer de madeira e vara de pesca" />
      {cast && <div className={`${styles.castSceneStatus} ${waiting && fishing.preferences.motion && !focused ? styles.floatWaiting : ''}`} aria-hidden="true"><span>{cast.phase === 'bite' ? '!' : cast.phase === 'paused' ? 'Ⅱ' : '·'}</span></div>}
      {cast?.phase === 'bite' && <div className={styles.biteHint}>Um peixe encontrou sua linha</div>}
    </div>
    {cast ? <section className={styles.gameControls} aria-label="Tentativa de pesca">
      <div role="status"><h3 ref={heading} tabIndex={-1}>{cast.phase === 'bite' ? 'É hora da fisgada' : cast.phase === 'paused' ? 'Sua linha ficou guardada' : 'A linha está na água'}</h3><p>{cast.phase === 'bite' ? 'Confirme quando quiser. O peixe não vai escapar por falta de reação.' : cast.phase === 'paused' ? focused ? 'A pesca está pausada enquanto você mantém o foco.' : 'Retome a espera ou revele a mesma captura diretamente.' : `Aguarde ${Math.ceil(remaining / 1000)} s. Você também pode revelar agora, com as mesmas chances.`}</p></div>
      {waiting && <progress max={CAST_WAIT_MS} value={CAST_WAIT_MS - remaining} aria-label="Espera pela fisgada" />}
      <div className={styles.actions}>
        {cast.phase === 'bite' ? <button className={styles.primary} disabled={busy || !ready || focused} onClick={() => void operation(() => useFlowStore.getState().catchFish())}><Fish size={18} /> Confirmar fisgada</button> : <>
          <button disabled={busy || focused} onClick={() => void operation(() => useFlowStore.getState().changeFishCast(cast.captureId, waiting ? 'pause' : 'resume'))}>{waiting ? <><Pause size={16} /> Pausar espera</> : <><Play size={16} /> Retomar espera</>}</button>
          <button className={styles.primary} disabled={busy || !ready || focused} onClick={() => void operation(() => useFlowStore.getState().catchFish())}>Revelar agora</button>
        </>}
        <button disabled={busy} onClick={() => void operation(async () => { await useFlowStore.getState().changeFishCast(cast.captureId, 'pause'); useFlowStore.getState().setActiveView('routine'); })}>Guardar e voltar à rotina</button>
      </div><small>O bilhete só é usado na confirmação. Sair preserva esta tentativa.</small>
    </section> : <div className={styles.castBar}>
      <button className={styles.primary} disabled={busy || !ready || focused || !!fishing.unrevealed || !!fishing.pending || (!starter && tickets < 1)} onClick={() => void operation(start)}><Ticket size={19} />{busy ? 'Confirmando captura…' : starter ? 'Primeira captura · grátis' : style.mode === 'simple' ? 'Revelar peixe · 1 bilhete' : 'Lançar linha · 1 bilhete'}</button>
      <p>{focused ? 'Volte ao lago quando terminar seu foco.' : starter ? 'Conheça a pesca com seu douradinho. Seus bilhetes ficam guardados.' : tickets ? 'Cada bilhete entrega um peixe. Suas descobertas ficam com você.' : 'Conclua a primeira tarefa do dia para ganhar um bilhete. A meta diária pode dar mais um.'}</p>
    </div>}
    <div className={styles.gamePreferences}><label>Modo de pesca<select value={style.mode} disabled={busy} onChange={(e) => void operation(() => useFlowStore.getState().configureAquaticStyle({ ...style, mode: e.target.value as typeof style.mode }), 'Modo de pesca salvo.')}><option value="interactive">Interativo · espera de 22 s</option><option value="simple">Simplificado · revelação direta</option></select></label><label className={styles.motion}><input type="checkbox" checked={style.sound} disabled={busy} onChange={(e) => void operation(() => useFlowStore.getState().configureAquaticStyle({ ...style, sound: e.target.checked }), 'Preferência de som salva.')} /> Som da pesca</label><small>Mesmas chances e garantias nos dois modos. Sem limite de reação.</small></div>
  </div>;
}
