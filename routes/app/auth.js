// backend/routes/auth.js
import express from 'express';
import { login } from '../../controllers/app/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

export default router;
