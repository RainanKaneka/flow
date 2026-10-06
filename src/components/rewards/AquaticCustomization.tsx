'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Coins, Waves, X } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import type { AquaticItemId, AquaticStyle } from '../../types/aquatic';
import type { FishId } from '../../types/fishing';
import { AQUATIC_ITEMS, AQUATIC_MILESTONES, AQUATIC_TITLES, COLLECTION_MILESTONES } from '../../services/rewards/aquaticCatalog';
import { createAquaticInventory, createAquaticStyle, masteryTier } from '../../services/rewards/aquatic';
import { getGuestFishPreview } from '../../services/rewards/runtime';
import { AquariumScene } from './AquaticView';
import styles from './AquaticView.module.css';

export function MasterySummary({ id }: { id: FishId }) {
  const fishing = useFlowStore((s) => s.rewards!.fishing!);
  const inventory = fishing.inventory || createAquaticInventory(), count = fishing.progress.counts[id];
  const tier = masteryTier(inventory, id), next = [3, 5, 10].find((threshold) => threshold > count);
  if (id === 'goldfish' && count < 3) return <section className={styles.mastery} aria-label="Companheiro inicial"><strong>Seu primeiro companheiro</strong><p>O douradinho é uma captura guiada única. Este encontro conta para os marcos da coleção.</p></section>;
  return <section className={styles.mastery} aria-label="Maestria da espécie"><strong>Maestria · {tier === 10 ? 'placa de ouro' : tier === 5 ? 'placa de prata' : tier === 3 ? 'placa de bronze' : 'primeiros encontros'}</strong><p>{next ? `${count}/${next} exemplares até o próximo marco.` : 'Todos os marcos desta espécie foram alcançados.'}</p><div className={styles.masterySteps}>{AQUATIC_MILESTONES.filter((m) => m.target === id).map((m) => <span key={m.id} title={m.reward}>{inventory.claimed.includes(m.id) ? <Check size={13} /> : null}{m.threshold} · {m.threshold === 3 ? 'bronze' : m.threshold === 5 ? 'prata' : 'ouro'}</span>)}</div>{tier >= 5 && <small>Nado especial disponível na personalização do aquário.</small>}{count >= 3 && !tier && <small>Marco alcançado · aguardando confirmação da nuvem.</small>}</section>;
}
export function CollectionMilestones() {
  const fishing = useFlowStore((s) => s.rewards!.fishing!);
  return <section className={styles.collectionMilestones} aria-label="Marcos da coleção">{COLLECTION_MILESTONES.map((m) => <div key={m.id}><strong>{fishing.inventory?.claimed.includes(m.id) ? <Check size={15} /> : <Waves size={15} />}{m.label}</strong><span>{Math.min(fishing.progress.discovered.length, m.threshold)}/{m.threshold} espécies · {m.reward}</span></div>)}</section>;
}
export function AquaticCustomization() {
  const account = useFlowStore((s) => s.rewards)!;
  const fishing = account.fishing!;
  const inventory = fishing.inventory || createAquaticInventory(), style = fishing.style || createAquaticStyle();
  const status = useFlowStore((s) => s.aquaticStatus), owner = useFlowStore((s) => s.rewardOwner), rewardStatus = useFlowStore((s) => s.rewardStatus), error = useFlowStore((s) => s.aquaticError);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [confirm, setConfirm] = useState<AquaticItemId | null>(null), [localItems, setLocalItems] = useState(0), [importPreview, setImportPreview] = useState(false);
  const lock = useRef(false), dialog = useRef<HTMLDivElement>(null);
  const ready = owner === 'guest' || (status === 'synced' && rewardStatus === 'synced');
  useEffect(() => { if (owner && owner !== 'guest') void getGuestFishPreview().then((guest) => setLocalItems(guest?.inventory?.owned.length || 0)).catch(() => undefined); }, [owner]);
  useEffect(() => {
    if (!confirm) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lock.current) setConfirm(null);
      if (e.key !== 'Tab') return;
      const nodes = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [confirm]);
  const operation = async (action: () => Promise<unknown>, text: string) => { if (lock.current) return; lock.current = true; setBusy(true); setNotice(''); try { await action(); setNotice(text); } catch (e) { setNotice(e instanceof Error ? e.message : 'Tente novamente.'); } finally { lock.current = false; setBusy(false); } };
  const equip = (patch: Partial<AquaticStyle>) => void operation(() => useFlowStore.getState().configureAquaticStyle({ ...style, ...patch }), 'Personalização salva.');
  const selected = AQUATIC_ITEMS.find((item) => item.id === confirm);
  return <section className={styles.root} aria-busy={busy}>
    <div className={styles.sectionHeading}><div><h2>Seu aquário, do seu jeito</h2><p>Decorações e fundos comprados com moedas da sua rotina. Tudo aqui é cosmético.</p></div></div>
    {error && <p role="alert" className={styles.alert}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    {!ready && <div className={styles.connection}><p>Itens já obtidos continuam disponíveis. Conecte para confirmar compras e novos marcos.</p><button disabled={busy} onClick={() => void operation(() => useFlowStore.getState().flushRewards(), 'Sincronização solicitada.')}>Sincronizar personalização</button></div>}
    {fishing.pendingPurchase && <div className={styles.connection}><p>A compra de {AQUATIC_ITEMS.find((i) => i.id === fishing.pendingPurchase)?.name} está guardada para confirmação.</p><button disabled={!ready || busy} onClick={() => void operation(() => useFlowStore.getState().buyAquaticItem(fishing.pendingPurchase!), 'Compra confirmada.')}>Retomar compra</button></div>}
    <div className={styles.customizationLayout}><div><AquariumScene fishing={fishing} onMove={(id, position) => { const latest = useFlowStore.getState().rewards?.fishing?.preferences; if (latest) void operation(() => useFlowStore.getState().configureAquarium({ ...latest, positions: { ...latest.positions, [id]: position } }), ''); }} /><small>Arraste os peixes para mudar a posição. Com teclado, use as setas.</small></div>
      <div className={styles.styleControls}>
        <label>Fundo do aquário<select value={style.background} disabled={busy} onChange={(e) => equip({ background: e.target.value as AquaticStyle['background'] })}><option value="base">Águas claras · inicial</option><option value="dusk" disabled={!inventory.owned.includes('background.dusk.v1')}>Entardecer{!inventory.owned.includes('background.dusk.v1') ? ' · bloqueado' : ''}</option><option value="moon" disabled={!inventory.owned.includes('background.moon.v1')}>Luar{!inventory.owned.includes('background.moon.v1') ? ' · bloqueado' : ''}</option></select></label>
        <label>Moldura<select value={style.frame} disabled={busy} onChange={(e) => equip({ frame: e.target.value as AquaticStyle['frame'] })}><option value="none">Sem moldura</option><option value="ripple" disabled={!inventory.owned.includes('frame.ripple.v1')}>Marés</option><option value="complete" disabled={!inventory.claimed.includes('collection_11')}>Coleção completa</option></select></label>
        <label>Título no perfil<select value={style.title} disabled={busy} onChange={(e) => equip({ title: e.target.value as AquaticStyle['title'] })}><option value="none">Sem título</option>{(['first', 'explorer', 'collector'] as const).map((id, i) => <option key={id} value={id} disabled={!inventory.claimed.includes(COLLECTION_MILESTONES[i].id)}>{AQUATIC_TITLES[id]}</option>)}</select></label>
        <label className={styles.motion}><input type="checkbox" checked={style.nameplates} disabled={busy} onChange={(e) => equip({ nameplates: e.target.checked })} /> Placas de maestria nos peixes</label>
        <label className={styles.motion}><input type="checkbox" checked={style.glide} disabled={busy || !inventory.claimed.some((id) => id.startsWith('mastery_') && (id.endsWith('_5') || id.endsWith('_10')))} onChange={(e) => equip({ glide: e.target.checked })} /> Nado especial · maestria 5</label>
        <small>Movimento continua respeitando suas preferências e pausa durante o foco.</small>
      </div>
    </div>
    <div className={styles.sectionHeading}><div><h3>Pequenos detalhes para descobrir</h3><p>{account.wallet.coins} moedas disponíveis. Compras permanecem com você.</p></div></div>
    <div className={styles.aquaticShop}>{AQUATIC_ITEMS.map((item) => {
      const owned = inventory.owned.includes(item.id), equipped = item.slot === 'background' ? style.background === item.value : item.slot === 'frame' ? style.frame === item.value : style.decorations.includes(item.value as 'lantern' | 'arch' | 'garden');
      return <article key={item.id} className={styles.shopItem}><div className={`${styles.shopArt} ${item.slot === 'background' ? styles.shopBackground : ''}`}>{item.asset ? <Image unoptimized src={item.asset} width={item.slot === 'background' ? 480 : 96} height={item.slot === 'background' ? 288 : 96} alt="" /> : <Waves size={45} />}</div><h3>{item.name}</h3><p>{item.description}</p><span className={styles.price}><Coins size={15} />{owned ? 'Desbloqueado' : `${item.price} moedas`}</span><button className={!owned ? styles.primary : undefined} disabled={busy || (!owned && (!ready || !!fishing.pendingPurchase || account.wallet.coins < item.price))} onClick={() => {
        if (!owned) { setConfirm(item.id); return; }
        if (item.slot === 'background') equip({ background: equipped ? 'base' : item.value as AquaticStyle['background'] });
        else if (item.slot === 'frame') equip({ frame: equipped ? 'none' : 'ripple' });
        else { const decoration = item.value as 'lantern' | 'arch' | 'garden'; equip({ decorations: equipped ? style.decorations.filter((id) => id !== decoration) : [...style.decorations, decoration] }); }
      }}>{owned ? equipped ? 'Em uso · retirar' : 'Usar no aquário' : account.wallet.coins < item.price ? `Faltam ${item.price - account.wallet.coins} moedas` : 'Desbloquear'}</button></article>;
    })}</div>
    <CollectionMilestones />
    {!!localItems && !inventory.imported && owner !== 'guest' && <div className={styles.importBox}><h3>Suas decorações locais podem vir com você</h3><p>{localItems} itens deste dispositivo. Os itens são reunidos uma vez; moedas e bilhetes não são somados.</p>{importPreview ? <div className={styles.actions}><button onClick={() => setImportPreview(false)} disabled={busy}>Cancelar</button><button disabled={busy || !ready} onClick={() => void operation(async () => { await useFlowStore.getState().importGuestAquatic(); setImportPreview(false); }, 'Decorações locais importadas.')}>Confirmar importação de decorações</button></div> : <button disabled={busy || !ready} onClick={() => setImportPreview(true)}>Revisar importação de decorações</button>}</div>}
    {selected && <div className={styles.purchaseBackdrop}><div className={styles.purchaseDialog} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="aquatic-purchase-title"><button className={styles.dialogClose} aria-label="Fechar confirmação" disabled={busy} onClick={() => setConfirm(null)}><X size={18} /></button><h2 id="aquatic-purchase-title">Desbloquear {selected.name}?</h2><p>Usar {selected.price} moedas da sua rotina. O item fica disponível permanentemente.</p><div className={styles.actions}><button disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button><button className={styles.primary} disabled={busy || !ready} onClick={() => void operation(async () => { await useFlowStore.getState().buyAquaticItem(selected.id); setConfirm(null); }, 'Item desbloqueado. Escolha Usar no aquário para equipar.')}>{busy ? 'Confirmando…' : `Usar ${selected.price} moedas`}</button></div></div></div>}
  </section>;
}
