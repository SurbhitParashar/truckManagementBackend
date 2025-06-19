import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export function setUser(user){
    return jwt.sign(
        { id: user.id, username: user.username },  // <== Add user.id here!
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

export function setCompanyToken(company) {
    return jwt.sign(
        { company_id: company.company_id, companyName: company.companyName },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}


export function verifyToken(token){
    if (!token) throw new Error("No token found");
    return jwt.verify(token,process.env.JWT_SECRET)
}