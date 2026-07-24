// claw-wedding-agent — WhatsApp Wedding Planner Bot
// v1.2 — Interactive buttons + Redis RSVP storage
// Repo canónico: softifycl/claw-wedding-agent
// Mirror (Railway): alejandrochungp/claw-wedding-agent

const express = require('express');
const Redis = require('ioredis');
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
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const META_API = 'https://graph.facebook.com/v22.0';
const SLACK_API = 'https://slack.com/api';

// ── Redis ────────────────────────────────────────────────────
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

const RSVP_KEY = 'wedding:rsvps';

redis.on('error', (err) => console.error('Redis error:', err.message));
redis.on('connect', () => console.log('✅ Redis connected'));

// ── Tenant Config ─────────────────────────────────────────────
const TENANT = {
  id: 'boda-alejandro-kuilen',
  novios: { nombre1: 'Alejandro', nombre2: 'Kuilen' },
  fecha: '2026-11-17',
  hora: '18:00',
  lugar: 'Restaurante Meihua, Av. Pedro Aguirre Cerda 5761, Cerrillos',
  dressCode: 'Formal / Temática China-Coreana',
  siteUrl: WEDDING_SITE_URL,
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Boda+Alejandro+y+Kuilen&dates=20261117T210000Z/20261118T030000Z&details=Boda+de+Alejandro+y+Kuilen+-+Restaurante+Meihua&location=Restaurante+Meihua,+Av.+Pedro+Aguirre+Cerda+5761,+Cerrillos,+Santiago',
  saveTheDateImage: 'https://missclickpro.wordpress.com/wp-content/uploads/2025/07/portadaweb_missclick.jpg',
};

// ── Healthcheck ──────────────────────────────────────────────
app.get('/status', async (_req, res) => {
  let rsvpCount = 0;
  try {
    rsvpCount = await redis.llen(RSVP_KEY);
  } catch (e) { /* redis might not be connected yet */ }
  res.json({
    status: 'ok',
    name: 'claw-wedding-agent',
    version: '1.2.0',
    uptime: Math.floor(process.uptime()),
    node: process.version,
    tenant: TENANT.id,
    whatsapp: !!WHATSAPP_TOKEN,
    slack: !!SLACK_BOT_TOKEN,
    redis: redis.status === 'ready',
    rsvps: rsvpCount,
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
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};

      if (value.messages) {
        for (const msg of value.messages) {
          await handleIncomingMessage(msg, value.metadata?.display_phone_number);
        }
      }

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
  const from = msg.from;
  const timestamp = msg.timestamp;
  const msgType = msg.type;

  let text = '';
  let interactiveType = null;
  let interactiveId = null;

  if (msgType === 'text') {
    text = msg.text.body;
  } else if (msgType === 'interactive') {
    const interactive = msg.interactive;
    if (interactive.type === 'button_reply') {
      interactiveType = 'button';
      interactiveId = interactive.button_reply.id;
      text = interactive.button_reply.title;
    } else if (interactive.type === 'list_reply') {
      interactiveType = 'list';
      interactiveId = interactive.list_reply.id;
      text = interactive.list_reply.title;
    }
  } else if (msgType === 'image') {
    text = '[Imagen recibida]';
  } else {
    text = `[${msgType}]`;
  }

  console.log(`💬 ${from}: ${text}` + (interactiveId ? ` [btn:${interactiveId}]` : ''));

  // Handle interactive button replies
  if (interactiveType === 'button') {
    await handleButtonReply(from, interactiveId, text);
  }

  // Forward ALL messages to Slack
  if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
    await sendToSlack(from, text, timestamp, fromPhone, interactiveId);
  }

  // Auto-reply for unknown text messages
  if (msgType === 'text') {
    await sendAutoReply(from, text);
  }
}

// ── Button Reply Handler ─────────────────────────────────────
async function handleButtonReply(from, buttonId, buttonText) {
  if (buttonId === 'confirmar_asistencia') {
    const confirmMsg = `¡Gracias por confirmar, nos alegra mucho! 🎉\n\n📅 Agregá el evento a tu calendario:\n${TENANT.calendarUrl}\n\n📍 ${TENANT.lugar}\n🕕 ${TENANT.hora} hrs\n👔 ${TENANT.dressCode}\n\nPronto te llegará la invitación formal. ¡Nos vemos! ✨`;
    await sendWhatsAppMessage(from, confirmMsg);
    await saveRSVP(from, '✅ Confirmado', buttonText);
    await notifySlack(`🎉 *RSVP CONFIRMADO* \`${from}\``);

  } else if (buttonId === 'no_asistire') {
    const declineMsg = `Gracias por avisarnos, lo entendemos completamente 🫶\n\nTe tendremos presente ese día. ¡Un abrazo!`;
    await sendWhatsAppMessage(from, declineMsg);
    await saveRSVP(from, '❌ No asistirá', buttonText);
    await notifySlack(`💔 *NO ASISTIRÁ* \`${from}\``);
  }
}

// ── Save RSVP to Redis ───────────────────────────────────────
async function saveRSVP(phone, status, rawReply) {
  try {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      telefono: phone,
      nombre: '',
      apellido: '',
      rsvp: status,
      acompanantes: '',
      mesa: '',
      notas: rawReply || '',
    });
    await redis.rpush(RSVP_KEY, entry);
    const count = await redis.llen(RSVP_KEY);
    console.log(`📊 RSVP saved: ${phone} → ${status} (total: ${count})`);
  } catch (err) {
    console.error('❌ Redis save error:', err.message);
  }
}

// ── Slack utilities ──────────────────────────────────────────
async function notifySlack(text) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) return;
  try {
    await axios.post(`${SLACK_API}/chat.postMessage`, {
      channel: SLACK_CHANNEL_ID,
      text,
      mrkdwn: true,
    }, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Slack notify error:', err.message);
  }
}

async function sendToSlack(from, text, timestamp, fromPhone, buttonId) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) return;
  try {
    const msgTime = new Date(parseInt(timestamp) * 1000).toISOString();
    let slackMsg = `💍 *Nuevo mensaje de boda*\n> *De:* \`${from}\`\n> *Hora:* ${msgTime}\n> *Cuenta:* ${fromPhone || 'desconocida'}`;
    if (buttonId) slackMsg += `\n> *Botón:* \`${buttonId}\``;
    slackMsg += `\n\n${text}`;

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
    console.error('Slack send error:', err.message);
  }
}

// ── Auto-Reply ────────────────────────────────────────────────
async function sendAutoReply(to, text) {
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
    console.warn('⚠️ WhatsApp not configured');
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
    const bodyParams = params.map((p) => ({
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

app.get('/admin/config', (_req, res) => {
  res.json({
    tenant: TENANT,
    configured: {
      whatsappToken: !!WHATSAPP_TOKEN,
      phoneNumberId: !!PHONE_NUMBER_ID,
      slackBotToken: !!SLACK_BOT_TOKEN,
      slackChannelId: !!SLACK_CHANNEL_ID,
      verifyToken: !!VERIFY_TOKEN,
      redis: redis.status === 'ready',
    },
  });
});

app.post('/admin/test-message', async (req, res) => {
  const { to, text } = req.body;
  if (!to) return res.status(400).json({ error: 'Phone number required' });
  const result = await sendWhatsAppMessage(to, text || '🧪 Mensaje de prueba — claw-wedding-agent v1.2');
  res.json({ sent: !!result, result });
});

app.post('/admin/test-template', async (req, res) => {
  const { to, template, params } = req.body;
  if (!to || !template) return res.status(400).json({ error: 'Phone and template required' });
  const result = await sendTemplate(to, template, params || []);
  res.json({ sent: !!result, result });
});

// List all RSVPs
app.get('/admin/rsvps', async (_req, res) => {
  try {
    const entries = await redis.lrange(RSVP_KEY, 0, -1);
    const rsvps = entries.map(e => JSON.parse(e));
    res.json({ total: rsvps.length, rsvps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats: confirmed vs declined
app.get('/admin/stats', async (_req, res) => {
  try {
    const entries = await redis.lrange(RSVP_KEY, 0, -1);
    const rsvps = entries.map(e => JSON.parse(e));
    const confirmed = rsvps.filter(r => r.rsvp.includes('Confirmado')).length;
    const declined = rsvps.filter(r => r.rsvp.includes('No asistir')).length;
    const total = rsvps.length;
    res.json({ total, confirmed, declined, pending: total - confirmed - declined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ───────────────────────────────────────────────────
async function start() {
  try {
    await redis.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️ Redis not available, starting without it');
  }

  app.listen(PORT, () => {
    console.log(`💒 claw-wedding-agent v1.2 running on port ${PORT}`);
    console.log(`   Tenant:    ${TENANT.id}`);
    console.log(`   Health:    http://localhost:${PORT}/status`);
    console.log(`   Webhook:   http://localhost:${PORT}/webhook`);
    console.log(`   WhatsApp:  ${WHATSAPP_TOKEN ? '✅ configured' : '❌ missing'}`);
    console.log(`   Slack:     ${SLACK_BOT_TOKEN && SLACK_CHANNEL_ID ? '✅ configured' : '❌ missing'}`);
    console.log(`   Redis:     ${redis.status === 'ready' ? '✅ connected' : '❌ not connected'}`);
    console.log(`   Site:      ${TENANT.siteUrl}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

module.exports = { app, sendWhatsAppMessage, sendTemplate, TENANT };
