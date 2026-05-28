<template>
  <div class="cart panel">
    <h3>🛒 收割车</h3>
    <div v-if="cart.length === 0" class="empty">车是空的</div>
    <div v-for="(item, idx) in cart" :key="idx" class="cart-item">
      <span>{{ item.name }}</span>
      <span class="price">{{ item.sellPrice }}💰</span>
    </div>
    <div v-if="cart.length > 0" class="cart-total">
      合计: {{ totalValue }} 金币
    </div>
    <button
      v-if="cart.length > 0"
      class="sell-btn"
      :disabled="!buyerPresent"
      @click="$emit('sell')"
    >
      {{ buyerPresent ? '🤝 卖给收购商' : '⏳ 等待收购商...' }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  cart: Array,
  buyerPresent: Boolean,
});

defineEmits(['sell']);

const totalValue = computed(() =>
  props.cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0)
);
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
.cart-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.price { opacity: 0.7; }
.cart-total {
  font-size: 12px;
  font-weight: bold;
  padding: 6px 0;
  border-top: 1px solid rgba(255,255,255,0.2);
  margin-top: 4px;
}
.sell-btn {
  width: 100%;
  margin-top: 6px;
  padding: 8px;
  background: rgba(255, 200, 50, 0.3);
  border: 1px solid rgba(255, 200, 50, 0.6);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}
.sell-btn:hover:not(:disabled) { background: rgba(255, 200, 50, 0.5); }
.sell-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
