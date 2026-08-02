// claw-wedding-agent — WhatsApp Wedding Planner Bot
// v1.6.1 — DeepSeek Flash RSVP + auto-replies + Mateo Slack App
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
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
const WEDDING_SITE_URL = process.env.WEDDING_SITE_URL || 'https://boda.alejandro-y-kuilen.cl';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

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
const CONVERSATION_KEY = 'wedding:conversations'; // phone → last interaction
const SLACK_TS_KEY = 'wedding:slack_ts'; // wa_msg_id → slack_ts for threading

redis.on('error', (err) => console.error('Redis error:', err.message));

// ── Tenant Config ─────────────────────────────────────────────
const TENANT = {
  id: 'boda-alejandro-kuilen',
  novios: { nombre1: 'Alejandro', nombre2: 'Kuilen' },
  fecha: '2026-11-17',
  hora: '18:00',
  horaNota: 'Sujeto a modificaciones. Por confirmar',
  tipoCelebracion: 'Boda China / Coreana',
  lugar: 'Restaurante Meihua, Av. Pedro Aguirre Cerda 5761, Cerrillos',
  dressCode: 'Semi Formal',
  siteUrl: WEDDING_SITE_URL,
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Boda+Alejandro+y+Kuilen&dates=20261117T210000Z/20261118T030000Z&details=Boda+de+Alejandro+y+Kuilen+-+Restaurante+Meihua&location=Restaurante+Meihua,+Av.+Pedro+Aguirre+Cerda+5761,+Cerrillos,+Santiago',
  saveTheDateImage: 'https://missclickpro.wordpress.com/wp-content/uploads/2025/07/portadaweb_missclick.jpg',
};

// ── Phone Formatting ─────────────────────────────────────────
function normalizePhone(phone) {
  // Accept +569XXXXXXXX, 569XXXXXXXX, 9XXXXXXXX
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('56') && cleaned.length >= 11) return `+${cleaned}`;
  if (cleaned.startsWith('9') && cleaned.length === 9) return `+56${cleaned}`;
  return cleaned;
}

// ── Healthcheck ──────────────────────────────────────────────
app.get('/status', async (_req, res) => {
  let rsvpCount = 0;
  try {
    rsvpCount = await redis.llen(RSVP_KEY);
  } catch (e) { /* redis might not be connected yet */ }
  res.json({
    status: 'ok',
    name: 'claw-wedding-agent',
    version: '1.6.0',
    uptime: Math.floor(process.uptime()),
    node: process.version,
    tenant: TENANT.id,
    whatsapp: !!WHATSAPP_TOKEN,
    slack: !!SLACK_BOT_TOKEN,
    redis: redis.status === 'ready',
    rsvps: rsvpCount,
    phoneNumberId: PHONE_NUMBER_ID ? '***configured***' : 'missing',
    metaApp: META_APP_ID ? `${META_APP_ID.slice(0, 8)}...` : 'missing',
    slackEvents: !!SLACK_SIGNING_SECRET,
    llmRSVP: !!DEEPSEEK_API_KEY,
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
      const metadata = value.metadata || {};

      if (PHONE_NUMBER_ID && metadata.phone_number_id !== PHONE_NUMBER_ID) {
        console.log(`⏭️ Skipping msg for ${metadata.phone_number_id} (not ${PHONE_NUMBER_ID})`);
        continue;
      }

      if (value.messages) {
        for (const msg of value.messages) {
          await handleIncomingMessage(msg, metadata.display_phone_number);
        }
      }

      if (value.statuses) {
        for (const status of value.statuses) {
          console.log(`📬 Status [${status.status}]: msg ${status.id} → ${status.recipient_id}`);
          // Forward delivery statuses to Slack
          if (status.status === 'delivered' || status.status === 'read') {
            const emoji = status.status === 'delivered' ? '✅' : '👀';
            await notifySlack(`${emoji} Mensaje *${status.status}* para \`${status.recipient_id}\` (id: ${status.id})`);
          } else if (status.status === 'failed') {
            const errors = (status.errors || []).map(e => `${e.code}: ${e.title}`).join(', ');
            await notifySlack(`⚠️ *FALLO DE ENTREGA* para \`${status.recipient_id}\`: ${errors}`);
          }
        }
      }
    }
  }

  return res.sendStatus(200);
});

// ── Slack Events Endpoint ────────────────────────────────────
// POST /slack/events — receives messages from Slack PE channel
// URL Challenge: Slack sends a verification request on setup
app.post('/slack/events', async (req, res) => {
  const body = req.body;

  // Slack URL Verification (one-time challenge)
  if (body.type === 'url_verification') {
    console.log('✅ Slack URL verification challenge');
    return res.json({ challenge: body.challenge });
  }

  // Acknowledge immediately (Slack requires <3s response)
  res.sendStatus(200);

  // Process events
  if (body.type === 'event_callback') {
    const event = body.event || {};

    // Only process messages from our wedding channel
    if (event.channel !== SLACK_CHANNEL_ID) {
      console.log(`⏭️ Skipping Slack event from channel ${event.channel}`);
      return;
    }

    // Skip messages from bots (including ourselves)
    if (event.bot_id || event.subtype === 'bot_message') return;

    // Only handle user messages
    if (event.type === 'message' && event.user && event.text) {
      await handleSlackMessage(event);
    }
  }
});

// ── Slack Message Handler (Slack → WhatsApp) ─────���───────────
async function resolvePhoneFromThread(thread_ts, channel) {
  // 1. Buscar en el mapa phoneToThread (Redis) por thread_ts
  try {
    const keys = await redis.hkeys(CONVERSATION_KEY);
    for (const k of keys) {
      if (k.startsWith('slack:thread:')) {
        const raw = await redis.hget(CONVERSATION_KEY, k);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (data.thread_ts === thread_ts) return k.replace('slack:thread:', '');
      }
    }
  } catch (e) { /* ignore */ }

  // 2. Fallback: leer el header del thread (primer mensaje) y extraer el teléfono
  try {
    const res = await axios.get(
      `https://slack.com/api/conversations.replies?channel=${channel}&ts=${thread_ts}&limit=1`,
      { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
    );
    const parentMsg = res.data?.messages?.[0];
    const match = parentMsg?.text?.match(/\+?(569\d{8})/);
    if (match) return match[1];
  } catch (e) { /* ignore */ }

  return null;
}

async function handleSlackMessage(event) {
  const { user, text, ts, thread_ts, channel } = event;
  console.log(`💬 Slack [${user}]: ${text.slice(0, 100)}`);

  // Comando: tomar control (estilo Yeppo)
  if (text.trim().toLowerCase() === 'tomar') {
    const phone = await resolvePhoneFromThread(thread_ts, channel);
    if (phone) {
      await notifySlackReply(ts, `🎛️ Tomaste control de \`${phone}\`. Escribe tu respuesta en este thread y llegará al invitado. Escribe \`soltar\` para devolver al bot.`);
    } else {
      await notifySlackReply(ts, '⚠️ No pude identificar el teléfono de este hilo.');
    }
    return;
  }

  // Comando: soltar control
  if (text.trim().toLowerCase() === 'soltar') {
    const phone = await resolvePhoneFromThread(thread_ts, channel);
    if (phone) {
      await notifySlackReply(ts, `✅ Bot retoma la conversación de \`${phone}\`.`);
    }
    return;
  }

  // Formato alternativo: +569XXXXXXXX mensaje (sigue funcionando)
  const phoneMatch = text.match(/\+?56\s*9\s*\d{4}\s*\d{4}/);
  let phone = null;
  let message = text;

  if (phoneMatch) {
    phone = normalizePhone(phoneMatch[0]);
    message = text.replace(phoneMatch[0], '').trim();
  } else if (thread_ts) {
    // En thread: resolver el teléfono desde el header (estilo Yeppo)
    phone = await resolvePhoneFromThread(thread_ts, channel);
  }

  if (!phone) {
    await notifySlackReply(ts, '⚠️ No encontré el teléfono. Respondé en el thread del invitado, o escribí: `+569XXXXXXXX tu mensaje`');
    return;
  }

  if (!message) {
    await notifySlackReply(ts, '⚠️ El mensaje está vacío. Escribí tu respuesta en este thread.');
    return;
  }

  // Send the message via WhatsApp
  const result = await sendWhatsAppMessage(phone, message);

  if (result) {
    const preview = message.length > 50 ? message.slice(0, 50) + '...' : message;
    await notifySlackReply(ts, `📤 Enviado a \`${phone}\`: ${preview}`);
  } else {
    await notifySlackReply(ts, `❌ Error al enviar a \`${phone}\`. ¿El número tiene una conversación abierta en las últimas 24h?`);
  }
}

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
  } else if (msgType === 'button') {
    // Quick reply de template llega como type=button (no interactive)
    interactiveType = 'button';
    interactiveId = (msg.button && (msg.button.payload || msg.button.text)) || '';
    text = (msg.button && msg.button.text) || '';
  } else if (msgType === 'image') {
    text = '[Imagen recibida]';
  } else {
    text = `[${msgType}]`;
  }

  console.log(`💬 ${from}: ${text}` + (interactiveId ? ` [btn:${interactiveId}]` : ''));

  // Handle interactive button replies
  if (interactiveType === 'button') {
    await handleButtonReply(from, interactiveId, text);
  } else if (msgType === 'text') {
    // Try to detect RSVP intent in free text
    await handleTextRSVP(from, text);
    // Auto-reply for common keywords
    await sendAutoReply(from, text);
  }

  // Forward to Slack with thread linking
  if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
    await sendToSlack(from, text, timestamp, fromPhone, interactiveId, msg.wamid);
  }

  // Store conversation mapping for Slack→WA replies
  try {
    await redis.hset(CONVERSATION_KEY, `wa:${from}`, JSON.stringify({
      lastMessage: text,
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
    }));
    await redis.expire(CONVERSATION_KEY, 86400 * 30);
  } catch (e) { /* ignore */ }
}

// ── DeepSeek-based RSVP Classification ───────────────────────
// Uses DeepSeek Flash (deepseek-chat) — regla permanente: sin Anthropic
// Falls back to negation-aware heuristic if DEEPSEEK_API_KEY not set

async function classifyRSVPIntent(text) {
  if (!DEEPSEEK_API_KEY) {
    return heuristicRSVP(text);
  }

  try {
    const res = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: DEEPSEEK_MODEL,
      max_tokens: 5,
      messages: [
        { role: 'system', content: 'Clasificá el mensaje como "confirm" (SÍ asiste), "decline" (NO asiste), o "unknown" (no está claro).\n\n⚠️ "no voy" = decline. "no voy a poder" = decline. "no puedo confirmar todavía" = unknown. "sí, voy" = confirm. "dale, ahí estaré" = confirm.\n\nRespondé SOLO una palabra: confirm, decline, o unknown.' },
        { role: 'user', content: text }
      ]
    }, {
      headers: {
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    const classification = (res.data?.choices?.[0]?.message?.content || '').trim().toLowerCase();
    console.log(`🤖 DeepSeek RSVP: "${text.slice(0, 80)}" → ${classification}`);
    return classification || 'unknown';
  } catch (err) {
    console.error('❌ DeepSeek RSVP error:', err.message);
    return heuristicRSVP(text);
  }
}

function heuristicRSVP(text) {
  const lower = text.toLowerCase();

  // Negation-aware: check "no" patterns FIRST
  if (/\bno\s+(?:podr[eé]|puedo|voy\b|pasa|queda|alcanzo|creo\s+que\s+podr[eé])/i.test(lower)) return 'decline';
  if (/\bno\s+(?:voy\s+a\s+poder|creo\s+poder|estar[eé])/i.test(lower)) return 'decline';

  // Strong confirm patterns (checked AFTER negation)
  if (/\ball[ií]\s+estar[eé]/i.test(lower)) return 'confirm';
  if (/\bcontad(?:lo|la|nos|me)\s+conmigo/i.test(lower)) return 'confirm';
  if (/\b(?:yo\s+)?me\s+(?:apunto|sumo)\b/i.test(lower)) return 'confirm';
  if (/\bvoy\s+seguro|seguro\s+que\s+(?:voy|ir[eé])|confirm(?:ado|o\b|amos\b)/i.test(lower)) return 'confirm';

  return 'unknown';
}

async function handleTextRSVP(from, text) {
  const intent = await classifyRSVPIntent(text);

  if (intent === 'confirm') {
    const confirmMsg = `¡Gracias por confirmar, nos alegra mucho! 🎉\n\n📅 Agregá el evento a tu calendario:\n${TENANT.calendarUrl}\n\n📍 ${TENANT.lugar}\n🕕 ${TENANT.hora} hrs (${TENANT.horaNota})\n👔 ${TENANT.dressCode}\n\nPronto te llegará la invitación formal. ¡Nos vemos! ✨`;
    await sendWhatsAppMessage(from, confirmMsg);
    await saveRSVP(from, '✅ Confirmado (texto)', text);
    await notifySlack(`🎉 *RSVP CONFIRMADO (LLM)* \`${from}\`: "${text.slice(0, 100)}"`);
  } else if (intent === 'decline') {
    const declineMsg = `Gracias por avisarnos, lo entendemos completamente 🫶\n\nTe tendremos presente ese día. ¡Un abrazo!`;
    await sendWhatsAppMessage(from, declineMsg);
    await saveRSVP(from, '❌ No asistirá (texto)', text);
    await notifySlack(`💔 *NO ASISTIRÁ (LLM)* \`${from}\`: "${text.slice(0, 100)}"`);
  } else {
    // Unknown intent — use Claude to generate a natural reply
    console.log(`🤷 RSVP unknown: ${from} — "${text.slice(0, 80)}"`);
    await generateAndSendDeepSeekReply(from, text);
  }
}

// ── DeepSeek-Generated Auto-Reply ────────────────────────────
// Generates a natural conversational reply for non-RSVP messages

async function generateAndSendDeepSeekReply(phone, userText) {
  if (!DEEPSEEK_API_KEY) return;

  try {
    const res = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: DEEPSEEK_MODEL,
      max_tokens: 300,
      messages: [
        { role: 'system', content: `Sos el asistente de WhatsApp para la boda de ${TENANT.novios.nombre1} y ${TENANT.novios.nombre2}.

Contexto de la boda:
- Fecha: ${new Date(TENANT.fecha).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Hora: ${TENANT.hora} hrs
- Lugar: ${TENANT.lugar}
- Dress code: ${TENANT.dressCode}

Reglas:
1. SIEMPRE responde en el mismo idioma del invitado (español si escribe español, inglés si escribe inglés)
2. Tono: directo, sin rodeos, informal pero respetuoso. NADA de "espero que estés bien", "saludos cordiales", "quedo atento". Sin chilenismos (nada de "cachai", "puta", "weón")
3. Si preguntan fecha/hora/lugar/ubicación → responde con los datos concretos. Incluí el link del calendario: ${TENANT.calendarUrl}
4. Si NO es pregunta sobre la boda → redirigí amablemente: "Para confirmar tu asistencia usá los botones de arriba, o decime 'voy' o 'no voy a poder'"
5. Máximo 3 oraciones. Breve y útil.
6. Respuestas de UNA SOLA LÍNEA cuando sea posible.` },
        { role: 'user', content: userText }
      ]
    }, {
      headers: {
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 15000
    });

    const reply = (res.data?.choices?.[0]?.message?.content || '').trim();
    if (reply) {
      await sendWhatsAppMessage(phone, reply);
      await notifySlack(`💬 *DeepSeek reply* a \`${phone}\`: "${userText.slice(0, 80)}" → "${reply.slice(0, 100)}"`);
      console.log(`💬 DeepSeek reply sent to ${phone}`);
    }
  } catch (err) {
    console.error('❌ DeepSeek reply error:', err.message);
    // Silent fail — don't spam guest with errors
  }
}

// ── Button Reply Handler ─────────────────────────────────────
async function handleButtonReply(from, buttonId, buttonText) {
  const isConfirm = buttonId === 'Confirmar asistencia' || buttonId === 'confirmar_asistencia';
  const isDecline = buttonId === 'No podre asistir' || buttonId === 'no_asistire';

  if (isConfirm) {
    const confirmMsg = `¡Gracias por confirmar, nos alegra mucho! 🎉\n\n📅 Agregá el evento a tu calendario:\n${TENANT.calendarUrl}\n\n📍 ${TENANT.lugar}\n🕕 ${TENANT.hora} hrs (${TENANT.horaNota})\n👔 ${TENANT.dressCode}\n\nPronto te llegará la invitación formal. ¡Nos vemos! ✨`;
    await sendWhatsAppMessage(from, confirmMsg);
    await saveRSVP(from, '✅ Confirmado (botón)', buttonText);
    await notifySlack(`🎉 *RSVP CONFIRMADO* \`${from}\``);

  } else if (isDecline) {
    const declineMsg = `Gracias por avisarnos, lo entendemos completamente 🫶\n\nTe tendremos presente ese día. ¡Un abrazo!`;
    await sendWhatsAppMessage(from, declineMsg);
    await saveRSVP(from, '❌ No asistirá (botón)', buttonText);
    await notifySlack(`💔 *NO ASISTIRÁ* \`${from}\``);
  }
}

// ── Save RSVP to Redis ───────────────────────────────────────
async function saveRSVP(phone, status, rawReply) {
  try {
    // Check for existing RSVP from this phone (upsert)
    const entries = await redis.lrange(RSVP_KEY, 0, -1);
    let foundIdx = -1;
    for (let i = 0; i < entries.length; i++) {
      const e = JSON.parse(entries[i]);
      if (e.telefono === phone) {
        foundIdx = i;
        break;
      }
    }

    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      telefono: phone,
      rsvp: status,
      notas: rawReply || '',
      updated: foundIdx >= 0 ? 'actualizado' : 'nuevo',
    });

    if (foundIdx >= 0) {
      // Replace existing entry
      await redis.lset(RSVP_KEY, foundIdx, entry);
      console.log(`📊 RSVP updated: ${phone} → ${status}`);
    } else {
      await redis.rpush(RSVP_KEY, entry);
      console.log(`📊 RSVP saved: ${phone} → ${status} (total: ${await redis.llen(RSVP_KEY)})`);
    }
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

async function notifySlackReply(threadTs, text) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) return;
  try {
    await axios.post(`${SLACK_API}/chat.postMessage`, {
      channel: SLACK_CHANNEL_ID,
      text,
      thread_ts: threadTs,
      mrkdwn: true,
    }, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Slack reply error:', err.message);
  }
}

async function getOrCreateSlackThread(phone) {
  // Retorna { thread_ts, headerTs } creando el thread si no existe (estilo Yeppo)
  const existing = await redis.hget(CONVERSATION_KEY, `slack:thread:${phone}`);
  if (existing) {
    try {
      const data = JSON.parse(existing);
      // Thread expirado (>24h)
      if (Date.now() - (data.timestamp || 0) < 24 * 60 * 60 * 1000) {
        return data;
      }
    } catch (e) { /* ignore */ }
  }

  // Crear header del thread con el teléfono visible
  const headerBase = `📱 *+${phone}*`;
  const headerText = `🟡 ${headerBase}\n*Estado:* En curso — bot respondiendo\n\nComandos: \`tomar\` · \`soltar\``;
  const res = await axios.post(`${SLACK_API}/chat.postMessage`, {
    channel: SLACK_CHANNEL_ID,
    text: headerText,
    mrkdwn: true,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: headerText } }],
  }, {
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.data?.ts) {
    const data = { thread_ts: res.data.ts, headerTs: res.data.ts, headerBase, channel: SLACK_CHANNEL_ID, timestamp: Date.now() };
    await redis.hset(CONVERSATION_KEY, `slack:thread:${phone}`, JSON.stringify(data));
    await redis.expire(CONVERSATION_KEY, 86400 * 30);
    return data;
  }
  return null;
}

async function sendToSlack(from, text, timestamp, fromPhone, buttonId, wamid) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) return;
  try {
    const msgTime = new Date(parseInt(timestamp) * 1000).toISOString();
    let slackMsg = `💬 *Invitado:* ${text}`;
    if (buttonId) slackMsg += `\n> *Botón:* \`${buttonId}\``;
    slackMsg += `\n> *Hora:* ${msgTime}`;

    // Thread estilo Yeppo: header + reply
    const thread = await getOrCreateSlackThread(from);
    if (thread?.thread_ts) {
      await axios.post(`${SLACK_API}/chat.postMessage`, {
        channel: SLACK_CHANNEL_ID,
        thread_ts: thread.thread_ts,
        text: slackMsg,
        mrkdwn: true,
      }, {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Fallback: mensaje suelto (si no hay thread)
      await axios.post(`${SLACK_API}/chat.postMessage`, {
        channel: SLACK_CHANNEL_ID,
        text: `${slackMsg}\n\n> ${from}`,
        mrkdwn: true,
      }, {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (wamid) {
      try {
        await redis.hset(SLACK_TS_KEY, wamid, thread?.thread_ts || '');
        await redis.expire(SLACK_TS_KEY, 86400 * 30);
      } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.error('Slack send error:', err.message);
  }
}

// ── Auto-Reply ────────────────────────────────────────────────
async function sendAutoReply(to, text) {
  let reply = null;
  const lower = text.toLowerCase();

  if (/hola|buenas|ola|holi|hey|info/i.test(lower) && lower.length < 20) {
    reply = `¡Hola! 💒 Somos ${TENANT.novios.nombre1} y ${TENANT.novios.nombre2}.\n\nNos casamos el *17 de noviembre de 2026* a las *${TENANT.hora}* (${TENANT.horaNota}) en *${TENANT.lugar}*.\n\n🎎 Celebración boda China / Coreana — dress code *${TENANT.dressCode}*.\n\nPronto recibirás la invitación formal. Mientras tanto, puedes visitar nuestro sitio: ${TENANT.siteUrl}`;
  } else if (/fecha|cu[aá]ndo|d[ií]a\b.*(?:boda|casamiento|evento)/i.test(lower)) {
    reply = `📅 Nos casamos el *17 de noviembre de 2026* a las *${TENANT.hora}* (${TENANT.horaNota})\n📍 ${TENANT.lugar}\n👗 ${TENANT.dressCode}`;
  } else if (/lugar|d[oó]nde|ubicaci[oó]n|direcci[oó]n/i.test(lower)) {
    reply = `📍 ${TENANT.lugar}\n\n🗺️ Google Maps: https://maps.google.com/?q=Restaurante+Meihua+Cerrillos`;
  }

  if (reply) {
    await sendWhatsAppMessage(to, reply);
  }
}

// ── Send WhatsApp Message ─────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp not configured');
    return null;
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
    const msgId = res.data?.messages?.[0]?.id;
    console.log(`✅ Sent to ${to}: ${msgId || 'ok'}`);
    return res.data;
  } catch (err) {
    const error = err.response?.data || err.message;
    console.error(`❌ Failed to send to ${to}:`, JSON.stringify(error).slice(0, 200));
    return null;
  }
}

// ── Send WhatsApp Template ────────────────────────────────────
async function sendTemplate(to, templateName, params = []) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp not configured');
    return null;
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

// ─────────────── ADMIN ENDPOINTS ──────────────────────────────

app.get('/admin/config', (_req, res) => {
  res.json({
    tenant: TENANT,
    configured: {
      whatsappToken: !!WHATSAPP_TOKEN,
      phoneNumberId: !!PHONE_NUMBER_ID,
      slackBotToken: !!SLACK_BOT_TOKEN,
      slackChannelId: !!SLACK_CHANNEL_ID,
      slackSigningSecret: !!SLACK_SIGNING_SECRET,
      verifyToken: !!VERIFY_TOKEN,
      redis: redis.status === 'ready',
    },
    slackEventUrl: SLACK_SIGNING_SECRET
      ? 'https://claw-wedding-agent-production.up.railway.app/slack/events'
      : '⚠️ Configurar SLACK_SIGNING_SECRET',
  });
});

app.post('/admin/test-message', async (req, res) => {
  const { to, text } = req.body;
  if (!to) return res.status(400).json({ error: 'Phone number required' });
  const result = await sendWhatsAppMessage(to, text || '🧪 Mensaje de prueba — claw-wedding-agent v1.4');
  res.json({ sent: !!result, result });
});

app.post('/admin/test-template', async (req, res) => {
  const { to, template, params } = req.body;
  if (!to || !template) return res.status(400).json({ error: 'Phone and template required' });
  const result = await sendTemplate(to, template, params || []);
  res.json({ sent: !!result, result });
});

// NEW: Simulate an incoming WhatsApp webhook (for testing the full flow)
app.post('/admin/simulate-webhook', async (req, res) => {
  const { from, type, text, buttonId } = req.body;

  if (!from) return res.status(400).json({ error: 'Phone number (from) required' });

  const phone = normalizePhone(from);

  if (type === 'text') {
    const msg = { from: phone, timestamp: Math.floor(Date.now() / 1000), type: 'text', text: { body: text || 'Hola' } };
    await handleIncomingMessage(msg, '5497 (simulado)');
    return res.json({ ok: true, simulated: 'text', from: phone, text });

  } else if (type === 'button') {
    const btnId = buttonId || 'Confirmar asistencia';
    const btnTitle = buttonId === 'no_asistire' || buttonId === 'No podre asistir' ? 'No podre asistir' : 'Confirmar asistencia';
    const msg = {
      from: phone,
      timestamp: Math.floor(Date.now() / 1000),
      type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: btnId, title: btnTitle } },
    };
    await handleIncomingMessage(msg, '5497 (simulado)');
    return res.json({ ok: true, simulated: 'button', from: phone, button: btnId });

  } else {
    return res.status(400).json({ error: 'Type must be "text" or "button"' });
  }
});

// NEW: Simulate multiple RSVPs at once (batch test)
app.post('/admin/simulate-batch', async (req, res) => {
  const { phones } = req.body;
  if (!phones || !Array.isArray(phones)) return res.status(400).json({ error: 'Array of phone numbers required' });

  const results = [];
  for (const entry of phones) {
    const phone = normalizePhone(typeof entry === 'string' ? entry : entry.phone);
    const rsvp = entry.rsvp || '✅ Confirmado (botón)';

    if (entry.rsvp === 'no') {
      const msg = {
        from: phone,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'interactive',
        interactive: { type: 'button_reply', button_reply: { id: 'No podre asistir', title: 'No podre asistir' } },
      };
      await handleIncomingMessage(msg, '5497 (batch)');
      results.push({ phone, rsvp: 'declined' });
    } else {
      const msg = {
        from: phone,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'interactive',
        interactive: { type: 'button_reply', button_reply: { id: 'Confirmar asistencia', title: 'Confirmar asistencia' } },
      };
      await handleIncomingMessage(msg, '5497 (batch)');
      results.push({ phone, rsvp: 'confirmed' });
    }
  }

  res.json({ ok: true, processed: results.length, results });
});

// NEW: Send from Slack — trigger WhatsApp message
// Use this with Slack Outgoing Webhook or Slash Command
app.post('/admin/send-from-slack', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required (format: +569XXXXXXXX mensaje)' });

  const phoneMatch = text.match(/\+?56\s*9\s*\d{4}\s*\d{4}/);
  if (!phoneMatch) return res.status(400).json({ error: 'No phone number found. Format: +569XXXXXXXX mensaje' });

  const phone = normalizePhone(phoneMatch[0]);
  const message = text.replace(phoneMatch[0], '').trim();

  if (!message) return res.status(400).json({ error: 'Empty message after phone number' });

  const result = await sendWhatsAppMessage(phone, message);
  res.json({
    sent: !!result,
    to: phone,
    message: message.slice(0, 100),
    result: result ? 'accepted' : 'failed',
  });
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

// NEW: Conversation info (for Slack reply context)
app.get('/admin/conversations', async (_req, res) => {
  try {
    const all = await redis.hgetall(CONVERSATION_KEY);
    const waConversations = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith('wa:')) {
        waConversations[key.slice(3)] = JSON.parse(value);
      }
    }
    res.json({ total: Object.keys(waConversations).length, conversations: waConversations });
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
    console.log(`💒 claw-wedding-agent v1.5.0 running on port ${PORT}`);
    console.log(`   Tenant:          ${TENANT.id}`);
    console.log(`   Health:          http://localhost:${PORT}/status`);
    console.log(`   Webhook WA:      http://localhost:${PORT}/webhook`);
    console.log(`   Webhook Slack:   http://localhost:${PORT}/slack/events`);
    console.log(`   WhatsApp:        ${WHATSAPP_TOKEN ? '✅ configured' : '❌ missing'}`);
    console.log(`   Slack:           ${SLACK_BOT_TOKEN && SLACK_CHANNEL_ID ? '✅ configured' : '❌ missing'}`);
    console.log(`   Slack Events:    ${SLACK_SIGNING_SECRET ? '✅ configured' : '⚠️ not configured (needed for Slack→WA)'}`);
    console.log(`   DeepSeek LLM:   ${DEEPSEEK_API_KEY ? `✅ ${DEEPSEEK_MODEL}` : '⚠️ heuristic fallback'}`);
    console.log(`   Redis:           ${redis.status === 'ready' ? '✅ connected' : '❌ not connected'}`);
    console.log(`   Simulator:       http://localhost:${PORT}/admin/simulate-webhook`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

module.exports = { app, sendWhatsAppMessage, sendTemplate, TENANT };
