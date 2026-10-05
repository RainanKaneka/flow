import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlowStore } from '../../../store/useFlowStore';
import { createRewardAccount, dayLabel, localDay } from '../engine';
import { acknowledgeFishCapture, buyAquaticItem, catchFish, changeFishCast, configureAquarium, configureAquaticStyle, disposeRewards, flushRewards, initializeRewards, prepareFishCast } from '../runtime';
import { createFishingAccount } from '../fishing';
import { createAquaticInventory, createAquaticStyle, purchaseAquatic } from '../aquatic';
import * as storage from '../storage';
import * as cloud from '../cloud';
import * as fishingCloud from '../fishingCloud';
import * as aquaticCloud from '../aquaticCloud';
import type { RewardAccount } from '../../../types/rewards';

vi.mock('../cloud', () => ({ initializeCloudRewards: vi.fn(async () => createRewardAccount().wallet), fetchRewardPeriod: vi.fn(async () => ({ day: localDay(), imported: false })), watchCloudRewards: vi.fn(() => () => undefined), watchCloudRewardPreferences: vi.fn(() => () => undefined), sendRewardEvent: vi.fn(), buyCloudReward: vi.fn(), configureCloudGoal: vi.fn(), importCloudGuest: vi.fn(), saveCloudRewardPreferences: vi.fn() }));
vi.mock('../fishingCloud', () => ({ initializeCloudFishing: vi.fn(async () => createFishingAccount().progress), watchCloudFishing: vi.fn(() => () => undefined), watchCloudAquarium: vi.fn(() => () => undefined), catchCloudFish: vi.fn(), saveCloudAquarium: vi.fn(), importCloudFish: vi.fn() }));
vi.mock('../aquaticCloud', () => ({ initializeCloudAquatic: vi.fn(async () => ({ inventory: createAquaticInventory(), style: createAquaticStyle() })), watchCloudAquaticInventory: vi.fn(() => () => undefined), watchCloudAquaticStyle: vi.fn(() => () => undefined), buyCloudAquatic: vi.fn(), claimCloudAquaticMilestone: vi.fn(), importCloudAquatic: vi.fn(), saveCloudAquaticStyle: vi.fn() }));
vi.mock('../storage', () => ({ loadRewardAccount: vi.fn(), saveRewardAccount: vi.fn(), backupRewardAccount: vi.fn() }));
vi.mock('../../firebaseConfig', () => ({ getActiveFirebaseConfig: () => ({ projectId: 'test' }), getFirebaseFirestoreInstance: () => null, isFirebaseConfigured: () => false }));
let accounts: Map<string, RewardAccount>;
const settle = async () => { for (let n = 0; n < 60; n++) await Promise.resolve(); };
beforeEach(async () => {
  accounts = new Map();
  vi.mocked(storage.loadRewardAccount).mockImplementation(async (owner) => accounts.get(owner) || null);
  vi.mocked(storage.saveRewardAccount).mockImplementation(async (owner, account) => { accounts.set(owner, structuredClone(account)); });
  vi.mocked(storage.backupRewardAccount).mockResolvedValue();
  const guest = createRewardAccount(600); guest.wallet.tickets = 3; accounts.set('guest', guest);
  useFlowStore.setState({ tasks: [], logs: {}, rewardOwner: null, rewards: null });
  await initializeRewards(null);
});
afterEach(() => { disposeRewards(); vi.restoreAllMocks(); });
describe('durable capture flow', () => {
  it('keeps a cast, random rolls and ticket intact through pauses, restart and mode change', async () => {
    await prepareFishCast();
    const intent = structuredClone(useFlowStore.getState().rewards!.fishing!.pending!);
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(3);
    await changeFishCast(intent.id, 'pause');
    await initializeRewards(null);
    expect(useFlowStore.getState().rewards?.fishing?.pending).toEqual(intent);
    expect(useFlowStore.getState().rewards?.fishing?.cast?.phase).toBe('paused');
    await configureAquaticStyle({ ...createAquaticStyle(), mode: 'simple' });
    const result = await catchFish();
    expect(result?.id).toBe(intent.id);
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(2);
    expect(useFlowStore.getState().rewards?.fishing?.cast).toBeNull();
  });
  it('serializes rapid cosmetic purchases and restores ownership and equipment', async () => {
    const old = useFlowStore.getState().rewards!;
    useFlowStore.setState({ rewards: { ...old, wallet: { ...old.wallet, coins: 80 } } });
    await Promise.all([buyAquaticItem('decor.lantern.v1'), buyAquaticItem('decor.lantern.v1')]);
    expect(useFlowStore.getState().rewards?.wallet.coins).toBe(40);
    await configureAquaticStyle({ ...createAquaticStyle(), decorations: ['lantern'] });
    await initializeRewards(null);
    expect(useFlowStore.getState().rewards?.fishing).toMatchObject({ inventory: { owned: ['decor.lantern.v1'] }, style: { decorations: ['lantern'] } });
  });
  it('does not charge or grant a decoration when local persistence fails', async () => {
    const old = useFlowStore.getState().rewards!;
    useFlowStore.setState({ rewards: { ...old, wallet: { ...old.wallet, coins: 80 } } });
    vi.mocked(storage.saveRewardAccount).mockRejectedValueOnce(new Error('Disk full'));
    await expect(buyAquaticItem('decor.lantern.v1')).rejects.toThrow('Disk full');
    expect(useFlowStore.getState().rewards?.wallet.coins).toBe(80);
    expect(useFlowStore.getState().rewards?.fishing?.inventory?.owned).toEqual([]);
  });
  it('recovers a committed purchase after a lost reply even when the new balance cannot afford it again', async () => {
    await initializeRewards('alice'); await settle();
    const old = useFlowStore.getState().rewards!;
    const wallet = { ...old.wallet, coins: 40 };
    useFlowStore.setState({ rewardStatus: 'synced', aquaticStatus: 'synced', rewards: { ...old, wallet } });
    const confirmed = purchaseAquatic(wallet, old.fishing!.inventory!, 'decor.lantern.v1');
    vi.mocked(aquaticCloud.buyCloudAquatic).mockRejectedValueOnce(new Error('Lost reply'));
    await expect(buyAquaticItem('decor.lantern.v1')).rejects.toThrow('Lost reply');
    const pending = useFlowStore.getState().rewards!;
    expect(accounts.get(useFlowStore.getState().rewardOwner!)?.fishing?.pendingPurchase).toBe('decor.lantern.v1');
    // The wallet listener can confirm the charge before the inventory listener arrives.
    useFlowStore.setState({ rewards: { ...pending, wallet: confirmed.wallet } });
    vi.mocked(aquaticCloud.buyCloudAquatic).mockResolvedValueOnce({ ...confirmed, receipt: null });
    await buyAquaticItem('decor.lantern.v1');
    expect(useFlowStore.getState().rewards?.wallet.coins).toBe(0);
    expect(useFlowStore.getState().rewards?.fishing).toMatchObject({ inventory: { owned: ['decor.lantern.v1'] }, pendingPurchase: null });
  });
  it('ignores a previous owner’s cosmetic purchase response after account switching', async () => {
    await initializeRewards('alice'); await settle();
    const old = useFlowStore.getState().rewards!;
    const wallet = { ...old.wallet, coins: 40 };
    useFlowStore.setState({ rewardStatus: 'synced', aquaticStatus: 'synced', rewards: { ...old, wallet } });
    let resolve!: (value: Awaited<ReturnType<typeof aquaticCloud.buyCloudAquatic>>) => void;
    vi.mocked(aquaticCloud.buyCloudAquatic).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const request = buyAquaticItem('decor.lantern.v1'); await settle();
    const previousOwner = useFlowStore.getState().rewardOwner!;
    await initializeRewards('bob'); await settle();
    resolve(purchaseAquatic(wallet, old.fishing!.inventory!, 'decor.lantern.v1'));
    await request;
    expect(useFlowStore.getState().rewardOwner).toBe('firebase:test:bob');
    expect(useFlowStore.getState().rewards?.fishing?.inventory?.owned).toEqual([]);
    expect(accounts.get(previousOwner)?.fishing?.pendingPurchase).toBe('decor.lantern.v1');
  });
  it('upgrades old accounts while preserving their balances and backing up before changes', () => {
    expect(useFlowStore.getState().rewards).toMatchObject({ wallet: { xp: 600, tickets: 3 }, fishing: { progress: { revision: 0 } } });
    expect(storage.backupRewardAccount).toHaveBeenCalledWith('guest:before-fishing-v1', expect.objectContaining({ wallet: expect.objectContaining({ xp: 600 }) }));
  });
  it('serializes rapid clicks and restores the saved reveal after restarting', async () => {
    const [first, second] = await Promise.all([catchFish(true), catchFish(true)]);
    expect(first?.id).toBe(second?.id);
    expect(accounts.get('guest')?.fishing?.progress.counts.goldfish).toBe(1);
    await initializeRewards(null);
    expect(useFlowStore.getState().rewards?.fishing?.unrevealed).toBe('starter_v1');
    await acknowledgeFishCapture(); await catchFish();
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(2);
  });
  it('keeps the durable intent after a disk failure and reuses its identity on retry', async () => {
    let writes = 0;
    vi.mocked(storage.saveRewardAccount).mockImplementation(async (owner, account) => {
      if (++writes === 2) throw new Error('Disk full');
      accounts.set(owner, structuredClone(account));
    });
    await expect(catchFish()).rejects.toThrow('Disk full');
    const id = accounts.get('guest')!.fishing!.pending!.id;
    expect(accounts.get('guest')!.wallet.tickets).toBe(3);
    await initializeRewards(null); const result = await catchFish();
    expect(result?.id).toBe(id); expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(2);
  });
  it('persists selection, nickname and companion across reopening', async () => {
    await catchFish(true); await acknowledgeFishCapture();
    await configureAquarium({ displayed: ['goldfish'], favorite: 'goldfish', nicknames: { goldfish: 'Maré' }, motion: false, positions: { goldfish: { x: 78, y: 43 } } });
    await initializeRewards(null);
    expect(useFlowStore.getState().rewards?.fishing?.preferences).toMatchObject({ favorite: 'goldfish', nicknames: { goldfish: 'Maré' }, motion: false, positions: { goldfish: { x: 78, y: 43 } } });
  });
  it('drops queued captures from an earlier session even when the same owner returns', async () => {
    let release!: () => void;
    vi.mocked(storage.saveRewardAccount).mockImplementationOnce(async (owner, account) => {
      await new Promise<void>((done) => { release = done; });
      accounts.set(owner, structuredClone(account));
    });
    const preferences = configureAquarium({ ...useFlowStore.getState().rewards!.fishing!.preferences, motion: false });
    await settle();
    const capture = catchFish();
    await initializeRewards(null);
    release();
    await preferences;
    expect(await capture).toBeNull();
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(3);
    expect(useFlowStore.getState().rewards?.fishing?.pending).toBeNull();
  });
  it('continues the existing task to ticket to fishing loop', async () => {
    const account = useFlowStore.getState().rewards!; account.wallet.tickets = 0; accounts.set('guest', structuredClone(account));
    useFlowStore.setState({ tasks: [{ id: 'fish-task', title: 'Ler', description: '', routineTypeId: 'r', categoryId: 'c', startTime: '00:00', endTime: '23:59', daysOfWeek: [0,1,2,3,4,5,6], tags: [], targetMinutes: 10 }] });
    await initializeRewards(null);
    useFlowStore.getState().toggleTaskCompletion('fish-task', dayLabel(localDay())); await settle();
    const pending = useFlowStore.getState().rewards!.pending[0]; pending.readyAt = 0; await flushRewards();
    expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(1);
    await catchFish(); expect(useFlowStore.getState().rewards?.wallet.tickets).toBe(0);
    expect(useFlowStore.getState().rewards?.fishing?.progress.discovered).toHaveLength(1);
  });
  it('ignores a previous owner’s capture response after account switching', async () => {
    await initializeRewards('alice'); await settle();
    useFlowStore.setState({ rewardStatus: 'synced', fishingStatus: 'synced' });
    let resolve!: (value: Awaited<ReturnType<typeof fishingCloud.catchCloudFish>>) => void;
    vi.mocked(fishingCloud.catchCloudFish).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const request = catchFish(true); await settle();
    const owner = useFlowStore.getState().rewardOwner!;
    await initializeRewards('bob'); await settle();
    const old = accounts.get(owner)!;
    const { confirmCapture } = await import('../fishing');
    resolve(confirmCapture(old.wallet, old.fishing!.progress, old.fishing!.pending!));
    expect(await request).toBeNull();
    expect(useFlowStore.getState().rewardOwner).toBe('firebase:test:bob');
    expect(useFlowStore.getState().rewards?.fishing?.progress.discovered).toEqual([]);
    expect(accounts.get(owner)?.fishing?.pending).toBeTruthy();
    expect(cloud.initializeCloudRewards).toHaveBeenCalled();
  });
});
