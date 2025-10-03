// backend/services/logs.service.js
import pool from '../db/index.js';

// Helper: ensure daily log exists and return id
async function getOrCreateDailyLog(client, driverId, logDate) {
  const sel = await client.query(
    `SELECT id FROM logs WHERE driver_id=$1 AND log_date=$2 FOR UPDATE`,
    [driverId, logDate]
  );
  if (sel.rows.length) return sel.rows[0].id;
  const ins = await client.query(
    `INSERT INTO logs (driver_id, log_date) VALUES ($1,$2) RETURNING id`,
    [driverId, logDate]
  );
  return ins.rows[0].id;
}

/**
 * Insert events (idempotent by client_event_id)
 * events input shape:
 * { clientEventId, status, time, logDate, location, eldIdentifier, odometer, engineHours }
 */
export async function upsertLogsForDriver(driverUsername, events) {
  const client = await pool.connect();
  const savedIds = [];
  try {
    await client.query('BEGIN');

    // find driver id
    const d = await client.query(`SELECT id FROM drivers WHERE username=$1 LIMIT 1`, [driverUsername]);
    if (!d.rows.length) throw new Error('Driver not found');
    const driverId = d.rows[0].id;

    // group events by logDate
    const byDate = {};
    for (const ev of events) {
      const key = ev.logDate || (new Date(ev.time)).toISOString().split('T')[0];
      (byDate[key] = byDate[key] || []).push(ev);
    }

    for (const [logDate, list] of Object.entries(byDate)) {
      const logId = await getOrCreateDailyLog(client, driverId, logDate);

      // ... inside upsertLogsForDriver after obtaining logId
for (const ev of list) {
  // normalize clientEventId (supports clientEventId, client_event_id, id)
  const clientEventId = ev.clientEventId || ev.client_event_id || ev.id || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

  // basic validation: we require time and status (clientEventId is normalized above)
  if (!ev?.time || !ev?.status) {
    console.warn('Skipping malformed event (missing time/status)', ev);
    continue;
  }

  // idempotency check by clientEventId
  const exists = await client.query(
    `SELECT id FROM log_events WHERE client_event_id=$1 LIMIT 1`,
    [clientEventId]
  );
  if (exists.rows.length) {
    savedIds.push(clientEventId);
    continue;
  }

  await client.query(
    `INSERT INTO log_events
       (log_id, status, event_time, location, odometer, engine_hours, eld_identifier, client_event_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      logId,
      ev.status,
      ev.time,
      ev.location ? ev.location : null,
      typeof ev.odometer === 'number' ? ev.odometer : null,
      typeof ev.engineHours === 'number' ? ev.engineHours : null,
      ev.eldIdentifier || null,
      clientEventId
    ]
  );
  console.log("Processing events for", driverUsername, logDate, JSON.stringify(list, null, 2));

  savedIds.push(clientEventId);
}

    }

    await client.query('COMMIT');
    return savedIds;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Save/update per-day metadata (form fields)
 * formData is JSON (object)
 */
export async function upsertLogMeta(driverUsername, logDate, formData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const d = await client.query(`SELECT id FROM drivers WHERE username=$1 LIMIT 1`, [driverUsername]);
    if (!d.rows.length) throw new Error('Driver not found');
    const driverId = d.rows[0].id;

    // ensure daily log exists
    const sel = await client.query(`SELECT id, metadata FROM logs WHERE driver_id=$1 AND log_date=$2`, [driverId, logDate]);
    if (sel.rows.length) {
      // merge metadata JSONB
      await client.query(
        `UPDATE logs SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb WHERE id=$2`,
        [JSON.stringify(formData), sel.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO logs (driver_id, log_date, metadata) VALUES ($1,$2,$3)`,
        [driverId, logDate, JSON.stringify(formData)]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Mark a day's log as certified, store signature and certifier
 */
export async function markLogCertified(driverUsername, logDate, signatureBase64, certifierName = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const d = await client.query(`SELECT id FROM drivers WHERE username=$1 LIMIT 1`, [driverUsername]);
    if (!d.rows.length) throw new Error('Driver not found');
    const driverId = d.rows[0].id;

    const sel = await client.query(`SELECT id FROM logs WHERE driver_id=$1 AND log_date=$2`, [driverId, logDate]);
    if (sel.rows.length) {
      await client.query(
        `UPDATE logs SET certified=true, certified_at=now(), certified_by=$1, signature=$2 WHERE id=$3`,
        [certifierName, signatureBase64, sel.rows[0].id]
      );
    } else {
      // create row and mark certified
      await client.query(
        `INSERT INTO logs (driver_id, log_date, certified, certified_at, certified_by, signature)
         VALUES ($1, $2, true, now(), $3, $4)`,
        [driverId, logDate, certifierName, signatureBase64]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Fetch last N days of logs for driver with their events
 */
export async function fetchLogsForDriver(driverUsername, days = 7) {
  const client = await pool.connect();
  try {
    // find driver
    const d = await client.query(`SELECT id FROM drivers WHERE username=$1 LIMIT 1`, [driverUsername]);
    if (!d.rows.length) return [];
    const driverId = d.rows[0].id;

    const rows = await client.query(
      `SELECT l.id as log_id, l.log_date, l.metadata, l.certified, l.certified_at, l.certified_by, l.signature,
              le.id as event_id, le.status, le.event_time, le.location, le.odometer, le.engine_hours, le.eld_identifier, le.client_event_id
       FROM logs l
       LEFT JOIN log_events le ON le.log_id = l.id
       WHERE l.driver_id = $1 AND l.log_date >= $2
       ORDER BY l.log_date DESC, le.event_time ASC`,
      [driverId, new Date(Date.now() - (days - 1) * 24 * 3600 * 1000).toISOString().split('T')[0]]
    );

    // group rows by log_date
    const map = new Map();
    for (const r of rows.rows) {
      const key = r.log_date.toISOString().split('T')[0];
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          metadata: r.metadata || {},
          certified: r.certified || false,
          certified_at: r.certified_at,
          certified_by: r.certified_by,
          signature: r.signature,
          events: []
        });
      }
      if (r.event_id) {
        map.get(key).events.push({
          id: r.event_id,
          status: r.status,
          time: r.event_time,
          location: r.location,
          odometer: r.odometer,
          engineHours: r.engine_hours,
          eldIdentifier: r.eld_identifier,
          clientEventId: r.client_event_id
        });
      }
    }

    return Array.from(map.values()).sort((a,b) => b.date.localeCompare(a.date));
  } finally {
    client.release();
  }
}
