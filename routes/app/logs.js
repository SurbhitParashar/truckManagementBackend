// backend/routes/app/logs.js
import { Router } from 'express';
import { syncLogs, submitForm, certifyLog, getLogsForDriver } from '../../controllers/app/logs.controller.js';

const router = Router();

// POST /api/app/logs/sync
router.post('/sync', syncLogs);

// POST /api/app/logs/form
router.post('/form', submitForm);

// POST /api/app/logs/certify
router.post('/certify', certifyLog);

// GET /api/app/logs/:username?days=7
router.get('/:username', getLogsForDriver);

export default router;
