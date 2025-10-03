import express from 'express';
import { addDriver,getDrivers,fetchDriverByUsername } from '../controllers/driverController.js';

const router = express.Router();

router.post('/addDriver', addDriver);
router.get('/getDrivers', getDrivers);
router.get("/:username",fetchDriverByUsername)

export default router;
