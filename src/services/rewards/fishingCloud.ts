import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { getFirebaseAuthInstance, getFirebaseFirestoreInstance } from '../firebaseConfig';
import type { AquariumPreferences, CaptureIntent, FishCapture, FishingAccount, FishingProgress } from '../../types/fishing';
import type { RewardWallet } from '../../types/rewards';
import { confirmCapture, createFishingAccount, mergeFishingProgress, validateAquarium } from './fishing';

function context(uid: string) {
  const db = getFirebaseFirestoreInstance();
  if (!db || getFirebaseAuthInstance()?.currentUser?.uid !== uid) throw new Error('Conecte sua conta para sincronizar os peixes.');
  return db;
}
const path = (db: NonNullable<ReturnType<typeof getFirebaseFirestoreInstance>>, uid: string, collection: string, id = 'main') => doc(db, 'users', uid, collection, id);
export async function initializeCloudFishing(uid: string) {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const ref = path(db, uid, 'fishingProgress');
    const snap = await tx.get(ref);
    if (snap.exists()) return snap.data() as FishingProgress;
    const progress = createFishingAccount().progress;
    tx.set(ref, progress);
    return progress;
  });
}
export async function catchCloudFish(uid: string, intent: CaptureIntent) {
  const db = context(uid);
  const readConfirmed = async () => {
    const [capture, progress, wallet] = await Promise.all([getDoc(path(db, uid, 'fishCaptures', intent.id)), getDoc(path(db, uid, 'fishingProgress')), getDoc(path(db, uid, 'rewardsWallet'))]);
    return capture.exists() ? { capture: capture.data() as FishCapture, progress: progress.data() as FishingProgress, wallet: wallet.data() as RewardWallet, receipt: null } : null;
  };
  try {
    return await runTransaction(db, async (tx) => {
      const captureRef = path(db, uid, 'fishCaptures', intent.id);
      const walletRef = path(db, uid, 'rewardsWallet');
      const progressRef = path(db, uid, 'fishingProgress');
      const [captureSnap, walletSnap, progressSnap] = await Promise.all([tx.get(captureRef), tx.get(walletRef), tx.get(progressRef)]);
      const wallet = walletSnap.data() as RewardWallet;
      const progress = progressSnap.data() as FishingProgress;
      if (captureSnap.exists()) return { capture: captureSnap.data() as FishCapture, progress, wallet, receipt: null };
      if (!wallet || !progress) throw new Error('Aguarde a sincronização antes de pescar.');
      const change = confirmCapture(wallet, progress, intent);
      tx.set(progressRef, change.progress);
      tx.set(captureRef, change.capture);
      if (change.receipt) {
        tx.set(walletRef, change.wallet);
        tx.set(path(db, uid, 'rewardReceipts', intent.id), change.receipt);
      }
      return change;
    });
  } catch (error) {
    if ((error as { code?: string }).code !== 'permission-denied') throw error;
    // Some concurrent receipt creates return permission-denied. Replay only a confirmed identity.
    const confirmed = await readConfirmed();
    if (confirmed) return confirmed;
    throw error;
  }
}
export function watchCloudFishing(uid: string, update: (progress: FishingProgress) => void, fail: (error: Error) => void) {
  return onSnapshot(path(context(uid), uid, 'fishingProgress'), { includeMetadataChanges: true }, (snap) => {
    if (snap.exists() && !snap.metadata.fromCache && !snap.metadata.hasPendingWrites) update(snap.data() as FishingProgress);
  }, fail);
}
export function watchCloudAquarium(uid: string, update: (preferences: AquariumPreferences) => void, fail: (error: Error) => void) {
  return onSnapshot(path(context(uid), uid, 'aquariumPreferences'), (snap) => {
    if (snap.exists() && !snap.metadata.fromCache && !snap.metadata.hasPendingWrites) update(snap.data() as AquariumPreferences);
  }, fail);
}
export async function saveCloudAquarium(uid: string, preferences: AquariumPreferences) {
  await setDoc(path(context(uid), uid, 'aquariumPreferences'), preferences);
}
export async function importCloudFish(uid: string, guest: FishingAccount) {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const progressRef = path(db, uid, 'fishingProgress');
    const preferencesRef = path(db, uid, 'aquariumPreferences');
    const importRef = path(db, uid, 'fishImports', 'guest_v1');
    const [old, preferencesSnap, imported] = await Promise.all([tx.get(progressRef), tx.get(preferencesRef), tx.get(importRef)]);
    if (imported.exists()) throw new Error('Os peixes locais já foram importados para esta conta.');
    const progress = mergeFishingProgress(old.data() as FishingProgress, guest.progress);
    const preferences = preferencesSnap.exists() ? preferencesSnap.data() as AquariumPreferences : validateAquarium(guest.preferences, progress);
    tx.set(importRef, { source: 'guest', version: 1, counts: guest.progress.counts, discoveredAt: guest.progress.discoveredAt });
    tx.set(progressRef, progress);
    if (!preferencesSnap.exists()) tx.set(preferencesRef, preferences);
    return { progress, preferences };
  });
}
