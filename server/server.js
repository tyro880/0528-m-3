const { WebSocketServer } = require('ws');
const { TICK_INTERVAL_MS, CROPS, TOOLS, SEASONS } = require('./constants');
const game = require('./game');

const PORT = 8765;
const wss = new WebSocketServer({ port: PORT });

let state = game.createInitialState();
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

function sendState() {
  broadcast({ type: 'state', payload: state });
}

function handleAction(ws, action) {
  let result;
  switch (action.type) {
    case 'plant':
      result = game.plantCrop(state, action.row, action.col, action.cropId);
      break;
    case 'water':
      result = game.waterTile(state, action.row, action.col);
      break;
    case 'fertilize':
      result = game.fertilizeTile(state, action.row, action.col);
      break;
    case 'harvest':
      result = game.harvestTile(state, action.row, action.col);
      break;
    case 'sell':
      result = game.sellCart(state);
      break;
    case 'buy':
      result = game.buyItem(state, action.itemId, action.quantity || 1);
      break;
    case 'select_tool':
      state.selectedTool = action.toolId;
      result = { success: true, message: `选择了工具` };
      break;
    case 'pause':
      state.paused = !state.paused;
      result = { success: true, message: state.paused ? '游戏已暂停' : '游戏继续' };
      break;
    default:
      result = { success: false, message: '未知操作' };
  }

  ws.send(JSON.stringify({ type: 'action_result', payload: result }));
  sendState();
}

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`玩家连接 (当前 ${clients.size} 人)`);

  ws.send(JSON.stringify({ type: 'init', payload: { state, crops: CROPS, tools: TOOLS, seasons: SEASONS } }));

  ws.on('message', (raw) => {
    try {
      const action = JSON.parse(raw);
      handleAction(ws, action);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', payload: { message: '无效消息格式' } }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`玩家断开 (当前 ${clients.size} 人)`);
  });
});

setInterval(() => {
  state = game.tick(state);
  sendState();
}, TICK_INTERVAL_MS);

console.log(`🌾 农场游戏服务器已启动 ws://localhost:${PORT}`);
console.log(`每 ${TICK_INTERVAL_MS / 1000} 秒推进一天`);
