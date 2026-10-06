import type { AquariumPreferences, FishCapture, FishingAccount } from './fishing';
import type { AquaticItemId, AquaticStyle } from './aquatic';
export type RewardItemId =
  | 'accent.sage.v1' | 'theme.forest.v1' | 'frame.horizon.v1'
  | 'accent.blush.v1' | 'theme.kawaii.v1' | 'frame.heart.v1'
  | 'accent.nebula.v1' | 'theme.space.v1' | 'frame.orbit.v1';
export type RewardAppearanceId = 'moss' | 'kawaii' | 'space';
export type RewardSlot = 'accent' | 'theme' | 'frame';
export type RewardGoal = 1 | 2 | 3;
export type RewardTab = 'aquarium' | 'fishing' | 'collection' | 'refuge' | 'catalog' | 'rules';
export interface GoalPeriod { day: number; target: RewardGoal; weekdays: number[] }
export interface RewardWallet {
  version: 1;
  xp: number;
  coins: number;
  tickets: number;
  taskCount: number;
  focusCount: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: number;
  owned: RewardItemId[];
  legacyAchievements: string[];
  legacyXp: number;
  timezone: string;
  offset: number;
  goals: GoalPeriod[];
  revision: number;
  lastEvent: string;
}
export interface RewardDay { tasks: number; focus: number; coins: number; goal: RewardGoal; planned: boolean }
export interface RewardWeek { days: number[]; rewarded: boolean }
export interface RewardEvent {
  id: string;
  kind: 'task' | 'focus';
  sourceId: string;
  day: number;
  occurredAt: number;
  readyAt: number;
  focusSeconds: number;
  // An overnight task belongs to its original occurrence; grace ends two hours after its end.
  graceUntil: number;
}
export interface RewardReceipt {
  goalIndex?: number;
  streakGoalIndexes?: number[];
  continuesStreak?: boolean;
  id: string;
  kind: 'task' | 'focus' | 'purchase' | 'goal' | 'migration' | 'fishing' | 'aquatic-purchase';
  day: number;
  sourceId: string;
  occurredAt: number;
  xp: number;
  coins: number;
  tickets: number;
  weeklyBonus: boolean;
  revision: number;
}
export interface RewardPreferences {
  visible: boolean;
  equipped: Partial<Record<RewardSlot, RewardItemId>>;
}
export interface RewardAccount {
  fishing?: FishingAccount;
  wallet: RewardWallet;
  days: Record<string, RewardDay>;
  weeks: Record<string, RewardWeek>;
  receipts: Record<string, RewardReceipt>;
  pending: RewardEvent[];
  rejected: { id: string; reason: string }[];
  preferences: RewardPreferences;
  importDone: boolean;
  preferencesPending?: boolean;
}
export interface RewardsState {
  aquaticStatus: 'loading' | 'local' | 'synced' | 'offline';
  aquaticError: string | null;
  rewardTab: RewardTab;
  fishingStatus: 'loading' | 'local' | 'synced' | 'offline' | 'error';
  fishingError: string | null;
  rewardOwner: string | null;
  rewards: RewardAccount | null;
  rewardStatus: 'loading' | 'local' | 'syncing' | 'synced' | 'offline' | 'error';
  rewardError: string | null;
}
export interface RewardsActions {
  prepareFishCast: () => Promise<void>;
  changeFishCast: (captureId: string, action: 'pause' | 'resume' | 'bite') => Promise<void>;
  buyAquaticItem: (id: AquaticItemId) => Promise<void>;
  configureAquaticStyle: (style: AquaticStyle) => Promise<void>;
  importGuestAquatic: () => Promise<void>;
  setRewardTab: (tab: RewardTab) => void;
  catchFish: (starter?: boolean) => Promise<FishCapture | null>;
  acknowledgeFishCapture: () => Promise<void>;
  configureAquarium: (preferences: AquariumPreferences) => Promise<void>;
  importGuestFish: () => Promise<void>;
  recordTaskReward: (taskId: string, date: string, completed: boolean) => void;
  recordFocusReward: (sessionId: string, seconds: number) => void;
  flushRewards: () => Promise<void>;
  buyReward: (id: RewardItemId) => Promise<void>;
  equipReward: (id: RewardItemId | null, slot: RewardSlot) => Promise<void>;
  configureRewardGoal: (target: RewardGoal, weekdays: number[]) => Promise<void>;
  setRewardsVisible: (visible: boolean) => Promise<void>;
  importGuestRewards: () => Promise<void>;
}
