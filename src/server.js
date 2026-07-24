// claw-wedding-agent — WhatsApp Wedding Planner Bot
// v1.1 — WhatsApp message handling + Slack forwarding
// Repo canónico: softifycl/claw-wedding-agent
// Mirror (Railway): alejandrochungp/claw-wedding-agent

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());

// ── Config ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'wedding_verify_2026';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const WEDDING_SITE_URL = process.env.WEDDING_SITE_URL || 'https://boda.alejandro-y-kuilen.cl';

const META_API = 'https://graph.facebook.com/v22.0';
const SLACK_API = 'https://slack.com/api';

// ── Tenant Config ─────────────────────────────────────────────
const TENANT = {
  id: 'boda-alejandro-kuilen',
  novios: { nombre1: 'Alejandro', nombre2: 'Kuilen' },
  fecha: '2026-11-17',
  hora: '18:00',
  lugar: 'Restaurante Meihua, Av. Pedro Aguirre Cerda 5761, Cerrillos',
  dressCode: 'Formal / Temática China-Coreana',
  siteUrl: WEDDING_SITE_URL,
};

// ── Healthcheck ──────────────────────────────────────────────
app.get('/status', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'claw-wedding-agent',
    version: '1.1.0',
    uptime: Math.floor(process.uptime()),
    node: process.version,
    tenant: TENANT.id,
    whatsapp: !!WHATSAPP_TOKEN,
    slack: !!SLACK_BOT_TOKEN,
    phoneNumberId: PHONE_NUMBER_ID ? '***configured***' : 'missing',
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

// ── Meta Webhook Event Handler ───────────────────────────────
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      // Incoming messages
      if (value.messages) {
        for (const msg of value.messages) {
          handleIncomingMessage(msg, value.metadata?.display_phone_number);
        }
      }

      // Message status updates (sent/delivered/read)
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log(`📬 Status [${status.status}]: msg ${status.id} → ${status.recipient_id}`);
        }
      }
    }
  }

  return res.sendStatus(200);
});

// ── Incoming Message Handler ─────────────────────────────────
async function handleIncomingMessage(msg, fromPhone) {
  const from = msg.from;        // guest phone
  const timestamp = msg.timestamp;
  const msgType = msg.type;

  let text = '';
  if (msgType === 'text') {
    text = msg.text.body;
  } else if (msgType === 'interactive') {
    const interactive = msg.interactive;
    if (interactive.type === 'button_reply') {
      text = `[Botón: "${interactive.button_reply.title}"]`;
    } else if (interactive.type === 'list_reply') {
      text = `[Lista: "${interactive.list_reply.title}"]`;
    }
  } else if (msgType === 'image') {
    text = '[Imagen]';
  } else if (msgType === 'audio') {
    text = '[Audio]';
  } else {
    text = `[${msgType}]`;
  }

  console.log(`💬 ${from}: ${text}`);

  // Forward to Slack
  if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
    await sendToSlack(from, text, timestamp, fromPhone);
  }

  // Auto-reply for unknown messages
  await sendAutoReply(from, text);
}

// ── Slack Forward ─────────────────────────────────────────────
async function sendToSlack(from, text, timestamp, fromPhone) {
  try {
    const msgTime = new Date(parseInt(timestamp) * 1000).toISOString();
    const slackMsg = `💍 *Nuevo mensaje de boda*\n> *De:* \`${from}\`\n> *Hora:* ${msgTime}\n> *Cuenta:* ${fromPhone || 'desconocida'}\n\n${text}`;

    await axios.post(`${SLACK_API}/chat.postMessage`, {
      channel: SLACK_CHANNEL_ID,
      text: slackMsg,
      mrkdwn: true,
    }, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Slack send error:', err.response?.data || err.message);
  }
}

// ── Auto-Reply ────────────────────────────────────────────────
async function sendAutoReply(to, text) {
  // Simple keyword detection for now — state machine in v2
  let reply = null;
  const lower = text.toLowerCase();

  if (/hola|buenas|info/i.test(lower)) {
    reply = `¡Hola! 💒 Somos ${TENANT.novios.nombre1} y ${TENANT.novios.nombre2}.\n\nNos casamos el *17 de noviembre de 2026* a las *18:00* en *${TENANT.lugar}*.\n\nPronto recibirás la invitación formal. Mientras tanto, puedes visitar nuestro sitio: ${TENANT.siteUrl}`;
  } else if (/fecha|cu[aá]ndo/i.test(lower)) {
    reply = `📅 Nos casamos el *17 de noviembre de 2026* a las *18:00*\n📍 ${TENANT.lugar}\n👗 ${TENANT.dressCode}`;
  } else if (/confirmar|voy|asistir|rsvp/i.test(lower)) {
    reply = `¡Gracias por confirmar! 🎉\n\nPara registrarte visita: ${TENANT.siteUrl}/rsvp\n\nO simplemente responde con tu nombre y número de acompañantes.`;
  }

  if (reply) {
    await sendWhatsAppMessage(to, reply);
  }
}

// ── Send WhatsApp Message ─────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp not configured — message not sent');
    return;
  }
  try {
    const res = await axios.post(`${META_API}/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: text },
    }, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ Sent to ${to}: ${res.data?.messages?.[0]?.id || 'ok'}`);
    return res.data;
  } catch (err) {
    console.error(`❌ Failed to send to ${to}:`, err.response?.data || err.message);
    return null;
  }
}

// ── Send WhatsApp Template ────────────────────────────────────
async function sendTemplate(to, templateName, params = []) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp not configured');
    return;
  }
  try {
    const bodyParams = params.map((p, i) => ({
      type: 'text',
      text: String(p),
    }));

    const res = await axios.post(`${META_API}/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: bodyParams,
          },
        ],
      },
    }, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`📨 Template "${templateName}" sent to ${to}`);
    return res.data;
  } catch (err) {
    console.error(`❌ Template "${templateName}" failed for ${to}:`, err.response?.data || err.message);
    return null;
  }
}

// ── Admin Endpoints ──────────────────────────────────────────

// Health + config status
app.get('/admin/config', (_req, res) => {
  res.json({
    tenant: TENANT,
    configured: {
      whatsappToken: !!WHATSAPP_TOKEN,
      phoneNumberId: !!PHONE_NUMBER_ID,
      slackBotToken: !!SLACK_BOT_TOKEN,
      slackChannelId: !!SLACK_CHANNEL_ID,
      verifyToken: !!VERIFY_TOKEN,
    },
  });
});

// Send test message
app.post('/admin/test-message', async (req, res) => {
  const { to, text } = req.body;
  if (!to) return res.status(400).json({ error: 'Phone number required' });
  const result = await sendWhatsAppMessage(to, text || '🧪 Mensaje de prueba — claw-wedding-agent v1.1');
  res.json({ sent: !!result, result });
});

// Send test template
app.post('/admin/test-template', async (req, res) => {
  const { to, template, params } = req.body;
  if (!to || !template) return res.status(400).json({ error: 'Phone and template required' });
  const result = await sendTemplate(to, template, params || []);
  res.json({ sent: !!result, result });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`💒 claw-wedding-agent v1.1 running on port ${PORT}`);
  console.log(`   Tenant:    ${TENANT.id}`);
  console.log(`   Health:    http://localhost:${PORT}/status`);
  console.log(`   Webhook:   http://localhost:${PORT}/webhook`);
  console.log(`   WhatsApp:  ${WHATSAPP_TOKEN ? '✅ configured' : '❌ missing'}`);
  console.log(`   Slack:     ${SLACK_BOT_TOKEN && SLACK_CHANNEL_ID ? '✅ configured' : '❌ missing'}`);
  console.log(`   Site:      ${TENANT.siteUrl}`);
});

module.exports = { app, sendWhatsAppMessage, sendTemplate, TENANT };
