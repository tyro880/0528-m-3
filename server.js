const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

function read() {
  if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return { coins: 1000, feed: 3, hasChickenCoop: false, warehouse: [] };
}

function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d), 'utf8'); }

app.get('/api/data', (req, res) => res.json(read()));

app.post('/api/build-coop', (req, res) => {
  const d = read();
  if (d.hasChickenCoop) return res.json({ ok: false, msg: '已有鸡舍' });
  if (d.coins < 200) return res.json({ ok: false, msg: '金币不足' });
  d.coins -= 200;
  d.hasChickenCoop = true;
  save(d);
  res.json({ ok: true, data: d });
});

app.post('/api/buy-feed', (req, res) => {
  const d = read();
  if (d.coins < 15) return res.json({ ok: false, msg: '金币不足' });
  d.coins -= 15;
  d.feed += 1;
  save(d);
  res.json({ ok: true, data: d });
});

app.post('/api/feed-chicken', (req, res) => {
  const d = read();
  if (!d.hasChickenCoop) return res.json({ ok: false, msg: '没有鸡舍' });
  if (d.feed <= 0) return res.json({ ok: false, msg: '饲料不足' });
  d.feed -= 1;
  d.warehouse.push({ type: 'egg', time: Date.now() });
  save(d);
  res.json({ ok: true, data: d });
});

app.listen(3000, () => console.log('http://localhost:3000'));
