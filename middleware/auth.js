import {verifyToken} from "../service/auth.js"

export function authenticateToken(req, res, next) {
  try {
    const token = req.cookies.uid;
    // console.log(token)
    if (!token) return res.status(401).json({ message: "Token missing" });

    const user = verifyToken(token);
   
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
}
