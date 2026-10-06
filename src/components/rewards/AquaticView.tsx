'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, Fish, Heart } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import type { AquariumPreferences, FishId, FishingAccount, FishRarity } from '../../types/fishing';
import { FISH_CATALOG, FISH_RARITIES, fishById } from '../../services/rewards/fishCatalog';
import { getGuestFishPreview } from '../../services/rewards/runtime';
import { FishSprite, RarityLabel } from './FishSprite';
import styles from './AquaticView.module.css';
import { FishingGame } from './FishingGame';
import { CollectionMilestones, MasterySummary } from './AquaticCustomization';
import { createAquaticInventory, createAquaticStyle, masteryTier } from '../../services/rewards/aquatic';
import { AQUATIC_TITLES } from '../../services/rewards/aquaticCatalog';
import { AquariumSwimmer, type SavedFishPosition } from './AquariumSwimmer';

export type AquaticTab = 'aquarium' | 'fishing' | 'collection';
const positions = [[23, 29], [68, 26], [44, 54], [74, 61], [19, 67]];
export function AquariumScene({ fishing, onSelect, onMove }: { fishing: FishingAccount; onSelect?: (id: FishId) => void; onMove?: (id: FishId, position: SavedFishPosition) => void }) {
  const displayed = fishing.preferences.displayed.filter((id) => fishing.progress.counts[id] > 0);
  const focused = useFlowStore((state) => state.pomodoro.isActive);
  const style = fishing.style || createAquaticStyle(), inventory = fishing.inventory || createAquaticInventory();
  const scene = useRef<HTMLDivElement>(null);
  return <div ref={scene} className={`${styles.scene} ${style.frame === 'ripple' ? styles.rippleFrame : style.frame === 'complete' ? styles.completeFrame : ''}`} aria-label="Seu aquário">
    <Image unoptimized className={styles.environment} src={`/rewards/environments/${style.background === 'base' ? 'aquarium' : style.background}.png`} width={480} height={288} alt="Aquário em pixel art com plantas, pedras e fundo de areia" />
    {style.decorations.map((id) => <Image key={id} unoptimized className={`${styles.decoration} ${styles[id]}`} src={`/rewards/decorations/${id}.png`} width={96} height={96} alt="" />)}
    {displayed.map((id, index) => {
      const tier = masteryTier(inventory, id);
      return <AquariumSwimmer key={id} id={id} initial={{ x: positions[index][0], y: positions[index][1] }} saved={fishing.preferences.positions?.[id]} name={fishing.preferences.nicknames[id] || fishById(id).name} plate={style.nameplates && tier > 0 ? <span aria-hidden="true" className={`${styles.nameplate} ${tier === 10 ? styles.goldPlate : tier === 5 ? styles.silverPlate : styles.bronzePlate}`}>{fishing.preferences.nicknames[id] || fishById(id).name}</span> : null} motion={fishing.preferences.motion && !focused} quick={style.glide && tier >= 5} scene={scene} onSelect={onSelect} onMove={onMove} />;
    })}
    {!displayed.length && <div className={styles.sceneEmpty}><Fish size={24} aria-hidden="true" /><strong>Um lugar para suas descobertas</strong><span>{fishing.progress.discovered.length ? 'Escolha os peixes que vão nadar aqui.' : 'Seu primeiro companheiro está esperando.'}</span></div>}
  </div>;
}
function AquariumPicker({ fishing, selected, onSelect, navigate }: { fishing: FishingAccount; selected: FishId | null; onSelect: (id: FishId) => void; navigate: (tab: AquaticTab) => void }) {
  return <div className={styles.aquariumPicker}><div className={styles.sectionHeading}><div><h3>Escolha quem nada aqui</h3><p>{fishing.preferences.displayed.length}/5 espécies no aquário. Selecione um peixe para ver sua ficha.</p>{!!fishing.preferences.displayed.length && <small>Arraste os peixes para mudar a posição. Com teclado, use as setas.</small>}</div><button onClick={() => navigate('fishing')}>Ir pescar <ArrowRight size={15} /></button></div><div className={styles.fishStrip}>{fishing.progress.discovered.map((id) => <button key={id} className={styles.fishTile} aria-pressed={selected === id} onClick={() => onSelect(id)}><FishSprite id={id} decorative /><strong>{fishing.preferences.nicknames[id] || fishById(id).name}</strong><small>{fishing.preferences.displayed.includes(id) ? 'No aquário' : 'Na coleção'}</small></button>)}</div>{!fishing.progress.discovered.length && <p>As próximas descobertas vão aparecer aqui.</p>}</div>;
}
export function AquaticView({ tab, navigate }: { tab: AquaticTab; navigate: (tab: AquaticTab) => void }) {
  const account = useFlowStore((state) => state.rewards)!;
  const fishing = account.fishing!;
  const status = useFlowStore((state) => state.fishingStatus);
  const rewardStatus = useFlowStore((state) => state.rewardStatus);
  const error = useFlowStore((state) => state.fishingError);
  const rewardError = useFlowStore((state) => state.rewardError);
  const owner = useFlowStore((state) => state.rewardOwner);
  const catchFish = useFlowStore((state) => state.catchFish);
  const acknowledge = useFlowStore((state) => state.acknowledgeFishCapture);
  const configure = useFlowStore((state) => state.configureAquarium);
  const importFish = useFlowStore((state) => state.importGuestFish);
  const setView = useFlowStore((state) => state.setActiveView);
  const setTab = useFlowStore((state) => state.setRewardTab);
  const flush = useFlowStore((state) => state.flushRewards);
  const [selected, setSelected] = useState<FishId | null>(fishing.preferences.favorite || fishing.progress.discovered[0] || null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<FishRarity | 'all'>('all');
  const [guest, setGuest] = useState<FishingAccount | null>(null);
  const [previewImport, setPreviewImport] = useState(false);
  const revealHeading = useRef<HTMLHeadingElement>(null);
  const capture = fishing.unrevealed ? fishing.receipts[fishing.unrevealed] : null;
  const ready = owner === 'guest' || (status === 'synced' && rewardStatus === 'synced');
  const starter = !fishing.progress.starterClaimed;
  const fish = selected && fishing.progress.counts[selected] > 0 ? fishById(selected) : null;
  useEffect(() => { if (capture) revealHeading.current?.focus(); }, [capture]);
  useEffect(() => {
    if (owner !== 'guest') void getGuestFishPreview().then(setGuest).catch(() => undefined);
  }, [owner]);
  async function operation(action: () => Promise<unknown>, success = '') {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice('');
    try { await action(); setNotice(success); }
    catch (error) { const text = error instanceof Error ? error.message : 'Não foi possível confirmar. Tente novamente.'; setNotice(useFlowStore.getState().fishingError === text || useFlowStore.getState().rewardError === text ? '' : text); }
    finally { locked.current = false; setBusy(false); }
  }
  const update = (patch: Partial<AquariumPreferences>, text: string) => operation(() => configure({ ...fishing.preferences, ...patch }), text);
  const toggleDisplay = (id: FishId) => {
    const displayed = fishing.preferences.displayed.includes(id) ? fishing.preferences.displayed.filter((fish) => fish !== id) : [...fishing.preferences.displayed, id];
    void update({ displayed }, 'Aquário atualizado.');
  };
  const reveal = async (destination: AquaticTab) => {
    await acknowledge();
    if (capture) setSelected(capture.species);
    navigate(destination);
  };
  return <div className={styles.root} aria-busy={busy}>
    {error && error !== rewardError && <p className={styles.alert} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {owner !== 'guest' && !ready && <div className={styles.connection}><p>{status === 'loading' ? 'Preparando seu aquário na nuvem…' : 'Seu aquário continua disponível. Conecte sua conta para confirmar novas capturas.'}</p><button disabled={busy} onClick={() => void operation(flush, 'Sincronização solicitada.')}>Tentar sincronizar</button></div>}
    {fishing.pending && !fishing.cast && !capture && <div className={styles.connection} role="status"><p>Uma pesca ficou pendente. Retome a mesma tentativa para conferir o resultado.</p><button className={styles.primary} disabled={busy || !ready} onClick={() => void operation(() => catchFish())}>{busy ? 'Confirmando captura…' : 'Retomar captura'}</button></div>}
    {capture && <section className={styles.reveal} aria-labelledby="fish-reveal-title">
      <div className={styles.revealArt}><FishSprite id={capture.species} /></div>
      <div><p className={styles.eyebrow}>{capture.kind === 'starter' ? 'SEU PRIMEIRO COMPANHEIRO' : capture.discovery ? 'NOVA DESCOBERTA' : 'MAIS UM PARA A COLEÇÃO'}</p><h2 id="fish-reveal-title" ref={revealHeading} tabIndex={-1}>{fishById(capture.species).name}</h2><RarityLabel rarity={capture.rarity} /><p>{capture.kind === 'starter' ? 'Seu douradinho já está no aquário. Conclua tarefas para ganhar bilhetes e descobrir novos peixes.' : capture.discovery ? 'Uma nova espécie foi adicionada à sua coleção.' : `Você já tem ${fishing.progress.counts[capture.species]} exemplares dessa espécie. Repetidos ficam registrados para a maestria da coleção.`}</p><p className={styles.captureSaved}><Check size={16} /> Captura salva · {capture.cost ? '1 bilhete usado' : 'captura gratuita'}</p><div className={styles.actions}><button className={styles.primary} disabled={busy} onClick={() => void operation(() => reveal('aquarium'))}>Ver no aquário <ArrowRight size={16} /></button><button disabled={busy} onClick={() => void operation(() => reveal('fishing'))}>Continuar pescando</button><button disabled={busy} onClick={() => void operation(async () => { await acknowledge(); setView('routine'); })}>Voltar à rotina</button></div></div>
    </section>}
    {tab === 'aquarium' && <>
      <div className={styles.sectionHeading}><div><h2>Meu aquário</h2><p>{fishing.style?.title && AQUATIC_TITLES[fishing.style.title] || 'Um pequeno mundo que cresce com sua rotina.'}</p></div><div className={styles.actions}><button onClick={() => setTab('catalog')}>Personalizar</button><label className={styles.motion}><input type="checkbox" checked={fishing.preferences.motion} disabled={busy} onChange={(event) => void update({ motion: event.target.checked }, 'Preferência de movimento salva.')} /> Movimento suave</label></div></div>
      <div className={styles.aquariumLayout}><AquariumScene fishing={fishing} onSelect={setSelected} onMove={(id, position) => { const latest = useFlowStore.getState().rewards?.fishing?.preferences; if (latest) void operation(() => configure({ ...latest, positions: { ...latest.positions, [id]: position } })); }} />
        {fish ? <FishDetails key={fish.id} id={fish.id} fishing={fishing} busy={busy} update={update} toggleDisplay={toggleDisplay} /> : <aside className={styles.details}><p className={styles.eyebrow}>SEU COMPANHEIRO</p><FishSprite id="goldfish" /><h3>Comece com um douradinho</h3><p>Uma captura guiada, gratuita, para conhecer seu aquário.</p><button className={styles.primary} disabled={busy || !ready || !!capture || !!fishing.pending} onClick={() => void operation(() => catchFish(true))}>Receber meu douradinho</button></aside>}
        <AquariumPicker fishing={fishing} selected={selected} onSelect={setSelected} navigate={navigate} />
      </div>
      {starter && fish && <div className={styles.connection}><p>Seu douradinho inicial ainda está disponível gratuitamente.</p><button disabled={busy || !ready || !!capture || !!fishing.pending} onClick={() => void operation(() => catchFish(true))}>Receber douradinho</button></div>}
    </>}
    {tab === 'fishing' && <>
      <div className={styles.sectionHeading}><div><h2>Lago tranquilo</h2><p>Uma pausa para descobrir algo novo.</p></div><button onClick={() => setView('routine')}>Voltar à rotina</button></div>
      <div className={styles.fishingLayout}><FishingGame busy={busy} ready={ready} operation={operation} />
      <aside className={styles.guarantees}><p className={styles.eyebrow}>CADA CAPTURA CONTA</p><h3>Sua próxima descoberta</h3><p>Raro ou melhor em até <strong>{10 - fishing.progress.sinceRare}</strong> {10 - fishing.progress.sinceRare === 1 ? 'captura' : 'capturas'}.</p><progress aria-label="Progresso para raro ou melhor" max={10} value={fishing.progress.sinceRare} /><p>Lendário em até <strong>{30 - fishing.progress.sinceLegendary}</strong> {30 - fishing.progress.sinceLegendary === 1 ? 'captura' : 'capturas'}.</p><progress aria-label="Progresso para lendário" max={30} value={fishing.progress.sinceLegendary} /><small>Encontrar um raro reinicia sua espera por raro. Um lendário reinicia as duas. Pausas na rotina preservam o progresso.</small><details><summary>Chances e garantias</summary><ul>{(Object.keys(FISH_RARITIES) as FishRarity[]).map((id) => <li key={id}><RarityLabel rarity={id} /><strong>{FISH_RARITIES[id].weight}%</strong></li>)}</ul><p>Chances base por categoria; as espécies da mesma categoria têm pesos iguais. As garantias aumentam a frequência efetiva de raros e lendários.</p><p>Depois de nove capturas abaixo de raro, a próxima é rara (80%) ou lendária (20%). Depois de 29 sem lendário, a próxima é lendária.</p><p>Após três repetidos de uma categoria, a próxima captura dessa categoria será uma espécie faltante, enquanto houver alguma. A raridade permanece a sorteada.</p><p>O douradinho gratuito fica fora do sorteio e das garantias.</p></details></aside></div>
    </>}
    {tab === 'collection' && <>
      <div className={styles.sectionHeading}><div><h2>Sua coleção</h2><p>{fishing.progress.discovered.length}/11 espécies descobertas. Cada peixe tem um lugar aqui.</p></div><label className={styles.filter}>Raridade<select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">Todas</option>{(Object.keys(FISH_RARITIES) as FishRarity[]).map((id) => <option key={id} value={id}>{FISH_RARITIES[id].label}</option>)}</select></label></div>
      {fishing.progress.discovered.length === 11 && <p className={styles.notice}>Coleção completa! Todas as espécies do Lago tranquilo já foram descobertas.</p>}
      <CollectionMilestones />
      <div className={styles.collection}>{FISH_CATALOG.filter((fish) => filter === 'all' || fish.rarity === filter).map((fish) => {
        const owned = fishing.progress.counts[fish.id] > 0;
        return <article key={fish.id} className={`${styles.collectionFish} ${!owned ? styles.locked : ''}`}><div className={styles.collectionArt}>{owned ? <FishSprite id={fish.id} /> : <Fish size={42} aria-hidden="true" />}{fishing.preferences.favorite === fish.id && <Heart size={16} aria-label="Seu companheiro" />}</div><RarityLabel rarity={fish.rarity} /><h3>{fish.name}</h3><p>{owned ? `${fishing.progress.counts[fish.id]} ${fishing.progress.counts[fish.id] === 1 ? 'exemplar' : 'exemplares'} · ${new Date(fishing.progress.discoveredAt[fish.id]).toLocaleDateString('pt-BR')}` : fish.starter ? 'Disponível na primeira captura gratuita' : 'Ainda por descobrir'}</p><button disabled={!owned} onClick={() => { setSelected(fish.id); navigate('aquarium'); }}>Ver ficha</button></article>;
      })}</div>
    </>}
    {guest?.progress.discovered.length && !fishing.progress.imported && owner !== 'guest' ? <section className={styles.importBox}><h3>Traga seus peixes deste dispositivo</h3><p>{guest.progress.discovered.length} espécies locais. A importação preserva o maior número de exemplares de cada espécie, sem somar bilhetes, moedas ou contadores de garantia.</p>{previewImport ? <><p>As escolhas do aquário da conta serão preservadas. A origem local ficará registrada; esta importação pode ser feita uma vez.</p><div className={styles.actions}><button disabled={busy} onClick={() => setPreviewImport(false)}>Cancelar</button><button className={styles.primary} disabled={busy || !ready} onClick={() => void operation(async () => { await importFish(); setPreviewImport(false); }, 'Peixes locais importados.')}>Confirmar importação de peixes</button></div></> : <button disabled={busy || !ready} onClick={() => setPreviewImport(true)}>Revisar importação de peixes</button>}</section> : null}
  </div>;
}

function FishDetails({ id, fishing, busy, update, toggleDisplay }: { id: FishId; fishing: FishingAccount; busy: boolean; update: (patch: Partial<AquariumPreferences>, text: string) => Promise<void>; toggleDisplay: (id: FishId) => void }) {
  const fish = fishById(id);
  const [nickname, setNickname] = useState(fishing.preferences.nicknames[id] || '');
  const displayed = fishing.preferences.displayed.includes(id);
  return <aside className={styles.details}><p className={styles.eyebrow}>FICHA DO PEIXE</p><div className={styles.detailArt}><FishSprite id={id} /></div><h3>{fish.name}</h3><RarityLabel rarity={fish.rarity} /><p>{fish.description}</p><small>Descoberto em {new Date(fishing.progress.discoveredAt[id]).toLocaleDateString('pt-BR')} · {fishing.progress.counts[id]} {fishing.progress.counts[id] === 1 ? 'exemplar' : 'exemplares'}</small><MasterySummary id={id} /><form onSubmit={(event) => { event.preventDefault(); void update({ nicknames: { ...fishing.preferences.nicknames, [id]: nickname.trim() } }, 'Apelido salvo.'); }}><label htmlFor="fish-nickname">Apelido do peixe</label><input id="fish-nickname" maxLength={40} value={nickname} placeholder={fish.name} onChange={(event) => setNickname(event.target.value)} /><button disabled={busy || nickname.trim() === (fishing.preferences.nicknames[id] || '')}>Salvar apelido</button></form><button className={styles.primary} disabled={busy} onClick={() => void update({ favorite: fishing.preferences.favorite === id ? null : id }, fishing.preferences.favorite === id ? 'Companheiro removido do perfil.' : 'Seu companheiro aparece no perfil.')}>{fishing.preferences.favorite === id ? <><Check size={16} /> Companheiro · remover</> : <><Heart size={16} /> Usar como companheiro</>}</button><button disabled={busy || (!displayed && fishing.preferences.displayed.length >= 5)} onClick={() => toggleDisplay(id)}>{displayed ? 'Retirar do aquário' : 'Colocar no aquário'}</button>{!displayed && fishing.preferences.displayed.length >= 5 && <small>Retire uma espécie para abrir espaço no aquário.</small>}</aside>;
}
