import express from 'express';
import { addDriver,getDrivers } from '../controllers/driverController.js';

const router = express.Router();

router.post('/addDriver', addDriver);
router.get('/getDrivers', getDrivers);

export default router;
