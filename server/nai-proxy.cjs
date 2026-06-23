const express = require('express');
const { createProactiveReminderStore } = require('./proactive-reminders.cjs');

const defaultPort = Number(process.env.NAI_PROXY_PORT || process.env.PORT || 8789);
const defaultExpoPushUrl = 'https://exp.host/--/api/v2/push/send';

function createExpoPushSender({ endpoint = process.env.EXPO_PUSH_URL || defaultExpoPushUrl } = {}) {
  return async (messages) => {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      throw new Error(`Expo push failed: HTTP ${response.status}${text ? ` - ${text.slice(0, 300)}` : ''}`);
    }
    return Array.isArray(data?.data) ? data.data : [];
  };
}

function buildExpoPushMessages(item, devices) {
  return devices.map((device) => ({
    to: device.pushToken,
    sound: 'default',
    title: 'Small Phone reminder',
    body: item.content,
    data: {
      type: 'proactive-reminder',
      outboxId: item.id,
      reminderId: item.reminderId,
      occurrenceKey: item.occurrenceKey,
      clientId: item.clientId,
      characterId: item.characterId,
      channel: item.channel,
    },
  }));
}

function createNaiProxyApp({ pushSender = createExpoPushSender(), nowProvider = Date.now } = {}) {
  const app = express();
  const allowedOrigin = process.env.NAI_ALLOWED_ORIGIN || '*';
  const reminderStore = createProactiveReminderStore({ filePath: process.env.PROACTIVE_REMINDER_STORE_PATH });
  const reminderIntervalMs = Math.max(5000, Number(process.env.PROACTIVE_REMINDER_TICK_MS || 30000));

  app.use(express.json({ limit: process.env.NAI_PROXY_BODY_LIMIT || '2mb' }));
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  const pushCreatedReminders = async (items) => {
    for (const item of items) {
      const devices = reminderStore.getDevicesForClient(item.clientId);
      if (devices.length === 0) {
        console.log(`No push device registered for proactive reminder client ${item.clientId}.`);
        continue;
      }
      const messages = buildExpoPushMessages(item, devices);
      try {
        const results = await pushSender(messages);
        devices.forEach((device, index) => {
          reminderStore.markOutboxPushed(item.id, device.pushToken, results[index] || { status: 'unknown' });
        });
        console.log(`Sent ${messages.length} proactive reminder push notification(s) for ${item.occurrenceKey}.`);
      } catch (error) {
        console.error('Proactive reminder push failed:', error instanceof Error ? error.message : error);
      }
    }
  };

  const checkReminders = async () => {
    const created = reminderStore.checkDueReminders(nowProvider());
    if (created.length > 0) {
      console.log(`Queued ${created.length} proactive reminder message(s).`);
      await pushCreatedReminders(created);
    }
    return created;
  };

  app.post('/api/nai/generate-image', async (req, res) => {
    try {
      const module = await import('../api/nai/generate-image.js');
      await module.default(req, res);
    } catch (error) {
      res.status(500).json({
        ok: false,
        message: 'NAI proxy handler failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/nai/health', (req, res) => {
    res.json({
      ok: true,
      relay: process.env.NAI_RELAY_URL ? 'enabled' : 'disabled',
      proxy: process.env.NAI_HTTPS_PROXY || process.env.HTTPS_PROXY ? 'enabled' : 'disabled',
    });
  });

  app.post('/api/proactive-reminders', (req, res) => {
    try {
      const reminder = reminderStore.upsertReminder(req.body || {});
      res.json({ ok: true, reminder });
    } catch (error) {
      res.status(400).json({ ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/proactive-reminders/devices', (req, res) => {
    try {
      const device = reminderStore.upsertDevice(req.body || {});
      res.json({ ok: true, device });
    } catch (error) {
      res.status(400).json({ ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/proactive-reminders/outbox', async (req, res) => {
    const clientId = String(req.query.clientId || 'default');
    await checkReminders();
    res.json({ ok: true, items: reminderStore.getPendingOutbox(clientId) });
  });

  app.post('/api/proactive-reminders/outbox/:id/ack', (req, res) => {
    const clientId = String(req.body?.clientId || req.query.clientId || 'default');
    const item = reminderStore.ackOutbox(req.params.id, clientId);
    if (!item) {
      res.status(404).json({ ok: false, message: 'outbox item not found' });
      return;
    }
    res.json({ ok: true, item });
  });

  app.get('/api/proactive-reminders/health', (req, res) => {
    const state = reminderStore.read();
    res.json({
      ok: true,
      reminders: state.reminders.length,
      outbox: state.outbox.length,
      devices: state.devices.length,
      tickMs: reminderIntervalMs,
    });
  });

  const timer = setInterval(() => {
    void checkReminders();
  }, reminderIntervalMs);
  timer.unref?.();

  return app;
}

if (require.main === module) {
  createNaiProxyApp().listen(defaultPort, () => {
    console.log(`Small phone NAI proxy listening on ${defaultPort}`);
  });
}

module.exports = {
  createNaiProxyApp,
  buildExpoPushMessages,
  createExpoPushSender,
};
