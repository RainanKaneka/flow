'use client';
import React from 'react';
import { useFlowStore } from '../../store/useFlowStore';
import { fishById, fishSprite } from '../../services/rewards/fishCatalog';
import { FishSprite, RarityLabel } from './FishSprite';
import styles from './AquaticView.module.css';
import { AQUATIC_TITLES } from '../../services/rewards/aquaticCatalog';

export function FishCompanion({ onUseAvatar, currentAvatar }: { onUseAvatar: (url: string) => void; currentAvatar: string }) {
  const fishing = useFlowStore((state) => state.rewards?.fishing);
  const closeProfile = useFlowStore((state) => state.closeProfileModal);
  const setView = useFlowStore((state) => state.setActiveView);
  const setTab = useFlowStore((state) => state.setRewardTab);
  const favorite = fishing?.preferences.favorite;
  if (!favorite || !fishing?.progress.counts[favorite]) return null;
  const fish = fishById(favorite);
  return <section className={`${styles.profilePet} ${fishing.style?.frame === 'ripple' ? styles.rippleFrame : fishing.style?.frame === 'complete' ? styles.completeFrame : ''}`} aria-label="Seu peixe companheiro"><FishSprite id={favorite} /><div><strong>{fishing.preferences.nicknames[favorite] || fish.name}</strong><RarityLabel rarity={fish.rarity} /><p>Seu companheiro do aquário{fishing.preferences.nicknames[favorite] ? ` · ${fish.name}` : ''}</p>{fishing.style?.title && AQUATIC_TITLES[fishing.style.title] && <p className={styles.profileTitle}>{AQUATIC_TITLES[fishing.style.title]}</p>}<div className={styles.actions}><button type="button" disabled={currentAvatar === fishSprite(favorite)} onClick={() => onUseAvatar(fishSprite(favorite))}>{currentAvatar === fishSprite(favorite) ? 'Usando como avatar' : 'Usar peixe como avatar'}</button><button type="button" onClick={() => { closeProfile(); setTab('aquarium'); setView('rewards'); }}>Abrir meu aquário</button></div></div></section>;
}
