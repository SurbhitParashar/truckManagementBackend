import { setCompanyToken} from "../service/auth.js";

// This will create a JWT with selected company info
export function selectCompany(req, res) {
    console.log(req.body)
    const { company_id, companyName } = req.body;

    if (!company_id || !companyName) {
        return res.status(400).json({ message: "companyId and companyName are required" });
    }

    const token = setCompanyToken({ company_id, companyName });

    res.cookie("company_jwt", token, {
        httpOnly: true,
        sameSite: "Lax",
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true, message: "Company selected and cookie set" });
}
