import type { GoalPeriod, RewardAccount, RewardAppearanceId, RewardDay, RewardEvent, RewardGoal, RewardItemId, RewardReceipt, RewardSlot, RewardWallet, RewardWeek } from '../../types/rewards';

export const DAY_MS = 86_400_000;
export const REWARD_APPEARANCES: { id: RewardAppearanceId; name: string; description: string }[] = [
  { id: 'moss', name: 'Musgo', description: 'Verdes calmos, superfícies de floresta e um contorno dourado.' },
  { id: 'kawaii', name: 'Kawaii', description: 'Rosa, branco e detalhes suaves para um Flow mais delicado.' },
  { id: 'space', name: 'Espaço', description: 'Tons de nebulosa, azul profundo e uma moldura orbital.' },
];
export const REWARD_ITEMS: { id: RewardItemId; appearance: RewardAppearanceId; slot: RewardSlot; name: string; price: number; description: string }[] = [
  { id: 'accent.sage.v1', appearance: 'moss', slot: 'accent', name: 'Sálvia', price: 15, description: 'Um verde suave para os detalhes do Flow.' },
  { id: 'theme.forest.v1', appearance: 'moss', slot: 'theme', name: 'Bosque', price: 80, description: 'Cores da floresta, em modo claro e escuro.' },
  { id: 'frame.horizon.v1', appearance: 'moss', slot: 'frame', name: 'Horizonte', price: 120, description: 'Uma moldura para acompanhar seu perfil.' },
  { id: 'accent.blush.v1', appearance: 'kawaii', slot: 'accent', name: 'Rosa Chá', price: 15, description: 'Um rosa acolhedor para botões e detalhes.' },
  { id: 'theme.kawaii.v1', appearance: 'kawaii', slot: 'theme', name: 'Algodão', price: 80, description: 'Brancos cremosos e rosa suave, em claro e escuro.' },
  { id: 'frame.heart.v1', appearance: 'kawaii', slot: 'frame', name: 'Carinho', price: 120, description: 'Um contorno rosa e branco para seu avatar.' },
  { id: 'accent.nebula.v1', appearance: 'space', slot: 'accent', name: 'Nebulosa', price: 15, description: 'Violeta estrelado para os detalhes do Flow.' },
  { id: 'theme.space.v1', appearance: 'space', slot: 'theme', name: 'Cosmos', price: 80, description: 'Superfícies de névoa e noite espacial.' },
  { id: 'frame.orbit.v1', appearance: 'space', slot: 'frame', name: 'Órbita', price: 120, description: 'Anéis celestes para destacar seu perfil.' },
];
export const ACHIEVEMENT_IDS = ['first_step', 'pomodoro_hero', 'task_streak_3', 'task_streak_7', 'routine_master', 'time_warrior'];
export const localDay = (now = Date.now(), offset = -new Date(now).getTimezoneOffset()) => Math.floor((now + offset * 60_000) / DAY_MS);
export const dayLabel = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
export const weekStart = (day: number) => day - ((day + 3) % 7);
export const weekday = (day: number) => (day + 4) % 7;
export const rewardEventId = (kind: RewardEvent['kind'], day: number, sourceId: string) => kind === 'focus' ? `focus_${sourceId}` : `task_${day}_${sourceId}`;
export function goalForDay(wallet: RewardWallet, day: number): GoalPeriod {
  return wallet.goals.find((goal) => goal.day <= day) || { day: 0, target: 3, weekdays: [0, 1, 2, 3, 4, 5, 6] };
}
export function goalEvidence(wallet: RewardWallet, day: number, kind: RewardEvent['kind']) {
  return { goalIndex: wallet.goals.findIndex((goal) => goal.day <= day),
    continuesStreak: kind === 'task' && day > wallet.lastActiveDay && streakContinues(wallet,day),
    streakGoalIndexes: Array.from({ length: 7 }, (_,index) => wallet.goals.findIndex((goal) => goal.day <= wallet.lastActiveDay + index + 1)) };
}
export function emptyDay(wallet: RewardWallet, day: number): RewardDay {
  const period = goalForDay(wallet, day);
  return { tasks: 0, focus: 0, coins: 0, goal: period.target, planned: period.weekdays.includes(weekday(day)) };
}
export function streakContinues(wallet: RewardWallet, day: number): boolean {
  if (day === wallet.lastActiveDay + 1) return true;
  if (wallet.lastActiveDay < 0 || day - wallet.lastActiveDay > 8) return false;
  for (let missed = wallet.lastActiveDay + 1; missed < day; missed++) {
    if (goalForDay(wallet, missed).weekdays.includes(weekday(missed))) return false;
  }
  return true;
}
export function createRewardAccount(xp = 0, achievements: string[] = [], welcome = false): RewardAccount {
  const safeXp = Math.max(0, Math.min(1_000_000_000, Math.floor(xp)));
  return {
    wallet: {
      version: 1, xp: safeXp, legacyXp: safeXp, coins: welcome ? 15 : 0, tickets: 0,
      taskCount: 0, focusCount: 0, streak: 0, bestStreak: 0, lastActiveDay: -1, owned: [],
      legacyAchievements: achievements.filter((id) => ACHIEVEMENT_IDS.includes(id)),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', offset: -new Date().getTimezoneOffset(),
      goals: [{ day: 0, target: 3, weekdays: [0, 1, 2, 3, 4, 5, 6] }], revision: 0, lastEvent: '',
    }, days: {}, weeks: {}, receipts: {}, pending: [], rejected: [],
    preferences: { visible: true, equipped: {} }, importDone: false,
  };
}
export function rewardLevel(xp: number) {
  const thresholds = [0, 250, 600, 1200, 2500];
  const threshold = (level: number) => level <= 5 ? thresholds[level - 1] : 2500 + 750 * (level - 5) + 250 * (level - 5) ** 2;
  let levelNumber = 1;
  while (threshold(levelNumber + 1) <= xp && levelNumber < 2000) levelNumber++;
  const nextLevelPoints = threshold(levelNumber + 1);
  const titles = ['Iniciante Consciente', 'Criador de Hábitos', 'Foco Consistente', 'Mestre da Disciplina', 'Estado de Flow Lendário'];
  return { levelNumber, title: titles[Math.min(levelNumber, 5) - 1], points: xp, nextLevelPoints,
    progressPercentage: Math.round(100 * (xp - threshold(levelNumber)) / (nextLevelPoints - threshold(levelNumber))) };
}
export function rewardAchievements(wallet: RewardWallet): string[] {
  return [...new Set([...wallet.legacyAchievements,
    ...(wallet.taskCount >= 1 ? ['first_step'] : []),
    ...(wallet.focusCount >= 1 ? ['pomodoro_hero'] : []),
    ...(wallet.bestStreak >= 3 ? ['task_streak_3'] : []),
    ...(wallet.bestStreak >= 7 ? ['task_streak_7'] : []),
    ...(wallet.taskCount >= 10 ? ['routine_master'] : []),
    ...(wallet.focusCount >= 3 ? ['time_warrior'] : []),
  ])];
}
/** Same deterministic arithmetic is enforced by Firestore rules, including capped zero receipts. */
export function earnReward(wallet: RewardWallet, previousDay: RewardDay | undefined, previousWeek: RewardWeek | undefined, event: RewardEvent, now = Date.now()) {
  if (event.id !== rewardEventId(event.kind, event.day, event.sourceId) || !/^[\w.-]{1,180}$/.test(event.sourceId)) throw new Error('Atividade inválida.');
  const occurredDay = localDay(event.occurredAt, wallet.offset);
  if (event.occurredAt > now + 60_000 || now - event.occurredAt > 7 * DAY_MS) throw new Error('Prazo de sincronização de sete dias encerrado.');
  if (event.day !== occurredDay && !(event.kind === 'task' && event.day === occurredDay - 1 && event.occurredAt <= event.graceUntil && event.graceUntil <= (event.day + 2) * DAY_MS - wallet.offset * 60_000 + 2 * 3_600_000)) throw new Error('Conclusões de outros dias não geram recompensas.');
  if (event.kind === 'focus' && event.focusSeconds < 1500) throw new Error('Uma sessão de foco precisa de pelo menos 25 minutos.');
  const old = previousDay || emptyDay(wallet, event.day);
  const week = previousWeek || { days: [], rewarded: false };
  const task = event.kind === 'task' && old.tasks < 5;
  const focus = event.kind === 'focus' && old.focus < 3;
  const first = task && old.tasks === 0;
  const reached = task && old.tasks + 1 === old.goal && old.planned;
  const goalXp = old.goal === 1 ? 15 : old.goal === 2 ? 30 : 50;
  const goalCoins = old.goal === 1 ? 5 : old.goal === 2 ? 7 : 10;
  const dailyCoins = Math.min(50 - old.coins, (task ? 5 : 0) + (first ? 10 : 0) + (reached ? goalCoins : 0) + (focus ? 2 : 0));
  const days = task && !week.days.includes(event.day) ? [...week.days, event.day] : week.days;
  const weeklyBonus = !week.rewarded && days.length >= 4;
  const xp = (task ? 50 : 0) + (first ? 25 : 0) + (reached ? goalXp : 0) + (focus ? 20 : 0) + (weeklyBonus ? 100 : 0);
  const coins = dailyCoins + (weeklyBonus ? 20 : 0);
  const tickets = (first ? 1 : 0) + (reached ? 1 : 0);
  const streak = task && event.day > wallet.lastActiveDay ? (streakContinues(wallet, event.day) ? wallet.streak + 1 : 1) : wallet.streak;
  const nextWallet = { ...wallet, xp: wallet.xp + xp, coins: wallet.coins + coins, tickets: wallet.tickets + tickets,
    taskCount: wallet.taskCount + (task ? 1 : 0), focusCount: wallet.focusCount + (focus ? 1 : 0), streak,
    bestStreak: Math.max(wallet.bestStreak, streak), lastActiveDay: task ? Math.max(wallet.lastActiveDay, event.day) : wallet.lastActiveDay,
    revision: wallet.revision + 1, lastEvent: event.id };
  const receipt: RewardReceipt = { id: event.id, kind: event.kind, sourceId: event.sourceId, day: event.day, occurredAt: event.occurredAt,
    xp, coins, tickets, weeklyBonus, revision: nextWallet.revision };
  return { wallet: nextWallet, day: { ...old, tasks: old.tasks + (task ? 1 : 0), focus: old.focus + (focus ? 1 : 0), coins: old.coins + dailyCoins },
    week: { days, rewarded: week.rewarded || weeklyBonus }, receipt };
}
export function applyLocalEvent(account: RewardAccount, event: RewardEvent, now = Date.now()): RewardAccount {
  if (account.receipts[event.id]) return { ...account, pending: account.pending.filter((e) => e.id !== event.id) };
  const change = earnReward(account.wallet, account.days[event.day], account.weeks[weekStart(event.day)], event, now);
  return { ...account, wallet: change.wallet, days: { ...account.days, [event.day]: change.day },
    weeks: { ...account.weeks, [weekStart(event.day)]: change.week }, receipts: { ...account.receipts, [event.id]: change.receipt },
    pending: account.pending.filter((e) => e.id !== event.id) };
}
export function purchaseReward(wallet: RewardWallet, id: RewardItemId, now = Date.now()) {
  const item = REWARD_ITEMS.find((item) => item.id === id);
  if (!item) throw new Error('Item não encontrado.');
  if (wallet.owned.includes(id)) throw new Error('Você já desbloqueou este item.');
  if (wallet.coins < item.price) throw new Error(`Faltam ${item.price - wallet.coins} moedas para desbloquear.`);
  const eventId = `purchase_${id}`;
  const next = { ...wallet, coins: wallet.coins - item.price, owned: [...wallet.owned, id], revision: wallet.revision + 1, lastEvent: eventId };
  const receipt: RewardReceipt = { id: eventId, kind: 'purchase', sourceId: id, day: localDay(now, wallet.offset), occurredAt: now,
    xp: 0, coins: -item.price, tickets: 0, weeklyBonus: false, revision: next.revision };
  return { wallet: next, receipt };
}
export function nextGoal(wallet: RewardWallet, target: RewardGoal, weekdays: number[], now = Date.now()) {
  if (![1, 2, 3].includes(target) || !weekdays.length || new Set(weekdays).size !== weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('Escolha uma meta e pelo menos um dia.');
  const day = localDay(now, wallet.offset) + 1;
  return [{ day, target, weekdays: [...weekdays].sort() }, ...wallet.goals.filter((goal) => goal.day !== day)].slice(0, 9);
}
export function mergeGuestProgress(account: RewardAccount, guest: RewardAccount): RewardAccount {
  if (account.importDone) throw new Error('O progresso local já foi importado para esta conta.');
  const floor = Math.max(account.wallet.legacyXp, guest.wallet.xp);
  return { ...account, importDone: true, wallet: { ...account.wallet, xp: Math.max(account.wallet.xp, floor), legacyXp: floor,
    owned: [...new Set([...account.wallet.owned, ...guest.wallet.owned])],
    legacyAchievements: [...new Set([...account.wallet.legacyAchievements, ...rewardAchievements(guest.wallet)])] } };
}
