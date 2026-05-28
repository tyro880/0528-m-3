const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'gamedata.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

function getDefaultState() {
  return {
    coins: 1000,
    feed: 5,
    day: 1,
    lastDayTime: Date.now(),
    buildings: [],
    warehouse: [],
    warehouseMax: 20
  };
}

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return getDefaultState();
}

function saveState(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/state', (req, res) => {
  res.json(loadState());
});

app.post('/api/state', (req, res) => {
  saveState(req.body);
  res.json({ ok: true });
});

app.post('/api/build', (req, res) => {
  const state = loadState();
  const { type, col, row } = req.body;
  const cost = type === 'chicken' ? 200 : 500;
  if (state.coins < cost) return res.json({ ok: false, msg: '金币不足' });
  const occupied = state.buildings.some(b => b.col === col && b.row === row);
  if (occupied) return res.json({ ok: false, msg: '该位置已有建筑' });
  state.coins -= cost;
  state.buildings.push({
    id: Date.now(),
    type,
    col,
    row,
    animals: type === 'chicken'
      ? [{ hungryDays: 0, sick: false, lastProduced: state.day }]
      : [{ hungryDays: 0, sick: false, lastProduced: state.day }],
    fedToday: false
  });
  saveState(state);
  res.json({ ok: true, state });
});

app.post('/api/feed', (req, res) => {
  const state = loadState();
  const { buildingId } = req.body;
  const b = state.buildings.find(x => x.id === buildingId);
  if (!b) return res.json({ ok: false, msg: '建筑不存在' });
  if (state.feed <= 0) return res.json({ ok: false, msg: '饲料不足，请去商店购买' });
  state.feed--;
  b.fedToday = true;
  b.animals.forEach(a => { a.hungryDays = 0; });
  saveState(state);
  res.json({ ok: true, state });
});

app.post('/api/heal', (req, res) => {
  const state = loadState();
  const { buildingId } = req.body;
  const b = state.buildings.find(x => x.id === buildingId);
  if (!b) return res.json({ ok: false, msg: '建筑不存在' });
  const sickCount = b.animals.filter(a => a.sick).length;
  const cost = sickCount * 50;
  if (state.coins < cost) return res.json({ ok: false, msg: '金币不足' });
  state.coins -= cost;
  b.animals.forEach(a => { if (a.sick) { a.sick = false; a.hungryDays = 0; } });
  saveState(state);
  res.json({ ok: true, state });
});

app.post('/api/buy-feed', (req, res) => {
  const state = loadState();
  const { amount } = req.body;
  const cost = amount * 15;
  if (state.coins < cost) return res.json({ ok: false, msg: '金币不足' });
  state.coins -= cost;
  state.feed += amount;
  saveState(state);
  res.json({ ok: true, state });
});

app.post('/api/sell', (req, res) => {
  const state = loadState();
  const { index } = req.body;
  if (index < 0 || index >= state.warehouse.length) return res.json({ ok: false });
  const item = state.warehouse[index];
  const price = item.type === 'egg' ? 20 : 40;
  state.coins += price;
  state.warehouse.splice(index, 1);
  saveState(state);
  res.json({ ok: true, state });
});

app.post('/api/sell-all', (req, res) => {
  const state = loadState();
  let total = 0;
  state.warehouse.forEach(item => {
    total += item.type === 'egg' ? 20 : 40;
  });
  state.coins += total;
  state.warehouse = [];
  saveState(state);
  res.json({ ok: true, state, earned: total });
});

app.post('/api/next-day', (req, res) => {
  const state = loadState();
  state.day++;
  state.lastDayTime = Date.now();
  const warehouseFull = state.warehouse.length >= state.warehouseMax;

  state.buildings.forEach(b => {
    b.animals.forEach(a => {
      if (!b.fedToday) {
        a.hungryDays++;
        if (a.hungryDays >= 2) a.sick = true;
      }
      if (!a.sick && !warehouseFull) {
        if (b.type === 'chicken') {
          state.warehouse.push({ type: 'egg', day: state.day });
        } else if (b.type === 'cow' && state.day % 2 === 0) {
          state.warehouse.push({ type: 'milk', day: state.day });
        }
      }
    });
    b.fedToday = false;
  });

  saveState(state);
  res.json({ ok: true, state });
});

app.listen(PORT, () => {
  console.log(`=== 农场游戏服务器启动 ===`);
  console.log(`打开浏览器访问: http://localhost:${PORT}`);
});
