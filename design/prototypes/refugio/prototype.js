/* Estudo isolado de interface. Não usar este simulador como carteira em produção. */
'use strict';

const $ = (selector) => document.querySelector(selector);
const icons = {
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9"/>',
  spark: '<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
  ticket:
    '<path d="M4 7h16v4a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Z"/><path d="M15 7v2m0 3v2m0 2v2"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  settings:
    '<path d="m10 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 3 2 3-2v-3l3-2-1-4-3-1-2-3h-4Z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  fish: '<path d="M4 12c5-8 11-8 16 0-5 8-11 8-16 0ZM4 12l-3-4v8l3-4Z"/><circle cx="15" cy="11" r=".7"/>',
  award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
  wifi: '<path d="M3 8c5-4 13-4 18 0M6 12c3-3 9-3 12 0m-9 4c2-2 4-2 6 0"/><circle cx="12" cy="20" r=".5"/>',
  cloud: '<path d="M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-1 10Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  heart: '<path d="M12 20 3 11a5 5 0 0 1 9-5 5 5 0 0 1 9 5l-9 9Z"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
const number = (value) => value.toLocaleString('pt-BR');
const catalog = [
  {
    id: 'accent.sage.v1',
    name: 'Sálvia',
    type: 'Cores',
    price: 15,
    description: 'Um verde tranquilo para os detalhes do seu espaço.',
    preview: '<div class="color-preview" aria-hidden="true"><i></i><i></i><i></i></div>',
  },
  {
    id: 'theme.forest.v1',
    name: 'Bosque',
    type: 'Temas',
    price: 80,
    description: 'Superfícies suaves inspiradas nas cores do refúgio.',
    preview:
      '<div class="theme-preview" aria-hidden="true"><aside></aside><div><span></span><span></span><span></span></div></div>',
  },
  {
    id: 'frame.horizon.v1',
    name: 'Horizonte',
    type: 'Perfil',
    price: 120,
    description: 'Uma moldura dourada para acompanhar sua jornada.',
    preview: '<div class="frame-preview" aria-hidden="true">M</div>',
  },
];
const goalRewards = { 1: { xp: 15, coins: 5 }, 2: { xp: 30, coins: 7 }, 3: { xp: 50, coins: 10 } };
const confirmationTimers = new Map();
let announcementTimer;
let purchaseTimer;
let pendingPurchaseId = null;
const initialTasks = () => [
  {
    id: 'read',
    title: 'Ler um capítulo',
    category: 'Aprendizado',
    duration: '20 min',
    completed: false,
  },
  {
    id: 'walk',
    title: 'Caminhar ao ar livre',
    category: 'Bem-estar',
    duration: '30 min',
    completed: false,
  },
  {
    id: 'plan',
    title: 'Preparar o dia de amanhã',
    category: 'Organização',
    duration: '10 min',
    completed: false,
  },
  {
    id: 'practice',
    title: 'Praticar um idioma',
    category: 'Aprendizado',
    duration: '15 min',
    completed: false,
  },
  { id: 'tidy', title: 'Organizar a mesa', category: 'Casa', duration: '10 min', completed: false },
];
const createState = () => ({
  scenario: 'new',
  view: 'refugio',
  filter: 'Todos',
  xp: 0,
  coins: 0,
  tickets: 0,
  owned: new Set(),
  equipped: {},
  target: catalog[0].id,
  goal: 3,
  nextGoal: 3,
  days: [1, 2, 3, 4, 5],
  nextDays: [1, 2, 3, 4, 5],
  reducedMotion: false,
  visible: true,
  day: 0,
  tasks: initialTasks(),
  seen: new Set(),
  receipts: new Set(),
  counts: new Map(),
  queue: [],
  activeDays: new Set(),
  weeklyReceipts: new Set(),
  migrated: true,
  existingAchievements: false,
  offline: false,
  error: false,
  loading: false,
});
let state = createState();

function levelFor(xp) {
  const thresholds = [0, 250, 600, 1200, 2500];
  let level = 1;
  while (threshold(level + 1) <= xp) level++;
  function threshold(n) {
    return n <= 5 ? thresholds[n - 1] : 2500 + 750 * (n - 5) + 250 * (n - 5) ** 2;
  }
  const start = threshold(level);
  const end = threshold(level + 1);
  return { level, start, end, progress: xp - start, range: end - start };
}

function dailyCount() {
  if (!state.counts.has(state.day)) state.counts.set(state.day, { tasks: 0, focus: 0, coins: 0 });
  return state.counts.get(state.day);
}

function showNotice(message, action = '') {
  clearTimeout(announcementTimer);
  $('#announcement').innerHTML = message + action;
  announcementTimer = setTimeout(() => {
    $('#announcement').innerHTML = '';
  }, 9000);
}

function commitOrQueue(reward) {
  if (state.receipts.has(reward.key) || state.queue.some((item) => item.key === reward.key)) return;
  if (state.offline || state.error) {
    state.queue.push(reward);
    showNotice(
      `Atividade salva. <strong>+${reward.xp} XP e +${reward.coins} moedas</strong> aguardam confirmação.`
    );
  } else {
    applyReceipt(reward);
    showNotice(
      `<strong>+${reward.xp} XP · +${reward.coins} moedas${reward.tickets ? ` · +${reward.tickets} bilhete${reward.tickets > 1 ? 's' : ''}` : ''}</strong><br>${escapeHTML(reward.message)}`
    );
  }
}

function applyReceipt(reward) {
  if (state.receipts.has(reward.key)) return;
  state.receipts.add(reward.key);
  state.xp += reward.xp;
  state.coins += reward.coins;
  state.tickets += reward.tickets;
}

function confirmTask(taskId, day) {
  const timerKey = `${day}:${taskId}`;
  confirmationTimers.delete(timerKey);
  if (day !== state.day) return;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || !task.completed || state.seen.has(timerKey)) return;
  state.seen.add(timerKey);
  const count = dailyCount();
  if (count.tasks >= 5) return;
  count.tasks++;
  let xp = 50,
    coins = 5,
    tickets = 0;
  const messages = ['Tarefa concluída.'];
  if (count.tasks === 1) {
    xp += 25;
    coins += 10;
    tickets++;
    messages.push('Primeiro passo do dia!');
  }
  if (count.tasks === state.goal) {
    xp += goalRewards[state.goal].xp;
    coins += goalRewards[state.goal].coins;
    tickets++;
    messages.push('Sua meta diária foi cumprida.');
  }
  coins = Math.min(coins, 50 - count.coins);
  count.coins += coins;
  state.activeDays.add(state.day);
  commitOrQueue({ key: `task:${timerKey}`, xp, coins, tickets, message: messages.join(' ') });
  const week = Math.floor(state.day / 7);
  const weekDays = [...state.activeDays].filter(
    (dayValue) => Math.floor(dayValue / 7) === week
  ).length;
  if (weekDays >= 4 && !state.weeklyReceipts.has(week)) {
    state.weeklyReceipts.add(week);
    commitOrQueue({
      key: `week:${week}`,
      xp: 100,
      coins: 20,
      tickets: 0,
      message: 'Quatro dias ativos nesta semana. Bônus semanal recebido.',
    });
  }
  render();
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  const key = `${state.day}:${taskId}`;
  if (!task.completed) {
    if (confirmationTimers.has(key)) {
      clearTimeout(confirmationTimers.get(key));
      confirmationTimers.delete(key);
      showNotice('Conclusão desfeita. Nenhuma recompensa foi concedida.');
    } else if (state.seen.has(key)) {
      showNotice('Registro atualizado. Esta ocorrência já recebeu sua recompensa.');
    }
  } else if (state.seen.has(key)) {
    showNotice('Registro atualizado. A recompensa desta tarefa não se repete.');
  } else {
    const day = state.day;
    confirmationTimers.set(
      key,
      setTimeout(() => confirmTask(taskId, day), 5000)
    );
    showNotice(
      'Tarefa concluída. Confirmando a recompensa em 5 segundos.',
      `<button type="button" data-undo="${taskId}">Desfazer</button>`
    );
  }
  render();
}

function syncQueue() {
  state.offline = false;
  state.error = false;
  state.loading = false;
  state.scenario = 'new';
  const pendingCount = state.queue.length;
  state.queue.forEach(applyReceipt);
  state.queue = [];
  render();
  showNotice(
    pendingCount
      ? `<strong>${pendingCount} atividade${pendingCount > 1 ? 's' : ''} confirmada${pendingCount > 1 ? 's' : ''}.</strong> Seu progresso está atualizado.`
      : 'Conexão restabelecida. Seu progresso está atualizado.'
  );
}

function renderWallet() {
  $('#wallet').innerHTML = state.visible
    ? `<span class="xp">${icon('spark')} ${number(state.xp)} <small>XP</small></span><span class="coins">${icon('coin')} ${number(state.coins)} <small>moedas</small></span><span class="ticket">${icon('ticket')} ${state.tickets} <small>bilhetes</small></span>`
    : '<span><small>Recompensas ocultas</small></span>';
}

function renderConnection() {
  const pendingXp = state.queue.reduce((total, entry) => total + entry.xp, 0);
  const pendingCoins = state.queue.reduce((total, entry) => total + entry.coins, 0);
  const pendingText = state.queue.length
    ? ` ${pendingXp} XP e ${pendingCoins} moedas aguardam confirmação.`
    : '';
  if (state.offline)
    $('#connection-state').innerHTML =
      `<div class="connection-banner">${icon('cloud')}<p><strong>Você está sem conexão</strong>Continue sua rotina. Compras aguardam a reconexão.${pendingText}</p><button id="reconnect" type="button" class="outline-button">Simular reconexão</button></div>`;
  else if (state.error)
    $('#connection-state').innerHTML =
      `<div class="connection-banner error">${icon('cloud')}<p><strong>Não foi possível confirmar o progresso</strong>Suas atividades foram mantidas. Nenhum saldo será debitado nesta falha.${pendingText}</p><button id="retry" type="button" class="outline-button">Tentar novamente</button></div>`;
  else $('#connection-state').innerHTML = '';
}

function heading(title, description, eyebrow = '') {
  return `<div class="page-heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1><p>${description}</p></div><span class="small-label">${icon('heart')} no seu ritmo</span></div>`;
}

function renderTask(task) {
  const key = `${state.day}:${task.id}`;
  const pending = confirmationTimers.has(key);
  const queued = state.queue.some((item) => item.key === `task:${key}`);
  const subtitle = pending
    ? 'Confirmando · você ainda pode desfazer'
    : queued
      ? 'Salva · recompensa pendente'
      : state.seen.has(key)
        ? 'Recompensa registrada para esta ocorrência'
        : `${task.category} · ${task.duration}`;
  return `<li class="task-row"><input class="task-check" id="task-${task.id}" type="checkbox" data-task="${task.id}" ${task.completed ? 'checked' : ''} /><label for="task-${task.id}"><span class="${task.completed ? 'done' : ''}">${task.title}</span><small>${subtitle}</small></label></li>`;
}

function renderRefuge() {
  const count = dailyCount();
  const target = catalog.find((item) => item.id === state.target) || catalog[0];
  const owned = state.owned.has(target.id);
  const missing = Math.max(0, target.price - state.coins);
  const week = Math.floor(state.day / 7);
  const weekActive = [...state.activeDays].filter((day) => Math.floor(day / 7) === week).length;
  return `${heading('Uma tarefa por vez.', 'Cuide da sua rotina. Seu espaço cresce com você.', 'Seu Refúgio')}
    <div class="refuge-grid">
      <section aria-label="Seu companheiro e refúgio">
        <div class="scene-wrap"><img src="refugio.svg" alt="Capivara descansando na margem de um lago cercado por árvores." /><span class="scene-label">Prévia do companheiro · capivara</span></div>
        <div class="scene-credit"><p><strong>Brisa encontrou um lugar tranquilo.</strong>Um companheiro para acompanhar seus dias.</p><button class="outline-button" type="button" data-view="perfil">Ver perfil</button></div>
        <div class="next-step"><span class="swatch" aria-hidden="true">${icon(owned ? 'check' : 'spark')}</span><div><h3>${owned ? `${target.name} faz parte do seu espaço` : `Seu próximo objetivo: ${target.name}`}</h3><p>${owned ? 'Escolha o que combina com você.' : missing ? `Faltam ${missing} moedas. A primeira tarefa do dia já rende 15.` : 'Você já pode desbloquear este item.'}</p></div><button type="button" class="outline-button" data-view="catalogo">${owned ? 'Explorar catálogo' : 'Ver recompensa'} ${icon('arrow')}</button></div>
      </section>
      <section class="daily-panel" aria-label="Atividades de demonstração"><div class="section-heading"><h2>Sua rotina de hoje</h2><button type="button" class="text-button" data-open-preferences>Editar meta</button></div><p>Conclua uma atividade para ganhar XP e moedas.</p><div class="goal-progress"><div class="progress-caption"><span>Meta diária</span><strong>${Math.min(count.tasks, state.goal)} de ${state.goal} tarefas</strong></div><progress max="${state.goal}" value="${Math.min(count.tasks, state.goal)}" aria-label="Tarefas da meta diária concluídas"></progress></div><ul class="task-list">${state.tasks.slice(0, 3).map(renderTask).join('')}</ul><details><summary>Outras atividades da demonstração</summary><ul class="task-list">${state.tasks.slice(3).map(renderTask).join('')}</ul></details><div class="daily-reward">${icon(count.tasks >= state.goal ? 'check' : 'ticket')}<p><strong>${count.tasks >= state.goal ? 'Meta cumprida. Você já fez sua parte.' : 'Ao cumprir sua meta'}</strong>${count.tasks >= state.goal ? 'Seu bônus foi registrado. Continue no seu ritmo.' : `+${goalRewards[state.goal].xp} XP · +${goalRewards[state.goal].coins} moedas · +1 bilhete`}</p></div>${state.nextGoal !== state.goal ? `<p class="helper">Amanhã, sua meta será de ${state.nextGoal} tarefa${state.nextGoal > 1 ? 's' : ''}.</p>` : ''}</section>
    </div>
    <div class="secondary-row"><section><h3>Sua semana, com espaço para descansar</h3><p>${weekActive} de 4 dias ativos para o marco semanal. Seus itens e seu nível permanecem após uma pausa.</p><div class="week-dots">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((label, index) => `<div class="day-dot ${state.activeDays.has(week * 7 + index) ? 'active' : ''} ${state.days.includes((index + 1) % 7) ? '' : 'rest'}"><span>${state.activeDays.has(week * 7 + index) ? icon('check') : '·'}</span><span>${label}</span></div>`).join('')}</div></section><section class="coming-soon"><div class="lake-symbol">${icon('fish')}</div><div><h3>Um lago de descobertas</h3><p>Seus bilhetes ficarão guardados para a pesca. O lago e o aquário entram em uma próxima etapa.</p><span class="small-label">Prévia · ainda indisponível</span></div></section></div>
    <div class="review-tools" aria-label="Controles exclusivos da demonstração"><button type="button" id="focus-complete" class="secondary-button">Simular conclusão de 25 min de foco</button><button type="button" id="next-day" class="secondary-button">Avançar um dia na demonstração</button><span class="prototype-day">Dia simulado ${state.day + 1} · dados reiniciam ao recarregar</span></div>`;
}

function renderCatalog() {
  const filtered = catalog.filter((item) => state.filter === 'Todos' || state.filter === item.type);
  return `${heading('Escolha o que combina com você.', 'Moedas da sua rotina viram detalhes do seu espaço.', 'Catálogo')}
    <div class="filter-row" aria-label="Filtrar catálogo">${['Todos', 'Cores', 'Temas', 'Perfil'].map((filter) => `<button id="filter-${filter}" type="button" data-filter="${filter}" aria-pressed="${state.filter === filter}">${filter}</button>`).join('')}</div>
    <div class="catalog-grid">${filtered
      .map((item) => {
        const owned = state.owned.has(item.id);
        const equipped = state.equipped[item.type] === item.id;
        const missing = Math.max(0, item.price - state.coins);
        const blocked = state.offline || state.error;
        let action;
        if (owned)
          action = `<button type="button" class="${equipped ? 'secondary-button' : 'primary-button'}" data-equip="${item.id}">${equipped ? 'Remover' : 'Equipar'}</button>`;
        else if (missing)
          action = `<button type="button" class="secondary-button" data-target="${item.id}" ${state.target === item.id ? 'disabled' : ''}>${state.target === item.id ? 'Seu objetivo' : 'Guardar como objetivo'}</button>`;
        else
          action = `<button type="button" class="primary-button" data-buy="${item.id}" ${blocked ? 'disabled' : ''}>Desbloquear</button>`;
        return `<article class="catalog-item"><div class="item-preview">${item.preview}</div><div class="item-info"><div class="item-type">${item.type}</div><h2>${item.name}</h2><p>${item.description}</p><div class="item-bottom">${owned ? `<span class="item-status">${icon('check')}${equipped ? 'Equipado' : 'Seu inventário'}</span>` : `<span class="price">${icon('coin')}${item.price} <small>moedas</small></span>`}${action}</div><p class="item-note">${owned ? 'Este item é seu. Você pode usá-lo quando quiser.' : blocked ? 'Conecte-se para confirmar este desbloqueio.' : missing ? `Faltam ${missing} moedas. Continue a rotina no seu ritmo.` : 'Saldo suficiente. O item permanece no seu inventário.'}</p></div></article>`;
      })
      .join(
        ''
      )}</div><p class="helper">Claro, escuro e recursos de acessibilidade estão sempre disponíveis gratuitamente.</p>`;
}

function renderProfile() {
  const level = levelFor(state.xp);
  const frame = state.equipped.Perfil === 'frame.horizon.v1';
  const firstTask =
    state.existingAchievements || [...state.receipts].some((key) => key.startsWith('task:'));
  const firstItem = state.owned.size > 0;
  return `${heading('Seu progresso tem a sua cara.', 'Um espaço para lembrar do que você já construiu.', 'Perfil')}
    <div class="profile-layout"><section class="profile-display"><div class="profile-heading"><div class="profile-large-avatar ${frame ? 'framed' : ''}" aria-hidden="true">M</div><div><h2>Marina</h2><p>Um dia de cada vez.</p><span class="small-label">Nível ${level.level} · ${number(state.xp)} XP</span></div></div><p>Aprender, me movimentar e deixar espaço para descansar.</p><div class="progress-caption"><span>Próximo nível</span><strong>${number(level.end - state.xp)} XP restantes</strong></div><progress max="${level.range}" value="${level.progress}" aria-label="Progresso até o próximo nível"></progress><div class="scene-wrap"><img src="refugio.svg" alt="Prévia do companheiro Brisa no Refúgio." /></div><p class="helper">Pet e vitrine de colecionáveis serão desenvolvidos nas próximas etapas.</p><button type="button" class="outline-button" data-view="catalogo">Personalizar meu espaço</button></section><section class="milestones"><h2>Marcos da sua jornada</h2>${[
      {
        title: 'Primeiro passo',
        description: 'Concluir sua primeira tarefa.',
        unlocked: firstTask,
      },
      {
        title: 'Do seu jeito',
        description: 'Desbloquear sua primeira personalização.',
        unlocked: firstItem,
      },
      {
        title: 'Uma semana com intenção',
        description: 'Registrar quatro dias ativos na mesma semana.',
        unlocked: [...state.receipts].some((key) => key.startsWith('week:')),
      },
    ]
      .map(
        (item) =>
          `<div class="milestone ${item.unlocked ? '' : 'locked'}">${icon(item.unlocked ? 'award' : 'lock')}<div><h3>${item.title}</h3><p>${item.description}</p><span class="small-label">${item.unlocked ? 'Conquista permanente' : 'Ainda por conquistar'}</span></div></div>`
      )
      .join(
        ''
      )}<p class="helper">As ilustrações, o nome e os dados deste perfil são exemplos.</p></section></div>`;
}

function renderRules() {
  return `${heading('Sua rotina faz seu mundo crescer.', 'Entenda o que você ganha e como pode usar.', 'Como funciona')}
    <div class="rules-layout"><p>XP aumenta seu nível. Moedas desbloqueiam personalizações. Bilhetes ficam guardados para a futura pesca. Nenhum recurso é vendido por dinheiro.</p><h2>Recompensas da rotina</h2><table class="rules-table"><thead><tr><th scope="col">Atividade</th><th scope="col">Ganho</th><th scope="col">Limite</th></tr></thead><tbody><tr><td>Tarefa concluída</td><td>50 XP + 5 moedas</td><td>5 por dia</td></tr><tr><td>Primeira tarefa do dia</td><td>+25 XP +10 moedas +1 bilhete</td><td>Uma vez ao dia</td></tr><tr><td>Meta de 3 tarefas</td><td>+50 XP +10 moedas +1 bilhete</td><td>Uma vez ao dia</td></tr><tr><td>Foco completo de 25 min ou mais</td><td>20 XP +2 moedas</td><td>3 por dia</td></tr><tr><td>Quatro dias ativos na semana</td><td>100 XP +20 moedas</td><td>Uma vez por semana</td></tr></tbody></table><h2>Seu ritmo é respeitado</h2><ul><li>Escolha metas de uma, duas ou três tarefas. Alterações passam a valer amanhã.</li><li>A meta de uma tarefa oferece 15 XP e 5 moedas; duas tarefas, 30 XP e 7 moedas. Todas entregam um bilhete.</li><li>Ganhos diários têm teto de 50 moedas. O bônus semanal é separado.</li><li>Dias de descanso e pausas não retiram nível, itens ou saldo.</li><li>Você pode ocultar as recompensas e continuar usando a rotina.</li></ul><h2>Progresso com clareza</h2><ul><li>Você pode desfazer uma conclusão acidental durante cinco segundos antes de confirmar o ganho.</li><li>Desmarcar e concluir uma tarefa novamente não repete a recompensa.</li><li>Sem conexão, tarefas ficam salvas e os ganhos aguardam confirmação. Itens já adquiridos continuam disponíveis.</li><li>Correções de tarefas antigas continuam possíveis, sem novos ganhos retroativos.</li></ul><p>Estes valores são a proposta v1 para teste. O protótipo não envia dados nem confirma saldos reais.</p></div>`;
}

function renderMigration() {
  return `${heading('O que você construiu continua com você.', 'Uma prévia da transição para o novo sistema de recompensas.', 'Usuário atual')}
    <section class="migration-panel"><span class="small-label">${icon('award')} Progresso existente</span><h2>Seu nível e suas conquistas serão preservados.</h2><p>Seu XP passa a ser permanente. As novas moedas começam a partir da ativação, com um presente de boas-vindas único.</p><div class="migration-summary"><div><span>XP preservado</span><strong>1.800 XP</strong><span>Nível 4 · sem redução</span></div><div><span>Presente de boas-vindas</span><strong>15 moedas</strong><span>Recebido uma única vez</span></div></div><p class="helper">Suas tarefas, fotos, preferências e conquistas atuais permanecem. O histórico antigo não será convertido em moedas.</p><button type="button" id="migrate" class="primary-button">Preservar progresso e conhecer o Refúgio</button><p class="helper">Esta confirmação afeta somente a demonstração.</p></section>`;
}

function render() {
  const focusedId = document.activeElement?.id;
  const expanded = document.querySelector('.daily-panel details')?.open;
  $('#scenario').value = state.scenario;
  document.documentElement.dataset.reducedMotion = String(state.reducedMotion);
  const sage = state.equipped.Cores === 'accent.sage.v1';
  const forest = state.equipped.Temas === 'theme.forest.v1';
  const dark = document.documentElement.dataset.theme === 'dark';
  const rootStyle = document.documentElement.style;
  [
    '--accent',
    '--accent-fill',
    '--on-accent',
    '--accent-soft',
    '--bg',
    '--surface',
    '--raised',
  ].forEach((property) => rootStyle.removeProperty(property));
  if (sage || forest) {
    rootStyle.setProperty('--accent', dark ? '#b1d2bb' : '#345c42');
    rootStyle.setProperty('--accent-fill', dark ? '#93ba9f' : '#426b4f');
    rootStyle.setProperty('--on-accent', dark ? '#172d20' : '#ffffff');
    rootStyle.setProperty('--accent-soft', dark ? '#273b2f' : '#e3eee5');
  }
  if (forest) {
    rootStyle.setProperty('--bg', dark ? '#141b17' : '#f2f5ee');
    rootStyle.setProperty('--surface', dark ? '#1c2720' : '#ffffff');
    rootStyle.setProperty('--raised', dark ? '#28352c' : '#e8eee3');
  }
  $('#theme-toggle').innerHTML = icon(dark ? 'sun' : 'moon');
  $('#theme-toggle').setAttribute('aria-label', `Ativar tema ${dark ? 'claro' : 'escuro'}`);
  $('#preferences-open').innerHTML = icon('settings');
  renderWallet();
  renderConnection();
  document.querySelectorAll('nav [data-view]').forEach((button) => {
    if (button.dataset.view === state.view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (state.loading)
    $('#view').innerHTML =
      '<div role="status" aria-label="Carregando seu progresso"><div class="skeleton title"></div><div class="skeleton line"></div><div class="refuge-grid"><div class="skeleton scene"></div><div class="skeleton scene"></div></div><p class="loading-message">Carregando seu progresso…</p><button id="finish-loading" type="button" class="outline-button">Concluir carregamento da prévia</button></div>';
  else if (!state.visible)
    $('#view').innerHTML =
      '<div class="empty-state"><h1>Mais espaço para sua rotina.</h1><p>As recompensas estão ocultas. Seu progresso permanece guardado.</p><button class="primary-button" type="button" data-open-preferences>Ajustar preferências</button></div>';
  else if (!state.migrated) $('#view').innerHTML = renderMigration();
  else
    $('#view').innerHTML = {
      refugio: renderRefuge,
      catalogo: renderCatalog,
      perfil: renderProfile,
      regras: renderRules,
    }[state.view]();
  if (expanded && state.view === 'refugio')
    document.querySelector('.daily-panel details')?.setAttribute('open', '');
  if (focusedId && document.getElementById(focusedId))
    document.getElementById(focusedId).focus({ preventScroll: true });
}

function openPreferences() {
  const form = $('#preferences-form');
  form.querySelector(`input[name="goal"][value="${state.nextGoal}"]`).checked = true;
  form.querySelectorAll('input[name="days"]').forEach((input) => {
    input.checked = state.nextDays.includes(Number(input.value));
  });
  form.elements.motion.checked = state.reducedMotion;
  form.elements.visible.checked = state.visible;
  $('#preferences-error').textContent = '';
  $('#preferences').showModal();
}

function openPurchase(itemId) {
  const item = catalog.find((entry) => entry.id === itemId);
  if (!item || state.owned.has(item.id)) return;
  pendingPurchaseId = itemId;
  $('#purchase-content').innerHTML =
    `<div class="dialog-heading"><h2>Desbloquear ${item.name}</h2><button type="button" class="icon-button" data-close-dialog aria-label="Fechar confirmação">×</button></div><div class="item-preview purchase-preview">${item.preview}</div><p>${item.description}</p><div class="purchase-details"><span>Preço</span><strong class="price">${icon('coin')}${item.price} moedas</strong></div><div class="purchase-details"><span>Saldo após desbloquear</span><strong>${state.coins - item.price} moedas</strong></div><p class="helper">O item ficará no seu inventário. Nada será comprado por dinheiro.</p><p id="purchase-error" class="inline-error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary-button" data-close-dialog>Cancelar</button><button type="button" id="confirm-purchase" class="primary-button">Confirmar desbloqueio</button></div>`;
  $('#purchase').showModal();
}

function confirmPurchase() {
  const item = catalog.find((entry) => entry.id === pendingPurchaseId);
  if (!item || purchaseTimer) return;
  if (state.offline || state.error || state.coins < item.price) {
    $('#purchase-error').textContent = state.offline
      ? 'Sem conexão. Seu saldo foi mantido. Reconecte e tente novamente.'
      : state.error
        ? 'Não foi possível confirmar. Seu saldo foi mantido. Tente novamente após reconectar.'
        : 'Saldo insuficiente. Nenhuma moeda foi debitada.';
    return;
  }
  $('#confirm-purchase').disabled = true;
  $('#confirm-purchase').textContent = 'Confirmando…';
  purchaseTimer = setTimeout(() => {
    purchaseTimer = undefined;
    if (state.owned.has(item.id)) return;
    if (state.coins < item.price || state.offline || state.error) {
      $('#confirm-purchase').disabled = false;
      $('#confirm-purchase').textContent = 'Tentar novamente';
      $('#purchase-error').textContent =
        'A confirmação foi interrompida. Nenhum saldo foi alterado.';
      return;
    }
    state.coins -= item.price;
    state.owned.add(item.id);
    $('#purchase').close();
    render();
    showNotice(
      `<strong>${item.name} agora faz parte do seu espaço.</strong><button type="button" data-equip="${item.id}">Equipar agora</button>`
    );
  }, 400);
}

function reset(scenario = 'new') {
  confirmationTimers.forEach(clearTimeout);
  confirmationTimers.clear();
  clearTimeout(purchaseTimer);
  purchaseTimer = undefined;
  pendingPurchaseId = null;
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  clearTimeout(announcementTimer);
  $('#announcement').innerHTML = '';
  state = createState();
  state.scenario = scenario;
  if (scenario === 'existing') {
    state.migrated = false;
    state.xp = 1800;
  }
  if (scenario === 'offline') state.offline = true;
  if (scenario === 'error') state.error = true;
  if (scenario === 'loading') state.loading = true;
  render();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.hasAttribute('data-close-dialog')) button.closest('dialog')?.close();
  if (button.hasAttribute('data-open-preferences') || button.id === 'preferences-open')
    openPreferences();
  if (button.dataset.view) {
    state.view = button.dataset.view;
    render();
    $('#main').focus({ preventScroll: true });
  }
  if (button.dataset.undo) toggleTask(button.dataset.undo);
  if (button.dataset.filter) {
    state.filter = button.dataset.filter;
    render();
  }
  if (button.dataset.target) {
    state.target = button.dataset.target;
    render();
    showNotice(
      `${escapeHTML(catalog.find((item) => item.id === state.target).name)} foi guardado como objetivo.`
    );
  }
  if (button.dataset.buy) openPurchase(button.dataset.buy);
  if (button.dataset.equip) {
    const item = catalog.find((entry) => entry.id === button.dataset.equip);
    if (!item || !state.owned.has(item.id)) return;
    const remove = state.equipped[item.type] === item.id;
    if (remove) delete state.equipped[item.type];
    else state.equipped[item.type] = item.id;
    render();
    showNotice(
      `${item.name} ${remove ? 'foi removido da personalização. Continua no inventário.' : 'foi equipado. Seu espaço foi atualizado.'}`
    );
  }
  if (button.id === 'confirm-purchase') confirmPurchase();
  if (button.id === 'theme-toggle') {
    document.documentElement.dataset.theme =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    render();
  }
  if (button.id === 'reset') reset($('#scenario').value);
  if (button.id === 'reconnect' || button.id === 'retry' || button.id === 'finish-loading')
    syncQueue();
  if (button.id === 'migrate') {
    if (state.migrated) return;
    state.migrated = true;
    state.existingAchievements = true;
    state.xp = Math.max(state.xp, 1800);
    applyReceipt({ key: 'migration:v1', xp: 0, coins: 15, tickets: 0 });
    render();
    showNotice(
      '<strong>Seu progresso foi preservado.</strong> 15 moedas de boas-vindas foram adicionadas à prévia.'
    );
  }
  if (button.id === 'focus-complete') {
    const count = dailyCount();
    if (count.focus >= 3)
      return showNotice(
        'As três sessões premiáveis do dia já foram registradas. O foco continua contando nas estatísticas.'
      );
    count.focus++;
    const coins = Math.min(2, 50 - count.coins);
    count.coins += coins;
    commitOrQueue({
      key: `focus:${state.day}:${count.focus}`,
      xp: 20,
      coins,
      tickets: 0,
      message: 'Sessão de foco concluída na demonstração.',
    });
    render();
  }
  if (button.id === 'next-day') {
    [...confirmationTimers.keys()].forEach((key) => {
      clearTimeout(confirmationTimers.get(key));
      confirmTask(key.split(':')[1], state.day);
    });
    state.day++;
    state.goal = state.nextGoal;
    state.days = [...state.nextDays];
    state.tasks = initialTasks();
    render();
    showNotice(
      `Dia ${state.day + 1} da demonstração. Meta: ${state.goal} tarefa${state.goal > 1 ? 's' : ''}.`
    );
  }
});

document.addEventListener('change', (event) => {
  if (event.target.dataset.task) toggleTask(event.target.dataset.task);
  if (event.target.id === 'scenario') {
    const scenario = event.target.value;
    if (scenario === 'new' && (state.offline || state.error || state.loading)) syncQueue();
    else if (scenario === 'offline' || scenario === 'error' || scenario === 'loading') {
      state.scenario = scenario;
      state.offline = scenario === 'offline';
      state.error = scenario === 'error';
      state.loading = scenario === 'loading';
      render();
    } else reset(scenario);
  }
});

$('#preferences-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const days = data.getAll('days').map(Number);
  if (!days.length) {
    $('#preferences-error').textContent =
      'Escolha pelo menos um dia de rotina. Você pode descansar nos demais.';
    return;
  }
  state.nextGoal = Number(data.get('goal'));
  state.nextDays = days;
  state.reducedMotion = data.has('motion');
  state.visible = data.has('visible');
  $('#preferences').close();
  render();
  showNotice('Preferências salvas. Meta e dias planejados passam a valer amanhã.');
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('close', () => {
    if (dialog.id === 'purchase' && purchaseTimer) {
      clearTimeout(purchaseTimer);
      purchaseTimer = undefined;
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
});
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  state.view = 'refugio';
  render();
  $('#main').focus({ preventScroll: true });
});
render();
