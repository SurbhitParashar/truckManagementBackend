import { insertVehicle,getVehiclesByCompany } from "../db/vehicleQueries.js";
import { verifyToken } from "../service/auth.js";

export async function addVehicle(req, res) {
    try {
        const companyToken = req.cookies.company_jwt;
        const userToken = req.cookies.uid;

        if (!companyToken || !userToken) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const company = verifyToken(companyToken);
        const user = verifyToken(userToken);

        const vehicleData = {
            ...req.body,

            added_by_user_id: user.id,
            added_by_username: user.username,
            addedby_companyid: company.company_id,
            added_by_company_name: company.companyName
        };

        const result = await insertVehicle(vehicleData);
        res.status(201).json({ message: "Vehicle added successfully", vehicle: result });
    } catch (err) {
        console.error("Error adding vehicle:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}




export async function getVehicles(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;
    if (!companyToken) return res.status(401).json({ message: "Unauthorized" });

    const company = verifyToken(companyToken);
    const companyId = company.company_id;

    const vehicles = await getVehiclesByCompany(companyId);

    res.status(200).json(vehicles);
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

