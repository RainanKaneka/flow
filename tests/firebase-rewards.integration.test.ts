import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, EmailAuthProvider, getAuth, linkWithCredential, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, getFirestore, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { createRewardAccount, DAY_MS, earnReward, localDay, rewardEventId, weekStart } from '../src/services/rewards/engine';
import type { RewardEvent, RewardWallet } from '../src/types/rewards';

const context = vi.hoisted(() => ({ db: null as ReturnType<typeof getFirestore> | null, auth: null as ReturnType<typeof getAuth> | null }));
vi.mock('../src/services/firebaseConfig', () => ({ getFirebaseFirestoreInstance: () => context.db, getFirebaseAuthInstance: () => context.auth }));
import { buyCloudReward, configureCloudGoal, importCloudGuest, initializeCloudRewards, sendRewardEvent } from '../src/services/rewards/cloud';

const apps: ReturnType<typeof initializeApp>[] = [];
function firestoreValue(value: unknown): Record<string,unknown> {
  if (typeof value === 'string') return { stringValue:value };
  if (typeof value === 'number') return { integerValue:String(value) };
  if (typeof value === 'boolean') return { booleanValue:value };
  if (Array.isArray(value)) return { arrayValue:{ values:value.map(firestoreValue) } };
  return { mapValue:{ fields:Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,item]) => [key,firestoreValue(item)])) } };
}
async function seedCanonicalWallet(uid: string,wallet: RewardWallet) {
  // Emulator-only admin seeding models a week of prior settings; never accesses a live project.
  const response=await fetch(`http://127.0.0.1:8080/v1/projects/demo-flow-rewards/databases/(default)/documents/users/${uid}/rewardsWallet/main`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(wallet).map(([key,value]) => [key,firestoreValue(value)]))})});
  expect(response.ok).toBe(true);
}
async function client(signedIn = true) {
  const app = initializeApp({ projectId: 'demo-flow-rewards', apiKey: 'emulator-only', authDomain: 'localhost' }, crypto.randomUUID());
  apps.push(app);
  const db = getFirestore(app);
  const auth = getAuth(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  if (signedIn) await signInAnonymously(auth);
  return { db, auth, uid: auth.currentUser?.uid || '' };
}
const event = (wallet: RewardWallet, sourceId: string, kind: RewardEvent['kind'] = 'task', time = Date.now()): RewardEvent => {
  const day = localDay(time, wallet.offset);
  return { id: rewardEventId(kind,day,sourceId), kind, sourceId, day, occurredAt: time, readyAt: time, focusSeconds: kind === 'focus' ? 1500 : 0, graceUntil: 0 };
};
let alice: Awaited<ReturnType<typeof client>>;
let bob: Awaited<ReturnType<typeof client>>;
let publicClient: Awaited<ReturnType<typeof client>>;
let secondDevice: Awaited<ReturnType<typeof client>>;
let wallet: RewardWallet;
beforeAll(async () => {
  [alice, bob, publicClient] = await Promise.all([client(), client(), client(false)]);
  const email = `${crypto.randomUUID()}@example.test`, password = 'emulator-password';
  await linkWithCredential(alice.auth.currentUser!, EmailAuthProvider.credential(email,password));
  secondDevice = await client(false);
  await signInWithEmailAndPassword(secondDevice.auth,email,password);
  context.db = alice.db; context.auth = alice.auth;
  wallet = await initializeCloudRewards(alice.uid);
});
afterAll(async () => { await Promise.all(apps.map(deleteApp)); });
describe('Firestore rewards: real transactions and hostile writes', () => {
  it('initializes with zero currency and disallows forged wallet creation', async () => {
    expect(wallet.coins).toBe(0);
    await expect(setDoc(doc(bob.db, 'users', bob.uid, 'rewardsWallet', 'main'), { ...createRewardAccount().wallet, coins: 999 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('denies anonymous reads, list queries and cross-account access', async () => {
    await expect(getDoc(doc(publicClient.db, 'users', alice.uid, 'rewardsWallet', 'main'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDocs(collection(publicClient.db, 'users', alice.uid, 'rewardReceipts'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDoc(doc(bob.db, 'users', alice.uid, 'rewardsWallet', 'main'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(bob.db, 'users', alice.uid, 'rewardsWallet', 'main'), wallet)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('denies direct balance, timezone, schema and revision edits', async () => {
    const ref = doc(alice.db, 'users', alice.uid, 'rewardsWallet', 'main');
    for (const change of [{ coins: 500 }, { xp: 999 }, { offset: 0 }, { isAdmin: true }, { revision: 1 }, { timezone: 'x'.repeat(10000) }, { goals: [] }, { owned: ['fake'] }, { coins: -1 }]) await expect(updateDoc(ref, change)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(deleteDoc(ref)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('credits a real task once when two devices claim it concurrently', async () => {
    const e = event(wallet, 'same-task');
    const original = sendRewardEvent(alice.uid, e);
    context.db = secondDevice.db; context.auth = secondDevice.auth;
    const other = sendRewardEvent(alice.uid, e);
    context.db = alice.db; context.auth = alice.auth;
    const [first, duplicate] = await Promise.all([original,other]);
    expect(first.wallet.xp).toBe(75);
    expect(duplicate.wallet.xp).toBe(75);
    wallet = duplicate.wallet;
    expect(wallet.coins).toBe(15);
    expect(wallet.tickets).toBe(1);
    const ref = doc(alice.db, 'users', alice.uid, 'rewardReceipts', e.id);
    await expect(deleteDoc(ref)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(ref, { coins: 500 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('requires day and week writes in the same transaction as a claimed gain', async () => {
    const e = event(wallet, 'missing-period');
    const day = (await getDoc(doc(alice.db, 'users', alice.uid, 'rewardDays', String(e.day)))).data();
    const week = (await getDoc(doc(alice.db, 'users', alice.uid, 'rewardWeeks', String(weekStart(e.day))))).data();
    const change = earnReward(wallet, day as Parameters<typeof earnReward>[1], week as Parameters<typeof earnReward>[2], e);
    const batch = writeBatch(alice.db);
    batch.set(doc(alice.db, 'users', alice.uid, 'rewardsWallet', 'main'), change.wallet);
    batch.set(doc(alice.db, 'users', alice.uid, 'rewardReceipts', e.id), { ...change.receipt, focusSeconds: 0, graceUntil: 0 });
    await expect(batch.commit()).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('enforces catalog ownership and prices under concurrent purchases', async () => {
    const purchases = await Promise.allSettled([buyCloudReward(alice.uid, 'accent.sage.v1'), buyCloudReward(alice.uid, 'accent.sage.v1')]);
    expect(purchases.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    wallet = (await getDoc(doc(alice.db, 'users', alice.uid, 'rewardsWallet', 'main'))).data() as RewardWallet;
    expect(wallet.coins).toBe(0); expect(wallet.owned).toEqual(['accent.sage.v1']);
    await expect(buyCloudReward(alice.uid, 'theme.forest.v1')).rejects.toThrow('Faltam');
    await expect(setDoc(doc(alice.db, 'users', alice.uid, 'rewardsPreferences', 'main'), { visible: true, equipped: { theme: 'theme.forest.v1' } })).rejects.toMatchObject({ code: 'permission-denied' });
    await setDoc(doc(alice.db, 'users', alice.uid, 'rewardsPreferences', 'main'), { visible: true, equipped: { accent: 'accent.sage.v1' } });
  });
  it('keeps the old appearance and allows six new cosmetics with exact prices and owned slots', async () => {
    const collector = await client();
    context.db = collector.db; context.auth = collector.auth;
    try {
      const initial = await initializeCloudRewards(collector.uid);
      await seedCanonicalWallet(collector.uid, { ...initial, coins: 500, owned: ['accent.sage.v1', 'theme.forest.v1', 'frame.horizon.v1'] });
      for (const id of ['accent.blush.v1', 'theme.kawaii.v1', 'frame.heart.v1', 'accent.nebula.v1', 'theme.space.v1', 'frame.orbit.v1'] as const) await buyCloudReward(collector.uid, id);
      const saved = (await getDoc(doc(collector.db, 'users', collector.uid, 'rewardsWallet', 'main'))).data() as RewardWallet;
      expect(saved.owned).toHaveLength(9);
      expect(saved.coins).toBe(70);
      const preferences = doc(collector.db, 'users', collector.uid, 'rewardsPreferences', 'main');
      await setDoc(preferences, { visible: true, equipped: { accent: 'accent.blush.v1', theme: 'theme.kawaii.v1', frame: 'frame.heart.v1' } });
      await setDoc(preferences, { visible: true, equipped: { accent: 'accent.nebula.v1', theme: 'theme.space.v1', frame: 'frame.orbit.v1' } });
      await expect(setDoc(preferences, { visible: true, equipped: { accent: 'frame.orbit.v1' } })).rejects.toMatchObject({ code: 'permission-denied' });
    } finally { context.db = alice.db; context.auth = alice.auth; }
  });
  it('changes goals only for tomorrow, preserving today and the seven-day history', async () => {
    const result = await configureCloudGoal(alice.uid, 1, [1, 2, 3, 4, 5]);
    wallet = result.wallet;
    expect(wallet.goals[0].day).toBe(localDay(Date.now(), wallet.offset) + 1);
    const second = await configureCloudGoal(alice.uid, 2, [0, 6]);
    wallet = second.wallet;
    expect(wallet.goals).toHaveLength(2);
    expect(wallet.goals[0].target).toBe(2);
    expect(wallet.goals[1].target).toBe(3);
  });
  it('validates caps and exact bonuses even after goal changes', async () => {
    for (let n = 2; n <= 7; n++) wallet = (await sendRewardEvent(alice.uid, event(wallet, `task-${n}`))).wallet;
    for (let n = 1; n <= 5; n++) wallet = (await sendRewardEvent(alice.uid, event(wallet, `focus-${n}`, 'focus'))).wallet;
    expect(wallet.xp).toBe(385); expect(wallet.coins).toBe(35); // 50 daily coins, minus the 15-coin purchase
    expect(wallet.taskCount).toBe(5); expect(wallet.focusCount).toBe(3); expect(wallet.tickets).toBe(2);
  });
  it('allows a one-time bounded legacy floor and inventory, never a sum of guest currency', async () => {
    const guest = createRewardAccount(600, ['first_step']);
    guest.wallet.coins = 999999; guest.wallet.tickets = 999999; guest.wallet.owned = ['frame.horizon.v1'];
    const result = await importCloudGuest(alice.uid, guest);
    wallet = result.wallet;
    expect(wallet.xp).toBe(600); expect(wallet.coins).toBe(50); expect(wallet.tickets).toBe(2);
    expect(wallet.owned).toEqual(['accent.sage.v1', 'frame.horizon.v1']);
    await expect(importCloudGuest(alice.uid, guest)).rejects.toThrow('já foi importado');
  });
  it('rejects forged prices and duplicated operation identities even with consistent revisions', async () => {
    const e = { id: 'purchase_theme.forest.v1', kind: 'purchase', sourceId: 'theme.forest.v1', day: localDay(Date.now(), wallet.offset), occurredAt: Date.now(), xp: 0, coins: 0, tickets: 0, weeklyBonus: false, revision: wallet.revision + 1 };
    const batch = writeBatch(alice.db);
    batch.set(doc(alice.db, 'users', alice.uid, 'rewardsWallet', 'main'), { ...wallet, owned: [...wallet.owned, 'theme.forest.v1'], revision: e.revision, lastEvent: e.id });
    batch.set(doc(alice.db, 'users', alice.uid, 'rewardReceipts', e.id), e);
    await expect(batch.commit()).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(alice.db, 'users', alice.uid, 'rewardDays', '123'), { tasks: 5, focus: 3, coins: 50, goal: 3, planned: true })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(deleteDoc(doc(alice.db, 'users', alice.uid, 'rewardDays', String(localDay(Date.now(), wallet.offset))))).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('retains compatibility for the private profile and relational sync', async () => {
    await setDoc(doc(alice.db, 'users', alice.uid), { displayName: 'Alice', email: 'alice@example.test', plan: 'free', profile: { name: 'Alice' } });
    await updateDoc(doc(alice.db, 'users', alice.uid), { profile: { name: 'Alice Updated' } });
    await expect(updateDoc(doc(alice.db, 'users', alice.uid), { isAdmin: true })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDoc(doc(bob.db, 'users', alice.uid))).rejects.toMatchObject({ code: 'permission-denied' });
    await setDoc(doc(alice.db, 'users', alice.uid, 'sync', 'state'), { tasks: [], logs: {}, routineTypes: [], categories: [], backlog: [], notes: [] });
  });
  it('authorizes a full seven-day week and grants the weekly bonus exactly once', async () => {
    const carol = await client(); context.db = carol.db; context.auth = carol.auth;
    try {
      let w = await initializeCloudRewards(carol.uid);
      // Previous Sunday through current Saturday spans only the accepted seven-day offline window.
      const last = localDay(Date.now(),w.offset);
      for (let day = last - 6; day <= last; day++) {
        const time = Date.now() - (last-day)*DAY_MS;
        w = (await sendRewardEvent(carol.uid,event(w,`week-day-${day}`,'task',time))).wallet;
      }
      expect(w.taskCount).toBe(7); expect(w.bestStreak).toBe(7);
      expect(w.xp).toBe(7*75+100); expect(w.coins).toBe(7*15+20);
    } finally { context.db = alice.db; context.auth = alice.auth; }
  });
  it('supports eight goal periods and a seven-day-old offline claim', async () => {
    const dave=await client();context.db=dave.db;context.auth=dave.auth;
    try {
      let w=await initializeCloudRewards(dave.uid);const today=localDay(Date.now(),w.offset);
      w={...w,goals:Array.from({length:8},(_,index) => ({day:today+1-index,target:1 as const,weekdays:[0,1,2,3,4,5,6]}))};
      await seedCanonicalWallet(dave.uid,w);
      const change=await sendRewardEvent(dave.uid,event(w,'offline-history','task',Date.now()-6*DAY_MS));
      expect(change.wallet.xp).toBe(90);
      w=(await configureCloudGoal(dave.uid,2,[1,2,3,4,5])).wallet;expect(w.goals).toHaveLength(8);
    }finally{context.db=alice.db;context.auth=alice.auth;}
  });
  it('preserves a streak over planned rest days with eight historical goal periods', async () => {
    const erin=await client();context.db=erin.db;context.auth=erin.auth;
    try {
      let w=await initializeCloudRewards(erin.uid);const today=localDay(Date.now(),w.offset), weekday=(today+4)%7;
      w={...w,streak:2,bestStreak:2,lastActiveDay:today-7,goals:Array.from({length:8},(_,index) => ({day:today+1-index,target:3 as const,weekdays:[weekday]}))};
      await seedCanonicalWallet(erin.uid,w);
      const change=await sendRewardEvent(erin.uid,event(w,'after-rest'));
      expect(change.wallet.streak).toBe(3);expect(change.wallet.bestStreak).toBe(3);
    }finally{context.db=alice.db;context.auth=alice.auth;}
  });
});
