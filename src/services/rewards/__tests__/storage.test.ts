import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createRewardAccount } from '../engine';
import { applyCapture } from '../fishing';

const databases = vi.hoisted(() => new Map<string,DatabaseSync>());
vi.mock('@tauri-apps/plugin-sql', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  return { default: { load: vi.fn(async (url: string) => {
    const db = databases.get(url) || new DatabaseSync(':memory:'); databases.set(url,db);
    return {
      execute: async (sql: string, args: string[] = []) => args.length ? db.prepare(sql).run(Object.fromEntries(args.map((value,index) => [`$${index+1}`,value]))) : db.prepare(sql).run(),
      select: async (sql: string, args: string[] = []) => args.length ? db.prepare(sql).all(Object.fromEntries(args.map((value,index) => [`$${index+1}`,value]))) : db.prepare(sql).all(),
    };
  }) } };
});
beforeEach(() => { vi.resetModules(); Object.defineProperty(window,'__TAURI_INTERNALS__',{ configurable: true,value:{} }); });
afterEach(() => { delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__; });
afterAll(() => { for (const db of databases.values()) db.close(); });
describe('reward storage using real SQLite statements', () => {
  it('commits ticket charge and fish inventory together, including a real SQLite failure', async () => {
    const storage = await import('../storage');
    const account = createRewardAccount(); account.wallet.tickets = 1;
    await storage.saveRewardAccount('fish-atomic', account);
    const captured = applyCapture(account, { id: 'fish_atomic', kind: 'normal', createdAt: Date.now(), rarityRoll: .9, speciesRoll: 0 });
    const db = databases.get('sqlite:flow-rewards.db')!;
    db.exec("CREATE TRIGGER reject_fish BEFORE UPDATE ON flow_rewards WHEN NEW.owner_key = 'fish-atomic' BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END");
    await expect(storage.saveRewardAccount('fish-atomic', captured)).rejects.toThrow('simulated disk failure');
    expect((await storage.loadRewardAccount('fish-atomic'))?.wallet.tickets).toBe(1);
    expect((await storage.loadRewardAccount('fish-atomic'))?.fishing).toBeUndefined();
    db.exec('DROP TRIGGER reject_fish');
    await storage.saveRewardAccount('fish-atomic', captured);
    vi.resetModules(); const reopened = await import('../storage');
    const restored = await reopened.loadRewardAccount('fish-atomic');
    expect(restored?.wallet.tickets).toBe(0);
    expect(restored?.fishing?.progress.counts.betta).toBe(1);
    expect(restored?.fishing?.unrevealed).toBe('fish_atomic');
  });
  it('uses a separate database, isolates owners and serializes concurrent snapshots', async () => {
    const storage = await import('../storage');
    const first = createRewardAccount(250), second = createRewardAccount(600);
    await Promise.all([storage.saveRewardAccount('alice',first),storage.saveRewardAccount('alice',second),storage.saveRewardAccount('bob',first)]);
    expect((await storage.loadRewardAccount('alice'))?.wallet.xp).toBe(600);
    expect((await storage.loadRewardAccount('bob'))?.wallet.xp).toBe(250);
    expect(databases.has('sqlite:flow-rewards.db')).toBe(true);
    expect(databases.has('sqlite:flow.db')).toBe(false);
    vi.resetModules(); const reopened = await import('../storage');
    expect((await reopened.loadRewardAccount('alice'))?.wallet.xp).toBe(600);
  });
  it('keeps the original migration backup when the migration is retried', async () => {
    const storage = await import('../storage');
    await storage.backupRewardAccount('migration',{ xp: 600 }); await storage.backupRewardAccount('migration',{ xp: 1 });
    const row = databases.get('sqlite:flow-rewards.db')!.prepare('SELECT payload FROM flow_rewards_backup WHERE owner_key = ?').get('migration') as { payload: string };
    expect(JSON.parse(row.payload)).toEqual({ xp: 600 });
  });
  it('keeps the browser fallback per owner and refuses a corrupt payload', async () => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    const storage = await import('../storage');
    await storage.saveRewardAccount('web-guest',createRewardAccount(1200));
    expect((await storage.loadRewardAccount('web-guest'))?.wallet.xp).toBe(1200);
    localStorage.setItem('flow-rewards-v1:corrupt','{"wallet":{"version":2}}');
    await expect(storage.loadRewardAccount('corrupt')).rejects.toThrow('preservados');
    expect(localStorage.getItem('flow-rewards-v1:corrupt')).toBeTruthy();
    const badFish = createRewardAccount(); badFish.fishing = (await import('../fishing')).createFishingAccount(); badFish.fishing.progress.sinceRare = 100;
    localStorage.setItem('flow-rewards-v1:bad-fish', JSON.stringify(badFish));
    await expect(storage.loadRewardAccount('bad-fish')).rejects.toThrow('preservados');
    expect(localStorage.getItem('flow-rewards-v1:bad-fish')).toBeTruthy();
  });
});
