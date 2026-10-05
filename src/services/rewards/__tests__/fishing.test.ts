import { describe, expect, it } from 'vitest';
import { createRewardAccount } from '../engine';
import { applyCapture, confirmCapture, createFishingAccount, drawFish, mergeFishingProgress, validateAquarium } from '../fishing';
import type { CaptureIntent } from '../../../types/fishing';

const intent = (id: string, rarityRoll = 0, speciesRoll = 0): CaptureIntent => ({ id: `fish_${id}`, kind: 'normal', createdAt: Date.now(), rarityRoll, speciesRoll });
describe('fishing economy and guarantees', () => {
  it('grants the starter once without spending balances or advancing guarantees', () => {
    const account = createRewardAccount(600); account.wallet.tickets = 4;
    account.fishing = createFishingAccount(); account.fishing.progress.sinceRare = 9;
    const starter = { ...intent('starter'), id: 'starter_v1', kind: 'starter' as const };
    const next = applyCapture(account, starter);
    expect(next.wallet).toEqual(account.wallet);
    expect(next.fishing?.progress).toMatchObject({ starterClaimed: true, sinceRare: 9, counts: { goldfish: 1 } });
    expect(next.fishing?.preferences).toMatchObject({ favorite: 'goldfish', displayed: ['goldfish'] });
    expect(applyCapture(next, starter).fishing?.progress.counts.goldfish).toBe(1);
    expect(() => confirmCapture(next.wallet, next.fishing!.progress, starter)).toThrow('já está');
  });
  it('spends exactly one ticket and replays the saved result without another charge', () => {
    const account = createRewardAccount(600); account.wallet.tickets = 2;
    const next = applyCapture(account, intent('once'));
    expect(next.wallet).toMatchObject({ xp: 600, coins: 0, tickets: 1, revision: 1 });
    expect(next.fishing?.progress.counts.koi).toBe(1);
    const replay = applyCapture(next, { ...intent('once'), rarityRoll: .999 });
    expect(replay.wallet.tickets).toBe(1); expect(replay.fishing?.progress.counts.discus).toBe(0);
    expect(replay.fishing?.receipts.fish_once.species).toBe('koi');
  });
  it('refuses insufficient tickets, malformed identities and invalid randomness', () => {
    const account = createRewardAccount(); const progress = createFishingAccount().progress;
    expect(() => confirmCapture(account.wallet, progress, intent('no-ticket'))).toThrow('bilhete');
    expect(() => drawFish(progress, intent('bad', 1))).toThrow('inválido');
    expect(() => drawFish(progress, intent('bad', NaN))).toThrow('inválido');
    expect(() => confirmCapture(account.wallet, progress, { ...intent('bad'), id: '../x' })).toThrow('inválida');
  });
  it('honors category boundaries and equal species weights', () => {
    const progress = createFishingAccount().progress;
    expect(drawFish(progress, intent('a', .549, .99)).species).toBe('catfish');
    expect(drawFish(progress, intent('b', .55)).species).toBe('guppy');
    expect(drawFish(progress, intent('c', .85)).species).toBe('betta');
    expect(drawFish(progress, intent('d', .969, .99)).species).toBe('mandarin');
    expect(drawFish(progress, intent('e', .97)).species).toBe('discus');
  });
  it('guarantees rare or better on the tenth consecutive lower capture', () => {
    let account = createRewardAccount(); account.wallet.tickets = 30;
    for (let n = 0; n < 9; n++) account = applyCapture(account, intent(String(n)));
    expect(account.fishing?.progress.sinceRare).toBe(9);
    account = applyCapture(account, intent('tenth'));
    expect(account.fishing?.receipts.fish_tenth).toMatchObject({ rarity: 'rare', guarantee: 'rare' });
    expect(account.fishing?.progress).toMatchObject({ sinceRare: 0, sinceLegendary: 10 });
  });
  it('prioritizes the thirtieth-capture legendary guarantee and resets both counters', () => {
    const account = createRewardAccount(); account.wallet.tickets = 1;
    account.fishing = createFishingAccount(); account.fishing.progress.sinceRare = 9; account.fishing.progress.sinceLegendary = 29;
    const next = applyCapture(account, intent('legend'));
    expect(next.fishing?.receipts.fish_legend).toMatchObject({ species: 'discus', guarantee: 'legendary' });
    expect(next.fishing?.progress).toMatchObject({ sinceRare: 0, sinceLegendary: 0 });
  });
  it('uses conditional 80:20 weights only when the rare guarantee is due', () => {
    const progress = createFishingAccount().progress; progress.sinceRare = 9;
    expect(drawFish(progress, intent('rare', .799)).species).toBe('betta');
    expect(drawFish(progress, intent('legend', .8)).species).toBe('discus');
  });
  it('protects against a fourth duplicate within the rolled category without elevating rarity', () => {
    let account = createRewardAccount(); account.wallet.tickets = 10;
    for (let n = 0; n < 4; n++) account = applyCapture(account, intent(`dup-${n}`));
    expect(account.fishing?.progress.duplicates.common).toBe(3);
    expect(drawFish(account.fishing!.progress, intent('uncommon', .6)).species).toBe('guppy');
    account = applyCapture(account, intent('missing'));
    expect(account.fishing?.receipts.fish_missing.species).toBe('neon');
    expect(account.fishing?.progress.duplicates.common).toBe(0);
    expect(account.wallet.coins).toBe(0); expect(account.wallet.tickets).toBe(5);
  });
  it('keeps duplicates usable after their whole category is collected', () => {
    const account = createRewardAccount(); account.wallet.tickets = 1; account.fishing = createFishingAccount();
    for (const id of ['koi', 'neon', 'clownfish', 'catfish'] as const) account.fishing.progress.counts[id] = 1;
    account.fishing.progress.duplicates.common = 3;
    const next = applyCapture(account, intent('complete'));
    expect(next.fishing?.progress.counts.koi).toBe(2); expect(next.fishing?.progress.duplicates.common).toBe(0);
  });
  it('imports max counts once and preserves account guarantees and currency', () => {
    const target = createFishingAccount().progress, guest = createFishingAccount().progress;
    target.counts.koi = 3; target.discoveredAt.koi = 1000; target.discovered = ['koi']; target.sinceRare = 7;
    guest.counts.koi = 2; guest.discoveredAt.koi = 500; guest.counts.goldfish = 1; guest.discoveredAt.goldfish = 600;
    const merged = mergeFishingProgress(target, guest);
    expect(merged).toMatchObject({ counts: { koi: 3, goldfish: 1 }, discoveredAt: { koi: 500 }, sinceRare: 7, starterClaimed: true, imported: true });
    expect(() => mergeFishingProgress(merged, guest)).toThrow('já foram');
  });
  it('validates aquarium capacity, discovered ownership and nickname length', () => {
    const fishing = createFishingAccount();
    expect(() => validateAquarium({ ...fishing.preferences, displayed: ['betta'] }, fishing.progress)).toThrow('coleção');
    expect(() => validateAquarium({ ...fishing.preferences, favorite: 'betta' }, fishing.progress)).toThrow('Capture');
    fishing.progress.discovered = ['betta'];
    expect(() => validateAquarium({ ...fishing.preferences, nicknames: { betta: 'a'.repeat(41) } }, fishing.progress)).toThrow('40');
  });
});
