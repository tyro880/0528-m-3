<template>
  <div class="game-container" :style="{ background: seasonBg }">
    <header class="header">
      <div class="status-bar">
        <span class="season-badge" :style="{ background: seasonColor }">
          {{ seasonName }} · 第{{ gameState?.day }}天 · 第{{ gameState?.year }}年
        </span>
        <span class="money">💰 {{ gameState?.money }} 金币</span>
        <button class="btn-pause" @click="send({ type: 'pause' })">
          {{ gameState?.paused ? '▶ 继续' : '⏸ 暂停' }}
        </button>
      </div>
      <div v-if="message" class="toast">{{ message }}</div>
    </header>

    <div class="main-area">
      <div class="left-panel">
        <ToolBar
          :inventory="gameState?.inventory || []"
          :selectedTool="gameState?.selectedTool"
          :crops="crops"
          @select-tool="selectTool"
        />
        <Shop
          :crops="crops"
          :tools="toolsDef"
          :season="gameState?.season"
          :money="gameState?.money || 0"
          @buy="buyItem"
        />
      </div>

      <div class="center">
        <FarmCanvas
          :grid="gameState?.grid"
          :season="gameState?.season"
          :selectedTool="gameState?.selectedTool"
          :crops="crops"
          @tile-click="handleTileClick"
        />
        <div v-if="gameState?.buyerPresent" class="buyer-notice">
          🚜 收购商来了！点击"卖出"按钮出售车中作物
        </div>
      </div>

      <div class="right-panel">
        <Cart
          :cart="gameState?.cart || []"
          :buyerPresent="gameState?.buyerPresent"
          @sell="send({ type: 'sell' })"
        />
        <Inventory :inventory="gameState?.inventory || []" :crops="crops" :tools="toolsDef" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWebSocket } from './composables/useWebSocket.js';
import { SEASON_NAMES, SEASON_COLORS, TOOL_ACTIONS } from './constants.js';
import FarmCanvas from './components/FarmCanvas.vue';
import ToolBar from './components/ToolBar.vue';
import Shop from './components/Shop.vue';
import Cart from './components/Cart.vue';
import Inventory from './components/Inventory.vue';

const { state: gameState, message, crops, tools: toolsDef, send } = useWebSocket('ws://localhost:8765');

const seasonName = computed(() => SEASON_NAMES[gameState.value?.season] || '');
const seasonColor = computed(() => SEASON_COLORS[gameState.value?.season] || '#666');
const seasonBg = computed(() => {
  const s = gameState.value?.season;
  const bgs = {
    spring: 'linear-gradient(135deg, #4a7c3f 0%, #6db35a 100%)',
    summer: 'linear-gradient(135deg, #5a8c2a 0%, #8fbc5a 100%)',
    autumn: 'linear-gradient(135deg, #6b4423 0%, #a06030 100%)',
    winter: 'linear-gradient(135deg, #4a6a7a 0%, #7aaabb 100%)',
  };
  return bgs[s] || bgs.spring;
});

function selectTool(toolId) {
  send({ type: 'select_tool', toolId });
}

function handleTileClick(row, col) {
  const tool = gameState.value?.selectedTool;
  if (!tool) return;

  const actionType = TOOL_ACTIONS[tool];
  if (actionType) {
    send({ type: actionType, row, col });
  } else if (tool.endsWith('_seed')) {
    const cropId = tool.replace('_seed', '');
    send({ type: 'plant', row, col, cropId });
  }
}

function buyItem(itemId, quantity) {
  send({ type: 'buy', itemId, quantity });
}
</script>

<style scoped>
.game-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}
.header {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.3);
  position: relative;
}
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}
.season-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 13px;
}
.money {
  font-size: 15px;
  font-weight: bold;
}
.btn-pause {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-pause:hover { background: rgba(255,255,255,0.25); }
.toast {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 100;
  animation: fadeIn 0.3s;
}
@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
.main-area {
  flex: 1;
  display: flex;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}
.left-panel, .right-panel {
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.buyer-notice {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid #ffd700;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  animation: pulse 1s infinite alternate;
}
@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}
</style>
