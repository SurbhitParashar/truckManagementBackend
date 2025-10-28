// src/controllers/logController.js
import {
  getDriverById,
  getLogsByDriver,
  getEventsByDriver,
  getCompanyById, // 👈 we'll add this in logService
} from "../service/logService.js";

export async function getDriverFullLogbook(req, res) {
  const { driverId } = req.params;

  try {
    const driver = await getDriverById(driverId);
    if (!driver)
      return res.status(404).json({ message: "Driver not found" });

    // console.log("🟢 Driver fetched:", driver);

    // Fetch logs + events in parallel
    const [logs, events] = await Promise.all([
      getLogsByDriver(driverId),
      getEventsByDriver(driverId),
    ]);

    // Fetch company data if available
    let company = null;
    if (driver.added_by_company_id) {
      company = await getCompanyById(driver.added_by_company_id);
      // console.log("🏢 Company fetched:", company);
    }

    // Send everything together
    res.json({ driver, company, logs, events });
  } catch (err) {
    console.error("❌ Error fetching driver full logbook:", err);
    res.status(500).json({
      message: "Server error fetching driver logbook",
      error: err.message,
    });
  }
}
