import type { AquaticInventory, AquaticItemId, AquaticStyle, FishingCast } from './aquatic';
export type FishId = 'goldfish' | 'koi' | 'neon' | 'clownfish' | 'catfish' | 'guppy' | 'angelfish' | 'pufferfish' | 'betta' | 'mandarin' | 'discus';
export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export interface FishingProgress {
  version: 1;
  revision: number;
  lastCapture: string;
  starterClaimed: boolean;
  imported: boolean;
  discovered: FishId[];
  counts: Record<FishId, number>;
  discoveredAt: Record<FishId, number>;
  sinceRare: number;
  sinceLegendary: number;
  duplicates: Record<FishRarity, number>;
}
export interface AquariumPreferences {
  displayed: FishId[];
  favorite: FishId | null;
  nicknames: Partial<Record<FishId, string>>;
  motion: boolean;
  positions?: Partial<Record<FishId, { x: number; y: number }>>;
}
export interface CaptureIntent {
  id: string;
  kind: 'starter' | 'normal';
  createdAt: number;
  rarityRoll: number;
  speciesRoll: number;
}
export interface FishCapture {
  id: string;
  kind: CaptureIntent['kind'];
  species: FishId;
  rarity: FishRarity;
  caughtAt: number;
  cost: 0 | 1;
  rulesVersion: 1;
  revision: number;
  walletRevision: number;
  discovery: boolean;
  guarantee: 'none' | 'rare' | 'legendary';
}
export interface FishingAccount {
  inventory?: AquaticInventory;
  style?: AquaticStyle;
  stylePending?: boolean;
  cast?: FishingCast | null;
  pendingPurchase?: AquaticItemId | null;
  progress: FishingProgress;
  preferences: AquariumPreferences;
  receipts: Record<string, FishCapture>;
  pending: CaptureIntent | null;
  unrevealed: string | null;
  preferencesPending?: boolean;
}
