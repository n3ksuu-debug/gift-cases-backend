import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { cases } from './data.js';
import { generateServerSeed, hashSeed, rollFromSeeds, pickWeighted } from './fair.js';

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// ✅ Health check для Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// ✅ Список кейсов для клиента
app.get('/api/cases', (req, res) => {
  res.json(cases.map(({ id, name, image, price, items }) => ({
    id, name, image, price,
    items: items.map(({ id, name, image, rarity, value }) => ({ id, name, image, rarity, value })),
  })));
});

// ✅ ВАЖНО: создаём httpServer (эта строка была потеряна!)
const httpServer = createServer(app);

const io = new Server(httpServer, { 
  cors: { 
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
  } 
});

const users = new Map();
const battles = new Map();

function newUser() {
  const s = generateServerSeed();
  return {
    balance: 5000,
    inventory: [],
    serverSeed: s,
    serverSeedHash: hashSeed(s),
    clientSeed: 'player',
    nonce: 0,
  };
}

function publicUser(u) {
  return {
    balance: u.balance,
    inventory: u.inventory,
    serverSeedHash: u.serverSeedHash,
    clientSeed: u.clientSeed,
    nonce: u.nonce,
  };
}

function sendBattlesList() {
  const list = [...battles.values()]
    .filter(b => b.state === 'waiting')
    .map(b => {
      const c = cases.find(x => x.id === b.caseId);
      return {
        id: b.id,
        caseName: c?.name, caseImage: c?.image,
        entryCost: b.entryCost,
        maxPlayers: b.maxPlayers,
        players: b.players.length,
      };
    });
  io.emit('battles_list', list);
}

function makeRollStrip(caseData, won) {
  const strip = [];
  for (let i = 0; i < 60; i++) {
    strip.push(caseData.items[Math.floor(Math.random() * caseData.items.length)]);
  }
  strip[50] = won;
  return strip;
}

function serializeBattle(battle) {
  const c = cases.find(x => x.id === battle.caseId);
  return {
    id: battle.id,
    caseName: c?.name, caseImage: c?.image,
    entryCost: battle.entryCost,
    maxPlayers: battle.maxPlayers,
    state: battle.state,
    players: battle.players.map(pid => ({ id: pid })),
    results: battle.results,
    winner: battle.winner,
  };
}

io.on('connection', (socket) => {
  users.set(socket.id, newUser());
  socket.emit('state', publicUser(users.get(socket.id)));
  sendBattlesList();

  socket.on('set_client_seed', ({ clientSeed }) => {
    const u = users.get(socket.id);
    if (!u) return;
    u.clientSeed = String(clientSeed || 'player');
    socket.emit('state', publicUser(u));
  });

  socket.on('reset_seed', () => {
    const u = users.get(socket.id);
    if (!u) return;
    const revealed = { oldServerSeed: u.serverSeed, oldHash: u.serverSeedHash };
    u.serverSeed = generateServerSeed();
    u.serverSeedHash = hashSeed(u.serverSeed);
    u.nonce = 0;
    socket.emit('seed_revealed', revealed);
    socket.emit('state', publicUser(u));
  });

  socket.on('open_case', ({ caseId }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const c = cases.find(x => x.id === caseId);
    if (!c) return socket.emit('error_msg', 'Кейс не найден');
    if (u.balance < c.price) return socket.emit('error_msg', 'Недостаточно средств');

    u.balance -= c.price;
    const r = rollFromSeeds(u.serverSeed, u.clientSeed, u.nonce);
    const won = pickWeighted(c.items, r);
    const instanceId = randomUUID();
    const nonce = u.nonce;
    u.nonce++;
    u.inventory.push({ ...won, instanceId });

    socket.emit('case_opened', {
      wonItem: { ...won, instanceId },
      roll: makeRollStrip(c, won),
      nonce,
      clientSeed: u.clientSeed,
    });
    socket.emit('state', publicUser(u));
  });

  socket.on('sell_item', ({ instanceId }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const idx = u.inventory.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return socket.emit('error_msg', 'Предмет не найден');
    const item = u.inventory[idx];
    u.inventory.splice(idx, 1);
    u.balance += Math.floor(item.value * 0.9);
    socket.emit('state', publicUser(u));
  });

  socket.on('create_battle', ({ caseId, maxPlayers }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const c = cases.find(x => x.id === caseId);
    if (!c) return socket.emit('error_msg', 'Кейс не найден');
    if (maxPlayers < 2 || maxPlayers > 4) return socket.emit('error_msg', 'Игроков 2-4');
    if (u.balance < c.price) return socket.emit('error_msg', 'Недостаточно средств');

    u.balance -= c.price;
    const battle = {
      id: randomUUID().slice(0, 8),
      caseId, entryCost: c.price, maxPlayers,
      players: [socket.id],
      state: 'waiting',
      results: null, winner: null,
    };
    battles.set(battle.id, battle);
    socket.join(`battle_${battle.id}`);
    socket.emit('state', publicUser(u));
    socket.emit('battle_update', serializeBattle(battle));
    sendBattlesList();
  });

  socket.on('join_battle', ({ battleId }) => {
    const u = users.get(socket.id);
    if (!u) return;
    const b = battles.get(battleId);
    if (!b || b.state !== 'waiting') return socket.emit('error_msg', 'Битва недоступна');
    if (b.players.includes(socket.id)) return;
    if (u.balance < b.entryCost) return socket.emit('error_msg', 'Недостаточно средств');

    u.balance -= b.entryCost;
    b.players.push(socket.id);
    socket.join(`battle_${battleId}`);
    socket.emit('state', publicUser(u));

    io.to(`battle_${b.id}`).emit('battle_update', serializeBattle(b));
    if (b.players.length === b.maxPlayers) startBattle(b);
    else sendBattlesList();
  });

  socket.on('disconnect', () => {
    for (const b of battles.values()) {
      if (b.state === 'waiting') {
        const idx = b.players.indexOf(socket.id);
        if (idx !== -1) {
          b.players.splice(idx, 1);
          if (b.players.length === 0) battles.delete(b.id);
          else io.to(`battle_${b.id}`).emit('battle_update', serializeBattle(b));
        }
      }
    }
    users.delete(socket.id);
    sendBattlesList();
  });
});

function startBattle(battle) {
  const c = cases.find(x => x.id === battle.caseId);
  battle.state = 'spinning';

  battle.results = battle.players.map(pid => {
    const u = users.get(pid);
    if (!u) return { playerId: pid, item: null, roll: [] };
    const r = rollFromSeeds(u.serverSeed, u.clientSeed, u.nonce);
    const won = pickWeighted(c.items, r);
    u.nonce++;
    const instanceId = randomUUID();
    u.inventory.push({ ...won, instanceId });
    return { playerId: pid, item: { ...won, instanceId }, roll: makeRollStrip(c, won) };
  });

  io.to(`battle_${battle.id}`).emit('battle_spinning', serializeBattle(battle));

  setTimeout(() => {
    let maxV = -1, winnerId = null;
    for (const r of battle.results) {
      if (r.item && r.item.value > maxV) { maxV = r.item.value; winnerId = r.playerId; }
    }
    const winner = users.get(winnerId);
    if (winner) {
      for (const r of battle.results) {
        if (!r.item || r.playerId === winnerId) continue;
        const u = users.get(r.playerId);
        if (!u) continue;
        const idx = u.inventory.findIndex(i => i.instanceId === r.item.instanceId);
        if (idx !== -1) u.inventory.splice(idx, 1);
        winner.inventory.push(r.item);
      }
    }
    battle.state = 'finished';
    battle.winner = winnerId;

    io.to(`battle_${battle.id}`).emit('battle_finished', serializeBattle(battle));

    for (const pid of battle.players) {
      const u = users.get(pid);
      const sock = io.sockets.sockets.get(pid);
      if (u && sock) sock.emit('state', publicUser(u));
    }

    setTimeout(() => battles.delete(battle.id), 30000);
    sendBattlesList();
  }, 5000);
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));