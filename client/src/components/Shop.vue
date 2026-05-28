<template>
  <div class="shop panel">
    <h3>🏪 商店</h3>
    <div class="shop-section">
      <h4>种子</h4>
      <div v-for="crop in availableSeeds" :key="crop.id" class="shop-item">
        <span class="item-name">🌱 {{ crop.name }}种子</span>
        <span class="item-price">{{ crop.seedPrice }}💰</span>
        <button class="buy-btn" @click="$emit('buy', crop.id + '_seed', 1)" :disabled="money < crop.seedPrice">买</button>
        <button class="buy-btn" @click="$emit('buy', crop.id + '_seed', 5)" :disabled="money < crop.seedPrice * 5">x5</button>
      </div>
      <div v-if="availableSeeds.length === 0" class="empty">当前季节无可种作物</div>
    </div>
    <div class="shop-section">
      <h4>工具与道具</h4>
      <div v-for="tool in shopTools" :key="tool.id" class="shop-item">
        <span class="item-name">🔧 {{ tool.name }}</span>
        <span class="item-price">{{ tool.price }}💰</span>
        <button class="buy-btn" @click="$emit('buy', tool.id, 1)" :disabled="money < tool.price">买</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  crops: Object,
  tools: Object,
  season: String,
  money: Number,
});

defineEmits(['buy']);

const availableSeeds = computed(() =>
  Object.values(props.crops || {}).filter(c => c.season === props.season)
);

const shopTools = computed(() => Object.values(props.tools || {}));
</script>

<style scoped>
.panel {
  background: rgba(0,0,0,0.4);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.1);
}
h3 { font-size: 13px; margin-bottom: 8px; opacity: 0.9; }
h4 { font-size: 11px; opacity: 0.6; margin: 6px 0 4px; }
.shop-section { margin-bottom: 8px; }
.shop-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.item-name { flex: 1; }
.item-price { font-size: 10px; opacity: 0.7; margin-right: 4px; }
.buy-btn {
  background: rgba(100,180,100,0.3);
  border: 1px solid rgba(100,180,100,0.5);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
}
.buy-btn:hover { background: rgba(100,180,100,0.5); }
.buy-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.empty { font-size: 11px; opacity: 0.5; padding: 4px 0; }
</style>
