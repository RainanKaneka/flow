import type { RewardAccount } from '../../types/rewards';
import Database from '@tauri-apps/plugin-sql';
import { validateFishingAccount } from './fishing';

const key = (owner: string) => `flow-rewards-v1:${owner}`;
let writes: Promise<void> = Promise.resolve();
let database: Promise<Database> | undefined;
const native = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
async function ensureTable() {
  // Routine database backups can be restored independently without rolling reward receipts back.
  const db = await (database ??= Database.load('sqlite:flow-rewards.db'));
  await db.execute('CREATE TABLE IF NOT EXISTS flow_rewards (owner_key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL)');
  await db.execute('CREATE TABLE IF NOT EXISTS flow_rewards_backup (owner_key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL)');
  return db;
}
/** Independent from task import/reset and FK cascades. Every commit is one atomic SQLite upsert. */
export async function loadRewardAccount(owner: string): Promise<RewardAccount | null> {
  await writes.catch(() => undefined);
  let json: string | null;
  if (native()) {
    const db = await ensureTable();
    const rows = await db.select<{ payload: string }[]>('SELECT payload FROM flow_rewards WHERE owner_key = $1', [owner]);
    json = rows[0]?.payload ?? null;
  } else json = localStorage.getItem(key(owner));
  if (!json) return null;
  const account = JSON.parse(json) as RewardAccount;
  if (account.wallet?.version !== 1 || !Array.isArray(account.pending) || !account.receipts || !account.preferences) throw new Error('O registro de recompensas não pôde ser lido. Seus dados foram preservados.');
  if (account.fishing) validateFishingAccount(account.fishing);
  return account;
}
export function saveRewardAccount(owner: string, account: RewardAccount): Promise<void> {
  const json = JSON.stringify(account);
  const write = writes.catch(() => undefined).then(async () => {
    if (native()) {
      const db = await ensureTable();
      await db.execute('INSERT INTO flow_rewards (owner_key, payload) VALUES ($1, $2) ON CONFLICT(owner_key) DO UPDATE SET payload = excluded.payload', [owner, json]);
    } else localStorage.setItem(key(owner), json);
  });
  writes = write;
  return write;
}
export async function backupRewardAccount(owner: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value);
  if (native()) {
    const db = await ensureTable();
    await db.execute('INSERT OR IGNORE INTO flow_rewards_backup (owner_key, payload) VALUES ($1, $2)', [owner, json]);
  } else if (!localStorage.getItem(`${key(owner)}:backup`)) localStorage.setItem(`${key(owner)}:backup`, json);
}
