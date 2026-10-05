import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createRewardAccount } from '../engine';
import { confirmCapture, createFishingAccount } from '../fishing';

describe('seeded fishing balance simulation', () => {
  it('bounds the first rare and legendary waits and measures collection pacing', () => {
    let seed = 20261005;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const rare: number[] = [], legendary: number[] = [], complete: number[] = [];
    const rarities = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
    const players = 2000, limit = 300;
    for (let player = 0; player < players; player++) {
      let wallet = { ...createRewardAccount().wallet, tickets: limit };
      let progress = createFishingAccount().progress;
      let firstRare = 0, firstLegendary = 0;
      for (let n = 1; n <= limit; n++) {
        const change = confirmCapture(wallet, progress, { id: `fish_${player}-${n}`, kind: 'normal', rarityRoll: random(), speciesRoll: random(), createdAt: 1 }, 1);
        wallet = change.wallet; progress = change.progress; rarities[change.capture.rarity]++;
        if (!firstRare && ['rare', 'legendary'].includes(change.capture.rarity)) firstRare = n;
        if (!firstLegendary && change.capture.rarity === 'legendary') firstLegendary = n;
        if (progress.discovered.length === 10) { complete.push(n); break; }
      }
      rare.push(firstRare); legendary.push(firstLegendary);
    }
    expect(Math.max(...rare)).toBeLessThanOrEqual(10);
    expect(Math.max(...legendary)).toBeLessThanOrEqual(30);
    expect(Math.min(...rare)).toBeGreaterThan(0);
    expect(complete.length).toBeGreaterThan(players * .99);
    const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
    if (process.env.FLOW_FISHING_REPORT) writeFileSync(process.env.FLOW_FISHING_REPORT, JSON.stringify({ seed: 20261005, players, maxCaptures: limit, firstRare: { median: percentile(rare, .5), p90: percentile(rare, .9), max: Math.max(...rare) }, firstLegendary: { median: percentile(legendary, .5), p90: percentile(legendary, .9), max: Math.max(...legendary) }, fullCollection: { completed: complete.length, median: percentile(complete, .5), p90: percentile(complete, .9), max: Math.max(...complete) }, effectiveRarities: rarities }, null, 2));
  });
});
