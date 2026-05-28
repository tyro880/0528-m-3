const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let gameState = null;

app.get('/api/state', (req, res) => {
  res.json({ state: gameState });
});

app.post('/api/state', (req, res) => {
  gameState = req.body.state;
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Farm game server running at http://localhost:${PORT}`);
});
