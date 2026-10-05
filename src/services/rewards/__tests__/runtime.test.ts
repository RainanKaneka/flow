import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlowStore } from '../../../store/useFlowStore';
import { createRewardAccount, dayLabel, localDay } from '../engine';
import { disposeRewards, initializeRewards, flushRewards, buyReward, equipReward, recordFocusReward } from '../runtime';
import * as cloud from '../cloud';
import * as storage from '../storage';
import type { RewardAccount } from '../../../types/rewards';
import type { Task } from '../../../types/routine';

vi.mock('../cloud', () => ({
  initializeCloudRewards: vi.fn(async () => createRewardAccount().wallet),
  fetchRewardPeriod: vi.fn(async () => ({ day: localDay(), imported: false })),
  watchCloudRewards: vi.fn(() => () => undefined), watchCloudRewardPreferences: vi.fn(() => () => undefined),
  sendRewardEvent: vi.fn(), buyCloudReward: vi.fn(), configureCloudGoal: vi.fn(), importCloudGuest: vi.fn(), saveCloudRewardPreferences: vi.fn(async () => undefined),
}));
vi.mock('../../firebaseConfig', () => ({ getActiveFirebaseConfig: () => ({ projectId: 'test' }), getFirebaseFirestoreInstance: () => null, isFirebaseConfigured: () => false }));
vi.mock('../storage', () => ({ loadRewardAccount: vi.fn(), saveRewardAccount: vi.fn(), backupRewardAccount: vi.fn() }));
const task: Task = { id: 'reward-task', title: 'Read', description: '', routineTypeId: 'routine', categoryId: 'category', startTime: '08:00', endTime: '20:00', daysOfWeek: [0,1,2,3,4,5,6], tags: [], targetMinutes: 30 };
let accounts: Map<string,RewardAccount>;
const settle = async () => { for (let i=0;i<30;i++) await Promise.resolve(); };
beforeEach(async () => {
  accounts = new Map();
  vi.mocked(storage.loadRewardAccount).mockImplementation(async (owner) => accounts.get(owner) || null);
  vi.mocked(storage.saveRewardAccount).mockImplementation(async (owner,account) => { accounts.set(owner,structuredClone(account)); });
  vi.mocked(storage.backupRewardAccount).mockResolvedValue();
  vi.mocked(cloud.initializeCloudRewards).mockResolvedValue(createRewardAccount().wallet);
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T15:00:00Z'));
  useFlowStore.setState({ tasks: [task], logs: {}, firebaseUser: null, rewardOwner: null, rewards: null, rewardStatus: 'loading', pomodoro: { isActive: false, mode: 'focus', timeLeftSeconds: 1500, totalDurationSeconds: 1500, completedSessions: 0, linkedTaskId: null, autoAdvance: false } });
  await initializeRewards(null);
});
afterEach(() => { disposeRewards(); vi.useRealTimers(); });
describe('durable rewards connected to the real store', () => {
  it('captures completion during session restoration and excludes it from the legacy XP floor', async () => {
    accounts.clear(); disposeRewards(); useFlowStore.setState({ rewardOwner:null,rewards:null,logs:{} });
    const date=dayLabel(localDay());
    useFlowStore.getState().toggleTaskCompletion(task.id,date);
    expect(localStorage.getItem('flow-rewards-startup-intentions-v1')).toBeTruthy();
    await initializeRewards(null);
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(0);
    await vi.advanceTimersByTimeAsync(6000); await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(75);
    expect(localStorage.getItem('flow-rewards-startup-intentions-v1')).toBeNull();
  });
  it('binds a session started during startup without transferring another account’s session', async () => {
    useFlowStore.setState({ rewardOwner:null });useFlowStore.getState().startPomodoro();
    expect(useFlowStore.getState().pomodoro.rewardOwnerAtStart).toBeNull();
    await initializeRewards(null);expect(useFlowStore.getState().pomodoro.rewardOwnerAtStart).toBe('guest');
    await initializeRewards('alice');await settle();
    expect(useFlowStore.getState().pomodoro.rewardOwnerAtStart).toBe('guest');
  });
  it('clears the previous wallet while the next profile is restoring and buffers new completions', async () => {
    disposeRewards();
    expect(useFlowStore.getState().rewardOwner).toBeNull();
    expect(useFlowStore.getState().rewards).toBeNull();
    useFlowStore.getState().toggleTaskCompletion(task.id,dayLabel(localDay()));
    await initializeRewards(null);
    await vi.advanceTimersByTimeAsync(6000); await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(75);
    expect(localStorage.getItem('flow-rewards-startup-intentions-v1')).toBeNull();
  });
  it('waits five seconds, cancels undo, and never remints after delete/reset/restart', async () => {
    const date = dayLabel(localDay());
    useFlowStore.getState().toggleTaskCompletion(task.id,date); await settle();
    expect(useFlowStore.getState().rewards!.pending).toHaveLength(1);
    await flushRewards(); expect(useFlowStore.getState().rewards!.wallet.xp).toBe(0);
    useFlowStore.getState().toggleTaskCompletion(task.id,date); await settle();
    await vi.advanceTimersByTimeAsync(6000); await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(0);
    useFlowStore.getState().toggleTaskCompletion(task.id,date); await settle();
    await vi.advanceTimersByTimeAsync(6000); await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(75);
    useFlowStore.getState().deleteTask(task.id); useFlowStore.getState().resetToTemplate();
    useFlowStore.setState({ tasks: [task], logs: {} }); // A routine import restores the same occurrence id.
    await initializeRewards(null);
    useFlowStore.getState().toggleTaskCompletion(task.id,date); await settle();
    await vi.advanceTimersByTimeAsync(6000); await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(75);
  });
  it('requires observed elapsed focus time and resets identity on a duration edit', async () => {
    useFlowStore.getState().startPomodoro();
    const originalId = useFlowStore.getState().pomodoro.rewardSessionId;
    useFlowStore.getState().finishPomodoroSession(); await settle();
    expect(useFlowStore.getState().rewards!.pending).toHaveLength(0);
    useFlowStore.getState().setPomodoroMode('focus'); useFlowStore.getState().startPomodoro();
    expect(useFlowStore.getState().pomodoro.rewardSessionId).not.toBe(originalId);
    // Observe each second, exercising the production timer. Fast unobserved ticks award nothing.
    for (let i=0;i<1500;i++) { vi.setSystemTime(Date.now()+1000); useFlowStore.getState().tickPomodoro(); }
    await settle(); await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet).toMatchObject({ xp: 20, coins: 2 });
    useFlowStore.getState().setPomodoroMode('focus'); useFlowStore.getState().startPomodoro();
    const id = useFlowStore.getState().pomodoro.rewardSessionId;
    useFlowStore.getState().setPomodoroDuration(10);
    expect(useFlowStore.getState().pomodoro.rewardSessionId).toBeNull();
    expect(id).toBeTruthy();
  });
  it('persists a purchase and equipment across app initialization', async () => {
    recordFocusReward('sample-focus',1500); await settle(); await flushRewards();
    const account = useFlowStore.getState().rewards!; account.wallet.coins = 15;
    accounts.set('guest',structuredClone(account)); await initializeRewards(null);
    await buyReward('accent.sage.v1'); await equipReward('accent.sage.v1','accent');
    await initializeRewards(null);
    expect(useFlowStore.getState().rewards!.wallet.coins).toBe(0);
    expect(useFlowStore.getState().rewards!.preferences.equipped.accent).toBe('accent.sage.v1');
  });
  it('keeps local intentions writable while a cloud request is stalled', async () => {
    await initializeRewards('alice'); await settle();
    const owner = useFlowStore.getState().rewardOwner!;
    useFlowStore.setState({ rewardStatus: 'synced' });
    recordFocusReward('first',1500); await settle();
    let resolve!: (value: Awaited<ReturnType<typeof cloud.sendRewardEvent>>) => void;
    vi.mocked(cloud.sendRewardEvent).mockReturnValueOnce(new Promise((done) => { resolve=done; }));
    const drain = flushRewards(); await settle();
    recordFocusReward('second',1500); await settle();
    expect(accounts.get(owner)!.pending.map((e) => e.sourceId)).toEqual(['first','second']);
    await initializeRewards('bob'); await settle();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(0);
    // Bob can synchronize independently while Alice's request is still unresolved.
    recordFocusReward('bob-focus',1500); await settle();
    const bobWallet = useFlowStore.getState().rewards!.wallet;
    vi.mocked(cloud.sendRewardEvent).mockResolvedValueOnce({ wallet: { ...bobWallet, xp: 20, revision: 1 }, receipt: { id:'focus_bob-focus',kind:'focus',sourceId:'bob-focus',day:localDay(),occurredAt:Date.now(),xp:20,coins:2,tickets:0,weeklyBonus:false,revision:1 }, day: { tasks:0,focus:1,coins:2,goal:3,planned:true }, week: { days:[],rewarded:false } });
    await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(20);
    const original = accounts.get(owner)!;
    resolve({ wallet: { ...original.wallet, xp: 20, revision: 1 }, receipt: { id:'focus_first',kind:'focus',sourceId:'first',day:localDay(),occurredAt:Date.now(),xp:20,coins:2,tickets:0,weeklyBonus:false,revision:1 }, day: { tasks:0,focus:1,coins:2,goal:3,planned:true }, week: { days:[],rewarded:false } });
    await drain;
    expect(useFlowStore.getState().rewardOwner).toBe('firebase:test:bob');
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(20);
    expect(accounts.get(owner)!.pending).toHaveLength(2); // Replay on Alice will read the confirmed receipt.
  });
  it('retains the durable pending event if a receipt cannot be written to disk', async () => {
    recordFocusReward('disk',1500); await settle();
    vi.mocked(storage.saveRewardAccount).mockRejectedValueOnce(new Error('Disk full'));
    await flushRewards();
    expect(useFlowStore.getState().rewards!.wallet.xp).toBe(0);
    expect(accounts.get('guest')!.pending).toHaveLength(1);
    await flushRewards(); expect(useFlowStore.getState().rewards!.wallet.xp).toBe(20);
  });
});
