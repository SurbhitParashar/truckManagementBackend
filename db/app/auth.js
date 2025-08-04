// src/db/authDb.js
import pool from '../index.js'; 

export async function findDriverByUsername(username) {
  const query = `
    SELECT id, username, password
    FROM drivers
    WHERE username = $1
  `;
  const values = [username];

  try {
    const { rows, rowCount } = await pool.query(query, values);
    return rowCount > 0 ? rows[0] : null;
  } catch (err) {
    console.error('❌ [authDb.findDriverByUsername]', err);
    throw err;
  }
}
