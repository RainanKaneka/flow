import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, EmailAuthProvider, getAuth, linkWithCredential, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { createAquaticInventory, createAquaticStyle, purchaseAquatic } from '../src/services/rewards/aquatic';
import { createFishingAccount } from '../src/services/rewards/fishing';
import type { AquaticInventory } from '../src/types/aquatic';
import type { RewardWallet } from '../src/types/rewards';

const context = vi.hoisted(() => ({ db: null as ReturnType<typeof getFirestore> | null, auth: null as ReturnType<typeof getAuth> | null }));
vi.mock('../src/services/firebaseConfig', () => ({ getFirebaseFirestoreInstance: () => context.db, getFirebaseAuthInstance: () => context.auth }));
import { initializeCloudRewards } from '../src/services/rewards/cloud';
import { buyCloudAquatic, claimCloudAquaticMilestone, importCloudAquatic, initializeCloudAquatic, saveCloudAquaticStyle } from '../src/services/rewards/aquaticCloud';
import { catchCloudFish, initializeCloudFishing } from '../src/services/rewards/fishingCloud';
const apps: ReturnType<typeof initializeApp>[] = [];
async function client(signedIn = true) {
  const app = initializeApp({ projectId: 'demo-flow-rewards', apiKey: 'emulator-only', authDomain: 'localhost' }, crypto.randomUUID()); apps.push(app);
  const db = getFirestore(app), auth = getAuth(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  if (signedIn) await signInAnonymously(auth);
  return { db, auth, uid: auth.currentUser?.uid || '' };
}
function value(v: unknown): Record<string, unknown> {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, v]) => [k, value(v)])) } };
}
let alice: Awaited<ReturnType<typeof client>>, bob: Awaited<ReturnType<typeof client>>, publicClient: Awaited<ReturnType<typeof client>>, second: Awaited<ReturnType<typeof client>>;
const ref = (name: string, id = 'main') => doc(alice.db, 'users', alice.uid, name, id);
const read = async <T>(name: string) => (await getDoc(ref(name))).data() as T;
async function seed(name: string, object: object) {
  const response = await fetch(`http://127.0.0.1:8080/v1/projects/demo-flow-rewards/databases/(default)/documents/users/${alice.uid}/${name}/main`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(object).map(([key, v]) => [key, value(v)])) }) });
  expect(response.ok).toBe(true);
}
beforeAll(async () => {
  [alice, bob, publicClient] = await Promise.all([client(), client(), client(false)]);
  const email = `${crypto.randomUUID()}@example.test`, password = 'emulator-only-password';
  await linkWithCredential(alice.auth.currentUser!, EmailAuthProvider.credential(email, password));
  second = await client(false); await signInWithEmailAndPassword(second.auth, email, password);
  context.db = alice.db; context.auth = alice.auth;
  const wallet = await initializeCloudRewards(alice.uid); await initializeCloudFishing(alice.uid); await initializeCloudAquatic(alice.uid);
  await seed('rewardsWallet', { ...wallet, coins: 500 });
});
afterAll(async () => { await Promise.all(apps.map(deleteApp)); });
describe('private cosmetic economy and permanent milestones', () => {
  it('requires owner reads and zero initialization; refuses direct inventory edits', async () => {
    for (const db of [bob.db, publicClient.db]) {
      await expect(getDoc(doc(db, 'users', alice.uid, 'aquaticInventory', 'main'))).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(getDocs(collection(db, 'users', alice.uid, 'aquaticMilestones'))).rejects.toMatchObject({ code: 'permission-denied' });
    }
    await expect(setDoc(doc(bob.db, 'users', bob.uid, 'aquaticInventory', 'main'), { ...createAquaticInventory(), owned: ['decor.arch.v1'] })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(ref('aquaticInventory'), { owned: ['decor.arch.v1'], revision: 1 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('atomically charges only the exact coin price and replays concurrent purchases once', async () => {
    const before = await read<RewardWallet>('rewardsWallet');
    const first = buyCloudAquatic(alice.uid, 'decor.lantern.v1');
    context.db = second.db; context.auth = second.auth;
    const another = buyCloudAquatic(alice.uid, 'decor.lantern.v1');
    await Promise.all([first, another]);
    context.db = alice.db; context.auth = alice.auth;
    await buyCloudAquatic(alice.uid, 'decor.lantern.v1');
    const after = await read<RewardWallet>('rewardsWallet');
    expect(after.coins).toBe(before.coins - 40); expect(after.xp).toBe(before.xp); expect(after.tickets).toBe(before.tickets);
    expect((await read<AquaticInventory>('aquaticInventory')).owned).toEqual(['decor.lantern.v1']);
    await expect(updateDoc(ref('rewardReceipts', 'aquatic_decor.lantern.v1'), { coins: 0 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('rejects missing wallet charges, insufficient coins and forged item costs', async () => {
    const old = await read<RewardWallet>('rewardsWallet'), inventory = await read<AquaticInventory>('aquaticInventory');
    const change = purchaseAquatic(old, inventory, 'decor.arch.v1');
    const batch = writeBatch(alice.db); batch.set(ref('aquaticInventory'), change.inventory); batch.set(ref('rewardReceipts', change.receipt!.id), change.receipt!);
    await expect(batch.commit()).rejects.toMatchObject({ code: 'permission-denied' });
    const forged = writeBatch(alice.db); forged.set(ref('aquaticInventory'), change.inventory); forged.set(ref('rewardReceipts', change.receipt!.id), { ...change.receipt, coins: -1 }); forged.set(ref('rewardsWallet'), { ...change.wallet, coins: old.coins - 1 });
    await expect(forged.commit()).rejects.toMatchObject({ code: 'permission-denied' });
    await seed('rewardsWallet', { ...old, coins: 0 });
    await expect(buyCloudAquatic(alice.uid, 'decor.arch.v1')).rejects.toThrow('moedas');
    await seed('rewardsWallet', old);
  });
  it('grants reached milestones once, rejects early or orphan claims and preserves currencies', async () => {
    await expect(claimCloudAquaticMilestone(alice.uid, 'mastery_goldfish_3')).rejects.toThrow('ainda');
    await expect(setDoc(ref('aquaticMilestones', 'collection_1'), { id: 'collection_1', kind: 'collection', target: 'collection', threshold: 1, revision: 2 })).rejects.toMatchObject({ code: 'permission-denied' });
    await catchCloudFish(alice.uid, { id: 'starter_v1', kind: 'starter', createdAt: Date.now(), rarityRoll: 0, speciesRoll: 0 });
    const before = await read<RewardWallet>('rewardsWallet');
    const [one, replay] = await Promise.all([claimCloudAquaticMilestone(alice.uid, 'collection_1'), claimCloudAquaticMilestone(alice.uid, 'collection_1')]);
    expect(one.claimed).toContain('collection_1'); expect(replay.claimed).toContain('collection_1');
    expect(await read<RewardWallet>('rewardsWallet')).toEqual(before);
    await expect(deleteDoc(ref('aquaticMilestones', 'collection_1'))).rejects.toMatchObject({ code: 'permission-denied' });
    const progress = createFishingAccount().progress; progress.counts.betta = 10; progress.discoveredAt.betta = Date.now(); progress.discovered = ['betta'];
    await seed('fishingProgress', progress);
    for (const threshold of [3, 5, 10] as const) await claimCloudAquaticMilestone(alice.uid, `mastery_betta_${threshold}`);
    expect((await read<AquaticInventory>('aquaticInventory')).claimed).toContain('mastery_betta_10');
  });
  it('validates equipped items, titles, fields and preference types', async () => {
    const style = createAquaticStyle();
    await saveCloudAquaticStyle(alice.uid, { ...style, decorations: ['lantern'], title: 'first', mode: 'simple' });
    for (const invalid of [{ ...style, background: 'moon' }, { ...style, decorations: ['arch'] }, { ...style, decorations: ['lantern', 'lantern'] }, { ...style, frame: 'complete' }, { ...style, title: 'collector' }, { ...style, sound: 'true' }, { ...style, coins: 999 }]) await expect(setDoc(ref('aquaticStyle'), invalid)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('imports bounded local cosmetics once without transferring coins, claims or tickets', async () => {
    const before = await read<RewardWallet>('rewardsWallet'), old = await read<AquaticInventory>('aquaticInventory');
    const guest = { ...createAquaticInventory(), owned: ['decor.arch.v1', 'decor.lantern.v1'] as const };
    const imported = await importCloudAquatic(alice.uid, { ...guest, owned: [...guest.owned] });
    expect(imported.owned).toEqual(['decor.lantern.v1', 'decor.arch.v1']); expect(imported.claimed).toEqual(old.claimed);
    expect(await read<RewardWallet>('rewardsWallet')).toEqual(before);
    expect((await importCloudAquatic(alice.uid, { ...guest, owned: [...guest.owned] })).revision).toBe(imported.revision);
    await expect(updateDoc(ref('aquaticImports', 'guest_v1'), { owned: ['background.moon.v1'] })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
