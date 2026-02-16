import { STARTER_DECK, cloneCard, formatCost, canPay, pay, COLORS } from './cards.js';

// --- Simple game state ---
const MAX_BOARD = 7;

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sumCost(cost) {
  return COLORS.reduce((s, c) => s + (cost?.[c] ?? 0), 0);
}

function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

function makePlayer(name) {
  const deck = shuffle(Array.from({ length: 20 }, (_, i) => cloneCard(STARTER_DECK[i % STARTER_DECK.length])));
  return {
    name,
    hp: 30,
    deck,
    hand: [],
    board: [],
    maxMana: { R: 0, G: 0, B: 0 },
    mana: { R: 0, G: 0, B: 0 },
  };
}

let state;

// UI refs
const el = {
  playerHp: document.getElementById('playerHp'),
  enemyHp: document.getElementById('enemyHp'),
  playerMana: document.getElementById('playerMana'),
  enemyMana: document.getElementById('enemyMana'),
  turn: document.getElementById('turn'),
  phase: document.getElementById('phase'),
  hand: document.getElementById('hand'),
  playerBoard: document.getElementById('playerBoard'),
  enemyBoard: document.getElementById('enemyBoard'),
  log: document.getElementById('log'),
  endTurnBtn: document.getElementById('endTurnBtn'),
  restartBtn: document.getElementById('restartBtn'),
  enemyHero: document.getElementById('enemyHero'),
  playerHero: document.getElementById('playerHero'),
  enemyHeroHp: document.getElementById('enemyHeroHp'),
  playerHeroHp: document.getElementById('playerHeroHp'),
};

function log(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  el.log.prepend(line);
}

function manaString(m) {
  return `R:${m.R} G:${m.G} B:${m.B}`;
}

function draw(p) {
  if (p.deck.length === 0) {
    p.hp -= 1; // fatigue (very simple)
    log(`${p.name} fatigues (-1).`);
    return;
  }
  if (p.hand.length >= 10) {
    p.deck.pop(); // burn
    return;
  }
  p.hand.push(p.deck.pop());
}

function startGame() {
  state = {
    turnN: 1,
    current: 'player', // 'player'|'enemy'
    phase: 'main',
    player: makePlayer('You'),
    enemy: makePlayer('Enemy'),
    selectedAttacker: null, // { owner: 'player'|'enemy', idx }
  };

  // opening hands
  for (let i = 0; i < 3; i++) { draw(state.player); draw(state.enemy); }

  beginTurn('player');
  render();
  log('Game start.');
}

function beginTurn(who) {
  state.current = who;
  state.phase = 'main';
  const p = state[who];

  // increment max mana: rotate colors each turn for predictability
  const color = COLORS[(state.turnN - 1) % COLORS.length];
  p.maxMana[color] += 1;
  p.mana = deepCopy(p.maxMana);

  // draw
  draw(p);

  // refresh summoning sickness
  for (const u of p.board) {
    if (u.summoningSick) u.summoningSick = false;
    u.exhausted = false;
  }

  log(`${p.name} turn ${state.turnN} (${color}+1 mana).`);

  // enemy auto-plays
  if (who === 'enemy') {
    enemyMainAndCombat();
  }
}

function endTurn() {
  if (isGameOver()) return;
  state.selectedAttacker = null;

  if (state.current === 'player') {
    state.current = 'enemy';
    beginTurn('enemy');
  } else {
    state.turnN += 1;
    state.current = 'player';
    beginTurn('player');
  }

  render();
}

function isGameOver() {
  if (state.player.hp <= 0 || state.enemy.hp <= 0) {
    const winner = state.player.hp <= 0 ? 'Enemy' : 'You';
    log(`Game over. Winner: ${winner}`);
    el.endTurnBtn.disabled = true;
    return true;
  }
  return false;
}

function playCard(owner, handIdx) {
  const p = state[owner];
  const card = p.hand[handIdx];
  if (!card) return;
  if (owner !== state.current) return;
  if (p.board.length >= MAX_BOARD) { log('Board is full.'); return; }
  if (!canPay(card.cost, p.mana)) return;

  p.mana = pay(card.cost, p.mana);
  p.hand.splice(handIdx, 1);

  p.board.push({
    ...card,
    currentHp: card.hp,
    summoningSick: true,
    exhausted: true,
  });

  log(`${p.name} played ${card.name} (${formatCost(card.cost)}).`);
  render();
}

function selectAttacker(owner, boardIdx) {
  if (owner !== state.current) return;
  if (owner !== 'player') return; // v1: only allow human targeting

  const p = state[owner];
  const u = p.board[boardIdx];
  if (!u) return;
  if (u.summoningSick) return;
  if (u.exhausted) return;

  state.selectedAttacker = { owner, idx: boardIdx };
  render();
}

function attackUnit(defOwner, defIdx) {
  const atk = state.selectedAttacker;
  if (!atk) return;
  const A = state[atk.owner].board[atk.idx];
  const D = state[defOwner].board[defIdx];
  if (!A || !D) return;

  // exchange damage
  D.currentHp -= A.atk;
  A.currentHp -= D.atk;
  A.exhausted = true;
  state.selectedAttacker = null;

  log(`${state[atk.owner].name}'s ${A.name} attacks ${state[defOwner].name}'s ${D.name}.`);

  cleanupDead();
  render();
  isGameOver();
}

function attackHero(defOwner) {
  const atk = state.selectedAttacker;
  if (!atk) return;
  const A = state[atk.owner].board[atk.idx];
  if (!A) return;

  state[defOwner].hp -= A.atk;
  A.exhausted = true;
  state.selectedAttacker = null;

  log(`${state[atk.owner].name}'s ${A.name} hits ${state[defOwner].name} for ${A.atk}.`);

  render();
  isGameOver();
}

function cleanupDead() {
  for (const who of ['player', 'enemy']) {
    const p = state[who];
    const before = p.board.length;
    p.board = p.board.filter(u => u.currentHp > 0);
    const died = before - p.board.length;
    if (died > 0) log(`${p.name} lost ${died} unit(s).`);
  }
}

function enemyMainAndCombat() {
  const enemy = state.enemy;

  // main: play best affordable cards until can't
  let played = true;
  while (played) {
    played = false;
    if (enemy.board.length >= MAX_BOARD) break;

    // pick the highest "value" affordable: prefer higher total cost
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < enemy.hand.length; i++) {
      const c = enemy.hand[i];
      if (!canPay(c.cost, enemy.mana)) continue;
      const score = sumCost(c.cost) * 10 + (c.atk * 2 + c.hp);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx >= 0) {
      playCard('enemy', bestIdx);
      played = true;
    }
  }

  // combat: very simple
  // If can lethal face, do it. Else, trade into enemy units if favorable, otherwise face.
  const player = state.player;

  function readyUnits() {
    return enemy.board.map((u, idx) => ({ u, idx }))
      .filter(x => !x.u.summoningSick && !x.u.exhausted && x.u.currentHp > 0);
  }

  // lethal check
  const dmg = readyUnits().reduce((s, x) => s + x.u.atk, 0);
  if (dmg >= player.hp) {
    for (const { idx } of readyUnits()) {
      // direct attack
      player.hp -= enemy.board[idx].atk;
      enemy.board[idx].exhausted = true;
    }
    log('Enemy goes face for lethal.');
    render();
    isGameOver();
    endTurn();
    return;
  }

  // trades
  for (const { u, idx } of readyUnits()) {
    // find a favorable trade target: enemy unit that dies and we survive
    let target = -1;
    for (let j = 0; j < player.board.length; j++) {
      const d = player.board[j];
      const dDies = d.currentHp <= u.atk;
      const aSurvives = u.currentHp > d.atk;
      if (dDies && aSurvives) { target = j; break; }
    }

    if (target >= 0) {
      // simulate attack
      const D = player.board[target];
      D.currentHp -= u.atk;
      u.currentHp -= D.atk;
      u.exhausted = true;
      log(`Enemy's ${u.name} trades into your ${D.name}.`);
      cleanupDead();
      continue;
    }

    // else face
    player.hp -= u.atk;
    u.exhausted = true;
    log(`Enemy's ${u.name} hits you for ${u.atk}.`);
  }

  render();
  isGameOver();
  endTurn();
}

// --- Render ---

function renderCard(card, opts) {
  const div = document.createElement('div');
  div.className = 'card';

  if (opts.disabled) div.classList.add('disabled');
  if (opts.selected) div.classList.add('selected');

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = opts.badgeText || '';
  if (opts.badgeKind) badge.classList.add(opts.badgeKind);
  div.appendChild(badge);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = card.name;
  div.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<span>Cost: ${formatCost(card.cost)}</span><span>${opts.ownerLabel}</span>`;
  div.appendChild(meta);

  const stats = document.createElement('div');
  stats.className = 'stats';
  const hp = (card.currentHp ?? card.hp);
  stats.innerHTML = `<span>ATK ${card.atk}</span><span>HP ${hp}</span>`;
  div.appendChild(stats);

  if (card.text) {
    const t = document.createElement('div');
    t.className = 'small';
    t.style.marginTop = '8px';
    t.textContent = card.text;
    div.appendChild(t);
  }

  return div;
}

function render() {
  const p = state.player;
  const e = state.enemy;

  el.playerHp.textContent = p.hp;
  el.enemyHp.textContent = e.hp;
  el.playerHeroHp.textContent = p.hp;
  el.enemyHeroHp.textContent = e.hp;

  el.playerMana.textContent = `${manaString(p.mana)} (max ${manaString(p.maxMana)})`;
  el.enemyMana.textContent = `${manaString(e.mana)} (max ${manaString(e.maxMana)})`;

  el.turn.textContent = state.turnN;
  el.phase.textContent = `${state.current.toUpperCase()} / ${state.phase}`;

  // hand
  el.hand.innerHTML = '';
  p.hand.forEach((c, i) => {
    const disabled = state.current !== 'player' || !canPay(c.cost, p.mana) || p.board.length >= MAX_BOARD;
    const div = renderCard(c, { disabled, ownerLabel: 'Hand', badgeText: disabled ? 'Not playable' : 'Playable', badgeKind: disabled ? '' : 'ready' });
    div.addEventListener('click', () => { if (!disabled) playCard('player', i); });
    el.hand.appendChild(div);
  });

  // boards
  el.playerBoard.innerHTML = '';
  p.board.forEach((u, idx) => {
    const badgeText = u.summoningSick ? 'Sick' : (u.exhausted ? 'Used' : 'Ready');
    const badgeKind = u.summoningSick ? 'sick' : (!u.exhausted ? 'ready' : '');
    const selected = state.selectedAttacker?.owner === 'player' && state.selectedAttacker?.idx === idx;
    const div = renderCard(u, { disabled: false, ownerLabel: 'Board', badgeText, badgeKind, selected });
    div.addEventListener('click', () => selectAttacker('player', idx));
    el.playerBoard.appendChild(div);
  });

  el.enemyBoard.innerHTML = '';
  e.board.forEach((u, idx) => {
    const badgeText = u.summoningSick ? 'Sick' : (u.exhausted ? 'Used' : 'Ready');
    const badgeKind = u.summoningSick ? 'sick' : (!u.exhausted ? 'ready' : '');
    const div = renderCard(u, { disabled: false, ownerLabel: 'Board', badgeText, badgeKind });
    div.addEventListener('click', () => attackUnit('enemy', idx));
    el.enemyBoard.appendChild(div);
  });

  el.endTurnBtn.disabled = isGameOver();
}

// Attack enemy hero by clicking it
el.enemyHero.addEventListener('click', () => attackHero('enemy'));

el.endTurnBtn.addEventListener('click', () => endTurn());
el.restartBtn.addEventListener('click', () => {
  el.endTurnBtn.disabled = false;
  el.log.innerHTML = '';
  startGame();
});

startGame();
