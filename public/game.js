// ==================== GAME CONFIG ====================
const CONFIG = {
  TILE_SIZE: 80,
  GRID_COLS: 14,
  GRID_ROWS: 9,
  GRID_OFFSET_X: 20,
  GRID_OFFSET_Y: 60,
  INITIAL_COINS: 500,
  INITIAL_FEED: 20,
  WAREHOUSE_MAX: 50,
  CHICKEN_COOP_COST: 100,
  COW_BARN_COST: 200,
  FEED_COST: 10,
  MEDICINE_COST: 50,
  EGG_SELL_PRICE: 15,
  MILK_SELL_PRICE: 30,
  SICK_DAYS_THRESHOLD: 3,
  DAY_DURATION_MS: 10000, // 10 seconds = 1 game day
};

// ==================== GAME STATE ====================
let state = {
  coins: CONFIG.INITIAL_COINS,
  feed: CONFIG.INITIAL_FEED,
  warehouse: { eggs: 0, milk: 0 },
  buildings: [], // { type, col, row, animals: [{fed, hungryDays, sick, lastProduced}] }
  day: 1,
  lastDayTime: Date.now(),
  animations: [],
  particles: [],
};

// ==================== CANVAS SETUP ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let hoveredTile = null;
let buildMode = null; // 'chicken_coop' or 'cow_barn'
let showShop = false;
let showWarehouse = false;
let tooltip = null;

// ==================== SAVE/LOAD ====================
function saveGame() {
  const saveData = {
    coins: state.coins,
    feed: state.feed,
    warehouse: state.warehouse,
    buildings: state.buildings,
    day: state.day,
    lastDayTime: state.lastDayTime,
  };
  localStorage.setItem('farmGame', JSON.stringify(saveData));
  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: saveData }),
  }).catch(() => {});
}

function loadGame() {
  const saved = localStorage.getItem('farmGame');
  if (saved) {
    const data = JSON.parse(saved);
    state.coins = data.coins;
    state.feed = data.feed;
    state.warehouse = data.warehouse || { eggs: 0, milk: 0 };
    state.buildings = data.buildings || [];
    state.day = data.day || 1;
    state.lastDayTime = data.lastDayTime || Date.now();
  }
}

// ==================== GRID HELPERS ====================
function getTileAt(col, row) {
  return state.buildings.find(b => b.col === col && b.row === row);
}

function isValidBuildTile(col, row) {
  if (col < 0 || col >= CONFIG.GRID_COLS || row < 0 || row >= CONFIG.GRID_ROWS) return false;
  return !getTileAt(col, row);
}

function getTileFromMouse(mx, my) {
  const col = Math.floor((mx - CONFIG.GRID_OFFSET_X) / CONFIG.TILE_SIZE);
  const row = Math.floor((my - CONFIG.GRID_OFFSET_Y) / CONFIG.TILE_SIZE);
  if (col >= 0 && col < CONFIG.GRID_COLS && row >= 0 && row < CONFIG.GRID_ROWS) {
    return { col, row };
  }
  return null;
}

// ==================== BUILDING ACTIONS ====================
function buildStructure(type, col, row) {
  const cost = type === 'chicken_coop' ? CONFIG.CHICKEN_COOP_COST : CONFIG.COW_BARN_COST;
  if (state.coins < cost) {
    addFloatingText('金币不足!', col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X, row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y, '#ff4444');
    return;
  }
  state.coins -= cost;
  const animalCount = type === 'chicken_coop' ? 3 : 2;
  const animals = [];
  for (let i = 0; i < animalCount; i++) {
    animals.push({ fed: true, hungryDays: 0, sick: false, lastProduced: state.day });
  }
  state.buildings.push({ type, col, row, animals, buildAnim: 1.0 });
  addBuildParticles(col, row);
  addFloatingText(`-${cost} 金币`, col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + 20, row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y, '#ffcc00');
  buildMode = null;
  saveGame();
}

function feedBuilding(building) {
  const feedNeeded = building.animals.length;
  if (state.feed < feedNeeded) {
    addFloatingText('饲料不足!', building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X, building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y, '#ff4444');
    return;
  }
  state.feed -= feedNeeded;
  building.animals.forEach(a => {
    a.fed = true;
    a.hungryDays = 0;
  });
  addFloatingText('已喂食!', building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + 20, building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y, '#44ff44');
  saveGame();
}

function healBuilding(building) {
  const sickCount = building.animals.filter(a => a.sick).length;
  const cost = sickCount * CONFIG.MEDICINE_COST;
  if (state.coins < cost) {
    addFloatingText('金币不足!', building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X, building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y, '#ff4444');
    return;
  }
  if (sickCount === 0) return;
  state.coins -= cost;
  building.animals.forEach(a => {
    if (a.sick) {
      a.sick = false;
      a.hungryDays = 0;
    }
  });
  addFloatingText(`-${cost} 治疗费`, building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + 10, building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y, '#ff88ff');
  saveGame();
}

// ==================== DAY CYCLE ====================
function processDayEnd() {
  state.day++;
  const totalWarehouse = state.warehouse.eggs + state.warehouse.milk;
  const warehouseFull = totalWarehouse >= CONFIG.WAREHOUSE_MAX;

  state.buildings.forEach(building => {
    building.animals.forEach(animal => {
      if (!animal.fed) {
        animal.hungryDays++;
        if (animal.hungryDays >= CONFIG.SICK_DAYS_THRESHOLD) {
          animal.sick = true;
        }
      }
      animal.fed = false;

      if (!animal.sick && !warehouseFull) {
        if (building.type === 'chicken_coop') {
          state.warehouse.eggs++;
          addFloatingText('+1 蛋', building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + 40, building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y + 20, '#fff8dc');
        } else {
          state.warehouse.milk++;
          addFloatingText('+1 奶', building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + 40, building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y + 20, '#f0f8ff');
        }
      }
    });
  });
  state.lastDayTime = Date.now();
  saveGame();
}

// ==================== SHOP ====================
function buyFeed(amount) {
  const cost = amount * CONFIG.FEED_COST;
  if (state.coins < cost) return;
  state.coins -= cost;
  state.feed += amount;
  saveGame();
}

function sellProducts() {
  const earnings = state.warehouse.eggs * CONFIG.EGG_SELL_PRICE + state.warehouse.milk * CONFIG.MILK_SELL_PRICE;
  if (earnings === 0) return;
  state.coins += earnings;
  state.warehouse.eggs = 0;
  state.warehouse.milk = 0;
  addFloatingText(`+${earnings} 金币!`, 600, 400, '#ffdd00');
  saveGame();
}

// ==================== ANIMATIONS & PARTICLES ====================
function addFloatingText(text, x, y, color) {
  state.animations.push({ type: 'text', text, x, y, color, alpha: 1.0, vy: -1.5, life: 60 });
}

function addBuildParticles(col, row) {
  const cx = col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + CONFIG.TILE_SIZE / 2;
  const cy = row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y + CONFIG.TILE_SIZE / 2;
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 2 + Math.random() * 3;
    state.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      color: ['#ffd700', '#ff8c00', '#8b4513', '#daa520'][Math.floor(Math.random() * 4)],
      size: 3 + Math.random() * 4,
    });
  }
}

function updateAnimations() {
  state.animations = state.animations.filter(a => {
    a.y += a.vy;
    a.life--;
    a.alpha = Math.max(0, a.life / 60);
    return a.life > 0;
  });
  state.particles = state.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    return p.life > 0;
  });
  state.buildings.forEach(b => {
    if (b.buildAnim && b.buildAnim > 0) {
      b.buildAnim -= 0.02;
    }
  });
}

// ==================== RENDERING ====================
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(0.3, '#98d4ee');
  grad.addColorStop(1, '#4a8c3f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  for (let row = 0; row < CONFIG.GRID_ROWS; row++) {
    for (let col = 0; col < CONFIG.GRID_COLS; col++) {
      const x = col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X;
      const y = row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y;
      ctx.fillStyle = (col + row) % 2 === 0 ? '#5d9e3a' : '#4d8e2a';
      ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    }
  }
}

function drawBuildings() {
  state.buildings.forEach(building => {
    const x = building.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X;
    const y = building.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y;
    let scale = 1;
    if (building.buildAnim && building.buildAnim > 0) {
      scale = 1 - building.buildAnim;
    }

    ctx.save();
    ctx.translate(x + CONFIG.TILE_SIZE / 2, y + CONFIG.TILE_SIZE / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + CONFIG.TILE_SIZE / 2), -(y + CONFIG.TILE_SIZE / 2));

    if (building.type === 'chicken_coop') {
      drawChickenCoop(x, y, building);
    } else {
      drawCowBarn(x, y, building);
    }
    ctx.restore();

    const sickCount = building.animals.filter(a => a.sick).length;
    const hungryCount = building.animals.filter(a => !a.fed && a.hungryDays > 0).length;
    if (sickCount > 0) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('🤒x' + sickCount, x + 2, y + 16);
    } else if (hungryCount > 0) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '14px Arial';
      ctx.fillText('饿x' + hungryCount, x + 2, y + 16);
    }
  });
}

function drawChickenCoop(x, y, building) {
  // Base
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 10, y + 30, 60, 45);
  // Roof
  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 32);
  ctx.lineTo(x + 40, y + 10);
  ctx.lineTo(x + 75, y + 32);
  ctx.closePath();
  ctx.fill();
  // Door
  ctx.fillStyle = '#654321';
  ctx.fillRect(x + 30, y + 50, 20, 25);
  // Chickens
  const healthy = building.animals.filter(a => !a.sick).length;
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.fillText(`🐔x${healthy}`, x + 45, y + 72);
}

function drawCowBarn(x, y, building) {
  // Base
  ctx.fillStyle = '#CD853F';
  ctx.fillRect(x + 5, y + 25, 70, 50);
  // Roof
  ctx.fillStyle = '#8B0000';
  ctx.beginPath();
  ctx.moveTo(x, y + 27);
  ctx.lineTo(x + 40, y + 5);
  ctx.lineTo(x + 80, y + 27);
  ctx.closePath();
  ctx.fill();
  // Door
  ctx.fillStyle = '#4a2a0a';
  ctx.fillRect(x + 28, y + 45, 24, 30);
  // Cows
  const healthy = building.animals.filter(a => !a.sick).length;
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.fillText(`🐄x${healthy}`, x + 48, y + 72);
}

function drawHoverIndicator() {
  if (!hoveredTile) return;
  if (buildMode) {
    const x = hoveredTile.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X;
    const y = hoveredTile.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y;
    const valid = isValidBuildTile(hoveredTile.col, hoveredTile.row);
    ctx.strokeStyle = valid ? '#00ff00' : '#ff0000';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x + 2, y + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '12px Arial';
    const label = buildMode === 'chicken_coop' ? '鸡舍' : '牛棚';
    ctx.fillText(`建造${label}`, x + 10, y + CONFIG.TILE_SIZE + 15);
  }
}

function drawHUD() {
  const totalWarehouse = state.warehouse.eggs + state.warehouse.milk;
  const warehousePercent = Math.round((totalWarehouse / CONFIG.WAREHOUSE_MAX) * 100);

  // HUD Background
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.roundRect(canvas.width - 260, 8, 250, 90, 8);
  ctx.fill();

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`💰 金币: ${state.coins}`, canvas.width - 245, 32);

  ctx.fillStyle = '#90ee90';
  ctx.fillText(`🌾 饲料: ${state.feed}`, canvas.width - 245, 55);

  ctx.fillStyle = warehousePercent >= 90 ? '#ff6666' : '#87cefa';
  ctx.fillText(`📦 仓库: ${totalWarehouse}/${CONFIG.WAREHOUSE_MAX} (${warehousePercent}%)`, canvas.width - 245, 78);

  // Day counter
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.roundRect(canvas.width - 260, 105, 250, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  const elapsed = Date.now() - state.lastDayTime;
  const progress = Math.min(elapsed / CONFIG.DAY_DURATION_MS, 1);
  ctx.fillText(`📅 第 ${state.day} 天`, canvas.width - 245, 125);
  // Progress bar
  ctx.fillStyle = '#333';
  ctx.fillRect(canvas.width - 140, 113, 120, 14);
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(canvas.width - 140, 113, 120 * progress, 14);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(canvas.width - 140, 113, 120, 14);
}

function drawToolbar() {
  // Bottom toolbar
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, canvas.height - 55, canvas.width, 55);

  const buttons = [
    { label: '🐔 建鸡舍 ($100)', action: 'build_chicken', x: 20 },
    { label: '🐄 建牛棚 ($200)', action: 'build_cow', x: 180 },
    { label: '🌾 买饲料x5 ($50)', action: 'buy_feed', x: 350 },
    { label: '💰 出售产物', action: 'sell', x: 530 },
    { label: '📦 仓库详情', action: 'warehouse', x: 670 },
  ];

  buttons.forEach(btn => {
    const w = 140;
    const h = 36;
    const y = canvas.height - 46;
    const isHover = tooltip && tooltip.action === btn.action;
    ctx.fillStyle = isHover ? '#555' : '#3a3a5a';
    ctx.roundRect(btn.x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.roundRect(btn.x, y, w, h, 6);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '13px Arial';
    ctx.fillText(btn.label, btn.x + 8, y + 24);
  });
}

function drawTooltip() {
  if (!tooltip || !tooltip.building) return;
  const b = tooltip.building;
  const x = b.col * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_X + CONFIG.TILE_SIZE + 5;
  const y = b.row * CONFIG.TILE_SIZE + CONFIG.GRID_OFFSET_Y;
  const sickCount = b.animals.filter(a => a.sick).length;
  const hungryCount = b.animals.filter(a => a.hungryDays > 0).length;
  const typeName = b.type === 'chicken_coop' ? '鸡舍' : '牛棚';

  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.roundRect(x, y, 180, 110, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '13px Arial';
  ctx.fillText(`${typeName} - ${b.animals.length}只`, x + 10, y + 20);
  ctx.fillText(`健康: ${b.animals.length - sickCount}  生病: ${sickCount}`, x + 10, y + 40);
  ctx.fillText(`饥饿: ${hungryCount}`, x + 10, y + 58);
  ctx.fillStyle = '#aaffaa';
  ctx.fillText(`[左键] 喂食`, x + 10, y + 80);
  ctx.fillStyle = '#ffaaaa';
  ctx.fillText(`[右键] 治疗 ($${sickCount * CONFIG.MEDICINE_COST})`, x + 10, y + 98);
}

function drawWarehousePanel() {
  if (!showWarehouse) return;
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.roundRect(400, 200, 400, 300, 12);
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.roundRect(400, 200, 400, 300, 12);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('📦 仓库详情', 450, 240);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#fff8dc';
  ctx.fillText(`🥚 鸡蛋: ${state.warehouse.eggs} (单价 $${CONFIG.EGG_SELL_PRICE})`, 450, 280);
  ctx.fillStyle = '#f0f8ff';
  ctx.fillText(`🥛 牛奶: ${state.warehouse.milk} (单价 $${CONFIG.MILK_SELL_PRICE})`, 450, 310);

  const total = state.warehouse.eggs + state.warehouse.milk;
  ctx.fillStyle = '#87cefa';
  ctx.fillText(`总计: ${total} / ${CONFIG.WAREHOUSE_MAX}`, 450, 350);

  const totalValue = state.warehouse.eggs * CONFIG.EGG_SELL_PRICE + state.warehouse.milk * CONFIG.MILK_SELL_PRICE;
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`总价值: $${totalValue}`, 450, 385);

  ctx.fillStyle = '#aaa';
  ctx.font = '14px Arial';
  ctx.fillText('点击任意位置关闭', 450, 470);
}

function drawAnimations() {
  state.animations.forEach(a => {
    ctx.globalAlpha = a.alpha;
    ctx.fillStyle = a.color;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(a.text, a.x, a.y);
  });
  ctx.globalAlpha = 1;

  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawBuildModeLabel() {
  if (!buildMode) return;
  ctx.fillStyle = 'rgba(255,200,0,0.9)';
  ctx.font = 'bold 16px Arial';
  const label = buildMode === 'chicken_coop' ? '鸡舍' : '牛棚';
  ctx.fillText(`🔨 建造模式: ${label} (按ESC取消)`, 20, 30);
}

// ==================== MAIN LOOP ====================
function update() {
  const elapsed = Date.now() - state.lastDayTime;
  if (elapsed >= CONFIG.DAY_DURATION_MS) {
    processDayEnd();
  }
  updateAnimations();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawGrid();
  drawBuildings();
  drawHoverIndicator();
  drawAnimations();
  drawHUD();
  drawToolbar();
  drawTooltip();
  drawWarehousePanel();
  drawBuildModeLabel();
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ==================== INPUT HANDLING ====================
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  hoveredTile = getTileFromMouse(mx, my);

  // Check toolbar hover
  const toolbarY = canvas.height - 46;
  const buttons = [
    { action: 'build_chicken', x: 20, w: 140 },
    { action: 'build_cow', x: 180, w: 140 },
    { action: 'buy_feed', x: 350, w: 140 },
    { action: 'sell', x: 530, w: 140 },
    { action: 'warehouse', x: 670, w: 140 },
  ];
  tooltip = null;
  if (my >= toolbarY && my <= toolbarY + 36) {
    for (const btn of buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w) {
        tooltip = { action: btn.action };
        break;
      }
    }
  }

  // Check building hover for tooltip
  if (hoveredTile && !buildMode) {
    const b = getTileAt(hoveredTile.col, hoveredTile.row);
    if (b) {
      tooltip = { building: b };
    }
  }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (showWarehouse) {
    showWarehouse = false;
    return;
  }

  // Toolbar clicks
  const toolbarY = canvas.height - 46;
  if (my >= toolbarY && my <= toolbarY + 36) {
    const buttons = [
      { action: 'build_chicken', x: 20, w: 140 },
      { action: 'build_cow', x: 180, w: 140 },
      { action: 'buy_feed', x: 350, w: 140 },
      { action: 'sell', x: 530, w: 140 },
      { action: 'warehouse', x: 670, w: 140 },
    ];
    for (const btn of buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w) {
        switch (btn.action) {
          case 'build_chicken': buildMode = 'chicken_coop'; break;
          case 'build_cow': buildMode = 'cow_barn'; break;
          case 'buy_feed': buyFeed(5); break;
          case 'sell': sellProducts(); break;
          case 'warehouse': showWarehouse = true; break;
        }
        return;
      }
    }
  }

  // Grid clicks
  const tile = getTileFromMouse(mx, my);
  if (!tile) return;

  if (buildMode) {
    if (isValidBuildTile(tile.col, tile.row)) {
      buildStructure(buildMode, tile.col, tile.row);
    }
  } else {
    const building = getTileAt(tile.col, tile.row);
    if (building) {
      feedBuilding(building);
    }
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const tile = getTileFromMouse(mx, my);
  if (!tile) return;

  const building = getTileAt(tile.col, tile.row);
  if (building) {
    healBuilding(building);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    buildMode = null;
    showWarehouse = false;
  }
});

// ==================== POLYFILL roundRect ====================
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

// ==================== INIT ====================
loadGame();
gameLoop();
