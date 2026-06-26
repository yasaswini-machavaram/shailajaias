import { Router } from 'express';
import {
    createDoubt,
    getDoubts,
    getDoubtById,
    addDoubtMessage,
    updateDoubtStatus,
} from '../controllers/doubt.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

// All doubt routes require authentication
router.post('/', protect, createDoubt);
router.get('/', protect, getDoubts);
router.get('/:id', protect, getDoubtById);
router.post('/:id/messages', protect, addDoubtMessage);
router.put('/:id/status', protect, updateDoubtStatus);

export default router;
