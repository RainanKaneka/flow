import { describe, expect, it } from 'vitest';
import { applyLocalEvent, createRewardAccount, DAY_MS, earnReward, goalForDay, localDay, mergeGuestProgress, nextGoal, purchaseReward, rewardAchievements, rewardEventId, rewardLevel, streakContinues, weekStart } from '../engine';
import type { RewardAccount, RewardEvent } from '../../../types/rewards';

const now = Date.now();
function event(account: RewardAccount, index = 0, kind: RewardEvent['kind'] = 'task', time = now): RewardEvent {
  const day = localDay(time, account.wallet.offset);
  return { id: rewardEventId(kind,day,`id-${index}`), sourceId: `id-${index}`, kind, day, occurredAt: time, readyAt: time, focusSeconds: kind === 'focus' ? 1500 : 0, graceUntil: 0 };
}
function tasks(count: number, account = createRewardAccount(), time = now) {
  for (let i = 0; i < count; i++) account = applyLocalEvent(account, event(account, i, 'task', time), time);
  return account;
}
describe('reward economy and permanent progress', () => {
  it('matches the agreed 3 tasks plus a focus session scenario', () => {
    let account = tasks(3);
    account = applyLocalEvent(account, event(account, 1, 'focus'));
    expect(account.wallet).toMatchObject({ xp: 245, coins: 37, tickets: 2, taskCount: 3, focusCount: 1 });
  });
  it('caps task, focus and currency rewards and records zero receipts', () => {
    let account = tasks(9);
    for (let i = 0; i < 8; i++) account = applyLocalEvent(account, event(account, i, 'focus'));
    expect(account.wallet).toMatchObject({ xp: 385, coins: 50, tickets: 2, taskCount: 5, focusCount: 3 });
    expect(account.receipts[event(account, 8).id].xp).toBe(0);
    expect(account.receipts[event(account, 7, 'focus').id].coins).toBe(0);
  });
  it('replays without reminting or consuming a daily slot', () => {
    const account = tasks(1);
    const replay = applyLocalEvent(account, event(account));
    expect(replay.wallet).toEqual(account.wallet);
    expect(replay.days).toEqual(account.days);
  });
  it.each([[1, 90, 20], [2, 155, 27], [3, 225, 35]])('awards goal %i exactly once', (goal, xp, coins) => {
    const account = createRewardAccount(); account.wallet.goals[0].target = goal as 1 | 2 | 3;
    expect(tasks(goal, account).wallet).toMatchObject({ xp, coins, tickets: 2 });
  });
  it('records purchases durably and never permits a negative balance or rebuy', () => {
    const wallet = tasks(1).wallet;
    const bought = purchaseReward(wallet, 'accent.sage.v1');
    expect(bought.wallet.coins).toBe(0); expect(bought.wallet.xp).toBe(75);
    expect(() => purchaseReward(bought.wallet, 'accent.sage.v1')).toThrow('já');
    expect(() => purchaseReward(bought.wallet, 'theme.forest.v1')).toThrow('Faltam');
  });
  it('applies goal changes tomorrow and replaces multiple changes for the same date', () => {
    const account = createRewardAccount();
    account.wallet.goals = nextGoal(account.wallet, 1, [1, 2], now);
    expect(goalForDay(account.wallet, localDay(now, account.wallet.offset)).target).toBe(3);
    account.wallet.goals = nextGoal(account.wallet, 2, [3, 4], now);
    expect(account.wallet.goals).toHaveLength(2);
    expect(goalForDay(account.wallet, localDay(now + DAY_MS, account.wallet.offset)).target).toBe(2);
  });
  it('does not give a daily-goal bonus on a planned rest day', () => {
    const account = createRewardAccount(); account.wallet.goals[0].weekdays = [];
    expect(tasks(3, account).wallet).toMatchObject({ xp: 175, coins: 25, tickets: 1 });
  });
  it('gives the fourth active-day weekly reward only once, outside the daily cap', () => {
    const start = weekStart(localDay(now));
    let account = createRewardAccount(); account.wallet.offset = 0;
    // Use an anchor at the end of a complete emulated week, avoiding future wall-clock dates.
    const end = (start + 6) * DAY_MS + 12 * 3600000;
    for (let d = 0; d < 4; d++) account = tasks(5, account, (start + d) * DAY_MS + 12 * 3600000);
    expect(account.weeks[start]).toMatchObject({ rewarded: true, days: [start, start + 1, start + 2, start + 3] });
    expect(account.wallet.xp).toBe(1400); // 4 * 325 + 100
    expect(account.wallet.coins).toBe(200); // 4 * 45 + 20
    const fifth = tasks(1, account, (start + 4) * DAY_MS + 12 * 3600000);
    expect(fifth.wallet.xp - account.wallet.xp).toBe(75);
    expect(end).toBeGreaterThan(start * DAY_MS);
  });
  it('rejects stale, future, previous-day corrections and short focus claims', () => {
    const account = createRewardAccount(); const e = event(account);
    expect(() => earnReward(account.wallet, undefined, undefined, { ...e, occurredAt: now - 8 * DAY_MS })).toThrow('sete dias');
    expect(() => earnReward(account.wallet, undefined, undefined, { ...e, occurredAt: now + 120000 })).toThrow();
    const yesterday = { ...e, day: e.day - 1, id: `task_${e.day - 1}_${e.sourceId}` };
    expect(() => earnReward(account.wallet, undefined, undefined, yesterday)).toThrow('outros dias');
    expect(() => earnReward(account.wallet, undefined, undefined, { ...event(account, 0, 'focus'), focusSeconds: 1499 })).toThrow('25 minutos');
  });
  it('allows the original date for an overnight task during its two-hour grace period', () => {
    const account = createRewardAccount(); account.wallet.offset = 0;
    const day = localDay(now, 0); const time = day * DAY_MS + 3600000;
    const e = { ...event(account, 0, 'task', time), day: day - 1, id: `task_${day - 1}_id-0`, graceUntil: time + 3600000 };
    expect(earnReward(account.wallet, undefined, undefined, e, time).wallet.xp).toBe(75);
    expect(() => earnReward(account.wallet, undefined, undefined, { ...e, occurredAt: e.graceUntil + 1 }, e.graceUntil + 1)).toThrow();
  });
  it('preserves the XP floor and achievements without transferring historical currency', () => {
    const cloud = tasks(1); const guest = createRewardAccount(1200, ['first_step']);
    guest.wallet.coins = 999; guest.wallet.tickets = 999; guest.wallet.owned = ['theme.forest.v1'];
    const merged = mergeGuestProgress(cloud, guest);
    expect(merged.wallet).toMatchObject({ xp: 1200, coins: 15, tickets: 1, owned: ['theme.forest.v1'] });
    expect(() => mergeGuestProgress(merged, guest)).toThrow('já foi importado');
    expect(rewardAchievements(merged.wallet)).toContain('first_step');
  });
  it('keeps existing level thresholds and extends progression above five', () => {
    expect([0, 250, 600, 1200, 2500].map((xp) => rewardLevel(xp).levelNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(rewardLevel(3500).levelNumber).toBe(6);
    expect(rewardLevel(5000).levelNumber).toBe(7);
  });
  it('never pays a restored focus session again on another day', () => {
    const account = applyLocalEvent(createRewardAccount(),event(createRewardAccount(),0,'focus'),now);
    const repeated = applyLocalEvent(account,event(account,0,'focus',now+DAY_MS),now+DAY_MS);
    expect(repeated.wallet).toEqual(account.wallet);
  });
  it('preserves the streak across planned rest days', () => {
    const wallet = createRewardAccount().wallet;
    wallet.goals[0].weekdays = [1,2,3,4,5];
    wallet.lastActiveDay = weekStart(localDay(now)) + 4; // Friday
    expect(streakContinues(wallet,wallet.lastActiveDay+3)).toBe(true);
    expect(streakContinues(wallet,wallet.lastActiveDay+4)).toBe(false); // A missed Monday
  });
});
