import pool from "../db/index.js";

export async function createDevice(device, companyId, username) {
  const {
    serialNumber,
    deviceType,
    deviceMac,
    deviceVersion,
    deviceModel,
    status,
  } = device;

  const result = await pool.query(
    `
    INSERT INTO devices (
      serial_number, device_type, device_mac,
      device_version, device_model, status,
      addedby_companyid, addedby_username
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      serialNumber,
      deviceType,
      deviceMac,
      deviceVersion,
      deviceModel,
      status,
      companyId,
      username,
    ]
  );

  return result.rows[0];
}
