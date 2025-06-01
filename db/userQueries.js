import pool from './index.js';

export async function validateUseronLogin(username, password) {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1 AND password = $2',
    [username, password]
  );
  return result.rows.length > 0; // returns true or false
}


export async function getUserByUsername(username) {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0];  // user object with id, username, password hash, etc.
}
