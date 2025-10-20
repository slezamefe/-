const balanceEl = document.getElementById('balance');
const betInput = document.getElementById('bet');
const autoCashoutInput = document.getElementById('autoCashout');
const actionButton = document.getElementById('actionButton');
const multiplierLabel = document.getElementById('multiplier');
const statusEl = document.getElementById('status');
const historyEl = document.getElementById('history');
const line = document.getElementById('multiplier-line');

let balance = 1000;
let roundActive = false;
let crashed = false;
let cashoutTaken = false;
let currentBet = 0;
let crashPoint = 0;
let multiplier = 1;
let roundStart = 0;
let animationFrameId;
let points = [];

const formatCurrency = (value) => {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
};
const formatMultiplier = (value) => `${value.toFixed(2)}×`;

const updateBalance = () => {
  balanceEl.textContent = formatCurrency(balance);
};

const pushHistory = (resultMultiplier, profit) => {
  const placeholder = historyEl.querySelector('.placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  const entry = document.createElement('li');
  entry.classList.add(profit >= 0 ? 'positive' : 'negative');
  entry.innerHTML = `
    <span>${formatMultiplier(resultMultiplier)}</span>
    <span>${profit >= 0 ? '+' : ''}${formatCurrency(profit)}</span>
  `;
  historyEl.prepend(entry);
  while (historyEl.children.length > 8) {
    historyEl.removeChild(historyEl.lastChild);
  }
};

const resetRoundState = () => {
  roundActive = false;
  crashed = false;
  cashoutTaken = false;
  currentBet = 0;
  multiplier = 1;
  crashPoint = 0;
  points = ['0,320'];
  line.setAttribute('points', points.join(' '));
  multiplierLabel.textContent = formatMultiplier(multiplier);
  statusEl.textContent = 'Waiting for bet…';
  actionButton.textContent = 'Start Round';
  actionButton.disabled = false;
};

const generateCrashPoint = () => {
  // Tuned distribution that keeps most rounds between 1.0 and 10.0
  const r = Math.random();
  const value = 1 + Math.pow(1 - r, -1.35) / 4;
  return Math.min(Math.max(value, 1.05), 20);
};

const getAutoCashout = () => {
  const value = parseFloat(autoCashoutInput.value);
  if (Number.isFinite(value) && value >= 1) {
    return value;
  }
  return null;
};

const updatePolyline = (elapsedMs, currentMultiplier) => {
  const maxWidth = 600;
  const maxHeight = 320;
  const duration = 12000; // ms until we reach the edge
  const x = Math.min((elapsedMs / duration) * maxWidth, maxWidth);
  const normalizationBase = Math.max(crashPoint, 4);
  const normalizedMultiplier = Math.min(currentMultiplier / normalizationBase, 1);
  const y = maxHeight - normalizedMultiplier * maxHeight;
  points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  if (points.length > 320) {
    points.splice(1, points.length - 320);
  }
  line.setAttribute('points', points.join(' '));
};

const endRound = (didCrash) => {
  cancelAnimationFrame(animationFrameId);
  roundActive = false;
  crashed = didCrash;
  actionButton.textContent = 'Start Round';
  actionButton.disabled = false;
  if (didCrash) {
    statusEl.textContent = `Crashed at ${formatMultiplier(crashPoint)}`;
    pushHistory(crashPoint, cashoutTaken ? currentBet * (multiplier - 1) : -currentBet);
  }
  roundStart = 0;
  currentBet = 0;
};

const tick = (timestamp) => {
  if (!roundActive) return;

  if (!roundStart) {
    roundStart = timestamp;
  }

  const elapsed = timestamp - roundStart;
  const nextMultiplier = Math.pow(1.0035, elapsed / 10);
  const willCrash = nextMultiplier >= crashPoint;
  multiplier = willCrash ? crashPoint : nextMultiplier;
  multiplierLabel.textContent = formatMultiplier(multiplier);
  updatePolyline(elapsed, multiplier);

  const autoCashout = getAutoCashout();
  if (autoCashout && !cashoutTaken && multiplier >= autoCashout) {
    handleCashout();
    return;
  }

  if (willCrash) {
    statusEl.textContent = 'Crash!';
    endRound(true);
    return;
  }

  animationFrameId = requestAnimationFrame(tick);
};

const handleCashout = () => {
  if (!roundActive || crashed || cashoutTaken) return;

  const profit = currentBet * multiplier;
  balance += profit;
  cashoutTaken = true;
  statusEl.textContent = `You cashed out at ${formatMultiplier(multiplier)}`;
  pushHistory(multiplier, profit - currentBet);
  updateBalance();
  endRound(false);
};

const startRound = () => {
  const bet = parseFloat(betInput.value);
  if (!Number.isFinite(bet) || bet <= 0) {
    statusEl.textContent = 'Enter a valid bet.';
    return;
  }
  if (bet > balance) {
    statusEl.textContent = 'Insufficient balance.';
    return;
  }

  balance -= bet;
  updateBalance();

  roundActive = true;
  crashed = false;
  cashoutTaken = false;
  currentBet = bet;
  multiplier = 1;
  crashPoint = generateCrashPoint();
  roundStart = 0;
  points = ['0,320'];
  line.setAttribute('points', points.join(' '));
  multiplierLabel.textContent = formatMultiplier(multiplier);

  actionButton.textContent = 'Cash Out';
  statusEl.textContent = 'Round live…';
  animationFrameId = requestAnimationFrame(tick);
};

actionButton.addEventListener('click', () => {
  if (!roundActive) {
    startRound();
  } else {
    handleCashout();
  }
});

resetRoundState();
updateBalance();
