const SEASONS = {
  SPRING: 'spring',
  SUMMER: 'summer',
  AUTUMN: 'autumn',
  WINTER: 'winter',
};

const SEASON_ORDER = [SEASONS.SPRING, SEASONS.SUMMER, SEASONS.AUTUMN, SEASONS.WINTER];
const DAYS_PER_SEASON = 28;
const TICK_INTERVAL_MS = 30000;

const GROWTH_STAGES = {
  SEED: 'seed',
  SPROUT: 'sprout',
  GROWING: 'growing',
  MATURE: 'mature',
  HARVESTABLE: 'harvestable',
};

const GROWTH_STAGE_ORDER = [
  GROWTH_STAGES.SEED,
  GROWTH_STAGES.SPROUT,
  GROWTH_STAGES.GROWING,
  GROWTH_STAGES.MATURE,
  GROWTH_STAGES.HARVESTABLE,
];

const CROPS = {
  POTATO: {
    id: 'potato',
    name: '土豆',
    season: SEASONS.SPRING,
    growthDays: 6,
    sellPrice: 80,
    seedPrice: 20,
  },
  TOMATO: {
    id: 'tomato',
    name: '番茄',
    season: SEASONS.SUMMER,
    growthDays: 8,
    sellPrice: 120,
    seedPrice: 30,
  },
  PUMPKIN: {
    id: 'pumpkin',
    name: '南瓜',
    season: SEASONS.AUTUMN,
    growthDays: 10,
    sellPrice: 200,
    seedPrice: 50,
  },
};

const TOOLS = {
  WATERING_CAN: {
    id: 'watering_can',
    name: '浇水壶',
    price: 50,
    description: '给作物浇水',
  },
  FERTILIZER: {
    id: 'fertilizer',
    name: '肥料',
    price: 15,
    description: '施肥加速生长',
    consumable: true,
  },
  SICKLE: {
    id: 'sickle',
    name: '镰刀',
    price: 80,
    description: '收割成熟作物',
  },
};

const GRID_SIZE = 10;

module.exports = {
  SEASONS,
  SEASON_ORDER,
  DAYS_PER_SEASON,
  TICK_INTERVAL_MS,
  GROWTH_STAGES,
  GROWTH_STAGE_ORDER,
  CROPS,
  TOOLS,
  GRID_SIZE,
};
