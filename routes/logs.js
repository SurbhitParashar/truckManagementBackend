import express from "express";
import pool from "../db/index.js";

const router = express.Router();

// GET driver details + company + logs (fully detailed)
router.get("/details/:driverId", async (req, res) => {
  const { driverId } = req.params;
  const client = await pool.connect();

  try {
    // 1️⃣ Fetch driver with all needed fields
    const driverRes = await client.query(
      `SELECT 
          id,
          first_name,
          last_name,
          email,
          username,
          license_number,
          state,
          exempt_driver,
          
          
          hos_rules,
          added_by_company_id
       FROM drivers 
       WHERE id = $1
       LIMIT 1`,
      [driverId]
    );

    if (!driverRes.rows.length)
      return res.status(404).json({ message: "Driver not found" });

    const driver = driverRes.rows[0];

    // 2️⃣ Fetch company details (if available)
    let company = null;
    if (driver.added_by_company_id) {
      const companyRes = await client.query(
        `SELECT 
            company_id,
            companyname,
            dot_number,
            address,
            city,
            state,
            country,
            hos_rules,
            terminal_address AS "terminalAddress"
            
         FROM companies 
         WHERE company_id = $1
         LIMIT 1`,
        [driver.added_by_company_id]
      );
      if (companyRes.rows.length) company = companyRes.rows[0];
    }

    // 3️⃣ Fetch logs + events
    const logsRes = await client.query(
      `SELECT 
          l.id AS log_id,
          l.driver_id,
          l.log_date AS date,
          l.certified,
          l.metadata,
          le.id AS event_id,
          le.status,
          le.event_time AS time,
          le.location,
          le.odometer,
          le.engine_hours
          
          
       FROM logs l
       LEFT JOIN log_events le ON le.log_id = l.id
       WHERE l.driver_id = $1
       ORDER BY l.log_date DESC, le.event_time ASC`,
      [driverId]
    );

    // 4️⃣ Group logs by date + attach events
    const logsMap = new Map();
    for (const r of logsRes.rows) {
      if (!logsMap.has(r.date)) {
        logsMap.set(r.date, {
          date: r.date,
          certified: r.certified,
          metadata: r.metadata || null,
          events: [],
        });
      }

      if (r.event_id) {
        logsMap.get(r.date).events.push({
          id: r.event_id || null,
          status: r.status || null,
          event: r.event || null,
          time: r.time || null,
          location: r.location || null,
          origin: r.origin || null,
          odometer: r.odometer || null,
          engine_hours: r.engine_hours || null,
          notes: r.notes || null,
        });
      }
    }

    const logs = Array.from(logsMap.values());

    // 5️⃣ Normalize missing fields → null
    const safeDriver = {
      id: driver.id ?? null,
      first_name: driver.first_name ?? null,
      last_name: driver.last_name ?? null,
      email: driver.email ?? null,
      username: driver.username ?? null,
      license_number: driver.license_number ?? null,
      state: driver.state ?? null,
      exempt_driver: driver.exempt_driver ?? null,
      co_driver: driver.co_driver ?? null,
      co_driver_id: driver.co_driver_id ?? null,
      exceptions: driver.exceptions ?? null,
      hos_rules: driver.hos_rules ?? null,
    };

    const safeCompany = company
      ? {
          company_id: company.company_id ?? null,
          companyname: company.companyname ?? null,
          dot_number: company.dot_number ?? null,
          address: company.address ?? null,
          city: company.city ?? null,
          state: company.state ?? null,
          country: company.country ?? null,
          hos_rules: company.hos_rules ?? null,
          terminalAddress: company.terminalAddress ?? null,
          sn_mac: company.sn_mac ?? null,
          provider: company.provider ?? null,
        }
      : null;

    // ✅ Final structured response
    res.json({
      driver: safeDriver,
      company: safeCompany,
      logs,
    });
  } catch (err) {
    console.error("❌ Error fetching driver details:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  } finally {
    client.release();
  }
});

// routes/logs.js
router.get("/logs/:driverId/:date", async (req, res) => {
  const { driverId, date } = req.params;
  const client = await pool.connect();
  try {
    const logResult = await client.query(
      `SELECT * FROM logs WHERE driver_id = $1 
       AND DATE(log_date) = $2 LIMIT 1`,
      [driverId, date]
    );

    if (logResult.rows.length === 0)
      return res.json({ events: [], metadata: null });

    const log = logResult.rows[0];

    const eventsResult = await client.query(
      `SELECT * FROM log_events WHERE log_id = $1 ORDER BY event_time ASC`,
      [log.id]
    );

    res.json({
      ...log,
      events: eventsResult.rows,
    });
  } catch (e) {
    console.error("Error fetching driver log:", e);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});


export default router;
