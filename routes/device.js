import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { addDevice,getDevicesForCompany,getUnlinkedDevices } from "../controllers/deviceController.js";

const router=express.Router();

router.post("/addDevice", authenticateToken, addDevice);
router.get("/getDevices", authenticateToken, getDevicesForCompany);
router.get("/getUnlinkedDevices", getUnlinkedDevices);


export default router