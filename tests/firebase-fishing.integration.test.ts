import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, EmailAuthProvider, getAuth, linkWithCredential, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, getFirestore, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { localDay, rewardEventId } from '../src/services/rewards/engine';
import { confirmCapture, createFishingAccount } from '../src/services/rewards/fishing';
import type { CaptureIntent, FishingProgress } from '../src/types/fishing';
import type { RewardWallet } from '../src/types/rewards';

const context = vi.hoisted(() => ({ db: null as ReturnType<typeof getFirestore> | null, auth: null as ReturnType<typeof getAuth> | null }));
vi.mock('../src/services/firebaseConfig', () => ({ getFirebaseFirestoreInstance: () => context.db, getFirebaseAuthInstance: () => context.auth }));
import { initializeCloudRewards, sendRewardEvent } from '../src/services/rewards/cloud';
import { catchCloudFish, importCloudFish, initializeCloudFishing, saveCloudAquarium } from '../src/services/rewards/fishingCloud';
const apps: ReturnType<typeof initializeApp>[] = [];
async function client(signedIn = true) {
  const app = initializeApp({ projectId: 'demo-flow-rewards', apiKey: 'emulator-only', authDomain: 'localhost' }, crypto.randomUUID()); apps.push(app);
  const db = getFirestore(app), auth = getAuth(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  if (signedIn) await signInAnonymously(auth);
  return { db, auth, uid: auth.currentUser?.uid || '' };
}
const intent = (id = crypto.randomUUID(), roll = 0): CaptureIntent => ({ id: `fish_${id}`, kind: 'normal', rarityRoll: roll, speciesRoll: 0, createdAt: Date.now() });
const starter: CaptureIntent = { ...intent(), id: 'starter_v1', kind: 'starter' };
let alice: Awaited<ReturnType<typeof client>>, bob: Awaited<ReturnType<typeof client>>, publicClient: Awaited<ReturnType<typeof client>>, otherDevice: Awaited<ReturnType<typeof client>>;
let wallet: RewardWallet, progress: FishingProgress;
const get = async <T>(collection: string) => (await getDoc(doc(alice.db, 'users', alice.uid, collection, 'main'))).data() as T;
function firestoreValue(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, firestoreValue(item)])) } };
}
async function seed(collection: string, value: object) {
  // Admin API is strictly emulator-only and models a known prior history for guarantee tests.
  const response = await fetch(`http://127.0.0.1:8080/v1/projects/demo-flow-rewards/databases/(default)/documents/users/${alice.uid}/${collection}/main`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) }) });
  expect(response.ok).toBe(true);
}
beforeAll(async () => {
  [alice, bob, publicClient] = await Promise.all([client(), client(), client(false)]);
  const email = `${crypto.randomUUID()}@example.test`, password = 'emulator-password';
  await linkWithCredential(alice.auth.currentUser!, EmailAuthProvider.credential(email, password));
  otherDevice = await client(false); await signInWithEmailAndPassword(otherDevice.auth, email, password);
  context.db = alice.db; context.auth = alice.auth;
  wallet = await initializeCloudRewards(alice.uid); progress = await initializeCloudFishing(alice.uid);
});
afterAll(async () => { await Promise.all(apps.map(deleteApp)); });
describe('Firestore fishing: real atomic captures and hostile writes', () => {
  it('initializes zero fish, rejects forged initialization and restricts reads to owner', async () => {
    expect(progress.discovered).toEqual([]);
    await expect(setDoc(doc(bob.db, 'users', bob.uid, 'fishingProgress', 'main'), { ...progress, counts: { ...progress.counts, discus: 100 } })).rejects.toMatchObject({ code: 'permission-denied' });
    for (const db of [bob.db, publicClient.db]) {
      await expect(getDoc(doc(db, 'users', alice.uid, 'fishingProgress', 'main'))).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(getDocs(collection(db, 'users', alice.uid, 'fishCaptures'))).rejects.toMatchObject({ code: 'permission-denied' });
    }
  });
  it('grants a concurrent starter once without changing the wallet or counters', async () => {
    const first = catchCloudFish(alice.uid, starter);
    context.db = otherDevice.db; context.auth = otherDevice.auth; const duplicate = catchCloudFish(alice.uid, starter);
    context.db = alice.db; context.auth = alice.auth;
    const results = await Promise.all([first, duplicate]);
    expect(results.map((result) => result.capture.species)).toEqual(['goldfish', 'goldfish']);
    progress = await get('fishingProgress'); expect(progress.counts.goldfish).toBe(1); expect(progress.sinceRare).toBe(0);
    expect(await get('rewardsWallet')).toEqual(wallet);
  });
  it('denies normal fishing without tickets then converts a real task ticket atomically', async () => {
    await expect(catchCloudFish(alice.uid, intent())).rejects.toThrow('bilhete');
    const now = Date.now(), day = localDay(now, wallet.offset);
    wallet = (await sendRewardEvent(alice.uid, { id: rewardEventId('task', day, 'fishing-task'), kind: 'task', sourceId: 'fishing-task', day, occurredAt: now, readyAt: now, focusSeconds: 0, graceUntil: 0 })).wallet;
    const pending = intent(); const first = catchCloudFish(alice.uid, pending);
    context.db = otherDevice.db; context.auth = otherDevice.auth; const duplicate = catchCloudFish(alice.uid, pending);
    context.db = alice.db; context.auth = alice.auth;
    const results = await Promise.all([first, duplicate]);
    expect(results[0].capture.id).toBe(results[1].capture.id);
    wallet = await get('rewardsWallet'); progress = await get('fishingProgress');
    expect(wallet.tickets).toBe(0); expect(wallet.xp).toBe(75); expect(progress.counts.koi).toBe(1);
    const replay = await catchCloudFish(alice.uid, { ...pending, rarityRoll: .999 });
    expect(replay.capture.species).toBe('koi'); expect(replay.wallet.tickets).toBe(0);
  });
  it('allows only one of two independent attempts competing for the last ticket', async () => {
    wallet = { ...wallet, tickets: 1 }; await seed('rewardsWallet', wallet);
    const first = catchCloudFish(alice.uid, intent());
    context.db = otherDevice.db; context.auth = otherDevice.auth; const second = catchCloudFish(alice.uid, intent());
    context.db = alice.db; context.auth = alice.auth;
    const results = await Promise.allSettled([first, second]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    wallet = await get('rewardsWallet'); progress = await get('fishingProgress'); expect(wallet.tickets).toBe(0);
  });
  it('rejects direct inventory, counter, revision, schema and capture edits', async () => {
    const ref = doc(alice.db, 'users', alice.uid, 'fishingProgress', 'main');
    for (const changes of [{ counts: { ...progress.counts, discus: 1 } }, { sinceRare: 0 }, { revision: progress.revision + 1 }, { isAdmin: true }, { version: 2 }]) {
      // sinceRare is positive after the previous normal captures.
      await expect(updateDoc(ref, changes)).rejects.toMatchObject({ code: 'permission-denied' });
    }
    await expect(deleteDoc(ref)).rejects.toMatchObject({ code: 'permission-denied' });
    const captureRef = doc(alice.db, 'users', alice.uid, 'fishCaptures', 'starter_v1');
    await expect(updateDoc(captureRef, { species: 'discus' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(deleteDoc(captureRef)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('rejects orphaned capture records and captures without a ticket deduction', async () => {
    wallet = { ...wallet, tickets: 2 }; await seed('rewardsWallet', wallet);
    const change = confirmCapture(wallet, progress, intent());
    await expect(setDoc(doc(alice.db, 'users', alice.uid, 'fishCaptures', change.capture.id), change.capture)).rejects.toMatchObject({ code: 'permission-denied' });
    const batch = writeBatch(alice.db);
    batch.set(doc(alice.db, 'users', alice.uid, 'fishCaptures', change.capture.id), change.capture);
    batch.set(doc(alice.db, 'users', alice.uid, 'fishingProgress', 'main'), change.progress);
    await expect(batch.commit()).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('enforces rare and legendary guarantees on the server rules', async () => {
    progress = { ...progress, sinceRare: 9, sinceLegendary: 20 }; await seed('fishingProgress', progress);
    const rare = await catchCloudFish(alice.uid, intent()); expect(rare.capture.rarity).toBe('rare');
    wallet = rare.wallet; progress = { ...rare.progress, sinceLegendary: 29 }; await seed('fishingProgress', progress);
    const legendary = await catchCloudFish(alice.uid, intent()); expect(legendary.capture.species).toBe('discus');
    expect(legendary.progress.sinceLegendary).toBe(0); expect(legendary.progress.sinceRare).toBe(0);
    wallet = legendary.wallet; progress = legendary.progress;
  });
  it('validates aquarium ownership, capacity and nickname content on create and update', async () => {
    const preferences = { displayed: ['goldfish' as const], favorite: 'goldfish' as const, nicknames: { goldfish: 'Maré' }, motion: false };
    await saveCloudAquarium(alice.uid, preferences);
    await saveCloudAquarium(alice.uid, { ...preferences, positions: { goldfish: { x: 78, y: 43 } } });
    expect((await getDoc(doc(alice.db, 'users', alice.uid, 'aquariumPreferences', 'main'))).data()?.positions.goldfish).toEqual({ x: 78, y: 43 });
    for (const invalid of [{ ...preferences, favorite: 'mandarin' }, { ...preferences, displayed: ['goldfish', 'goldfish'] }, { ...preferences, nicknames: { goldfish: 'x'.repeat(41) } }, { ...preferences, motion: 'yes' }, { ...preferences, extra: true }, { ...preferences, displayed: ['goldfish','koi','betta','discus','neon','catfish'] }]) {
      await expect(setDoc(doc(alice.db, 'users', alice.uid, 'aquariumPreferences', 'main'), invalid)).rejects.toMatchObject({ code: 'permission-denied' });
    }
    for (const positions of [{ goldfish: { x: -1, y: 50 } }, { goldfish: { x: 101, y: 50 } }, { goldfish: { x: 40.5, y: 50 } }, { goldfish: { x: 50, y: 40, extra: 1 } }, { mandarin: { x: 50, y: 50 } }]) {
      await expect(setDoc(doc(alice.db, 'users', alice.uid, 'aquariumPreferences', 'main'), { ...preferences, positions })).rejects.toMatchObject({ code: 'permission-denied' });
    }
    await expect(updateDoc(doc(alice.db, 'users', alice.uid, 'aquariumPreferences', 'main'), { nicknames: { goldfish: 123 } })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('imports max counts once, records local origin and preserves wallet and account guarantees', async () => {
    const guest = createFishingAccount(); guest.progress.counts.koi = 1; guest.progress.discoveredAt.koi = Date.now() - 1000; guest.progress.counts.guppy = 3; guest.progress.discoveredAt.guppy = Date.now() - 1000;
    guest.progress.discovered = ['koi', 'guppy']; guest.preferences.displayed = ['guppy']; guest.preferences.favorite = 'guppy';
    const oldWallet = await get('rewardsWallet'); const oldCounter = progress.sinceRare;
    const imported = await importCloudFish(alice.uid, guest);
    expect(imported.progress.counts.koi).toBe(progress.counts.koi); expect(imported.progress.counts.guppy).toBe(3);
    expect(imported.progress.sinceRare).toBe(oldCounter); expect(imported.preferences.favorite).toBe('goldfish');
    expect(await get('rewardsWallet')).toEqual(oldWallet);
    await expect(importCloudFish(alice.uid, guest)).rejects.toThrow('já foram');
    expect((await getDoc(doc(alice.db, 'users', alice.uid, 'fishImports', 'guest_v1'))).data()?.source).toBe('guest');
  });
});
