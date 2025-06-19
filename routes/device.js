import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { addDevice } from "../controllers/deviceController.js";

const router=express.Router();

router.post("/addDevice", authenticateToken, addDevice);

export default router