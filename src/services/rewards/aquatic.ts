import type { AquaticInventory, AquaticItemId, AquaticStyle, FishingCast, MilestoneId } from '../../types/aquatic';
import type { FishId, FishingProgress } from '../../types/fishing';
import type { RewardAccount, RewardReceipt, RewardWallet } from '../../types/rewards';
import { AQUATIC_ITEMS, AQUATIC_ITEM_IDS, AQUATIC_MILESTONES, CAST_WAIT_MS } from './aquaticCatalog';
import { localDay } from './engine';

export const createAquaticInventory = (): AquaticInventory => ({ version: 1, revision: 0, lastOperation: '', owned: [], claimed: [], imported: false });
export const createAquaticStyle = (): AquaticStyle => ({ background: 'base', decorations: [], frame: 'none', title: 'none', nameplates: true, glide: false, mode: 'interactive', sound: false });
export const earnedMilestones = (progress: FishingProgress) => AQUATIC_MILESTONES.filter((m) => (m.kind === 'collection' ? progress.discovered.length : progress.counts[m.target as FishId]) >= m.threshold);
export function grantLocalMilestones(account: RewardAccount): RewardAccount {
  if (!account.fishing) return account;
  const inventory = account.fishing.inventory || createAquaticInventory();
  const added = earnedMilestones(account.fishing.progress).filter((m) => !inventory.claimed.includes(m.id));
  return { ...account, fishing: { ...account.fishing, inventory: added.length ? { ...inventory, revision: inventory.revision + added.length, lastOperation: added[added.length - 1].id, claimed: [...inventory.claimed, ...added.map((m) => m.id)] } : inventory, style: account.fishing.style || createAquaticStyle() } };
}
export function purchaseAquatic(wallet: RewardWallet, inventory: AquaticInventory, id: AquaticItemId, now = Date.now()) {
  const item = AQUATIC_ITEMS.find((item) => item.id === id);
  if (!item) throw new Error('Essa decoração não está no catálogo.');
  if (inventory.owned.includes(id)) return { wallet, inventory, receipt: null };
  if (wallet.coins < item.price) throw new Error('Continue sua rotina para juntar as moedas deste item.');
  const operation = `aquatic_${id}`;
  const nextWallet = { ...wallet, coins: wallet.coins - item.price, revision: wallet.revision + 1, lastEvent: operation };
  const nextInventory = { ...inventory, revision: inventory.revision + 1, lastOperation: operation, owned: [...inventory.owned, id] };
  const receipt: RewardReceipt = { id: operation, kind: 'aquatic-purchase', sourceId: id, day: localDay(now, wallet.offset), occurredAt: now, xp: 0, coins: -item.price, tickets: 0, weeklyBonus: false, revision: nextWallet.revision };
  return { wallet: nextWallet, inventory: nextInventory, receipt };
}
export function masteryTier(inventory: AquaticInventory, id: FishId) {
  return ([10, 5, 3] as const).find((tier) => inventory.claimed.includes(`mastery_${id}_${tier}`)) || 0;
}
export function validateAquaticInventory(inventory: AquaticInventory) {
  if (inventory.version !== 1 || !Number.isInteger(inventory.revision) || inventory.revision < 0 || !Array.isArray(inventory.owned) || !Array.isArray(inventory.claimed)
    || new Set(inventory.owned).size !== inventory.owned.length || inventory.owned.some((id) => !AQUATIC_ITEM_IDS.includes(id))
    || new Set(inventory.claimed).size !== inventory.claimed.length || inventory.claimed.some((id) => !AQUATIC_MILESTONES.some((m) => m.id === id)) || typeof inventory.imported !== 'boolean') throw new Error('Os cosméticos não puderam ser lidos. Seus dados foram preservados.');
  return inventory;
}
export function validateAquaticStyle(style: AquaticStyle, inventory: AquaticInventory) {
  const owns = (id: AquaticItemId) => inventory.owned.includes(id);
  const claimed = (id: MilestoneId) => inventory.claimed.includes(id);
  if (!['base', 'dusk', 'moon'].includes(style.background) || (style.background !== 'base' && !owns(`background.${style.background}.v1`))
    || !Array.isArray(style.decorations) || style.decorations.length > 3 || new Set(style.decorations).size !== style.decorations.length || style.decorations.some((id) => !['lantern', 'arch', 'garden'].includes(id) || !owns(`decor.${id}.v1`))
    || !['none', 'ripple', 'complete'].includes(style.frame) || (style.frame === 'ripple' && !owns('frame.ripple.v1')) || (style.frame === 'complete' && !claimed('collection_11'))
    || !['none', 'first', 'explorer', 'collector'].includes(style.title) || (style.title === 'first' && !claimed('collection_1')) || (style.title === 'explorer' && !claimed('collection_5')) || (style.title === 'collector' && !claimed('collection_11'))
    || !['interactive', 'simple'].includes(style.mode) || ![style.nameplates, style.glide, style.sound].every((v) => typeof v === 'boolean')) throw new Error('Desbloqueie o cosmético antes de equipar.');
  return style;
}
export function newFishingCast(captureId: string, now = Date.now()): FishingCast { return { captureId, phase: 'waiting', dueAt: now + CAST_WAIT_MS, remainingMs: CAST_WAIT_MS }; }
export function pauseFishingCast(cast: FishingCast, now = Date.now()): FishingCast {
  if (cast.phase !== 'waiting') return cast;
  const remainingMs = Math.max(0, Math.min(CAST_WAIT_MS, cast.dueAt - now));
  return { ...cast, phase: remainingMs ? 'paused' : 'bite', remainingMs, dueAt: 0 };
}
export function resumeFishingCast(cast: FishingCast, now = Date.now()): FishingCast { return cast.phase === 'paused' ? { ...cast, phase: cast.remainingMs ? 'waiting' : 'bite', dueAt: now + cast.remainingMs } : cast; }
