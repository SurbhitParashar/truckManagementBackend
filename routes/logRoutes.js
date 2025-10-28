// src/routes/logRoutes.js
import express from "express";
import { getDriverFullLogbook } from "../controllers/logController.js";

const router = express.Router();

// GET /api/logs/driver/:driverId/full
router.get("/driver/:driverId/full", getDriverFullLogbook);

export default router;
