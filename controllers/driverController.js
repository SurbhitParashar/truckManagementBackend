import { verifyToken } from '../service/auth.js';
import { insertDriver, getAllDrivers } from '../db/driverQueries.js';
import bcrypt from 'bcrypt';

export async function addDriver(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;
    const userToken = req.cookies.uid;

    if (!companyToken || !userToken) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const company = verifyToken(companyToken);
    const user = verifyToken(userToken);

    const driverData = {
      ...req.body,
      added_by_user_id: user.id,
      added_by_username: user.username,
      added_by_company_id: company.company_id,
      added_by_company_name: company.companyName,
      status: 'active'
    };

    driverData.password = await bcrypt.hash(driverData.password, 10);

    const result = await insertDriver(driverData);
    res.status(201).json({ message: "Driver added successfully", driver: result });
  } catch (err) {
    console.error("Error adding driver:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}




export async function getDrivers(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;

    if (!companyToken) {
      return res.status(401).json({ message: "Company authentication required" });
    }

    const company = verifyToken(companyToken);
    const companyId = company.company_id;

    const drivers = await getAllDrivers(companyId);
    res.status(200).json(drivers);
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

