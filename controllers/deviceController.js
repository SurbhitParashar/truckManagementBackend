import { createDevice } from "../db/addDeviceQueries.js";
import { verifyToken } from "../service/auth.js";

export async function addDevice(req, res) {
  try {
    const device = req.body;

    const userToken = req.cookies.uid;
    const companyToken = req.cookies.company_jwt;
    console.log(userToken,companyToken)

    if (!userToken || !companyToken) {
      return res.status(403).json({ message: "Missing authentication cookies" });
    }

    const user = verifyToken(userToken);         // id + username
    const company = verifyToken(companyToken);   // companyId + companyName
    console.log("user",user, "company",company);

    const newDevice = await createDevice(device, company.company_id, user.username);

    res.status(201).json({ success: true, device: newDevice });
  } catch (err) {
    console.error("Error adding device:", err);
    res.status(500).json({ message: "Failed to add device" });
  }
}
