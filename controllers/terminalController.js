import { insertTerminal, getTerminalsByCompany } from "../db/terminalQueries.js";
import { verifyToken } from "../service/auth.js";

export async function addTerminal(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;
    const userToken = req.cookies.uid;

    if (!companyToken || !userToken) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const company = verifyToken(companyToken);
    const user = verifyToken(userToken);

    // console.log(company, user);

    const terminalData = {
      ...req.body,
      added_by_user_id: user.id,
      added_by_username: user.username,
      addedby_companyid: company.company_id,
      added_by_company_name: company.companyName
    };

    const result = await insertTerminal(terminalData);
    res.status(201).json({ message: "Terminal added successfully", terminal: result });
  } catch (err) {
    console.error("Error adding terminal:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getTerminals(req, res) {
  try {
    const companyToken = req.cookies.company_jwt;

    if (!companyToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const company = verifyToken(companyToken);
    const terminals = await getTerminalsByCompany(company.company_id);

    res.status(200).json(terminals);
  } catch (err) {
    console.error("Error fetching terminals:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
