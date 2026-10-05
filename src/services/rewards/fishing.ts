import type { AquariumPreferences, CaptureIntent, FishCapture, FishId, FishingAccount, FishingProgress, FishRarity } from '../../types/fishing';
import type { RewardAccount, RewardReceipt, RewardWallet } from '../../types/rewards';
import { FISH_IDS, FISH_RARITIES, FISHING_RULES, fishById, speciesInRarity } from './fishCatalog';
import { localDay } from './engine';
import { createAquaticInventory, createAquaticStyle, validateAquaticInventory, validateAquaticStyle } from './aquatic';

export function createFishingAccount(): FishingAccount {
  const zeros = Object.fromEntries(FISH_IDS.map((id) => [id, 0])) as Record<FishId, number>;
  return {
    progress: { version: 1, revision: 0, lastCapture: '', starterClaimed: false, imported: false, discovered: [], counts: { ...zeros }, discoveredAt: { ...zeros }, sinceRare: 0, sinceLegendary: 0, duplicates: { common: 0, uncommon: 0, rare: 0, legendary: 0 } },
    preferences: { displayed: [], favorite: null, nicknames: {}, motion: true, positions: {} }, receipts: {}, pending: null, unrevealed: null,
    inventory: createAquaticInventory(), style: createAquaticStyle(), cast: null, pendingPurchase: null,
  };
}
export function validateFishingAccount(fishing: FishingAccount) {
  const p = fishing?.progress;
  const integer = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
  if (!p || p.version !== 1 || !integer(p.revision, 2000000000) || !integer(p.sinceRare, 9) || !integer(p.sinceLegendary, 29)
    || !Array.isArray(p.discovered) || new Set(p.discovered).size !== p.discovered.length || p.discovered.some((id) => !FISH_IDS.includes(id))
    || !FISH_IDS.every((id) => integer(p.counts?.[id], 1000000) && integer(p.discoveredAt?.[id], 8640000000000) && (p.counts[id] > 0 ? p.discoveredAt[id] > 0 && p.discovered.includes(id) : p.discoveredAt[id] === 0 && !p.discovered.includes(id)))
    || !Object.keys(FISH_RARITIES).every((rarity) => integer(p.duplicates?.[rarity as FishRarity], 3)) || !fishing.preferences || !fishing.receipts
    || (fishing.unrevealed && !fishing.receipts[fishing.unrevealed])) throw new Error('O registro dos peixes não pôde ser lido. Seus dados foram preservados.');
  validateAquarium(fishing.preferences, p);
  if (fishing.inventory) validateAquaticInventory(fishing.inventory);
  if (fishing.style && fishing.inventory) validateAquaticStyle(fishing.style, fishing.inventory);
  if (fishing.cast && (fishing.cast.captureId !== fishing.pending?.id || !['waiting', 'bite', 'paused'].includes(fishing.cast.phase) || !Number.isFinite(fishing.cast.dueAt) || !Number.isInteger(fishing.cast.remainingMs) || fishing.cast.remainingMs < 0 || fishing.cast.remainingMs > 22000)) throw new Error('A tentativa de pesca não pôde ser lida. Seus dados foram preservados.');
  return fishing;
}
export function captureIntent(starter: boolean, now = Date.now()): CaptureIntent {
  const rolls = crypto.getRandomValues(new Uint32Array(2));
  return { id: starter ? 'starter_v1' : `fish_${crypto.randomUUID()}`, kind: starter ? 'starter' : 'normal', createdAt: now, rarityRoll: rolls[0] / 4294967296, speciesRoll: rolls[1] / 4294967296 };
}
export function drawFish(progress: FishingProgress, intent: CaptureIntent) {
  if (![intent.rarityRoll, intent.speciesRoll].every((roll) => Number.isFinite(roll) && roll >= 0 && roll < 1)) throw new Error('Sorteio inválido.');
  if (intent.kind === 'starter') return { species: 'goldfish' as FishId, guarantee: 'none' as const };
  let rarity: FishRarity = 'legendary';
  let guarantee: FishCapture['guarantee'] = 'none';
  if (progress.sinceLegendary >= FISHING_RULES.legendaryGuarantee - 1) guarantee = 'legendary';
  else if (progress.sinceRare >= FISHING_RULES.rareGuarantee - 1) { rarity = intent.rarityRoll < .8 ? 'rare' : 'legendary'; guarantee = 'rare'; }
  else {
    let cumulative = 0;
    for (const [id, rule] of Object.entries(FISH_RARITIES) as [FishRarity, typeof FISH_RARITIES[FishRarity]][]) {
      cumulative += rule.weight;
      if (intent.rarityRoll * 100 < cumulative) { rarity = id; break; }
    }
  }
  const species = speciesInRarity(rarity);
  const missing = species.filter((id) => progress.counts[id] === 0);
  const candidates = progress.duplicates[rarity] >= FISHING_RULES.duplicateGuarantee && missing.length ? missing : species;
  return { species: candidates[Math.floor(intent.speciesRoll * candidates.length)], guarantee };
}
/** Pure transition. Random rolls are durably created outside transactions and reused on retries. */
export function confirmCapture(wallet: RewardWallet, progress: FishingProgress, intent: CaptureIntent, now = Date.now()) {
  if (intent.kind === 'starter' ? intent.id !== 'starter_v1' : !/^fish_[A-Za-z0-9-]{1,80}$/.test(intent.id)) throw new Error('Captura inválida.');
  if (intent.kind === 'starter' && progress.starterClaimed) throw new Error('Seu douradinho já está na coleção.');
  const cost = intent.kind === 'starter' ? 0 : 1;
  if (wallet.tickets < cost) throw new Error('Você precisa de um bilhete. Conclua uma tarefa para ganhar.');
  const { species, guarantee } = drawFish(progress, intent);
  const rarity = fishById(species).rarity;
  const discovery = progress.counts[species] === 0;
  const normal = intent.kind === 'normal';
  const duplicates = { ...progress.duplicates };
  if (normal) duplicates[rarity] = discovery || speciesInRarity(rarity).every((id) => progress.counts[id] > 0) ? 0 : Math.min(3, duplicates[rarity] + 1);
  const next: FishingProgress = { ...progress, revision: progress.revision + 1, lastCapture: intent.id, starterClaimed: progress.starterClaimed || !normal,
    counts: { ...progress.counts, [species]: progress.counts[species] + 1 }, discoveredAt: discovery ? { ...progress.discoveredAt, [species]: now } : progress.discoveredAt,
    discovered: discovery ? [...progress.discovered, species] : progress.discovered,
    sinceRare: !normal ? progress.sinceRare : ['rare', 'legendary'].includes(rarity) ? 0 : progress.sinceRare + 1,
    sinceLegendary: !normal ? progress.sinceLegendary : rarity === 'legendary' ? 0 : progress.sinceLegendary + 1, duplicates };
  const nextWallet = normal ? { ...wallet, tickets: wallet.tickets - 1, revision: wallet.revision + 1, lastEvent: intent.id } : wallet;
  const capture: FishCapture = { id: intent.id, kind: intent.kind, species, rarity, caughtAt: now, cost, rulesVersion: 1, revision: next.revision, walletRevision: nextWallet.revision, discovery, guarantee };
  const receipt: RewardReceipt | null = normal ? { id: intent.id, kind: 'fishing', sourceId: species, day: localDay(now, wallet.offset), occurredAt: now, xp: 0, coins: 0, tickets: -1, weeklyBonus: false, revision: nextWallet.revision } : null;
  return { wallet: nextWallet, progress: next, capture, receipt };
}
export function applyCapture(account: RewardAccount, intent: CaptureIntent): RewardAccount {
  const fishing = account.fishing || createFishingAccount();
  if (fishing.receipts[intent.id]) return { ...account, fishing: { ...fishing, pending: null, cast: null, unrevealed: intent.id } };
  const change = confirmCapture(account.wallet, fishing.progress, intent);
  const preferences = intent.kind === 'starter' ? { ...fishing.preferences, displayed: [...new Set([...fishing.preferences.displayed, 'goldfish' as const])].slice(0, 5), favorite: fishing.preferences.favorite || 'goldfish' as const } : fishing.preferences;
  return { ...account, wallet: change.wallet, receipts: change.receipt ? { ...account.receipts, [intent.id]: change.receipt } : account.receipts,
    fishing: { ...fishing, progress: change.progress, preferences, receipts: { ...fishing.receipts, [intent.id]: change.capture }, pending: null, cast: null, unrevealed: intent.id } };
}
export function validateAquarium(preferences: AquariumPreferences, progress: FishingProgress) {
  if (preferences.displayed.length > 5 || new Set(preferences.displayed).size !== preferences.displayed.length || preferences.displayed.some((id) => !progress.discovered.includes(id))) throw new Error('Escolha até cinco espécies da sua coleção.');
  if (preferences.favorite && !progress.discovered.includes(preferences.favorite)) throw new Error('Capture esse peixe antes de escolher seu companheiro.');
  if (typeof preferences.motion !== 'boolean' || Object.entries(preferences.nicknames).some(([id, name]) => !progress.discovered.includes(id as FishId) || typeof name !== 'string' || name.length > 40)) throw new Error('Use apelidos com até 40 caracteres para peixes descobertos.');
  if (preferences.positions && (typeof preferences.positions !== 'object' || Array.isArray(preferences.positions) || Object.entries(preferences.positions).some(([id, point]) => !progress.discovered.includes(id as FishId) || !point || !Number.isInteger(point.x) || !Number.isInteger(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100 || Object.keys(point).some((key) => !['x','y'].includes(key))))) throw new Error('A posição do peixe deve ficar dentro do aquário.');
  return preferences;
}
export function mergeFishingProgress(target: FishingProgress, guest: FishingProgress): FishingProgress {
  if (target.imported) throw new Error('Os peixes locais já foram importados para esta conta.');
  const counts = { ...target.counts }, discoveredAt = { ...target.discoveredAt };
  for (const id of FISH_IDS) {
    counts[id] = Math.max(target.counts[id], guest.counts[id]);
    discoveredAt[id] = counts[id] ? Math.min(...[target.discoveredAt[id], guest.discoveredAt[id]].filter((time) => time > 0)) : 0;
  }
  return { ...target, counts, discoveredAt, discovered: FISH_IDS.filter((id) => counts[id] > 0), starterClaimed: target.starterClaimed || counts.goldfish > 0, imported: true, revision: target.revision + 1 };
}
