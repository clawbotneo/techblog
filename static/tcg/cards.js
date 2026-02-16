// Card data (prototype)
// cost is an object with R/G/B integers.

export const COLORS = ['R', 'G', 'B'];

export const STARTER_DECK = [
  // Red: aggressive
  { id: 'r1', name: 'Spark Goblin', cost: { R: 1 }, atk: 2, hp: 1, text: 'Fast and fragile.' },
  { id: 'r2', name: 'Ash Hound', cost: { R: 2 }, atk: 3, hp: 2, text: 'Keeps pressure.' },
  { id: 'r3', name: 'Molten Brute', cost: { R: 3 }, atk: 5, hp: 3, text: 'Big swing.' },

  // Green: stat-efficient
  { id: 'g1', name: 'Moss Turtle', cost: { G: 1 }, atk: 1, hp: 3, text: 'Soaks damage.' },
  { id: 'g2', name: 'Grove Stag', cost: { G: 2 }, atk: 3, hp: 3, text: 'Solid body.' },
  { id: 'g3', name: 'Ancient Treant', cost: { G: 3 }, atk: 4, hp: 6, text: 'Hard to remove.' },

  // Blue: tricky-ish (still just units in v1)
  { id: 'b1', name: 'Mist Adept', cost: { B: 1 }, atk: 1, hp: 2, text: 'Value unit.' },
  { id: 'b2', name: 'Tide Scribe', cost: { B: 2 }, atk: 2, hp: 4, text: 'Stabilizes.' },
  { id: 'b3', name: 'Storm Warden', cost: { B: 3 }, atk: 3, hp: 5, text: 'Defensive.' },

  // Dual-color examples (forces resource decisions)
  { id: 'rg1', name: 'Wildfire Raider', cost: { R: 1, G: 1 }, atk: 3, hp: 2, text: 'Aggro mid.' },
  { id: 'gb1', name: 'Bog Oracle', cost: { G: 1, B: 1 }, atk: 2, hp: 3, text: 'Balanced.' },
  { id: 'rb1', name: 'Arc Corsair', cost: { R: 1, B: 1 }, atk: 3, hp: 1, text: 'Glass cannon.' },

  // Neutral-ish (cost in any color via "X")
  { id: 'n1', name: 'Clockwork Sentry', cost: { R: 1, G: 0, B: 0 }, atk: 2, hp: 2, text: 'Placeholder neutral.' },
];

export function cloneCard(card) {
  return JSON.parse(JSON.stringify(card));
}

export function formatCost(cost) {
  const parts = [];
  for (const c of COLORS) {
    const v = cost?.[c] ?? 0;
    if (v > 0) parts.push(`${c}${v}`);
  }
  return parts.length ? parts.join(' ') : '0';
}

export function canPay(cost, mana) {
  for (const c of COLORS) {
    const need = cost?.[c] ?? 0;
    if ((mana?.[c] ?? 0) < need) return false;
  }
  return true;
}

export function pay(cost, mana) {
  const next = { ...mana };
  for (const c of COLORS) {
    const need = cost?.[c] ?? 0;
    next[c] = (next[c] ?? 0) - need;
  }
  return next;
}
