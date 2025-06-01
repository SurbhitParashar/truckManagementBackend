import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import * as CompanyDB from "../db/addCompanyQueries.js"

const router=express.Router()

router.post('/', authenticateToken, async (req, res) => {
  console.log('📦 Incoming user on addCompany route:', req.user);
  try {
    const userId = req.user.id;            // from your JWT payload
    const username = req.user.username;
    const data = req.body;               // the full form payload

    const newCompany = await CompanyDB.createCompany(userId, username,data);
    res.status(201).json({ success: true, company: newCompany });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create company' });
  }
});

export default router;