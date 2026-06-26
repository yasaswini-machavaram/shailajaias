import { Router } from 'express';
import { saveReport, getReports, getReportById } from '../controllers/testReport.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();

router.use(protect);

// @route   POST /api/reports
// @desc    Save test report
// @access  Private (Student)
router.post('/', saveReport);

// @route   GET /api/reports
// @desc    Get all test reports
// @access  Private (Student)
router.get('/', getReports);

// @route   GET /api/reports/:id
// @desc    Get test report details
// @access  Private (Student)
router.get('/:id', getReportById);

export default router;
