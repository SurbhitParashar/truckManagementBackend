import { createDevice } from "../db/addDeviceQueries.js";
import { verifyToken } from "../service/auth.js";
import { getDevicesByCompanyId, getUnlinkedDevicesByCompanyId } from "../db/DeviceQueries.js";

export async function addDevice(req, res) {
  try {
    const device = req.body;

    const userToken = req.cookies.uid;
    const companyToken = req.cookies.company_jwt;
    // console.log(userToken,companyToken)

    if (!userToken || !companyToken) {
      return res.status(403).json({ message: "Missing authentication cookies" });
    }

    const user = verifyToken(userToken);         // id + username
    const company = verifyToken(companyToken);   // companyId + companyName
    // console.log("user",user, "company",company);

    const newDevice = await createDevice(device, company.company_id, user.username);
    
    res.status(201).json({ success: true, device: newDevice });
  } catch (err) {
    console.error("Error adding device:", err);
    res.status(500).json({ message: "Failed to add device" });
  }
}


export async function getDevicesForCompany(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;
    // console.log(companyToken)

    if (!companyToken) {
      return res.status(401).json({ message: "Company token missing" });
    }

    const company = verifyToken(companyToken);
    const devices = await getDevicesByCompanyId(company.company_id);
    // console.log("Company devices:", devices);
    res.status(200).json(devices);
  } catch (err) {
    console.error("Error fetching company devices:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}


export async function getUnlinkedDevices(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;
    if (!companyToken) {
      return res.status(401).json({ message: "Company token missing" });
    }

    const company = verifyToken(companyToken);
    const devices = await getUnlinkedDevicesByCompanyId(company.company_id);

    res.status(200).json(devices);
  } catch (err) {
    console.error("Error fetching unlinked devices:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
