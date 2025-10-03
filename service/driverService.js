import pool from "../db/index.js";

export async function getDriverByUsername(username) {
  const query = `SELECT * FROM drivers WHERE username = $1 LIMIT 1`;
  const result = await pool.query(query, [username]);
  return result.rows[0] || null;
}