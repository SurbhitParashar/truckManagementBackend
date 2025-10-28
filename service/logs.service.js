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

    const d = await client.query(`SELECT id FROM drivers WHERE username=$1 LIMIT 1`, [driverUsername]);
    if (!d.rows.length) throw new Error('Driver not found');
    const driverId = d.rows[0].id;

    const byDate = {};
    for (const ev of events) {
      const key = ev.logDate || (new Date(ev.time)).toISOString().split('T')[0];
      (byDate[key] = byDate[key] || []).push(ev);
    }

    for (const [logDate, list] of Object.entries(byDate)) {
      const logId = await getOrCreateDailyLog(client, driverId, logDate);

      // upsert events (your existing code)
      for (const ev of list) {
        const clientEventId = ev.clientEventId || ev.client_event_id || ev.id || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
        if (!ev?.time || !ev?.status) {
          console.warn('Skipping malformed event (missing time/status)', ev);
          continue;
        }

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
        savedIds.push(clientEventId);
      }

      // AFTER events inserted for this log: fetch events for that log to compute hourly samples
      const evRows = await client.query(
        `SELECT id, status, event_time as time, location, odometer, engine_hours, eld_identifier
         FROM log_events WHERE log_id=$1 ORDER BY event_time ASC`,
        [logId]
      );

      // map events into the shape expected by computeHourlySamplesFromEvents
      const mappedEvents = evRows.rows.map(r => ({
        id: r.id,
        status: r.status,
        time: r.time,
        location: r.location,
        odometer: r.odometer,
        engineHours: r.engine_hours,
        eldIdentifier: r.eld_identifier
      }));

      const samples = computeHourlySamplesFromEvents(logId, mappedEvents, logDate);
      await upsertHourlySamplesForLog(client, logId, samples);
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

  // --- Helper function: calculate per-day summary ---
  function calculateDailySummary(events) {
    const summary = {
      break: 0,
      drive: 0,
      shift: 0,
      cycle: 0,
      lastDuty: "OFF_DUTY",
      vehicle: null
    };

    if (!events || events.length === 0) return summary;

    // Sort by time (oldest first)
    events.sort((a, b) => new Date(a.time) - new Date(b.time));

    for (let i = 0; i < events.length - 1; i++) {
      const curr = events[i];
      const next = events[i + 1];
      const durationHrs = (new Date(next.time) - new Date(curr.time)) / 3600000;

      switch (curr.status) {
        case "DRIVING":
          summary.drive += durationHrs;
          break;
        case "OFF_DUTY":
        case "SLEEPER":
          summary.break += durationHrs;
          break;
        case "ON_DUTY":
          summary.shift += durationHrs;
          break;
      }
      summary.lastDuty = curr.status;
    }

    // Vehicle — use last event's ELD ID if available
    summary.vehicle = events[events.length - 1]?.eldIdentifier || null;

    // For now hardcode cycle; can compute via FMCSA 70-hr rule later
    summary.cycle = 70;

    // Round to 2 decimals
    summary.break = +summary.break.toFixed(2);
    summary.drive = +summary.drive.toFixed(2);
    summary.shift = +summary.shift.toFixed(2);

    return summary;
  }

  try {
    // --- Step 1: Find driver ---
    const d = await client.query(`SELECT id FROM drivers WHERE username=$1 LIMIT 1`, [driverUsername]);
    if (!d.rows.length) return [];
    const driverId = d.rows[0].id;

    // --- Step 2: Query logs + events ---
    const sinceDate = new Date(Date.now() - (days - 1) * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];

    const rows = await client.query(
      `SELECT 
          l.id as log_id, l.log_date, l.metadata, l.certified, 
          l.certified_at, l.certified_by, l.signature,
          le.id as event_id, le.status, le.event_time, le.location, 
          le.odometer, le.engine_hours, le.eld_identifier, le.client_event_id
       FROM logs l
       LEFT JOIN log_events le ON le.log_id = l.id
       WHERE l.driver_id = $1 AND l.log_date >= $2
       ORDER BY l.log_date DESC, le.event_time ASC`,
      [driverId, sinceDate]
    );

    // --- Step 3: Group by log_date ---
    const map = new Map();

    for (const r of rows.rows) {
      const key = r.log_date.toISOString().split("T")[0];
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

      // Add event if exists
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

    // inside fetchLogsForDriver, after grouping events per day

// fetch hourly samples for the set of logs we have
const logIds = rows.rows
  .filter(r => r.log_id)
  .map(r => r.log_id)
  .filter((v,i,a)=>a.indexOf(v)===i);

if (logIds.length) {
  const q = await client.query(
    `SELECT id, log_id, hour, start_time, end_time, status, event_id, odometer, engine_hours, location
     FROM daily_hourly_samples WHERE log_id = ANY($1::int[]) ORDER BY log_id, hour`,
    [logIds]
  );

  const samplesMap = new Map(); // key: log_id -> array
  for (const s of q.rows) {
    if (!samplesMap.has(s.log_id)) samplesMap.set(s.log_id, []);
    samplesMap.get(s.log_id).push({
      id: s.id,
      hour: s.hour,
      start_time: s.start_time,
      end_time: s.end_time,
      status: s.status,
      event_id: s.event_id,
      odometer: s.odometer,
      engine_hours: s.engine_hours,
      location: s.location
    });
  }

  // attach to logs built earlier
  for (const log of logs) {
    // you need a way to map log -> log_id. When building `map` above you put log_id in rows?
    // We can query log id as well when grouping — ensure map values include log_id.
    // Assuming when grouping we created log object with 'log_id' property:
    const matchingRow = rows.rows.find(r => r.log_date.toISOString().split('T')[0] === log.date);
    if (matchingRow && matchingRow.log_id && samplesMap.has(matchingRow.log_id)) {
      log.hourlySamples = samplesMap.get(matchingRow.log_id);
    } else {
      log.hourlySamples = [];
    }
  }
}




    // --- Step 4: Add summaries per day ---
    const logs = Array.from(map.values()).map((log) => ({
      ...log,
      summary: calculateDailySummary(log.events)
    }));


    // --- Step 5: Sort by date descending ---
    return logs.sort((a, b) => b.date.localeCompare(a.date));
    

  } finally {
    client.release();
  }
}


function calculateDailySummary(events) {
  const summary = { break: 0, drive: 0, shift: 0, cycle: 0, lastDuty: "OFF_DUTY", vehicle: null };
  
  if (!events || events.length === 0) return summary;

  // Sort by time
  events.sort((a, b) => new Date(a.time) - new Date(b.time));

  for (let i = 0; i < events.length - 1; i++) {
    const curr = events[i];
    const next = events[i + 1];
    const durationHrs = (new Date(next.time) - new Date(curr.time)) / 3600000;

    switch (curr.status) {
      case "DRIVING":
        summary.drive += durationHrs;
        break;
      case "OFF_DUTY":
      case "SLEEPER":
        summary.break += durationHrs;
        break;
      case "ON_DUTY":
        summary.shift += durationHrs;
        break;
    }
    summary.lastDuty = curr.status;
  }

  // Hardcode cycle for now — later compute via FMCSA 70-hour rule
  summary.cycle = 70;
  return summary;
}



function computeHourlySamplesFromEvents(logId, events, logDate) {
  // events: array sorted ascending by time
  // logDate: 'YYYY-MM-DD' string, used to build day's boundaries
  // return: array of rows for hours that have status (others may be absent)
  if (!events) events = [];
  events = [...events].sort((a,b)=> new Date(a.time) - new Date(b.time));

  const dayStart = new Date(logDate + 'T00:00:00.000Z'); // careful with timezone if needed
  const result = [];

  // If no events, return empty array (frontend fallback can show blank)
  if (events.length === 0) return result;

  // Build timeline: for each event, determine its effective end (next event.time or end of day)
  for (let i = 0; i < events.length; i++) {
    const curr = events[i];
    const next = events[i+1];
    const start = new Date(curr.time);
    const end = next ? new Date(next.time) : new Date(new Date(logDate + 'T23:59:59.999Z'));

    // clamp to day bounds
    const s = start < dayStart ? dayStart : start;
    const e = end;

    // iterate over each hour slot overlapped by [s,e)
    let slotHour = s.getUTCHours();
    // compute start of slot
    while (true) {
      const slotStart = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), slotHour, 0, 0));
      const slotEnd = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), slotHour, 59, 59, 999));

      // overlap check
      const overlapStart = s > slotStart ? s : slotStart;
      const overlapEnd = e < slotEnd ? e : slotEnd;

      if (overlapEnd > overlapStart) {
        result.push({
          log_id: logId,
          hour: slotHour,
          start_time: overlapStart.toISOString(),
          end_time: overlapEnd.toISOString(),
          status: curr.status,
          event_time: curr.time,
          event_id: curr.id || null,
          odometer: curr.odometer || null,
          engine_hours: curr.engineHours || curr.engine_hours || null,
          location: curr.location || null
        });
      }

      slotHour++;
      if (slotHour > 23) break;
      // stop if we've reached end of event region
      const nextSlotStart = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), slotHour, 0, 0));
      if (nextSlotStart >= e) break;
    }
  }

  // reduce by hour so we have 1 row per hour: if multiple entries exist for same hour keep first one (or prefer driving)
  const byHourMap = new Map();
  for (const r of result) {
    if (!byHourMap.has(r.hour)) byHourMap.set(r.hour, r);
    else {
      // optional: prefer DRIVING over ON_DUTY over OFF_DUTY
      const existing = byHourMap.get(r.hour);
      const precedence = { 'DRIVING': 3, 'ON_DUTY':2, 'OFF_DUTY':1, 'SLEEPER':1 };
      const exScore = precedence[existing.status] || 0;
      const rScore = precedence[r.status] || 0;
      if (rScore > exScore) byHourMap.set(r.hour, r);
    }
  }

  // return sorted array
  return Array.from(byHourMap.values()).sort((a,b)=>a.hour-b.hour);
}

/**
 * Upsert hourly samples for a given log id.
 * Will insert or update rows in daily_hourly_samples and remove rows not present in samples.
 */
async function upsertHourlySamplesForLog(client, logId, samples) {
  // samples: [{hour, start_time, end_time, status, event_id, odometer, engine_hours, location}]
  // We'll upsert per hour. Use a temp table or loop (loop is simpler).
  if (!samples || samples.length === 0) {
    // Optionally delete any existing rows for this log if no samples are present
    await client.query(`DELETE FROM daily_hourly_samples WHERE log_id=$1`, [logId]);
    return;
  }

  for (const s of samples) {
    // Upsert by unique (log_id, hour)
    await client.query(
      `INSERT INTO daily_hourly_samples
        (log_id, hour, start_time, end_time, status, event_id, odometer, engine_hours, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (log_id, hour) DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         status = EXCLUDED.status,
         event_id = EXCLUDED.event_id,
         odometer = EXCLUDED.odometer,
         engine_hours = EXCLUDED.engine_hours,
         location = EXCLUDED.location`,
      [logId, s.hour, s.start_time, s.end_time, s.status, s.event_id, s.odometer, s.engine_hours, s.location]
    );
  }
}
