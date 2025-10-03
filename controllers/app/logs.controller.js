// backend/controllers/app/logs.controller.js
import { upsertLogsForDriver, upsertLogMeta, markLogCertified, fetchLogsForDriver } from '../../service/logs.service.js';

export async function syncLogs(req, res) {
  
  try {
    console.log("📥 Received sync request:", JSON.stringify(req.body, null, 2));
    const { driverUsername, events } = req.body || {};

    if (!driverUsername || !Array.isArray(events)) {
      return res.status(400).json({ error: 'driverUsername and events[] required' });
    }
    const savedClientEventIds = await upsertLogsForDriver(driverUsername, events);
    res.json({ savedClientEventIds });
  } catch (e) {
    console.error('syncLogs error', e);
    res.status(500).json({ error: 'Failed to sync logs' });
  }
}

export async function submitForm(req, res) {
  
  try {
    console.log("📥 Incoming form payload:", JSON.stringify(req.body, null, 2));
    const { driverUsername, logDate, formData } = req.body || {};
    if (!driverUsername || !logDate || !formData) {
      return res.status(400).json({ error: 'driverUsername, logDate, formData required' });
    }
    await upsertLogMeta(driverUsername, logDate, formData);
    res.json({ ok: true });
  } catch (e) {
    console.error('submitForm error', e);
    res.status(500).json({ error: 'Failed to save form' });
  }
}

export async function certifyLog(req, res) {
  
  try {
    console.log("📥 Incoming certify payload:", JSON.stringify(req.body, null, 2));
    const { driverUsername, logDate, signature, certifierName } = req.body || {};
    if (!driverUsername || !logDate || !signature) {
      return res.status(400).json({ error: 'driverUsername, logDate, signature required' });
    }
    await markLogCertified(driverUsername, logDate, signature, certifierName || null);
    res.json({ ok: true });
  } catch (e) {
    console.error('certifyLog error', e);
    res.status(500).json({ error: 'Failed to certify log' });
  }
}

export async function getLogsForDriver(req, res) {
  try {
    const username = req.params.username;
    const days = Number(req.query.days || 7);
    if (!username) return res.status(400).json({ error: 'username required' });
    const data = await fetchLogsForDriver(username, days);
    res.json({ logs: data });
  } catch (e) {
    console.error('getLogsForDriver error', e);
    res.status(500).json({ error: 'Failed to get logs' });
  }
}
