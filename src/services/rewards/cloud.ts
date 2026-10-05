import { doc, getDoc, onSnapshot, runTransaction, setDoc, type Transaction, type Firestore } from 'firebase/firestore';
import { getFirebaseAuthInstance, getFirebaseFirestoreInstance } from '../firebaseConfig';
import type { RewardAccount, RewardEvent, RewardGoal, RewardItemId, RewardPreferences, RewardReceipt, RewardWallet } from '../../types/rewards';
import { createRewardAccount, earnReward, goalEvidence, localDay, mergeGuestProgress, nextGoal, purchaseReward, weekStart } from './engine';

function context(uid: string) {
  const db = getFirebaseFirestoreInstance();
  if (!db || getFirebaseAuthInstance()?.currentUser?.uid !== uid) throw new Error('Conecte sua conta para sincronizar as recompensas.');
  return db;
}
const ref = (db: Firestore, uid: string, collection: string, id = 'main') => doc(db, 'users', uid, collection, id);
function writeOperation(tx: Transaction, db: Firestore, uid: string, wallet: RewardWallet, receipt: RewardReceipt, details: Record<string, unknown> = {}) {
  tx.set(ref(db, uid, 'rewardsWallet'), wallet);
  tx.set(ref(db, uid, 'rewardReceipts', receipt.id), { ...receipt, ...details });
}
export async function initializeCloudRewards(uid: string): Promise<RewardWallet> {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const walletRef = ref(db, uid, 'rewardsWallet');
    const snap = await tx.get(walletRef);
    if (snap.exists()) return snap.data() as RewardWallet;
    const wallet = createRewardAccount().wallet;
    tx.set(walletRef, wallet);
    return wallet;
  });
}
export async function sendRewardEvent(uid: string, event: RewardEvent) {
  const db = context(uid);
  try { return await runTransaction(db, async (tx) => {
    const receiptRef = ref(db, uid, 'rewardReceipts', event.id);
    const walletRef = ref(db, uid, 'rewardsWallet');
    const dayRef = ref(db, uid, 'rewardDays', String(event.day));
    const weekRef = ref(db, uid, 'rewardWeeks', String(weekStart(event.day)));
    const [walletSnap, receiptSnap, daySnap, weekSnap] = await Promise.all([tx.get(walletRef), tx.get(receiptRef), tx.get(dayRef), tx.get(weekRef)]);
    if (!walletSnap.exists()) throw new Error('As recompensas da conta ainda não estão prontas.');
    const wallet = walletSnap.data() as RewardWallet;
    if (receiptSnap.exists()) return { wallet, receipt: receiptSnap.data() as RewardReceipt, day: daySnap.data(), week: weekSnap.data() };
    const change = earnReward(wallet, daySnap.data() as Parameters<typeof earnReward>[1], weekSnap.data() as Parameters<typeof earnReward>[2], event);
    writeOperation(tx, db, uid, change.wallet, change.receipt, { focusSeconds: event.focusSeconds, graceUntil: event.graceUntil, ...goalEvidence(wallet,event.day,event.kind) });
    tx.set(dayRef, change.day);
    tx.set(weekRef, change.week);
    return change;
  }); } catch (error) {
    // A competing device may create the immutable receipt while this transaction is being
    // authorized. Some backends report permission-denied rather than a retryable conflict.
    if ((error as { code?: string }).code !== 'permission-denied') throw error;
    const [receipt, wallet, day, week] = await Promise.all([
      getDoc(ref(db, uid, 'rewardReceipts', event.id)), getDoc(ref(db, uid, 'rewardsWallet')),
      getDoc(ref(db, uid, 'rewardDays', String(event.day))), getDoc(ref(db, uid, 'rewardWeeks', String(weekStart(event.day)))),
    ]);
    if (!receipt.exists()) throw error;
    return { wallet: wallet.data() as RewardWallet, receipt: receipt.data() as RewardReceipt, day: day.data(), week: week.data() };
  }
}
export async function buyCloudReward(uid: string, id: RewardItemId) {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const wallet = (await tx.get(ref(db, uid, 'rewardsWallet'))).data() as RewardWallet;
    const change = purchaseReward(wallet, id);
    writeOperation(tx, db, uid, change.wallet, change.receipt);
    return change;
  });
}
export async function configureCloudGoal(uid: string, target: RewardGoal, weekdays: number[]) {
  const db = context(uid);
  const id = `goal_${crypto.randomUUID()}`;
  return runTransaction(db, async (tx) => {
    const wallet = (await tx.get(ref(db, uid, 'rewardsWallet'))).data() as RewardWallet;
    const now = Date.now();
    const next = { ...wallet, goals: nextGoal(wallet, target, weekdays, now), revision: wallet.revision + 1, lastEvent: id };
    const receipt: RewardReceipt = { id, kind: 'goal', sourceId: id, day: localDay(now, wallet.offset), occurredAt: now, xp: 0, coins: 0, tickets: 0, weeklyBonus: false, revision: next.revision };
    writeOperation(tx, db, uid, next, receipt);
    return { wallet: next, receipt };
  });
}
export async function importCloudGuest(uid: string, guest: RewardAccount) {
  const db = context(uid);
  return runTransaction(db, async (tx) => {
    const migrationRef = ref(db, uid, 'rewardReceipts', 'migration_v1');
    const [walletSnap, migration] = await Promise.all([tx.get(ref(db, uid, 'rewardsWallet')), tx.get(migrationRef)]);
    if (migration.exists()) throw new Error('O progresso local já foi importado para esta conta.');
    const old = walletSnap.data() as RewardWallet;
    const result = mergeGuestProgress({ ...createRewardAccount(), wallet: old }, guest);
    const wallet = { ...result.wallet, coins: old.coins + 15, revision: old.revision + 1, lastEvent: 'migration_v1' };
    const now = Date.now();
    const receipt: RewardReceipt = { id: 'migration_v1', kind: 'migration', sourceId: 'migration_v1', day: localDay(now, old.offset), occurredAt: now,
      xp: wallet.xp - old.xp, coins: 15, tickets: 0, weeklyBonus: false, revision: wallet.revision };
    writeOperation(tx, db, uid, wallet, receipt);
    return { wallet, receipt };
  });
}
export function watchCloudRewards(uid: string, update: (wallet: RewardWallet) => void, fail: (error: Error) => void) {
  const db = context(uid);
  return onSnapshot(ref(db, uid, 'rewardsWallet'), { includeMetadataChanges: true }, (snap) => {
    // Never mark a cached/unconfirmed wallet as server-confirmed.
    if (snap.exists() && !snap.metadata.fromCache && !snap.metadata.hasPendingWrites) update(snap.data() as RewardWallet);
  }, fail);
}
export async function fetchRewardPeriod(uid: string, wallet: RewardWallet) {
  const db = context(uid);
  const day = localDay(Date.now(), wallet.offset);
  const [daySnap, weekSnap, migrationSnap] = await Promise.all([getDoc(ref(db, uid, 'rewardDays', String(day))), getDoc(ref(db, uid, 'rewardWeeks', String(weekStart(day)))), getDoc(ref(db, uid, 'rewardReceipts', 'migration_v1'))]);
  return { day, daily: daySnap.data() as RewardAccount['days'][string] | undefined, weekly: weekSnap.data() as RewardAccount['weeks'][string] | undefined, imported: migrationSnap.exists() };
}
export async function saveCloudRewardPreferences(uid: string, preferences: RewardPreferences) {
  await setDoc(ref(context(uid), uid, 'rewardsPreferences'), preferences);
}
export function watchCloudRewardPreferences(uid: string, update: (preferences: RewardPreferences) => void, fail: (error: Error) => void) {
  return onSnapshot(ref(context(uid), uid, 'rewardsPreferences'), (snap) => {
    if (snap.exists() && !snap.metadata.fromCache && !snap.metadata.hasPendingWrites) update(snap.data() as RewardPreferences);
  }, fail);
}
