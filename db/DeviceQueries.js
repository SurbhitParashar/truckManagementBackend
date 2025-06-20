import pool from "./index.js";

export async function getDevicesByCompanyId(company_id) {
  const result = await pool.query(
    `SELECT * FROM devices WHERE addedby_companyid = $1`,
    [company_id]
  );
  return result.rows;
}
