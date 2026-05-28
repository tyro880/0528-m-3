// ===== Canvas Farm Game - Full Livestock System =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE = 90;
const COLS = 10;
const ROWS = 6;
const OFFSET_X = 55;
const OFFSET_Y = 120;
const DAY_MS = 12000;

let state = null;
let contextMenu = null;
let animations = [];
let floatingTexts = [];
let flashingBuildings = new Set();
let dayTimer = 0;
let longPressTimer = null;
let longPressPos = null;

// ===== API =====
async function api(endpoint, body) {
  const res = await fetch('/api/' + endpoint, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

async function loadState() {
  state = await api('state');
  dayTimer = Date.now();
}

async function buildAt(type, col, row) {
  const res = await api('build', { type, col, row });
  if (res.ok) {
    state = res.state;
    animations.push({ type: 'build', col, row, scale: 0, t: 0 });
    addFloat(`-${type === 'chicken' ? 200 : 500} 金币`, col, row, '#ff6');
  } else {
    addFloat(res.msg, col, row, '#f44');
  }
}

async function feedAnimal(buildingId) {
  const res = await api('feed', { buildingId });
  if (res.ok) {
    state = res.state;
    const b = state.buildings.find(x => x.id === buildingId);
    if (b) addFloat('喂食成功!', b.col, b.row, '#4f4');
  } else {
    addFloat(res.msg, 5, 3, '#f44');
  }
}

async function healAnimal(buildingId) {
  const res = await api('heal', { buildingId });
  if (res.ok) {
    state = res.state;
    addFloat('治愈成功!', 5, 3, '#f4f');
  } else {
    addFloat(res.msg, 5, 3, '#f44');
  }
}

async function buyFeed(amount) {
  const res = await api('buy-feed', { amount });
  if (res.ok) {
    state = res.state;
    addFloat(`+${amount} 饲料`, 5, 0, '#4f4');
  } else {
    addFloat(res.msg, 5, 0, '#f44');
  }
}

async function sellAll() {
  const res = await api('sell-all', {});
  if (res.ok) {
    state = res.state;
    if (res.earned > 0) addFloat(`+${res.earned} 金币!`, 5, 3, '#fd0');
  }
}

async function nextDay() {
  const res = await api('next-day', {});
  if (res.ok) {
    state = res.state;
    addFloat(`第 ${state.day} 天`, 5, 3, '#fff');
    if (state.warehouse.length >= state.warehouseMax) {
      state.buildings.forEach(b => flashingBuildings.add(b.id));
      setTimeout(() => flashingBuildings.clear(), 2000);
    }
  }
}

// ===== Helpers =====
function getTile(mx, my) {
  const col = Math.floor((mx - OFFSET_X) / TILE);
  const row = Math.floor((my - OFFSET_Y) / TILE);
  if (col >= 0 && col < COLS && row >= 0 && row < ROWS) return { col, row };
  return null;
}

function getBuildingAt(col, row) {
  return state.buildings.find(b => b.col === col && b.row === row);
}

function addFloat(text, col, row, color) {
  floatingTexts.push({
    text, color,
    x: OFFSET_X + col * TILE + TILE / 2,
    y: OFFSET_Y + row * TILE,
    life: 80, alpha: 1
  });
}

// ===== Drawing =====
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, OFFSET_Y);
  g.addColorStop(0, '#4fa4d4');
  g.addColorStop(1, '#87ceeb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, OFFSET_Y);

  // sun
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(80, 50, 30, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = '#3d7a28';
  ctx.fillRect(0, OFFSET_Y - 10, canvas.width, canvas.height - OFFSET_Y + 10);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = OFFSET_X + c * TILE;
      const y = OFFSET_Y + r * TILE;
      ctx.fillStyle = (c + r) % 2 === 0 ? '#4a8b30' : '#3f7a28';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, TILE, TILE);
    }
  }
}

function drawBuilding(b) {
  const x = OFFSET_X + b.col * TILE;
  const y = OFFSET_Y + b.row * TILE;

  // Build animation
  const anim = animations.find(a => a.type === 'build' && a.col === b.col && a.row === b.row);
  let scale = 1;
  if (anim) scale = Math.min(anim.scale, 1);

  // Flashing red warning
  const flashing = flashingBuildings.has(b.id);
  if (flashing && Math.floor(Date.now() / 200) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.fillRect(x, y, TILE, TILE);
  }

  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  ctx.scale(scale, scale);
  ctx.translate(-(TILE / 2), -(TILE / 2));

  if (b.type === 'chicken') {
    // Coop body
    ctx.fillStyle = '#d4a056';
    ctx.fillRect(8, 30, 74, 50);
    // Roof
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.moveTo(3, 33);
    ctx.lineTo(45, 8);
    ctx.lineTo(87, 33);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(35, 50, 20, 30);
    // Chicken emoji
    ctx.font = '20px serif';
    ctx.fillText('🐔', 55, 75);
  } else {
    // Barn body
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(5, 28, 80, 55);
    // Roof
    ctx.fillStyle = '#4a0000';
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(45, 5);
    ctx.lineTo(90, 30);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(30, 45, 30, 38);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(44, 45, 2, 38);
    // Cow emoji
    ctx.font = '22px serif';
    ctx.fillText('🐄', 55, 78);
  }

  ctx.restore();

  // Mood icons above building
  b.animals.forEach((a, i) => {
    const ix = x + 10 + i * 25;
    const iy = y - 5;
    if (a.sick) {
      ctx.font = '16px serif';
      ctx.fillText('🤒', ix, iy);
    } else if (a.hungryDays > 0) {
      ctx.font = '16px serif';
      ctx.fillText('😟', ix, iy);
    } else {
      ctx.font = '16px serif';
      ctx.fillText('😊', ix, iy);
    }
  });

  // Feed button
  const btnX = x + TILE + 2;
  const btnY = y + 10;
  const btnW = 32;
  const btnH = 24;
  ctx.fillStyle = b.fedToday ? '#666' : '#2e7d32';
  roundRect(ctx, btnX, btnY, btnW, btnH, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(b.fedToday ? '已喂' : '喂食', btnX + btnW / 2, btnY + 16);
  ctx.textAlign = 'left';

  // Heal button if sick
  const hasSick = b.animals.some(a => a.sick);
  if (hasSick) {
    const hbtnY = btnY + 28;
    ctx.fillStyle = '#c62828';
    roundRect(ctx, btnX, hbtnY, btnW, btnH, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('治疗', btnX + btnW / 2, hbtnY + 16);
    ctx.textAlign = 'left';
  }

  // Warehouse full warning
  if (flashing) {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('⚠仓库满', x + 5, y + TILE + 14);
  }
}

function drawHUD() {
  // Background panel
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  roundRect(ctx, canvas.width - 280, 10, 270, 100, 10);
  ctx.fill();

  ctx.font = 'bold 15px Arial';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`💰 金币: ${state.coins}`, canvas.width - 265, 35);

  ctx.fillStyle = '#90ee90';
  ctx.fillText(`🌾 饲料: ${state.feed}`, canvas.width - 265, 58);

  const wUsed = state.warehouse.length;
  const wMax = state.warehouseMax;
  const pct = Math.round(wUsed / wMax * 100);
  ctx.fillStyle = pct >= 90 ? '#ff4444' : '#87cefa';
  ctx.fillText(`📦 仓库: ${wUsed}/${wMax} (${pct}%)`, canvas.width - 265, 81);

  ctx.fillStyle = '#fff';
  ctx.fillText(`📅 第 ${state.day} 天`, canvas.width - 265, 104);

  // Day progress bar
  const elapsed = Date.now() - dayTimer;
  const prog = Math.min(elapsed / DAY_MS, 1);
  ctx.fillStyle = '#333';
  ctx.fillRect(canvas.width - 140, 93, 110, 12);
  ctx.fillStyle = prog > 0.8 ? '#f44' : '#4caf50';
  ctx.fillRect(canvas.width - 140, 93, 110 * prog, 12);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(canvas.width - 140, 93, 110, 12);
}

function drawShopBar() {
  const barY = canvas.height - 50;
  ctx.fillStyle = 'rgba(20,20,40,0.9)';
  ctx.fillRect(0, barY, canvas.width, 50);

  const buttons = [
    { label: '🌾 买饲料x3 ($45)', x: 20, w: 160, action: 'buy3' },
    { label: '🌾 买饲料x10 ($150)', x: 190, w: 170, action: 'buy10' },
    { label: '💰 全部出售', x: 370, w: 120, action: 'sell' },
    { label: `📦 仓库 [${state ? state.warehouse.length : 0}]`, x: 500, w: 130, action: 'info' },
  ];

  buttons.forEach(btn => {
    ctx.fillStyle = '#3a506b';
    roundRect(ctx, btn.x, barY + 8, btn.w, 34, 6);
    ctx.fill();
    ctx.strokeStyle = '#5a7a9a';
    roundRect(ctx, btn.x, barY + 8, btn.w, 34, 6);
    ctx.stroke();
    ctx.fillStyle = '#eee';
    ctx.font = '13px Arial';
    ctx.fillText(btn.label, btn.x + 10, barY + 30);
  });
}

function drawContextMenu() {
  if (!contextMenu) return;
  const { x, y } = contextMenu;
  const w = 150;
  const h = 90;
  const mx = Math.min(x, canvas.width - w - 10);
  const my = Math.min(y, canvas.height - h - 10);

  ctx.fillStyle = 'rgba(30,30,50,0.95)';
  roundRect(ctx, mx, my, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#6a8caf';
  ctx.lineWidth = 2;
  roundRect(ctx, mx, my, w, h, 8);
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.fillStyle = '#ddd';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('建造:', mx + 10, my + 20);

  // Chicken button
  ctx.fillStyle = '#5d4e37';
  roundRect(ctx, mx + 10, my + 28, 130, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#ffe';
  ctx.font = '12px Arial';
  ctx.fillText('🐔 鸡舍 (200金币)', mx + 16, my + 45);

  // Cow button
  ctx.fillStyle = '#37475d';
  roundRect(ctx, mx + 10, my + 58, 130, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#ffe';
  ctx.fillText('🐄 牛棚 (500金币)', mx + 16, my + 75);

  contextMenu.rect = { x: mx, y: my, w, h };
}

function drawFloatingTexts() {
  floatingTexts.forEach(f => {
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;
}

function drawAnimations() {
  animations.forEach(a => {
    if (a.type === 'build') {
      const x = OFFSET_X + a.col * TILE + TILE / 2;
      const y = OFFSET_Y + a.row * TILE + TILE / 2;
      const r = (1 - a.scale) * 40;
      ctx.strokeStyle = `rgba(255,215,0,${1 - a.scale})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  });
}

function drawInstructions() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, 10, 10, 320, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#ccc';
  ctx.font = '12px Arial';
  ctx.fillText('右键空地 → 建造 | 点击"喂食"按钮 | 底栏买卖', 20, 28);
}

// ===== Context Menu Logic =====
function handleContextMenuClick(mx, my) {
  if (!contextMenu || !contextMenu.rect) return false;
  const { rect, col, row } = contextMenu;
  const rx = rect.x;
  const ry = rect.y;

  if (mx >= rx + 10 && mx <= rx + 140 && my >= ry + 28 && my <= ry + 52) {
    buildAt('chicken', col, row);
    contextMenu = null;
    return true;
  }
  if (mx >= rx + 10 && mx <= rx + 140 && my >= ry + 58 && my <= ry + 82) {
    buildAt('cow', col, row);
    contextMenu = null;
    return true;
  }
  contextMenu = null;
  return true;
}

function handleFeedButtonClick(mx, my) {
  for (const b of state.buildings) {
    const btnX = OFFSET_X + b.col * TILE + TILE + 2;
    const btnY = OFFSET_Y + b.row * TILE + 10;
    const btnW = 32;
    const btnH = 24;

    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      if (!b.fedToday) feedAnimal(b.id);
      return true;
    }

    const hasSick = b.animals.some(a => a.sick);
    if (hasSick) {
      const hbtnY = btnY + 28;
      if (mx >= btnX && mx <= btnX + btnW && my >= hbtnY && my <= hbtnY + btnH) {
        healAnimal(b.id);
        return true;
      }
    }
  }
  return false;
}

function handleShopClick(mx, my) {
  const barY = canvas.height - 50;
  if (my < barY + 8 || my > barY + 42) return false;

  if (mx >= 20 && mx <= 180) { buyFeed(3); return true; }
  if (mx >= 190 && mx <= 360) { buyFeed(10); return true; }
  if (mx >= 370 && mx <= 490) { sellAll(); return true; }
  return false;
}

// ===== Events =====
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const tile = getTile(mx, my);
  if (tile && !getBuildingAt(tile.col, tile.row)) {
    contextMenu = { x: mx, y: my, col: tile.col, row: tile.row };
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    longPressPos = { mx, my };
    longPressTimer = setTimeout(() => {
      const tile = getTile(mx, my);
      if (tile && !getBuildingAt(tile.col, tile.row)) {
        contextMenu = { x: mx, y: my, col: tile.col, row: tile.row };
      }
      longPressTimer = null;
    }, 600);
  }
});

canvas.addEventListener('mouseup', () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (contextMenu) {
    handleContextMenuClick(mx, my);
    return;
  }
  if (handleFeedButtonClick(mx, my)) return;
  if (handleShopClick(mx, my)) return;
});

// ===== Update =====
function update() {
  // Day timer
  const elapsed = Date.now() - dayTimer;
  if (elapsed >= DAY_MS && state) {
    nextDay();
    dayTimer = Date.now();
  }

  // Animations
  animations = animations.filter(a => {
    a.t++;
    if (a.type === 'build') {
      a.scale += 0.04;
      return a.scale < 1.2;
    }
    return false;
  });

  // Floating texts
  floatingTexts = floatingTexts.filter(f => {
    f.y -= 1;
    f.life--;
    f.alpha = Math.max(0, f.life / 80);
    return f.life > 0;
  });
}

// ===== Render =====
function render() {
  if (!state) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawGround();
  state.buildings.forEach(b => drawBuilding(b));
  drawAnimations();
  drawFloatingTexts();
  drawHUD();
  drawShopBar();
  drawContextMenu();
  drawInstructions();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ===== Utility =====
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===== Init =====
loadState().then(() => {
  dayTimer = Date.now();
  gameLoop();
});
