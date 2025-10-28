import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import * as CompanyDB from "../db/addCompanyQueries.js"
import pool from "../db/index.js"
const router = express.Router()
import { selectCompany } from "../controllers/companyController.js"

router
  .post('/addCompany', authenticateToken, async (req, res) => {
    console.log('📦 Incoming user on addCompany route:', req.user);
    try {
      const createdBy_ID = req.user.id;            // from your JWT payload
      const createdBy_username = req.user.username;
      const data = req.body;               // the full form payload

      const newCompany = await CompanyDB.createCompany(createdBy_ID, createdBy_username, data);
      res.status(201).json({ success: true, company: newCompany });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to create company' });
    }
  })
  .get('/getCompanies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        company_id,
        companyname,
        createdBy_username,
        Status,
        dot_number
      FROM companies
    `);
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching companies' });
  }
});

router.post('/select', authenticateToken, selectCompany);


// GET /api/company/:id
// router.get('/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const company = await CompanyDB.findOne({ where: { company_id: id } });
//     if (!company) return res.status(404).json({ message: "Company not found" });

//     res.json({ company });
//   } catch (err) {
//     console.error("Error fetching company:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.get('/api/company/:id', async (req, res) => {
  const { id } = req.params;
  const company = await db.query('SELECT * FROM company WHERE company_id = $1', [id]);
  res.json(company.rows[0]);
});




export default router;