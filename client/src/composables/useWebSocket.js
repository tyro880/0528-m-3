import { ref, onMounted, onUnmounted } from 'vue';

export function useWebSocket(url) {
  const state = ref(null);
  const connected = ref(false);
  const message = ref('');
  const crops = ref({});
  const tools = ref({});
  let ws = null;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      connected.value = true;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'init':
          state.value = data.payload.state;
          crops.value = data.payload.crops;
          tools.value = data.payload.tools;
          break;
        case 'state':
          state.value = data.payload;
          break;
        case 'action_result':
          message.value = data.payload.message;
          setTimeout(() => { message.value = ''; }, 2000);
          break;
      }
    };

    ws.onclose = () => {
      connected.value = false;
      setTimeout(connect, 2000);
    };
  }

  function send(action) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
    }
  }

  onMounted(connect);
  onUnmounted(() => { if (ws) ws.close(); });

  return { state, connected, message, crops, tools, send };
}
