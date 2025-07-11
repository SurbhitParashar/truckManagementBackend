import pool from "./index.js";

export async function getDevicesByCompanyId(company_id) {
  const result = await pool.query(
    `SELECT * FROM devices WHERE addedby_companyid = $1`,
    [company_id]
  );
  return result.rows;
}



export async function getUnlinkedDevicesByCompanyId(companyId) {
  const query = `
    SELECT * FROM devices
    WHERE addedby_companyid = $1
      AND id NOT IN (
        SELECT device_id FROM vehicles WHERE device_id IS NOT NULL
      )
    ORDER BY id DESC;
  `;

  const values = [companyId];

  const result = await pool.query(query, values);
  return result.rows;
}
