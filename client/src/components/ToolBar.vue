<template>
  <div class="toolbar panel">
    <h3>🧰 工具栏</h3>
    <div class="tool-grid">
      <button
        v-for="item in toolItems"
        :key="item.itemId"
        class="tool-btn"
        :class="{ active: selectedTool === item.itemId }"
        @click="$emit('select-tool', item.itemId)"
      >
        <span class="tool-icon">{{ getIcon(item.itemId) }}</span>
        <span class="tool-name">{{ getItemName(item.itemId) }}</span>
        <span v-if="item.quantity > 1" class="tool-qty">x{{ item.quantity }}</span>
      </button>
      <button
        v-for="seed in seedItems"
        :key="seed.itemId"
        class="tool-btn seed-btn"
        :class="{ active: selectedTool === seed.itemId }"
        @click="$emit('select-tool', seed.itemId)"
      >
        <span class="tool-icon">🌱</span>
        <span class="tool-name">{{ getSeedName(seed.itemId) }}</span>
        <span class="tool-qty">x{{ seed.quantity }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  inventory: Array,
  selectedTool: String,
  crops: Object,
});

defineEmits(['select-tool']);

const toolItems = computed(() =>
  props.inventory.filter(i => i.type === 'tool')
);
const seedItems = computed(() =>
  props.inventory.filter(i => i.type === 'seed')
);

const ICONS = {
  watering_can: '🚿',
  sickle: '🌾',
  fertilizer: '✨',
};

const TOOL_NAMES = {
  watering_can: '浇水壶',
  sickle: '镰刀',
  fertilizer: '肥料',
};

function getIcon(id) {
  return ICONS[id] || '🔧';
}

function getItemName(id) {
  return TOOL_NAMES[id] || id;
}

function getSeedName(seedId) {
  const cropId = seedId.replace('_seed', '');
  const crop = Object.values(props.crops || {}).find(c => c.id === cropId);
  return crop ? `${crop.name}种子` : seedId;
}
</script>

<style scoped>
.panel {
  background: rgba(0,0,0,0.4);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.1);
}
h3 {
  font-size: 13px;
  margin-bottom: 8px;
  opacity: 0.9;
}
.tool-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
.tool-btn:hover { background: rgba(255,255,255,0.15); }
.tool-btn.active {
  background: rgba(100, 200, 100, 0.3);
  border-color: #6c6;
  box-shadow: 0 0 8px rgba(100,200,100,0.3);
}
.tool-icon { font-size: 16px; }
.tool-name { flex: 1; text-align: left; }
.tool-qty { opacity: 0.6; font-size: 11px; }
.seed-btn .tool-icon { font-size: 14px; }
</style>
