import express from 'express';
import { handleUserLogin } from '../controllers/user.js';

const router = express.Router();
console.log("going..")
router.post('/login', handleUserLogin);

export default router;
