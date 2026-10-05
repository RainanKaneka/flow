import { useFlowStore } from '../../store/useFlowStore';
import type { RewardAccount, RewardDay, RewardEvent, RewardGoal, RewardItemId, RewardSlot, RewardWeek } from '../../types/rewards';
import { calculateProfileStats } from '../userProfileService';
import { getActiveFirebaseConfig } from '../firebaseConfig';
import { getTaskTimeWindow } from '../../utils/taskProgress';
import { applyLocalEvent, createRewardAccount, localDay, mergeGuestProgress, nextGoal, purchaseReward, REWARD_ITEMS, rewardEventId, weekStart } from './engine';
import { backupRewardAccount, loadRewardAccount, saveRewardAccount } from './storage';
import { buyCloudReward, configureCloudGoal, fetchRewardPeriod, importCloudGuest, initializeCloudRewards, saveCloudRewardPreferences, sendRewardEvent, watchCloudRewardPreferences, watchCloudRewards } from './cloud';
import type { AquariumPreferences, FishCapture } from '../../types/fishing';
import { applyCapture, captureIntent, createFishingAccount, validateAquarium } from './fishing';
import { catchCloudFish, importCloudFish, initializeCloudFishing, saveCloudAquarium, watchCloudAquarium, watchCloudFishing } from './fishingCloud';
import type { AquaticItemId, AquaticStyle } from '../../types/aquatic';
import { createAquaticInventory, createAquaticStyle, earnedMilestones, grantLocalMilestones, newFishingCast, pauseFishingCast, purchaseAquatic, resumeFishingCast, validateAquaticStyle } from './aquatic';
import { buyCloudAquatic, claimCloudAquaticMilestone, importCloudAquatic, initializeCloudAquatic, saveCloudAquaticStyle, watchCloudAquaticInventory, watchCloudAquaticStyle } from './aquaticCloud';

export const GUEST_OWNER = 'guest';
const BOOT_INTENTIONS = 'flow-rewards-startup-intentions-v1';
let generation = 0;
let ready: Promise<void> = Promise.resolve();
let mutations: Promise<unknown> = Promise.resolve();
let stopWatch: (() => void) | undefined;
let stopPreferences: (() => void) | undefined;
let stopFishing: (() => void) | undefined;
let stopAquarium: (() => void) | undefined;
let stopInventory: (() => void) | undefined;
let stopStyle: (() => void) | undefined;
let nextAquaticAttempt = 0;
const aquaticPurchases = new Map<string, Promise<void>>();
let nextFishingAttempt = 0;
const catches = new Map<string, Promise<FishCapture | null>>();
let flushing: Promise<void> | null = null;
let flushingGeneration = -1;
let nextConnectionAttempt = 0;
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível salvar as recompensas. Tente novamente.';
const fishingMessage = (error: unknown) => (error as { code?: string })?.code === 'permission-denied' ? 'A nuvem não autorizou a sincronização dos peixes. Seus dados continuam guardados; tente novamente mais tarde.' : message(error);
const uidFor = (owner: string) => owner === GUEST_OWNER ? null : owner.slice(owner.lastIndexOf(':') + 1);
const current = (owner: string) => useFlowStore.getState().rewardOwner === owner;
export function rewardOwnerKey(uid: string | null) {
  return uid ? `firebase:${getActiveFirebaseConfig()?.projectId || 'unconfigured'}:${uid}` : GUEST_OWNER;
}
async function commit(owner: string, account: RewardAccount, token: number) {
  if (owner === GUEST_OWNER) account = grantLocalMilestones(account);
  // Persist before updating spendable balance. A failed disk write leaves the old account intact.
  await saveRewardAccount(owner, account);
  if (current(owner) && token === generation) useFlowStore.setState({ rewards: account, rewardError: null });
}
function mutate(owner: string, action: (account: RewardAccount) => Promise<RewardAccount> | RewardAccount) {
  const token = generation;
  const result = mutations.catch(() => undefined).then(async () => {
    await ready;
    if (!current(owner) || token !== generation) return;
    const account = useFlowStore.getState().rewards;
    if (!account) throw new Error('As recompensas ainda não estão prontas.');
    await commit(owner, await action(account), token);
  });
  mutations = result;
  return result.catch((error) => {
    if (current(owner) && token === generation) useFlowStore.setState({ rewardStatus: 'error', rewardError: message(error) });
    throw error;
  });
}
function attachCloud(owner: string, uid: string, token: number) {
  stopWatch?.(); stopPreferences?.();
  stopWatch = watchCloudRewards(uid, (incoming) => {
    if (token !== generation) return;
    // Network reads stay outside the disk queue so new offline intentions can always be saved.
    void fetchRewardPeriod(uid, incoming).then((period) => mutate(owner, (cached) => {
      if (incoming.revision < cached.wallet.revision) return cached;
      return { ...cached, wallet: incoming, importDone: period.imported,
        days: period.daily ? { ...cached.days, [period.day]: period.daily } : cached.days,
        weeks: period.weekly ? { ...cached.weeks, [weekStart(period.day)]: period.weekly } : cached.weeks };
    })).then(() => { if (token === generation) useFlowStore.setState({ rewardStatus: 'synced' }); }).catch((error) => {
      if (token === generation) useFlowStore.setState({ rewardStatus: 'offline', rewardError: message(error) });
    });
  }, (error) => { if (token === generation) useFlowStore.setState({ rewardStatus: 'offline', rewardError: message(error) }); });
  stopPreferences = watchCloudRewardPreferences(uid, (preferences) => {
    if (token === generation) void mutate(owner, (cached) => cached.preferencesPending ? cached : { ...cached, preferences }).catch(() => undefined);
  }, (error) => { if (token === generation) useFlowStore.setState({ rewardError: message(error) }); });
}
async function connectCloud(owner: string, uid: string, token: number) {
  nextConnectionAttempt = Date.now() + 15000;
  const wallet = await initializeCloudRewards(uid);
  const period = await fetchRewardPeriod(uid, wallet);
  if (token !== generation) return;
  await mutate(owner, (cached) => ({ ...cached, wallet: wallet.revision >= cached.wallet.revision ? wallet : cached.wallet, importDone: period.imported,
    days: period.daily ? { ...cached.days, [period.day]: period.daily } : cached.days,
    weeks: period.weekly ? { ...cached.weeks, [weekStart(period.day)]: period.weekly } : cached.weeks }));
  if (token === generation) {
    attachCloud(owner,uid,token); useFlowStore.setState({ rewardStatus: 'synced' });
    void connectFishing(owner, uid, token);
  }
}
async function connectFishing(owner: string, uid: string, token: number) {
  nextFishingAttempt = Date.now() + 15000;
  try {
    const progress = await initializeCloudFishing(uid);
    if (token !== generation) return;
    await mutate(owner, (account) => ({ ...account, fishing: { ...(account.fishing || createFishingAccount()), progress } }));
    if (token !== generation) return;
    stopFishing?.(); stopAquarium?.();
    const fail = (error: Error) => { if (token === generation) useFlowStore.setState({ fishingStatus: 'offline', fishingError: fishingMessage(error) }); };
    stopFishing = watchCloudFishing(uid, (incoming) => {
      if (token === generation) void mutate(owner, (account) => {
        const fishing = account.fishing || createFishingAccount();
        return incoming.revision >= fishing.progress.revision ? { ...account, fishing: { ...fishing, progress: incoming } } : account;
      }).catch(fail);
    }, fail);
    stopAquarium = watchCloudAquarium(uid, (preferences) => {
      if (token === generation) void mutate(owner, (account) => account.fishing?.preferencesPending ? account : { ...account, fishing: { ...(account.fishing || createFishingAccount()), preferences } }).catch(fail);
    }, fail);
    useFlowStore.setState({ fishingStatus: 'synced', fishingError: null });
    void connectAquatic(owner, uid, token);
  } catch (error) {
    if (token === generation) useFlowStore.setState({ fishingStatus: 'offline', fishingError: fishingMessage(error) });
  }
}
async function connectAquatic(owner: string, uid: string, token: number) {
  nextAquaticAttempt = Date.now() + 15000;
  try {
    const change = await initializeCloudAquatic(uid);
    if (token !== generation) return;
    await mutate(owner, (account) => ({ ...account, fishing: { ...account.fishing!, inventory: change.inventory, style: account.fishing?.stylePending ? account.fishing.style : change.style } }));
    if (token !== generation) return;
    stopInventory?.(); stopStyle?.();
    const fail = (error: Error) => { if (token === generation) useFlowStore.setState({ aquaticStatus: 'offline', aquaticError: fishingMessage(error) }); };
    stopInventory = watchCloudAquaticInventory(uid, (inventory) => { if (token === generation) void mutate(owner, (account) => inventory.revision >= (account.fishing?.inventory?.revision || 0) ? { ...account, fishing: { ...account.fishing!, inventory } } : account).catch(fail); }, fail);
    stopStyle = watchCloudAquaticStyle(uid, (style) => { if (token === generation) void mutate(owner, (account) => account.fishing?.stylePending ? account : { ...account, fishing: { ...account.fishing!, style } }).catch(fail); }, fail);
    useFlowStore.setState({ aquaticStatus: 'synced', aquaticError: null });
  } catch (error) { if (token === generation) useFlowStore.setState({ aquaticStatus: 'offline', aquaticError: fishingMessage(error) }); }
}
export function initializeRewards(uid: string | null): Promise<void> {
  catches.clear();
  aquaticPurchases.clear(); stopInventory?.(); stopStyle?.(); stopInventory = undefined; stopStyle = undefined; nextAquaticAttempt = 0;
  const owner = rewardOwnerKey(uid);
  const token = ++generation;
  stopWatch?.();
  stopPreferences?.();
  stopFishing?.(); stopAquarium?.(); stopFishing = undefined; stopAquarium = undefined;
  stopWatch = undefined;
  stopPreferences = undefined;
  nextConnectionAttempt = 0;
  nextFishingAttempt = 0;
  useFlowStore.setState({ rewardOwner: owner, rewards: null, rewardTab: 'aquarium', rewardStatus: 'loading', rewardError: null, fishingStatus: 'loading', fishingError: null, aquaticStatus: 'loading', aquaticError: null });
  ready = (async () => {
    try {
      let account = await loadRewardAccount(owner);
      const startup: RewardEvent[] = JSON.parse(localStorage.getItem(BOOT_INTENTIONS) || '[]');
      if (!account) {
        const state = useFlowStore.getState();
        const captured = new Set(startup.map((event) => `${new Date(event.day * 86400000).toISOString().slice(0,10)}_${event.sourceId}`));
        const legacyLogs = Object.fromEntries(Object.entries(state.logs).filter(([id]) => !captured.has(id)));
        const legacy = calculateProfileStats(state.tasks, legacyLogs, state.pomodoro, state.categories);
        await backupRewardAccount(owner, { legacy, logs: state.logs, pomodoro: state.pomodoro, userProfile: state.userProfile });
        if (uid && legacy.productivityLevel.points > 0 && !await loadRewardAccount(`${owner}:legacy`)) {
          await saveRewardAccount(`${owner}:legacy`, createRewardAccount(legacy.productivityLevel.points, legacy.achievements.filter((a) => a.unlocked).map((a) => a.id)));
        }
        // Historical records never generate retroactive coins. Cloud import requires an explicit preview.
        account = createRewardAccount(uid ? 0 : legacy.productivityLevel.points, uid ? [] : legacy.achievements.filter((a) => a.unlocked).map((a) => a.id), !uid && legacy.totalTasksCompleted > 0);
        await saveRewardAccount(owner, account);
      }
      if (token !== generation) return;
      if (!account.fishing) {
        await backupRewardAccount(`${owner}:before-fishing-v1`, account);
        account = { ...account, fishing: createFishingAccount() };
        await saveRewardAccount(owner, account);
        if (token !== generation) return;
      }
      if (!account.fishing!.inventory || !account.fishing!.style) {
        await backupRewardAccount(`${owner}:before-aquatic-v1`, account);
        account = { ...account, fishing: { ...account.fishing!, inventory: account.fishing!.inventory || createAquaticInventory(), style: account.fishing!.style || createAquaticStyle() } };
        await saveRewardAccount(owner, account);
        if (token !== generation) return;
      }
      if (!uid) {
        account = grantLocalMilestones(account);
        await saveRewardAccount(owner, account);
        if (token !== generation) return;
      }
      if (startup.length) {
        account = { ...account, pending: [...account.pending, ...startup.filter((event) => !account!.receipts[event.id] && !account!.pending.some((pending) => pending.id === event.id))] };
        await saveRewardAccount(owner,account);
        if (token !== generation) return;
        localStorage.removeItem(BOOT_INTENTIONS);
      }
      useFlowStore.setState({ rewards: account, rewardStatus: uid ? 'syncing' : 'local', fishingStatus: uid ? 'loading' : 'local', aquaticStatus: uid ? 'loading' : 'local' });
      const pomodoro = useFlowStore.getState().pomodoro;
      if (pomodoro.rewardSessionId && !pomodoro.rewardOwnerAtStart) {
        useFlowStore.setState({ pomodoro: { ...pomodoro, rewardOwnerAtStart: owner } });
      }
    } catch (error) {
      if (token === generation) useFlowStore.setState({ rewardStatus: 'error', rewardError: message(error) });
    }
  })();
  if (uid) void ready.then(() => {
    if (token !== generation || !useFlowStore.getState().rewards) return;
    return connectCloud(owner,uid,token);
  }).catch((error) => { if (token === generation) useFlowStore.setState({ rewardStatus: 'offline', rewardError: message(error), fishingStatus: 'offline' }); });
  return ready;
}
export function disposeRewards() {
  aquaticPurchases.clear(); stopInventory?.(); stopStyle?.(); stopInventory = undefined; stopStyle = undefined;
  catches.clear();
  generation++; stopWatch?.(); stopPreferences?.(); stopWatch = undefined; stopPreferences = undefined;
  stopFishing?.(); stopAquarium?.(); stopFishing = undefined; stopAquarium = undefined;
  // A restored Firebase session may still be loading the next profile. Never leave the
  // previous wallet active in that interval; new task intentions use the startup buffer.
  useFlowStore.setState({ rewardOwner: null, rewards: null, rewardStatus: 'loading', rewardError: null, fishingStatus: 'loading', fishingError: null, aquaticStatus: 'loading', aquaticError: null });
}
export function recordTaskReward(taskId: string, date: string, completed: boolean) {
  const state = useFlowStore.getState();
  const owner = state.rewardOwner;
  const task = state.tasks.find((task) => task.id === taskId);
  const window = task && getTaskTimeWindow(task, date);
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const id = `task_${day}_${taskId}`;
  const now = Date.now();
  if (!owner) {
    // A task may be checked while Firebase is restoring the session. Save the intention now,
    // then assign it to the restored owner; never lose it during application startup.
    if (!window || !Number.isInteger(day) || !/^[\w.-]{1,180}$/.test(taskId)) return;
    try {
      const pending: RewardEvent[] = JSON.parse(localStorage.getItem(BOOT_INTENTIONS) || '[]');
      const rest = pending.filter((event) => event.id !== id);
      const overnight = window.end.getDate() !== window.start.getDate();
      if (completed) rest.push({ id,kind:'task',sourceId:taskId,day,occurredAt:now,readyAt:now+5000,focusSeconds:0,graceUntil:overnight ? window.end.getTime()+7200000 : 0 });
      localStorage.setItem(BOOT_INTENTIONS,JSON.stringify(rest));
    } catch (error) { useFlowStore.setState({ rewardStatus:'error',rewardError:message(error) }); }
    return;
  }
  void mutate(owner, (account) => {
    if (!completed) return { ...account, pending: account.pending.filter((event) => event.id !== id) };
    if (!window || !Number.isInteger(day) || !/^[\w.-]{1,180}$/.test(taskId) || account.receipts[id] || account.pending.some((event) => event.id === id)) return account;
    const today = localDay(now, account.wallet.offset);
    const overnight = window.end.getDate() !== window.start.getDate();
    if (day !== today && !(overnight && day === today - 1 && now <= window.end.getTime() + 7_200_000)) return account;
    return { ...account, pending: [...account.pending, { id, kind: 'task', sourceId: taskId, day, occurredAt: now, readyAt: now + 5000, focusSeconds: 0, graceUntil: overnight ? window.end.getTime() + 7_200_000 : 0 }] };
  }).catch(() => undefined);
}
export function recordFocusReward(sourceId: string, focusSeconds: number) {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner || focusSeconds < 1500) return;
  void mutate(owner, (account) => {
    const now = Date.now();
    const day = localDay(now, account.wallet.offset);
    const id = rewardEventId('focus', day, sourceId);
    if (account.receipts[id] || account.pending.some((event) => event.id === id)) return account;
    const event: RewardEvent = { id, kind: 'focus', sourceId, day, occurredAt: now, readyAt: now, focusSeconds, graceUntil: 0 };
    return { ...account, pending: [...account.pending, event] };
  }).catch(() => undefined);
}
export function flushRewards(): Promise<void> {
  if (flushing && flushingGeneration === generation) return flushing;
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return Promise.resolve();
  const state = useFlowStore.getState();
  if (state.rewardStatus === 'loading') return Promise.resolve();
  if (uidFor(owner) && state.rewardStatus === 'syncing' && !stopWatch) return Promise.resolve();
  const fish = state.rewards?.fishing;
  const aquaticWork = !!fish && (!!fish.stylePending || !!fish.pendingPurchase || state.aquaticStatus === 'offline' || earnedMilestones(fish.progress).some((m) => !fish.inventory?.claimed.includes(m.id)));
  if (!state.rewards?.pending.some((e) => e.readyAt <= Date.now()) && !state.rewards?.preferencesPending && !fish?.preferencesPending && !aquaticWork && !['offline', 'error'].includes(state.rewardStatus) && !['offline', 'error'].includes(state.fishingStatus)) return Promise.resolve();
  if (uidFor(owner) && ['offline', 'error'].includes(state.rewardStatus) && Date.now() < nextConnectionAttempt) return Promise.resolve();
  const token = generation;
  flushingGeneration = token;
  flushing = (async () => {
    await ready; await mutations.catch(() => undefined);
    if (!current(owner) || token !== generation) return;
    const uid = uidFor(owner);
    const account = useFlowStore.getState().rewards!;
    const eligible = account.pending.filter((event) => event.readyAt <= Date.now()).sort((a, b) => a.occurredAt - b.occurredAt);
    if (uid && typeof navigator !== 'undefined' && !navigator.onLine) {
      if (current(owner)) useFlowStore.setState({ rewardStatus: 'offline' });
      return;
    }
    if (uid && ['offline', 'error'].includes(useFlowStore.getState().rewardStatus)) {
      await connectCloud(owner,uid,token);
    }
    if (uid && ['offline', 'error'].includes(useFlowStore.getState().fishingStatus) && Date.now() >= nextFishingAttempt) await connectFishing(owner, uid, token);
    if (uid && account.fishing?.preferencesPending && useFlowStore.getState().fishingStatus === 'synced') {
      const preferences = account.fishing.preferences;
      await saveCloudAquarium(uid, preferences);
      await mutate(owner, (latest) => JSON.stringify(latest.fishing?.preferences) === JSON.stringify(preferences) ? { ...latest, fishing: { ...latest.fishing!, preferencesPending: false } } : latest);
    }
    if (uid && account.preferencesPending) {
      const preferences = account.preferences;
      await saveCloudRewardPreferences(uid,preferences);
      await mutate(owner,(latest) => JSON.stringify(latest.preferences) === JSON.stringify(preferences) ? { ...latest, preferencesPending: false } : latest);
    }
    for (const event of eligible) {
      if (token !== generation || !current(owner)) return;
      if (!useFlowStore.getState().rewards?.pending.some((pending) => pending.id === event.id)) continue;
      try {
        if (uid) {
          if (current(owner)) useFlowStore.setState({ rewardStatus: 'syncing' });
          const change = await sendRewardEvent(uid, event);
          if (token !== generation) return;
          await mutate(owner,(latest) => ({ ...latest, wallet: change.wallet.revision >= latest.wallet.revision ? change.wallet : latest.wallet, receipts: { ...latest.receipts, [event.id]: change.receipt },
            days: change.day ? { ...latest.days, [change.receipt.day]: change.day as RewardDay } : latest.days, weeks: change.week ? { ...latest.weeks, [weekStart(change.receipt.day)]: change.week as RewardWeek } : latest.weeks,
            pending: latest.pending.filter((e) => e.id !== event.id) }));
        } else await mutate(owner,(latest) => applyLocalEvent(latest,event));
        // Receipt and acknowledgement are durable before the next claim is attempted.
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code && !['permission-denied', 'invalid-argument'].includes(code)) {
          if (current(owner)) useFlowStore.setState({ rewardStatus: 'offline', rewardError: message(error) });
          return;
        }
        if (code === 'permission-denied') {
          // Keep denied claims for a retry after a rules/configuration fix, never silently discard them.
          if (current(owner)) useFlowStore.setState({ rewardStatus: 'error', rewardError: 'A nuvem não confirmou a recompensa. Seu registro está guardado; tente sincronizar novamente.' });
          return;
        }
        // A disk failure must keep the original durable claim for retry.
        if (useFlowStore.getState().rewardStatus === 'error') return;
        await mutate(owner,(latest) => ({ ...latest, pending: latest.pending.filter((e) => e.id !== event.id), rejected: [...latest.rejected, { id: event.id, reason: message(error) }].slice(-20) }));
      }
    }
    if (uid && token === generation && useFlowStore.getState().fishingStatus === 'synced' && useFlowStore.getState().aquaticStatus !== 'synced' && Date.now() >= nextAquaticAttempt) await connectAquatic(owner, uid, token);
    if (uid && token === generation && useFlowStore.getState().aquaticStatus === 'synced') {
      try {
      let fishing = useFlowStore.getState().rewards?.fishing;
      if (fishing?.pendingPurchase) await buyAquaticItem(fishing.pendingPurchase);
      fishing = useFlowStore.getState().rewards?.fishing;
      if (fishing?.stylePending && fishing.style) {
        const style = fishing.style;
        await saveCloudAquaticStyle(uid, style);
        if (token !== generation) return;
        await mutate(owner, (latest) => JSON.stringify(latest.fishing?.style) === JSON.stringify(style) ? { ...latest, fishing: { ...latest.fishing!, stylePending: false } } : latest);
      }
      const missing = fishing ? earnedMilestones(fishing.progress).filter((m) => !fishing.inventory?.claimed.includes(m.id)) : [];
      for (const milestone of missing) {
        if (token !== generation) return;
        const inventory = await claimCloudAquaticMilestone(uid, milestone.id);
        if (token !== generation) return;
        await mutate(owner, (latest) => inventory.revision >= (latest.fishing?.inventory?.revision || 0) ? { ...latest, fishing: { ...latest.fishing!, inventory } } : latest);
      }
      } catch (error) {
        if (token === generation) { nextAquaticAttempt = Date.now() + 15000; useFlowStore.setState({ aquaticStatus: 'offline', aquaticError: fishingMessage(error) }); }
      }
    }
    if (current(owner) && token === generation) useFlowStore.setState({ rewardStatus: uid ? 'synced' : 'local' });
  })().catch((error) => { if (token === generation) useFlowStore.setState({ rewardStatus: 'error', rewardError: message(error) }); }).finally(() => { if (flushingGeneration === token) flushing = null; });
  return flushing;
}
export async function buyReward(id: RewardItemId) {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) throw new Error('Aguarde o carregamento das recompensas.');
  const uid = uidFor(owner);
  if (uid && useFlowStore.getState().rewardStatus !== 'synced') throw new Error('Sincronize seu saldo antes de desbloquear.');
  if (uid) {
    const change = await buyCloudReward(uid,id);
    await mutate(owner,(account) => ({ ...account, wallet: change.wallet.revision >= account.wallet.revision ? change.wallet : account.wallet, receipts: { ...account.receipts, [change.receipt.id]: change.receipt } }));
  } else await mutate(owner,(account) => {
    const change = purchaseReward(account.wallet,id);
    return { ...account, wallet: change.wallet, receipts: { ...account.receipts, [change.receipt.id]: change.receipt } };
  });
}
export async function equipReward(id: RewardItemId | null, slot: RewardSlot) {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return;
  await mutate(owner, (account) => {
    if (id && (!account.wallet.owned.includes(id) || REWARD_ITEMS.find((item) => item.id === id)?.slot !== slot)) throw new Error('Desbloqueie o item para usar.');
    const equipped = { ...account.preferences.equipped };
    if (id) equipped[slot] = id; else delete equipped[slot];
    const preferences = { ...account.preferences, equipped };
    const uid = uidFor(owner);
    return { ...account, preferences, preferencesPending: !!uid };
  });
}
export async function configureRewardGoal(target: RewardGoal, weekdays: number[]) {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return;
  const uid = uidFor(owner);
  if (uid) {
    const change = await configureCloudGoal(uid,target,weekdays);
    await mutate(owner,(account) => ({ ...account, wallet: change.wallet.revision >= account.wallet.revision ? change.wallet : account.wallet, receipts: { ...account.receipts, [change.receipt.id]: change.receipt } }));
  } else await mutate(owner, (account) => {
    return { ...account, wallet: { ...account.wallet, goals: nextGoal(account.wallet, target, weekdays) } };
  });
}
export async function setRewardsVisible(visible: boolean) {
  const owner = useFlowStore.getState().rewardOwner;
  if (owner) await mutate(owner, (account) => {
    const preferences = { ...account.preferences, visible };
    const uid = uidFor(owner);
    return { ...account, preferences, preferencesPending: !!uid };
  });
}
export async function getGuestImportPreview() {
  const guest = await loadRewardAccount(GUEST_OWNER);
  if (guest) return guest;
  const owner = useFlowStore.getState().rewardOwner;
  return owner ? loadRewardAccount(`${owner}:legacy`) : null;
}
export async function importGuestRewards() {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner || owner === GUEST_OWNER) return;
  const guest = await getGuestImportPreview();
  if (!guest) throw new Error('Não há progresso local para importar.');
  const account = useFlowStore.getState().rewards!;
  mergeGuestProgress(account,guest);
  await backupRewardAccount(`${owner}:before-import`,account);
  const change = await importCloudGuest(uidFor(owner)!,guest);
  await mutate(owner,(latest) => ({ ...latest, importDone: true, wallet: change.wallet.revision >= latest.wallet.revision ? change.wallet : latest.wallet, receipts: { ...latest.receipts, [change.receipt.id]: change.receipt } }));
}

export function catchFish(starter = false): Promise<FishCapture | null> {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return Promise.reject(new Error('Aguarde o carregamento do aquário.'));
  if (catches.has(owner)) return catches.get(owner)!;
  const token = generation;
  const operation = (async () => {
    const uid = uidFor(owner);
    if (uid && (useFlowStore.getState().fishingStatus !== 'synced' || useFlowStore.getState().rewardStatus !== 'synced' || !navigator.onLine)) throw new Error('Conecte e sincronize sua conta antes de pescar.');
    // This write happens before any network request or reveal. A retry always uses this identity.
    await mutate(owner, (account) => {
      if (token !== generation) return account;
      const fishing = account.fishing || createFishingAccount();
      if (fishing.pending) return account;
      if (fishing.unrevealed) throw new Error('Veja sua captura anterior antes de lançar outra linha.');
      if (starter && fishing.progress.starterClaimed) throw new Error('Seu douradinho já está na coleção.');
      if (!starter && account.wallet.tickets < 1) throw new Error('Conclua uma tarefa para ganhar um bilhete.');
      return { ...account, fishing: { ...fishing, pending: captureIntent(starter) } };
    });
    if (!current(owner) || token !== generation) return null;
    const intent = useFlowStore.getState().rewards!.fishing!.pending!;
    if (uid) {
      const change = await catchCloudFish(uid, intent);
      if (!current(owner) || token !== generation) return null;
      await mutate(owner, (account) => {
        const fishing = account.fishing!;
        const preferences = intent.kind === 'starter' && !fishing.preferences.favorite ? { ...fishing.preferences, favorite: 'goldfish' as const, displayed: [...new Set([...fishing.preferences.displayed, 'goldfish' as const])].slice(0, 5) } : fishing.preferences;
        return { ...account, wallet: change.wallet.revision >= account.wallet.revision ? change.wallet : account.wallet,
          receipts: change.receipt ? { ...account.receipts, [intent.id]: change.receipt } : account.receipts,
          fishing: { ...fishing, progress: change.progress.revision >= fishing.progress.revision ? change.progress : fishing.progress, preferences, preferencesPending: fishing.preferencesPending || intent.kind === 'starter',
            receipts: { ...fishing.receipts, [intent.id]: change.capture }, pending: null, cast: null, unrevealed: intent.id } };
      });
    } else await mutate(owner, (account) => applyCapture(account, intent));
    if (!current(owner) || token !== generation) return null;
    useFlowStore.setState({ fishingError: null, fishingStatus: uid ? 'synced' : 'local' });
    return useFlowStore.getState().rewards!.fishing!.receipts[intent.id];
  })().catch((error) => {
    if (current(owner) && token === generation) useFlowStore.setState({ fishingError: fishingMessage(error) });
    throw error;
  }).finally(() => { if (catches.get(owner) === operation) catches.delete(owner); });
  catches.set(owner, operation);
  return operation;
}
export async function acknowledgeFishCapture() {
  const owner = useFlowStore.getState().rewardOwner;
  if (owner) await mutate(owner, (account) => account.fishing ? { ...account, fishing: { ...account.fishing, unrevealed: null } } : account);
}
export async function configureAquarium(preferences: AquariumPreferences) {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return;
  await mutate(owner, (account) => {
    const fishing = account.fishing || createFishingAccount();
    validateAquarium(preferences, fishing.progress);
    return { ...account, fishing: { ...fishing, preferences, preferencesPending: !!uidFor(owner) } };
  });
}
export async function getGuestFishPreview() {
  return (await loadRewardAccount(GUEST_OWNER))?.fishing || null;
}
export async function importGuestFish() {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner || owner === GUEST_OWNER) return;
  const token = generation;
  if (useFlowStore.getState().fishingStatus !== 'synced') throw new Error('Sincronize o aquário antes de importar.');
  const guest = await getGuestFishPreview();
  if (!guest?.progress.discovered.length) throw new Error('Não há peixes locais para importar.');
  await backupRewardAccount(`${owner}:before-fish-import`, useFlowStore.getState().rewards!);
  const change = await importCloudFish(uidFor(owner)!, guest);
  if (token !== generation) return;
  await mutate(owner, (account) => {
    const fishing = account.fishing || createFishingAccount();
    return { ...account, fishing: { ...fishing, progress: change.progress.revision >= fishing.progress.revision ? change.progress : fishing.progress, preferences: fishing.preferencesPending ? fishing.preferences : change.preferences } };
  });
}

export async function prepareFishCast() {
  const state = useFlowStore.getState(), owner = state.rewardOwner;
  if (!owner) throw new Error('Aguarde o carregamento da pesca.');
  if (state.pomodoro.isActive) throw new Error('Sua pesca pode esperar até o fim do foco.');
  if (uidFor(owner) && (state.fishingStatus !== 'synced' || state.rewardStatus !== 'synced' || !navigator.onLine)) throw new Error('Sincronize sua conta antes de lançar a linha.');
  await mutate(owner, (account) => {
    const fishing = account.fishing!;
    if (fishing.pending || fishing.unrevealed) return account;
    if (account.wallet.tickets < 1) throw new Error('Conclua uma tarefa para ganhar um bilhete.');
    const intent = captureIntent(false);
    return { ...account, fishing: { ...fishing, pending: intent, cast: newFishingCast(intent.id) } };
  });
}
export async function changeFishCast(captureId: string, action: 'pause' | 'resume' | 'bite') {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return;
  await mutate(owner, (account) => {
    const fishing = account.fishing!, cast = fishing.cast;
    if (!cast || cast.captureId !== captureId || fishing.pending?.id !== captureId) return account;
    const next = action === 'pause' ? pauseFishingCast(cast) : action === 'resume' ? resumeFishingCast(cast) : cast.phase === 'waiting' && Date.now() >= cast.dueAt ? { ...cast, phase: 'bite' as const, remainingMs: 0 } : cast;
    return { ...account, fishing: { ...fishing, cast: next } };
  });
}
export function buyAquaticItem(id: AquaticItemId): Promise<void> {
  const owner = useFlowStore.getState().rewardOwner;
  if (!owner) return Promise.reject(new Error('Aguarde o carregamento da personalização.'));
  const key = `${owner}:${id}`;
  if (aquaticPurchases.has(key)) return aquaticPurchases.get(key)!;
  const token = generation, uid = uidFor(owner);
  const operation = (async () => {
    if (uid && (useFlowStore.getState().rewardStatus !== 'synced' || useFlowStore.getState().aquaticStatus !== 'synced' || !navigator.onLine)) throw new Error('Sincronize o saldo antes de desbloquear a decoração.');
    await mutate(owner, (account) => {
      const fishing = account.fishing!;
      if (fishing.pendingPurchase && fishing.pendingPurchase !== id) throw new Error('Retome a compra pendente antes de escolher outro item.');
      if (uid && fishing.pendingPurchase === id) return account;
      const change = purchaseAquatic(account.wallet, fishing.inventory!, id);
      if (uid) return { ...account, fishing: { ...fishing, pendingPurchase: id } };
      return { ...account, wallet: change.wallet, receipts: change.receipt ? { ...account.receipts, [change.receipt.id]: change.receipt } : account.receipts, fishing: { ...fishing, inventory: change.inventory, pendingPurchase: null } };
    });
    if (uid && current(owner) && token === generation) {
      const change = await buyCloudAquatic(uid, id);
      if (token !== generation) return;
      await mutate(owner, (account) => ({ ...account, wallet: change.wallet.revision >= account.wallet.revision ? change.wallet : account.wallet,
        receipts: change.receipt ? { ...account.receipts, [change.receipt.id]: change.receipt } : account.receipts,
        fishing: { ...account.fishing!, inventory: change.inventory.revision >= account.fishing!.inventory!.revision ? change.inventory : account.fishing!.inventory, pendingPurchase: null } }));
    }
  })().catch((error) => { if (token === generation) useFlowStore.setState({ aquaticError: fishingMessage(error) }); throw error; }).finally(() => { if (aquaticPurchases.get(key) === operation) aquaticPurchases.delete(key); });
  aquaticPurchases.set(key, operation); return operation;
}
export async function configureAquaticStyle(style: AquaticStyle) {
  const owner = useFlowStore.getState().rewardOwner;
  if (owner) await mutate(owner, (account) => { validateAquaticStyle(style, account.fishing!.inventory!); return { ...account, fishing: { ...account.fishing!, style, stylePending: !!uidFor(owner) } }; });
}
export async function importGuestAquatic() {
  const owner = useFlowStore.getState().rewardOwner, token = generation;
  if (!owner || owner === GUEST_OWNER) return;
  if (useFlowStore.getState().aquaticStatus !== 'synced') throw new Error('Sincronize a personalização antes de importar.');
  const guest = (await loadRewardAccount(GUEST_OWNER))?.fishing?.inventory;
  if (!guest?.owned.length) throw new Error('Não há decorações locais para importar.');
  await backupRewardAccount(`${owner}:before-aquatic-import`, useFlowStore.getState().rewards!);
  const inventory = await importCloudAquatic(uidFor(owner)!, guest);
  if (token === generation) await mutate(owner, (account) => ({ ...account, fishing: { ...account.fishing!, inventory } }));
}
