import pool from '../db/index.js';

export async function fetchLogsForDriver(driverUsername) {
  const client = await pool.connect();
  try {
    // Fetch driver info
    const driverRes = await client.query(
      `SELECT id, first_name, last_name, email, hos_rules, added_by_company_id
       FROM drivers
       WHERE username=$1
       LIMIT 1`,
      [driverUsername]
    );
    if (!driverRes.rows.length) return { driver: null, logs: [], company: null };

    const driver = driverRes.rows[0];
    const driverId = driver.id;

    // Fetch company info if driver has company
    let company = null;
    if (driver.added_by_company_id) {
      const companyRes = await client.query(
        `SELECT id, companyname, dot_number, address, city, state, hos_rules
         FROM companies
         WHERE id=$1 LIMIT 1`,
        [driver.added_by_company_id]
      );
      company = companyRes.rows[0] || null;
    }

    // Fetch logs and events
    const logsRes = await client.query(
      `SELECT l.id as log_id, l.driver_id, l.log_date, l.metadata, l.certified, l.certified_at, l.certified_by, l.signature,
              le.id as event_id, le.status, le.event_time, le.location, le.odometer, le.engine_hours
       FROM logs l
       LEFT JOIN log_events le ON le.log_id = l.id
       WHERE l.driver_id = $1
       ORDER BY l.log_date DESC, le.event_time ASC`,
      [driverId]
    );

    // Group events by log date
    const grouped = new Map();
    for (const r of logsRes.rows) {
      const key = r.log_date?.toISOString().split('T')[0];
      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          metadata: r.metadata || {},
          certified: r.certified || false,
          certified_at: r.certified_at,
          certified_by: r.certified_by,
          signature: r.signature,
          vehicle: r.metadata?.vehicle || null,
          events: []
        });
      }
      if (r.event_id) {
        grouped.get(key).events.push({
          id: r.event_id,
          status: r.status,
          time: r.event_time,
          location: r.location,
          odometer: r.odometer,
          engineHours: r.engine_hours
        });
      }
    }

    const logs = Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
    return { driver, logs, company };
  } finally {
    client.release();
  }
}
