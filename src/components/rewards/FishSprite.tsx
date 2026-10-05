'use client';
import React from 'react';
import Image from 'next/image';
import type { FishId, FishRarity } from '../../types/fishing';
import { fishById, fishSprite, FISH_RARITIES } from '../../services/rewards/fishCatalog';
import styles from './AquaticView.module.css';

export function FishSprite({ id, className = '', decorative = false }: { id: FishId; className?: string; decorative?: boolean }) {
  return <Image unoptimized src={fishSprite(id)} alt={decorative ? '' : fishById(id).name} width={96} height={96} className={`${styles.sprite} ${className}`} draggable={false} />;
}
export function RarityLabel({ rarity }: { rarity: FishRarity }) {
  const rule = FISH_RARITIES[rarity];
  return <span className={`${styles.rarity} ${styles[rarity]}`}><span aria-hidden="true">{rule.mark}</span> {rule.label}</span>;
}
