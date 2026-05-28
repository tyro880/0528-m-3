<template>
  <div class="inventory panel">
    <h3>🎒 背包</h3>
    <div v-if="inventory.length === 0" class="empty">背包是空的</div>
    <div v-for="item in inventory" :key="item.itemId" class="inv-item">
      <span class="inv-icon">{{ getIcon(item) }}</span>
      <span class="inv-name">{{ getItemName(item) }}</span>
      <span class="inv-qty">x{{ item.quantity }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  inventory: Array,
  crops: Object,
  tools: Object,
});

const ICONS = {
  watering_can: '🚿',
  sickle: '🌾',
  fertilizer: '✨',
};

function getIcon(item) {
  if (item.type === 'seed') return '🌱';
  return ICONS[item.itemId] || '📦';
}

function getItemName(item) {
  if (item.type === 'seed') {
    const cropId = item.itemId.replace('_seed', '');
    const crop = Object.values(props.crops || {}).find(c => c.id === cropId);
    return crop ? `${crop.name}种子` : item.itemId;
  }
  const tool = Object.values(props.tools || {}).find(t => t.id === item.itemId);
  return tool ? tool.name : item.itemId;
}
</script>

<style scoped>
.panel {
  background: rgba(0,0,0,0.4);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.1);
}
h3 { font-size: 13px; margin-bottom: 8px; opacity: 0.9; }
.empty { font-size: 11px; opacity: 0.5; padding: 4px 0; }
.inv-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.inv-icon { font-size: 14px; }
.inv-name { flex: 1; }
.inv-qty { opacity: 0.6; font-size: 11px; }
</style>
