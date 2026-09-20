import { Router } from 'express';
import { purchaseItem } from '../controllers/purchase.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post('/', protect, purchaseItem);

export default router;
