import { Router } from 'express';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';
import {
    getAllMasterTags,
    createMasterTag,
    updateMasterTag,
    deleteMasterTag,
    getLinkedItemsForTag
} from '../controllers/masterTag.controller.js';

const router: Router = Router();

router.get('/', getAllMasterTags);

// Admin-only endpoints
router.post('/', protect, adminOnly, createMasterTag);
router.put('/:id', protect, adminOnly, updateMasterTag);
router.delete('/:id', protect, adminOnly, deleteMasterTag);
router.get('/:id/linked-items', protect, adminOnly, getLinkedItemsForTag);

export default router;
