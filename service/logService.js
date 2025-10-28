import pool from "../db/index.js";

export async function getDriverById(driverId) {
  const result = await pool.query(`SELECT * FROM drivers WHERE id = $1`, [driverId]);
  return result.rows[0] || null;
}

export async function getLogsByDriver(driverId) {
  const result = await pool.query(
    `SELECT * FROM logs WHERE driver_id = $1 ORDER BY log_date DESC`,
    [driverId]
  );
  return result.rows;
}

export async function getEventsByDriver(driverId) {
  const result = await pool.query(
    `SELECT * FROM log_events WHERE id = $1 ORDER BY event_time ASC`,
    [driverId]
  );
  return result.rows;
}

export async function getCompanyById(companyId) {
  const result = await pool.query(`SELECT * FROM companies WHERE company_id = $1`, [companyId]);
  return result.rows[0] || null;
}
