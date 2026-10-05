import type { FishId } from './fishing';

export type AquaticItemId = 'decor.lantern.v1' | 'decor.arch.v1' | 'decor.garden.v1' | 'background.dusk.v1' | 'background.moon.v1' | 'frame.ripple.v1';
export type MilestoneId = `mastery_${FishId}_${3 | 5 | 10}` | `collection_${1 | 5 | 11}`;
export interface AquaticInventory {
  version: 1;
  revision: number;
  lastOperation: string;
  owned: AquaticItemId[];
  claimed: MilestoneId[];
  imported: boolean;
}
export interface AquaticStyle {
  background: 'base' | 'dusk' | 'moon';
  decorations: ('lantern' | 'arch' | 'garden')[];
  frame: 'none' | 'ripple' | 'complete';
  title: 'none' | 'first' | 'explorer' | 'collector';
  nameplates: boolean;
  glide: boolean;
  mode: 'interactive' | 'simple';
  sound: boolean;
}
export interface FishingCast {
  captureId: string;
  phase: 'waiting' | 'bite' | 'paused';
  dueAt: number;
  remainingMs: number;
}
export interface AquaticMilestone {
  id: MilestoneId;
  kind: 'mastery' | 'collection';
  target: FishId | 'collection';
  threshold: number;
  label: string;
  reward: string;
}
