<template>
  <div class="farm-canvas-wrapper">
    <canvas
      ref="canvasRef"
      :width="canvasSize"
      :height="canvasSize"
      @click="onClick"
      @mousemove="onHover"
    />
    <div v-if="hoverInfo" class="tile-tooltip" :style="tooltipStyle">
      {{ hoverInfo }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { GRID_SIZE, TILE_SIZE, GROWTH_STAGES } from '../constants.js';

const props = defineProps({
  grid: Array,
  season: String,
  selectedTool: String,
  crops: Object,
});

const emit = defineEmits(['tile-click']);

const canvasRef = ref(null);
const canvasSize = GRID_SIZE * TILE_SIZE;
const hoverInfo = ref('');
const hoverPos = ref({ x: 0, y: 0 });

const tooltipStyle = computed(() => ({
  left: hoverPos.value.x + 'px',
  top: (hoverPos.value.y - 30) + 'px',
}));

const STAGE_NAMES = {
  seed: '种子',
  sprout: '发芽',
  growing: '生长中',
  mature: '成熟中',
  harvestable: '可收割',
};

// 浅绿色草地，高对比
const GRASS_COLORS = {
  spring: { base: '#7dd85a', dark: '#5ab840', light: '#a0f080' },
  summer: { base: '#60c840', dark: '#48a830', light: '#88e860' },
  autumn: { base: '#c8a848', dark: '#a08030', light: '#e0c868' },
  winter: { base: '#90b8a8', dark: '#70a090', light: '#b0d8c0' },
};

// 深褐色耕地
const SOIL_DRY = '#4a2e14';
const SOIL_WET = '#2a1808';

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function drawGrassTile(ctx, x, y, season) {
  const colors = GRASS_COLORS[season] || GRASS_COLORS.spring;
  ctx.fillStyle = colors.base;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  const s = x * 100 + y;
  // 浅色斑块
  for (let i = 0; i < 5; i++) {
    const bx = x + seededRandom(s + i * 31) * (TILE_SIZE - 10);
    const by = y + seededRandom(s + i * 47) * (TILE_SIZE - 10);
    ctx.fillStyle = colors.light;
    ctx.beginPath();
    ctx.ellipse(bx + 5, by + 5, 6, 4, seededRandom(s + i) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 草叶
  for (let i = 0; i < 14; i++) {
    const gx = x + 4 + seededRandom(s + i * 7) * (TILE_SIZE - 8);
    const gy = y + 8 + seededRandom(s + i * 13) * (TILE_SIZE - 12);
    const h = 6 + seededRandom(s + i * 3) * 10;
    ctx.strokeStyle = seededRandom(s + i) > 0.4 ? colors.dark : colors.light;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + (seededRandom(s + i * 2) - 0.5) * 6, gy - h * 0.6, gx + (seededRandom(s + i * 5) - 0.5) * 4, gy - h);
    ctx.stroke();
  }

  // 小花/点缀
  for (let i = 0; i < 3; i++) {
    const fx = x + 6 + seededRandom(s + i * 67) * (TILE_SIZE - 12);
    const fy = y + 6 + seededRandom(s + i * 83) * (TILE_SIZE - 12);
    if (season === 'spring' || season === 'summer') {
      ctx.fillStyle = season === 'spring' ? '#fff060' : '#ff90c0';
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSoilTile(ctx, x, y, watered) {
  // 深褐色土壤底色
  ctx.fillStyle = watered ? SOIL_WET : SOIL_DRY;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // 犁沟纹理
  const furrowColor = watered ? '#1e1004' : '#3a2010';
  ctx.strokeStyle = furrowColor;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const ly = y + 6 + i * 11;
    ctx.beginPath();
    ctx.moveTo(x + 3, ly);
    ctx.lineTo(x + TILE_SIZE - 3, ly);
    ctx.stroke();
  }

  // 土块纹理
  const s = x * 7 + y * 13;
  const clumpColor = watered ? '#3a2008' : '#5c3a1c';
  ctx.fillStyle = clumpColor;
  for (let i = 0; i < 4; i++) {
    const cx = x + 6 + seededRandom(s + i * 11) * (TILE_SIZE - 12);
    const cy = y + 6 + seededRandom(s + i * 19) * (TILE_SIZE - 12);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3, 2, seededRandom(s + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (watered) {
    // 湿润水光效果 — 明显的深色+反光
    ctx.fillStyle = 'rgba(30, 80, 160, 0.2)';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    // 水珠高光
    for (let i = 0; i < 6; i++) {
      const wx = x + 5 + seededRandom(s + i * 23) * (TILE_SIZE - 10);
      const wy = y + 5 + seededRandom(s + i * 37) * (TILE_SIZE - 10);
      ctx.fillStyle = 'rgba(120, 190, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(wx, wy, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 反光条
    ctx.fillStyle = 'rgba(150, 210, 255, 0.12)';
    ctx.fillRect(x + 4, y + TILE_SIZE * 0.3, TILE_SIZE - 8, 3);
    ctx.fillRect(x + 8, y + TILE_SIZE * 0.65, TILE_SIZE - 16, 2);
  }
}

function drawFertilized(ctx, x, y) {
  // 黄绿色肥料颗粒散布整块地
  const s = x * 53 + y * 29;
  for (let i = 0; i < 10; i++) {
    const fx = x + 4 + seededRandom(s + i * 7) * (TILE_SIZE - 8);
    const fy = y + 4 + seededRandom(s + i * 11) * (TILE_SIZE - 8);
    const r = 2 + seededRandom(s + i * 3) * 1.5;
    // 颗粒本体
    ctx.fillStyle = '#e8d040';
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    // 颗粒边框
    ctx.strokeStyle = '#b8a020';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  // 淡黄色光晕覆盖
  ctx.fillStyle = 'rgba(255, 240, 80, 0.08)';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawCrop(ctx, x, y, crop) {
  const pad = 2;
  const w = TILE_SIZE - pad * 2;
  const h = TILE_SIZE - pad * 2;
  const ox = x + pad;
  const oy = y + pad;

  switch (crop.stage) {
    case GROWTH_STAGES.SEED:
      drawSeedStage(ctx, ox, oy, w, h, crop.type);
      break;
    case GROWTH_STAGES.SPROUT:
      drawSproutStage(ctx, ox, oy, w, h, crop.type);
      break;
    case GROWTH_STAGES.GROWING:
      drawGrowingStage(ctx, ox, oy, w, h, crop.type);
      break;
    case GROWTH_STAGES.MATURE:
      drawMatureStage(ctx, ox, oy, w, h, crop.type);
      break;
    case GROWTH_STAGES.HARVESTABLE:
      drawHarvestStage(ctx, ox, oy, w, h, crop.type);
      break;
  }
}

// ---- 种子：铺满的种子颗粒，大颗可见 ----
function drawSeedStage(ctx, x, y, w, h, type) {
  const colors = { potato: '#c49530', tomato: '#b05020', pumpkin: '#a07020' };
  const color = colors[type] || colors.potato;
  const outline = { potato: '#8a6a18', tomato: '#803818', pumpkin: '#705010' };

  const positions = [
    [0.15, 0.15], [0.5, 0.12], [0.85, 0.18],
    [0.2, 0.45], [0.5, 0.5], [0.8, 0.42],
    [0.15, 0.78], [0.5, 0.82], [0.85, 0.75],
    [0.35, 0.3], [0.65, 0.68],
  ];
  for (const [px, py] of positions) {
    const sx = x + w * px;
    const sy = y + h * py;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4.5, 3.5, seededRandom(px * 100 + py * 200) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline[type] || outline.potato;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

// ---- 发芽：满地小苗，明亮绿色 ----
function drawSproutStage(ctx, x, y, w, h, type) {
  const stemColor = { potato: '#40a020', tomato: '#38b830', pumpkin: '#35a018' };
  const leafColor = { potato: '#70e040', tomato: '#50e848', pumpkin: '#60d830' };
  const sc = stemColor[type] || stemColor.potato;
  const lc = leafColor[type] || leafColor.potato;

  const sprouts = [
    [0.15, 0.2], [0.5, 0.15], [0.85, 0.2],
    [0.25, 0.5], [0.55, 0.48], [0.8, 0.52],
    [0.15, 0.8], [0.45, 0.82], [0.75, 0.78],
  ];
  for (const [px, py] of sprouts) {
    const sx = x + w * px;
    const sy = y + h * py;
    // 茎
    ctx.strokeStyle = sc;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 10);
    ctx.lineTo(sx, sy - 2);
    ctx.stroke();
    // 叶子对
    ctx.fillStyle = lc;
    ctx.beginPath();
    ctx.ellipse(sx - 5, sy - 3, 6, 3.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 5, sy - 3, 6, 3.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 叶脉
    ctx.strokeStyle = sc;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sx - 1, sy - 3);
    ctx.lineTo(sx - 8, sy - 4);
    ctx.moveTo(sx + 1, sy - 3);
    ctx.lineTo(sx + 8, sy - 4);
    ctx.stroke();
  }
}

// ---- 生长中：茂密植株铺满地块 ----
function drawGrowingStage(ctx, x, y, w, h, type) {
  const stemColor = '#2a7a10';
  const leafColors = { potato: '#3aaa28', tomato: '#30b838', pumpkin: '#38a020' };
  const leafDark = { potato: '#28801a', tomato: '#209828', pumpkin: '#288018' };
  const lc = leafColors[type] || leafColors.potato;
  const ld = leafDark[type] || leafDark.potato;

  // 底部绿色铺底
  ctx.fillStyle = ld;
  ctx.fillRect(x, y, w, h);

  const plants = [
    [0.18, 0.18], [0.52, 0.15], [0.84, 0.2],
    [0.2, 0.52], [0.5, 0.5], [0.82, 0.48],
    [0.18, 0.82], [0.5, 0.84], [0.82, 0.8],
  ];
  for (const [px, py] of plants) {
    const sx = x + w * px;
    const sy = y + h * py;
    // 茎
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 8);
    ctx.lineTo(sx, sy - 8);
    ctx.stroke();
    // 大叶
    ctx.fillStyle = lc;
    ctx.beginPath();
    ctx.ellipse(sx - 6, sy - 2, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 6, sy - 4, 8, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx, sy - 9, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- 成熟中：绿叶密布+果实初现 ----
function drawMatureStage(ctx, x, y, w, h, type) {
  const fruitColor = { potato: '#e8b830', tomato: '#f06838', pumpkin: '#f0a020' };
  const fc = fruitColor[type] || fruitColor.potato;

  // 绿色底覆盖
  ctx.fillStyle = '#28882a';
  ctx.fillRect(x, y, w, h);

  // 叶片层
  const leaves = [
    [0.1, 0.15], [0.4, 0.1], [0.7, 0.12], [0.9, 0.2],
    [0.05, 0.45], [0.35, 0.4], [0.65, 0.42], [0.95, 0.5],
    [0.1, 0.7], [0.4, 0.72], [0.7, 0.68], [0.9, 0.75],
    [0.2, 0.92], [0.55, 0.9], [0.8, 0.93],
  ];
  ctx.fillStyle = '#1e7020';
  for (const [px, py] of leaves) {
    ctx.beginPath();
    ctx.ellipse(x + w * px, y + h * py, 9, 6, seededRandom(px * 100) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 鲜艳果实
  const fruits = [
    [0.25, 0.25], [0.7, 0.2], [0.45, 0.5],
    [0.15, 0.6], [0.75, 0.6],
    [0.3, 0.82], [0.65, 0.85],
  ];
  ctx.fillStyle = fc;
  for (const [px, py] of fruits) {
    const fx = x + w * px;
    const fy = y + h * py;
    ctx.beginPath();
    if (type === 'pumpkin') {
      ctx.ellipse(fx, fy, 7, 5.5, 0, 0, Math.PI * 2);
    } else if (type === 'tomato') {
      ctx.arc(fx, fy, 6, 0, Math.PI * 2);
    } else {
      ctx.ellipse(fx, fy, 6, 4.5, 0.3, 0, Math.PI * 2);
    }
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fc;
  }
}

// ---- 可收割：整块地铺满大果实 ----
function drawHarvestStage(ctx, x, y, w, h, type) {
  const fruitColor = { potato: '#F0C030', tomato: '#FF2828', pumpkin: '#FF7800' };
  const fruitDark = { potato: '#C89820', tomato: '#CC1818', pumpkin: '#D06000' };
  const fruitLight = { potato: '#FFE060', tomato: '#FF6060', pumpkin: '#FFA040' };
  const fc = fruitColor[type] || fruitColor.potato;
  const fd = fruitDark[type] || fruitDark.potato;
  const fl = fruitLight[type] || fruitLight.potato;

  // 深绿底
  ctx.fillStyle = '#165a12';
  ctx.fillRect(x, y, w, h);

  // 稠密叶子底
  ctx.fillStyle = '#1a6a14';
  for (let i = 0; i < 8; i++) {
    const lx = x + seededRandom(i * 31 + 100) * w;
    const ly = y + seededRandom(i * 43 + 200) * h;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 10, 7, i * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 大果实铺满 — 3x3网格布局确保填满
  const grid = [
    [0.2, 0.2], [0.5, 0.15], [0.8, 0.22],
    [0.15, 0.5], [0.5, 0.5], [0.85, 0.5],
    [0.2, 0.8], [0.5, 0.82], [0.8, 0.78],
  ];

  for (const [px, py] of grid) {
    const fx = x + w * px;
    const fy = y + h * py;

    if (type === 'pumpkin') {
      // 南瓜 — 大椭圆带纹路
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // 瓜纹
      ctx.strokeStyle = fd;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 9);
      ctx.quadraticCurveTo(fx - 2, fy, fx, fy + 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx - 7, fy - 5);
      ctx.quadraticCurveTo(fx - 5, fy, fx - 7, fy + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx + 7, fy - 5);
      ctx.quadraticCurveTo(fx + 5, fy, fx + 7, fy + 5);
      ctx.stroke();
      // 蒂
      ctx.fillStyle = '#5a8030';
      ctx.fillRect(fx - 2, fy - 11, 4, 4);
      // 高光
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.ellipse(fx - 4, fy - 3, 3, 5, -0.2, 0, Math.PI * 2);
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (type === 'tomato') {
      // 番茄 — 圆形鲜红
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.arc(fx, fy, 10, 0, Math.PI * 2);
      ctx.fill();
      // 反光
      ctx.fillStyle = fl;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(fx - 3, fy - 4, 4, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 蒂
      ctx.fillStyle = '#40a020';
      ctx.beginPath();
      const starR = 5;
      for (let j = 0; j < 5; j++) {
        const angle = (j * 72 - 90) * Math.PI / 180;
        const sx = fx + Math.cos(angle) * starR;
        const sy = fy - 8 + Math.sin(angle) * (starR * 0.5);
        if (j === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // 土豆 — 椭圆土黄
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 10, 7, 0.2 + seededRandom(px * 50 + py * 80) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // 斑点
      ctx.fillStyle = fd;
      for (let j = 0; j < 3; j++) {
        const dx = fx - 4 + seededRandom(px * 30 + j * 17) * 8;
        const dy = fy - 3 + seededRandom(py * 30 + j * 23) * 6;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 高光
      ctx.fillStyle = fl;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse(fx - 3, fy - 2, 4, 2.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 金色发光边框 — 提示可收割
  ctx.save();
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawGrid(ctx) {
  if (!props.grid) return;
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const tile = props.grid[row]?.[col];

      // 地面层：草地 vs 耕地
      if (!tile?.tilled && !tile?.crop) {
        drawGrassTile(ctx, x, y, props.season);
      } else {
        drawSoilTile(ctx, x, y, tile?.watered);
      }

      // 肥料颗粒层
      if (tile?.fertilized) {
        drawFertilized(ctx, x, y);
      }

      // 作物层
      if (tile?.crop) {
        drawCrop(ctx, x, y, tile.crop);
      }
    }
  }

  // 极淡网格线
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, canvasSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(canvasSize, i * TILE_SIZE);
    ctx.stroke();
  }
}

function onClick(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const row = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
    emit('tile-click', row, col);
  }
}

function onHover(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const row = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  hoverPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };

  if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && props.grid) {
    const tile = props.grid[row]?.[col];
    if (tile?.crop) {
      const cropDef = Object.values(props.crops || {}).find(c => c.id === tile.crop.type);
      const stageName = STAGE_NAMES[tile.crop.stage] || '';
      hoverInfo.value = `${cropDef?.name || tile.crop.type} - ${stageName}`;
    } else if (tile?.tilled) {
      hoverInfo.value = tile.watered ? '湿润土地' : '已耕地';
    } else {
      hoverInfo.value = '草地';
    }
  } else {
    hoverInfo.value = '';
  }
}

watch(() => [props.grid, props.season], () => {
  const ctx = canvasRef.value?.getContext('2d');
  if (ctx) drawGrid(ctx);
}, { deep: true });

onMounted(() => {
  const ctx = canvasRef.value?.getContext('2d');
  if (ctx) drawGrid(ctx);
});
</script>

<style scoped>
.farm-canvas-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4), inset 0 0 0 3px rgba(255,255,255,0.1);
}
canvas {
  display: block;
  cursor: crosshair;
  image-rendering: pixelated;
}
.tile-tooltip {
  position: absolute;
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
