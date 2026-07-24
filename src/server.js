// claw-wedding-agent — WhatsApp Wedding Planner Bot
// Railway deployment v1.0 — minimal server scaffold

const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'wedding_verify_2026';

// ── Healthcheck ──────────────────────────────────────────────
app.get('/status', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'claw-wedding-agent',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    node: process.version,
  });
});

// ── Meta Webhook Verification ────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  console.warn('❌ Webhook verification failed');
  return res.sendStatus(403);
});

// ── Meta Webhook Event Handler (incoming messages) ───────────
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const msg = change.value?.messages?.[0];
          if (msg) {
            console.log(`📩 Message from ${msg.from}: ${msg.text?.body || '[non-text]'}`);
            // TODO: state machine routing → src/core/flows.js
          }
        }
      }
    }
    return res.sendStatus(200);
  }
  return res.sendStatus(404);
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`💒 claw-wedding-agent running on port ${PORT}`);
  console.log(`   Healthcheck: http://localhost:${PORT}/status`);
  console.log(`   Webhook:     http://localhost:${PORT}/webhook`);
});
