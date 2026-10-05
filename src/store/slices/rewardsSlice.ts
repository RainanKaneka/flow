import type { StateCreator } from 'zustand';
import type { FlowStore } from '../../types/routine';
import type { RewardsActions, RewardsState } from '../../types/rewards';
import * as runtime from '../../services/rewards/runtime';

export const createRewardsSlice: StateCreator<FlowStore, [], [], RewardsState & RewardsActions> = (set) => ({
  rewardTab: 'aquarium', setRewardTab: (rewardTab) => set({ rewardTab }),
  prepareFishCast: runtime.prepareFishCast, changeFishCast: runtime.changeFishCast,
  buyAquaticItem: runtime.buyAquaticItem, configureAquaticStyle: runtime.configureAquaticStyle,
  importGuestAquatic: runtime.importGuestAquatic,
  rewardOwner: null, rewards: null, rewardStatus: 'loading', rewardError: null,
  fishingStatus: 'loading', fishingError: null,
  aquaticStatus: 'loading', aquaticError: null,
  catchFish: runtime.catchFish, acknowledgeFishCapture: runtime.acknowledgeFishCapture,
  configureAquarium: runtime.configureAquarium, importGuestFish: runtime.importGuestFish,
  recordTaskReward: runtime.recordTaskReward, recordFocusReward: runtime.recordFocusReward,
  flushRewards: runtime.flushRewards, buyReward: runtime.buyReward, equipReward: runtime.equipReward,
  configureRewardGoal: runtime.configureRewardGoal, setRewardsVisible: runtime.setRewardsVisible,
  importGuestRewards: runtime.importGuestRewards,
});
