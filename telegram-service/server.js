const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const SESSION_FILE = path.join(__dirname, 'data', 'session.txt');
let savedSession = '';
if (fs.existsSync(SESSION_FILE)) {
  savedSession = fs.readFileSync(SESSION_FILE, 'utf-8').trim();
}

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';
const stringSession = new StringSession(savedSession);

let client;

async function initTelegram() {
  if (!apiId || !apiHash) {
    console.log('⚠️ TELEGRAM_API_ID e TELEGRAM_API_HASH não configurados.');
    return;
  }

  client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Cliente Telegram MTProto Conectado!');
}

initTelegram();

// Status da conexão
app.get('/api/status', (req, res) => {
  res.json({
    connected: client ? client.connected : false,
    sessionSaved: !!savedSession
  });
});

// Endpoint para n8n enviar mensagem
app.post('/api/send-message', async (req, res) => {
  const { peer, message } = req.body;
  if (!client || !client.connected) {
    return res.status(400).json({ error: 'Cliente Telegram não conectado' });
  }

  try {
    await client.sendMessage(peer, { message });
    res.json({ success: true, message: 'Mensagem enviada!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Telegram Service rodando na porta ${PORT}`);
});
