import { readFile } from 'node:fs/promises';

const rules = JSON.parse(await readFile(new URL('./rewards-rules.v1.json', import.meta.url)));

function dailyRewards(tasks, sessions, goal) {
  const eligibleTasks = Math.min(tasks, rules.task.dailyLimit);
  const eligibleSessions = Math.min(sessions, rules.focus.dailyLimit);
  let xp = eligibleTasks * rules.task.xp + eligibleSessions * rules.focus.xp;
  let coins = eligibleTasks * rules.task.coins + eligibleSessions * rules.focus.coins;
  let tickets = 0;
  if (eligibleTasks) {
    xp += rules.firstTask.xp;
    coins += rules.firstTask.coins;
    tickets += rules.firstTask.tickets;
  }
  if (eligibleTasks >= goal) {
    xp += rules.dailyGoals[goal].xp;
    coins += rules.dailyGoals[goal].coins;
    tickets += rules.dailyGoals[goal].tickets;
  }
  return { xp, coins: Math.min(coins, rules.dailyCoinsCap), tickets };
}

console.log('| Meta | Tarefas | Focos ≥25 min | XP | Moedas | Bilhetes |');
console.log('| ---: | ---: | ---: | ---: | ---: | ---: |');
for (const [goal, tasks, sessions] of [
  [3, 0, 0],
  [3, 1, 0],
  [1, 1, 0],
  [2, 2, 0],
  [3, 3, 0],
  [3, 3, 1],
  [3, 5, 3],
  [3, 12, 8],
]) {
  const result = dailyRewards(tasks, sessions, goal);
  console.log(
    `| ${goal} | ${tasks} | ${sessions} | ${result.xp} | ${result.coins} | ${result.tickets} |`
  );
}
const standard = dailyRewards(3, 1, 3);
const fortnight = 10 * standard.coins + 2 * rules.weeklyGoal.coins;
console.log(
  `\n14 dias corridos, 10 dias ativos (seg–sex), 3 tarefas e 1 foco/dia: ${10 * standard.xp + 2 * rules.weeklyGoal.xp} XP, ${fortnight} moedas, ${10 * standard.tickets} bilhetes. Sem gastos.`
);
console.log('\nDias ativos até cada item, sem gastos anteriores, com bônus semanal seg–sex:');
for (const item of rules.catalog) {
  let balance = 0;
  let activeDay = 0;
  while (balance < item.coins) {
    activeDay++;
    balance += standard.coins;
    if ((activeDay - 1) % 5 === 3) balance += rules.weeklyGoal.coins;
  }
  console.log(`${item.name}: ${activeDay} dia(s) ativo(s), saldo ${balance}.`);
}
