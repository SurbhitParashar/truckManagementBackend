import pool from "./index.js"; // PostgreSQL pool

export async function insertDriver(driverData) {
  const {
    username,
    email,
    firstName,
    lastName,
    phone,
    country,
    state,
    licenseNumber,
    password,
    homeTerminal,          // TEXT — not a foreign key
    assignedVehicles,      // TEXT — not a foreign key
    exemptDriver,
    hosRules,
    cargoType,
    restart,
    shortHaulException,
    allowPersonalUse,
    allowYardMoves,
    unlimitedTrailer,
    unlimitedShippingDocs,
    allowSplitSleep,
    resetBreak,
    added_by_user_id,
    added_by_username,
    added_by_company_id,
    added_by_company_name,
    status
  } = driverData;

  const query = `
    INSERT INTO drivers (
      username, email, first_name, last_name, phone,
      country, state, license_number, password,
      home_terminal, assigned_vehicles,
      exempt_driver, hos_rules, cargo_type, restart,
      short_haul_exception, allow_personal_use,
      allow_yard_moves, unlimited_trailer,
      unlimited_shipping_docs, allow_split_sleep, reset_break,
      added_by_user_id, added_by_username,
      added_by_company_id, added_by_company_name,status
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11,
      $12, $13, $14, $15,
      $16, $17,
      $18, $19,
      $20, $21, $22,
      $23, $24,
      $25, $26,$27
    )
    RETURNING *;
  `;

  const values = [
    username,
    email,
    firstName,
    lastName,
    phone,
    country,
    state,
    licenseNumber,
    password,
    homeTerminal,
    assignedVehicles,
    exemptDriver,
    hosRules,
    cargoType,
    restart,
    shortHaulException,
    allowPersonalUse,
    allowYardMoves,
    unlimitedTrailer,
    unlimitedShippingDocs,
    allowSplitSleep,
    resetBreak,
    added_by_user_id,
    added_by_username,
    added_by_company_id,
    added_by_company_name,
    status
  ];

  const result = await pool.query(query, values);
  return result.rows[0]; // return the inserted driver row
}


export async function getAllDrivers(companyId) {
  const query = `SELECT * FROM drivers WHERE added_by_company_id = $1 ORDER BY created_at DESC`;
  const result = await pool.query(query, [companyId]);
  return result.rows;
}
