import { describe, expect, it } from 'vitest';
import { createRewardAccount } from '../engine';
import { createFishingAccount } from '../fishing';
import { createAquaticInventory, createAquaticStyle, grantLocalMilestones, masteryTier, newFishingCast, pauseFishingCast, purchaseAquatic, resumeFishingCast, validateAquaticStyle } from '../aquatic';

describe('cosmetics and interruptible fishing', () => {
  it('grants collection and species milestones once without changing any currency', () => {
    const account = createRewardAccount(800); account.wallet.coins = 120; account.wallet.tickets = 2; account.fishing = createFishingAccount();
    account.fishing.progress.counts.betta = 5; account.fishing.progress.discovered = ['betta'];
    const next = grantLocalMilestones(account);
    expect(next.fishing?.inventory?.claimed).toEqual(['collection_1', 'mastery_betta_3', 'mastery_betta_5']);
    expect(next.wallet).toEqual(account.wallet);
    expect(masteryTier(next.fishing!.inventory!, 'betta')).toBe(5);
    expect(grantLocalMilestones(next).fishing?.inventory).toEqual(next.fishing?.inventory);
    next.fishing!.progress.counts.betta = 10;
    expect(grantLocalMilestones(next).fishing?.inventory?.claimed.filter((id) => id === 'mastery_betta_10')).toHaveLength(1);
  });
  it('charges only coins once and keeps a permanent item when replayed', () => {
    const wallet = { ...createRewardAccount(600).wallet, coins: 60, tickets: 2 };
    const first = purchaseAquatic(wallet, createAquaticInventory(), 'decor.arch.v1');
    expect(first.wallet).toMatchObject({ xp: 600, coins: 0, tickets: 2 });
    expect(first.inventory.owned).toEqual(['decor.arch.v1']);
    const replay = purchaseAquatic(first.wallet, first.inventory, 'decor.arch.v1');
    expect(replay.wallet).toEqual(first.wallet); expect(replay.receipt).toBeNull();
    expect(() => purchaseAquatic(first.wallet, first.inventory, 'background.moon.v1')).toThrow('moedas');
  });
  it('rejects equipping unowned backgrounds, decorations, collection frames and titles', () => {
    const inventory = createAquaticInventory(), style = createAquaticStyle();
    expect(() => validateAquaticStyle({ ...style, background: 'moon' }, inventory)).toThrow('Desbloqueie');
    expect(() => validateAquaticStyle({ ...style, decorations: ['arch'] }, inventory)).toThrow('Desbloqueie');
    expect(() => validateAquaticStyle({ ...style, frame: 'complete' }, inventory)).toThrow('Desbloqueie');
    expect(() => validateAquaticStyle({ ...style, title: 'collector' }, inventory)).toThrow('Desbloqueie');
    inventory.owned = ['decor.arch.v1']; inventory.claimed = ['collection_11'];
    expect(validateAquaticStyle({ ...style, decorations: ['arch'], frame: 'complete', title: 'collector' }, inventory)).toBeTruthy();
    expect(() => validateAquaticStyle({ ...style, decorations: ['arch', 'arch'] }, inventory)).toThrow('Desbloqueie');
  });
  it('preserves the remaining wait and the same capture across long pauses', () => {
    const cast = newFishingCast('fish_stable', 1000);
    const paused = pauseFishingCast(cast, 6000);
    expect(paused).toMatchObject({ captureId: 'fish_stable', phase: 'paused', remainingMs: 17000 });
    expect(pauseFishingCast(paused, 100000)).toEqual(paused);
    const resumed = resumeFishingCast(paused, 100000);
    expect(resumed.dueAt).toBe(117000);
    expect(pauseFishingCast(resumed, 117001)).toMatchObject({ phase: 'bite', remainingMs: 0 });
  });
});
