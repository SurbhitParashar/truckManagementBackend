import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { addVehicle, getVehicles } from "../controllers/vehicleController.js";

const router = express.Router();

router.post("/addVehicle", authenticateToken, addVehicle);
router.get("/getVehicles", authenticateToken, getVehicles);


export default router;
