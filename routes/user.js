import express from 'express';
import { handleUserLogin } from '../controllers/user.js';

const router = express.Router();

router.post('/login', handleUserLogin);

export default router;
