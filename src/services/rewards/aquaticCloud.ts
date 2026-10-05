import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { getFirebaseAuthInstance, getFirebaseFirestoreInstance } from '../firebaseConfig';
import type { AquaticInventory, AquaticItemId, AquaticStyle, MilestoneId } from '../../types/aquatic';
import type { FishingProgress } from '../../types/fishing';
import type { RewardWallet } from '../../types/rewards';
import { createAquaticInventory, createAquaticStyle, purchaseAquatic } from './aquatic';
import { AQUATIC_MILESTONES } from './aquaticCatalog';

function context(uid: string) {
  const db = getFirebaseFirestoreInstance();
  if (!db || getFirebaseAuthInstance()?.currentUser?.uid !== uid) throw new Error('Conecte sua conta para sincronizar a personalização.');
  return db;
}
const path = (db: NonNullable<ReturnType<typeof getFirebaseFirestoreInstance>>, uid: string, collection: string, id = 'main') => doc(db, 'users', uid, collection, id);
export async function initializeCloudAquatic(uid: string) {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const ref = path(db, uid, 'aquaticInventory');
    const [inventory, style] = await Promise.all([tx.get(ref), tx.get(path(db, uid, 'aquaticStyle'))]);
    const next = inventory.exists() ? inventory.data() as AquaticInventory : createAquaticInventory();
    if (!inventory.exists()) tx.set(ref, next);
    return { inventory: next, style: style.exists() ? style.data() as AquaticStyle : createAquaticStyle() };
  });
}
export async function buyCloudAquatic(uid: string, id: AquaticItemId) {
  const db = context(uid);
  try { return await runTransaction(db, async (tx) => {
    const inventoryRef = path(db, uid, 'aquaticInventory'), walletRef = path(db, uid, 'rewardsWallet');
    const [inventory, wallet] = await Promise.all([tx.get(inventoryRef), tx.get(walletRef)]);
    const change = purchaseAquatic(wallet.data() as RewardWallet, inventory.data() as AquaticInventory, id);
    if (change.receipt) {
      tx.set(walletRef, change.wallet); tx.set(inventoryRef, change.inventory);
      tx.set(path(db, uid, 'rewardReceipts', change.receipt.id), change.receipt);
    }
    return change;
  }); } catch (error) {
    if ((error as { code?: string }).code !== 'permission-denied') throw error;
    const [inventory, wallet] = await Promise.all([getDoc(path(db, uid, 'aquaticInventory')), getDoc(path(db, uid, 'rewardsWallet'))]);
    if (!(inventory.data() as AquaticInventory)?.owned.includes(id)) throw error;
    return { inventory: inventory.data() as AquaticInventory, wallet: wallet.data() as RewardWallet, receipt: null };
  }
}
export async function claimCloudAquaticMilestone(uid: string, id: MilestoneId) {
  const db = context(uid);
  const milestone = AQUATIC_MILESTONES.find((m) => m.id === id);
  if (!milestone) throw new Error('Marco desconhecido.');
  try { return await runTransaction(db, async (tx) => {
    const ref = path(db, uid, 'aquaticInventory');
    const [inventorySnap, progressSnap] = await Promise.all([tx.get(ref), tx.get(path(db, uid, 'fishingProgress'))]);
    const inventory = inventorySnap.data() as AquaticInventory, progress = progressSnap.data() as FishingProgress;
    if (inventory.claimed.includes(id)) return inventory;
    const value = milestone.kind === 'collection' ? progress.discovered.length : progress.counts[milestone.target as keyof typeof progress.counts];
    if (value < milestone.threshold) throw new Error('Este marco ainda não foi alcançado.');
    const next = { ...inventory, revision: inventory.revision + 1, lastOperation: id, claimed: [...inventory.claimed, id] };
    tx.set(ref, next);
    tx.set(path(db, uid, 'aquaticMilestones', id), { id, kind: milestone.kind, target: milestone.target, threshold: milestone.threshold, revision: next.revision });
    return next;
  }); } catch (error) {
    if ((error as { code?: string }).code !== 'permission-denied') throw error;
    const inventory = (await getDoc(path(db, uid, 'aquaticInventory'))).data() as AquaticInventory;
    if (!inventory?.claimed.includes(id)) throw error;
    return inventory;
  }
}
export async function importCloudAquatic(uid: string, guest: AquaticInventory) {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const ref = path(db, uid, 'aquaticInventory'), importRef = path(db, uid, 'aquaticImports', 'guest_v1');
    const [snap, oldImport] = await Promise.all([tx.get(ref), tx.get(importRef)]);
    const old = snap.data() as AquaticInventory;
    if (oldImport.exists()) return old;
    const next = { ...old, imported: true, revision: old.revision + 1, lastOperation: 'guest_v1', owned: [...new Set([...old.owned, ...guest.owned])] };
    tx.set(ref, next); tx.set(importRef, { version: 1, owned: guest.owned });
    return next;
  });
}
export function watchCloudAquaticInventory(uid: string, update: (inventory: AquaticInventory) => void, fail: (error: Error) => void) {
  return onSnapshot(path(context(uid), uid, 'aquaticInventory'), (snap) => { if (snap.exists() && !snap.metadata.fromCache && !snap.metadata.hasPendingWrites) update(snap.data() as AquaticInventory); }, fail);
}
export function watchCloudAquaticStyle(uid: string, update: (style: AquaticStyle) => void, fail: (error: Error) => void) {
  return onSnapshot(path(context(uid), uid, 'aquaticStyle'), (snap) => { if (snap.exists() && !snap.metadata.fromCache && !snap.metadata.hasPendingWrites) update(snap.data() as AquaticStyle); }, fail);
}
export async function saveCloudAquaticStyle(uid: string, style: AquaticStyle) { await setDoc(path(context(uid), uid, 'aquaticStyle'), style); }
