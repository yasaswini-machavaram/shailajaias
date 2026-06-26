import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { TestReport } from '../models/index.js';

/**
 * @desc    Save a new test report
 * @route   POST /api/reports
 * @access  Private (Student)
 */
export const saveReport = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { quiz, testSeries, scorecard, answers } = req.body;

        if (!quiz || !scorecard || !answers) {
            res.status(400).json({ success: false, message: 'Quiz, scorecard and answers are required' });
            return;
        }

        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const report = new TestReport({
            student: req.user._id,
            quiz,
            testSeries: testSeries || undefined,
            scorecard,
            answers,
        });

        await report.save();

        res.status(201).json({
            success: true,
            data: report,
            message: 'Test report saved successfully',
        });
    } catch (error) {
        console.error('Save test report error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get all test reports for the logged-in student
 * @route   GET /api/reports
 * @access  Private (Student)
 */
export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const reports = await TestReport.find({ student: req.user._id })
            .sort({ createdAt: -1 })
            .populate('quiz', 'title')
            .populate('testSeries', 'title');

        res.json({
            success: true,
            data: reports,
        });
    } catch (error) {
        console.error('Get test reports error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get details of a single test report
 * @route   GET /api/reports/:id
 * @access  Private (Student)
 */
export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        const report = await TestReport.findById(req.params.id)
            .populate('quiz')
            .populate('testSeries', 'title');

        if (!report) {
            res.status(404).json({ success: false, message: 'Report not found' });
            return;
        }

        // Student can only access their own reports
        if (report.student.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        res.json({
            success: true,
            data: report,
        });
    } catch (error) {
        console.error('Get test report by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
