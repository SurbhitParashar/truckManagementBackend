import pool from "./index.js"; // PostgreSQL connection pool

export async function insertVehicle(vehicleData) {
  const {
    vehicleUnitNumber,
    make,
    model,
    year,
    vin,
    fuel,
    eld,
    device_id,
    licensePlate,
    country,
    plateNumber,
    engineHoursOffset,
    offsetOdometer,
    harshBreaking,
    harshAcceleration,
    harshTurn,
    vinMatch,
    isActive,
    added_by_user_id,
    added_by_username,
    addedby_companyid,
    added_by_company_name
  } = vehicleData;

  const query = `
    INSERT INTO vehicles (
      vehicle_unit_number, make, model, year, vin, fuel, eld, device_id,
      license_plate, country, plate_number,
      engine_hours_offset, offset_odometer,
      harsh_breaking, harsh_acceleration, harsh_turn,
      vin_match, is_active,
      added_by_user_id, added_by_username,
      addedby_companyid, added_by_company_name
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11,
      $12, $13,
      $14, $15, $16,
      $17, $18,
      $19, $20,
      $21, $22
    )
    RETURNING *;
  `;

  const values = [
    vehicleUnitNumber, make, model, year, vin, fuel, eld, device_id,
    licensePlate, country, plateNumber,
    engineHoursOffset, offsetOdometer,
    harshBreaking, harshAcceleration, harshTurn,
    vinMatch, isActive,
    added_by_user_id, added_by_username,
    addedby_companyid, added_by_company_name
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}


export async function getVehiclesByCompany(companyId) {
  const query = `
    SELECT * FROM vehicles
    WHERE addedby_companyid = $1
    ORDER BY id DESC;
  `;

  const values = [companyId];

  const result = await pool.query(query, values);
  return result.rows;
}

