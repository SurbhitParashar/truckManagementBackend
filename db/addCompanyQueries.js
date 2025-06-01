import pool from './index.js';

export async function createCompany(userId, username, c) {
  const { 
    name, dotNumber, timeZone, periodStart,
    address, city, state, country, zipCode,
    exemptDriver, terminalTimeZone, terminalAddress,
    terminalCity, terminalState, terminalCountry, terminalZipCode,
    complianceMode, hosRules, cargoType, restartOption,
    restBreakRequirement, shortHaulException,
    allowPersonalUse, allowYardMoves, allowSplitSleep,
    allowTracking, allowGpsTracking, allowIfta
  } = c;

  const result = await pool.query(
    `INSERT INTO companies (
       user_id, username,name, dot_number, time_zone, period_start,
       address, city, state, country, zip_code,
       exempt_driver, terminal_time_zone, terminal_address,
       terminal_city, terminal_state, terminal_country, terminal_zip_code,
       compliance_mode, hos_rules, cargo_type, restart_option,
       rest_break_requirement, short_haul_exception,
       allow_personal_use, allow_yard_moves, allow_split_sleep,
       allow_tracking, allow_gps_tracking, allow_ifta
     ) VALUES (
       $1,$2,$3,$4,$5,
       $6,$7,$8,$9,$10,
       $11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$23,
       $24,$25,$26,$27,$28,$29,$30
     ) RETURNING *`,
    [
      userId,username, name, dotNumber, timeZone, periodStart,
      address, city, state, country, zipCode,
      exemptDriver, terminalTimeZone, terminalAddress,
      terminalCity, terminalState, terminalCountry, terminalZipCode,
      complianceMode, hosRules, cargoType, restartOption,
      restBreakRequirement, shortHaulException,
      allowPersonalUse, allowYardMoves, allowSplitSleep,
      allowTracking, allowGpsTracking, allowIfta
    ]
  );
  return result.rows[0];
}
