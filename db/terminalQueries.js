import pool from "./index.js"; // PostgreSQL pool

export async function insertTerminal(terminalData) {
  const {
    timezone,
    city,
    state,
    country,
    address,
    addressPin,
    added_by_user_id,
    added_by_username,
    addedby_companyid,
    added_by_company_name
  } = terminalData;

  const query = `
    INSERT INTO terminals 
    (timezone, city, state, country, address, address_pin, 
     added_by_user_id, added_by_username, addedby_companyid, added_by_company_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    timezone, city, state, country, address, addressPin,
    added_by_user_id, added_by_username, addedby_companyid, added_by_company_name
  ];

  const result = await pool.query(query, values);
  return result.rows[0]; // Return the inserted terminal
}


export async function getTerminalsByCompany(companyId) {
  const query = `SELECT * FROM terminals WHERE addedby_companyid = $1`;
  const values = [companyId];

  const result = await pool.query(query, values);
  return result.rows; // ✅ use result.rows, NOT destructuring
}

