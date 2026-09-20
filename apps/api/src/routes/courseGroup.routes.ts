import { Router } from 'express';
import {
    getCourseGroups,
    getAdminCourseGroups,
    getCourseGroupById,
    createCourseGroup,
    updateCourseGroup,
    deleteCourseGroup,
} from '../controllers/courseGroup.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.get('/', getCourseGroups);
router.get('/admin', protect, adminOnly, getAdminCourseGroups);
router.get('/:id', getCourseGroupById);
router.post('/', protect, adminOnly, createCourseGroup);
router.put('/:id', protect, adminOnly, updateCourseGroup);
router.delete('/:id', protect, adminOnly, deleteCourseGroup);

export default router;
