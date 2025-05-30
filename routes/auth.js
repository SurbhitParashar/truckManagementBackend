import express from "express";
import {authenticateToken} from "../middleware/auth.js"

const router = express.Router();

router.get("/me",authenticateToken, (req, res) => {
    res.json({username: req.user.username});
})

export default router