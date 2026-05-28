const {
  SEASONS,
  SEASON_ORDER,
  DAYS_PER_SEASON,
  GROWTH_STAGES,
  GROWTH_STAGE_ORDER,
  CROPS,
  TOOLS,
  GRID_SIZE,
} = require('./constants');

function createInitialState() {
  const grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = {
        tilled: false,
        crop: null,
        watered: false,
        fertilized: false,
      };
    }
  }

  return {
    grid,
    day: 1,
    season: SEASONS.SPRING,
    year: 1,
    money: 200,
    inventory: [
      { itemId: 'watering_can', type: 'tool', quantity: 1 },
      { itemId: 'sickle', type: 'tool', quantity: 1 },
      { itemId: 'potato_seed', type: 'seed', quantity: 5 },
    ],
    cart: [],
    selectedTool: null,
    buyerPresent: false,
    buyerTimer: 0,
    paused: false,
  };
}

function getSeasonCrops(season) {
  return Object.values(CROPS).filter((c) => c.season === season);
}

function tick(state) {
  if (state.paused) return state;

  state.day++;

  if (state.day > DAYS_PER_SEASON) {
    state.day = 1;
    const currentIdx = SEASON_ORDER.indexOf(state.season);
    const nextIdx = (currentIdx + 1) % SEASON_ORDER.length;
    state.season = SEASON_ORDER[nextIdx];
    if (nextIdx === 0) state.year++;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const tile = state.grid[row][col];
        if (tile.crop && tile.crop.season !== state.season) {
          tile.crop = null;
        }
      }
    }
  }

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const tile = state.grid[row][col];
      if (tile.crop && tile.crop.stage !== GROWTH_STAGES.HARVESTABLE) {
        if (tile.watered) {
          let growthIncrement = 1;
          if (tile.fertilized) growthIncrement = 2;
          tile.crop.growthProgress += growthIncrement;

          const cropDef = Object.values(CROPS).find((c) => c.id === tile.crop.type);
          if (cropDef) {
            const ratio = tile.crop.growthProgress / cropDef.growthDays;
            if (ratio >= 1) {
              tile.crop.stage = GROWTH_STAGES.HARVESTABLE;
            } else if (ratio >= 0.75) {
              tile.crop.stage = GROWTH_STAGES.MATURE;
            } else if (ratio >= 0.5) {
              tile.crop.stage = GROWTH_STAGES.GROWING;
            } else if (ratio >= 0.25) {
              tile.crop.stage = GROWTH_STAGES.SPROUT;
            }
          }
        }
        tile.watered = false;
        tile.fertilized = false;
      }
    }
  }

  if (!state.buyerPresent) {
    state.buyerTimer++;
    if (state.buyerTimer >= 10) {
      state.buyerPresent = true;
      state.buyerTimer = 0;
    }
  }

  return state;
}

function plantCrop(state, row, col, cropId) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return { success: false, message: '无效位置' };
  const tile = state.grid[row][col];
  if (tile.crop) return { success: false, message: '该地块已有作物' };

  const cropDef = Object.values(CROPS).find((c) => c.id === cropId);
  if (!cropDef) return { success: false, message: '未知作物' };
  if (cropDef.season !== state.season) return { success: false, message: `${cropDef.name}不适合当前季节种植` };

  const seedId = `${cropId}_seed`;
  const seedSlot = state.inventory.find((s) => s.itemId === seedId && s.type === 'seed');
  if (!seedSlot || seedSlot.quantity <= 0) return { success: false, message: '种子不足' };

  seedSlot.quantity--;
  if (seedSlot.quantity <= 0) {
    state.inventory = state.inventory.filter((s) => s !== seedSlot);
  }

  tile.tilled = true;
  tile.crop = {
    type: cropId,
    stage: GROWTH_STAGES.SEED,
    growthProgress: 0,
    season: cropDef.season,
  };

  return { success: true, message: `种下了${cropDef.name}` };
}

function waterTile(state, row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return { success: false, message: '无效位置' };
  const tile = state.grid[row][col];
  if (!tile.crop) return { success: false, message: '该地块没有作物' };
  if (tile.crop.stage === GROWTH_STAGES.HARVESTABLE) return { success: false, message: '作物已成熟' };

  const hasCan = state.inventory.find((s) => s.itemId === 'watering_can');
  if (!hasCan) return { success: false, message: '没有浇水壶' };

  tile.watered = true;
  return { success: true, message: '浇水成功' };
}

function fertilizeTile(state, row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return { success: false, message: '无效位置' };
  const tile = state.grid[row][col];
  if (!tile.crop) return { success: false, message: '该地块没有作物' };
  if (tile.crop.stage === GROWTH_STAGES.HARVESTABLE) return { success: false, message: '作物已成熟' };

  const fertSlot = state.inventory.find((s) => s.itemId === 'fertilizer');
  if (!fertSlot || fertSlot.quantity <= 0) return { success: false, message: '肥料不足' };

  fertSlot.quantity--;
  if (fertSlot.quantity <= 0) {
    state.inventory = state.inventory.filter((s) => s !== fertSlot);
  }

  tile.fertilized = true;
  return { success: true, message: '施肥成功' };
}

function harvestTile(state, row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return { success: false, message: '无效位置' };
  const tile = state.grid[row][col];
  if (!tile.crop) return { success: false, message: '该地块没有作物' };
  if (tile.crop.stage !== GROWTH_STAGES.HARVESTABLE) return { success: false, message: '作物尚未成熟' };

  const hasSickle = state.inventory.find((s) => s.itemId === 'sickle');
  if (!hasSickle) return { success: false, message: '没有镰刀' };

  const cropDef = Object.values(CROPS).find((c) => c.id === tile.crop.type);
  state.cart.push({
    itemId: tile.crop.type,
    name: cropDef.name,
    sellPrice: cropDef.sellPrice,
    quantity: 1,
  });

  tile.crop = null;
  tile.watered = false;
  tile.fertilized = false;
  return { success: true, message: `收割了${cropDef.name}，已放入车中` };
}

function sellCart(state) {
  if (!state.buyerPresent) return { success: false, message: '收购商还没来' };
  if (state.cart.length === 0) return { success: false, message: '车里没有作物' };

  let totalEarned = 0;
  for (const item of state.cart) {
    totalEarned += item.sellPrice * item.quantity;
  }
  state.money += totalEarned;
  state.cart = [];
  state.buyerPresent = false;
  return { success: true, message: `卖出了所有作物，获得 ${totalEarned} 金币` };
}

function buyItem(state, itemId, quantity = 1) {
  const seedMatch = itemId.match(/^(.+)_seed$/);
  if (seedMatch) {
    const cropId = seedMatch[1];
    const cropDef = Object.values(CROPS).find((c) => c.id === cropId);
    if (!cropDef) return { success: false, message: '未知种子' };

    const totalCost = cropDef.seedPrice * quantity;
    if (state.money < totalCost) return { success: false, message: '金币不足' };

    state.money -= totalCost;
    const existing = state.inventory.find((s) => s.itemId === itemId && s.type === 'seed');
    if (existing) {
      existing.quantity += quantity;
    } else {
      state.inventory.push({ itemId, type: 'seed', quantity });
    }
    return { success: true, message: `购买了 ${quantity} 个${cropDef.name}种子` };
  }

  const toolDef = Object.values(TOOLS).find((t) => t.id === itemId);
  if (toolDef) {
    if (toolDef.consumable) {
      const totalCost = toolDef.price * quantity;
      if (state.money < totalCost) return { success: false, message: '金币不足' };
      state.money -= totalCost;
      const existing = state.inventory.find((s) => s.itemId === itemId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.inventory.push({ itemId, type: 'tool', quantity });
      }
      return { success: true, message: `购买了 ${quantity} 个${toolDef.name}` };
    }
    const existing = state.inventory.find((s) => s.itemId === itemId);
    if (existing) return { success: false, message: '已拥有该工具' };
    if (state.money < toolDef.price) return { success: false, message: '金币不足' };
    state.money -= toolDef.price;
    state.inventory.push({ itemId, type: 'tool', quantity: 1 });
    return { success: true, message: `购买了${toolDef.name}` };
  }

  return { success: false, message: '未知物品' };
}

module.exports = {
  createInitialState,
  getSeasonCrops,
  tick,
  plantCrop,
  waterTile,
  fertilizeTile,
  harvestTile,
  sellCart,
  buyItem,
};
