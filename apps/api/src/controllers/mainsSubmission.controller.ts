import type { Request, Response } from 'express';
import { MainsSubmission, MainsTestSeries, User } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// @desc    Student submits answer sheets
// @route   POST /api/mts/submissions
// @access  Private (Student)
export const submitAnswerSheet = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { mainsTestSeriesId, testIndex, testTitle, seriesUniqueId } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'Please upload at least one answer sheet file' });
            return;
        }

        if (!mainsTestSeriesId || testIndex === undefined || !testTitle) {
            res.status(400).json({ success: false, message: 'Missing required fields: mainsTestSeriesId, testIndex, testTitle' });
            return;
        }

        // Verify the MTS group exists
        const mts = await MainsTestSeries.findById(mainsTestSeriesId);
        if (!mts) {
            res.status(404).json({ success: false, message: 'Mains Test Series not found' });
            return;
        }

        // Check if student already submitted for this test
        const existing = await MainsSubmission.findOne({
            student: user._id,
            mainsTestSeries: mainsTestSeriesId,
            testIndex: Number(testIndex),
        });

        if (existing) {
            res.status(400).json({ success: false, message: 'You have already submitted answer sheets for this test. Please contact admin to re-submit.' });
            return;
        }

        const answerSheetUrls = files.map(f => `/uploads/${f.filename}`);
        const answerSheetKeys = files.map(f => f.filename);

        // Auto-assign mentor if mentor is assigned to this student or batch
        let assignedMentorId: any = undefined;
        let initialStatus: 'submitted' | 'assigned' = 'submitted';

        // Check if student has a designated mentor
        const studentMentor = await User.findOne({ role: 'mentor', status: 'active', assignedStudents: user._id } as any);
        if (studentMentor) {
            assignedMentorId = studentMentor._id;
            initialStatus = 'assigned';
        } else {
            // Check if batch has a designated mentor
            const batchMentor = await User.findOne({ role: 'mentor', status: 'active', assignedMtsGroups: mainsTestSeriesId } as any);
            if (batchMentor) {
                assignedMentorId = batchMentor._id;
                initialStatus = 'assigned';
            }
        }

        const submission = await MainsSubmission.create({
            student: user._id,
            mainsTestSeries: mainsTestSeriesId,
            testIndex: Number(testIndex),
            testTitle,
            seriesUniqueId: seriesUniqueId || mts.uniqueId || '',
            answerSheetUrls,
            answerSheetKeys,
            submittedAt: new Date(),
            mentor: assignedMentorId,
            status: initialStatus,
        });

        res.status(201).json({ success: true, data: submission });
    } catch (error) {
        console.error('Submit answer sheet error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Student re-uploads answer sheet (once only, before mentor starts review)
// @route   PUT /api/mts/submissions/:id/reupload
// @access  Private (Student)
export const reuploadAnswerSheet = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'Please upload at least one new answer sheet file' });
            return;
        }

        const submission = await MainsSubmission.findById(id);
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }

        // Verify ownership
        if (submission.student.toString() !== user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not authorized to modify this submission' });
            return;
        }

        // Check evaluation status
        if (submission.status === 'under_review' || submission.status === 'evaluated') {
            res.status(400).json({
                success: false,
                message: 'Reupload unavailable: Your answer sheet is currently under review or evaluated by mentor.',
            });
            return;
        }

        // Check reupload count (only 1 reupload allowed)
        if (submission.reuploadCount && submission.reuploadCount >= 1) {
            res.status(400).json({
                success: false,
                message: 'You have already reuploaded your answer sheet once. Multiple reuploads are not permitted.',
            });
            return;
        }

        // Delete previous answer files from disk
        if (submission.answerSheetKeys && submission.answerSheetKeys.length > 0) {
            for (const key of submission.answerSheetKeys) {
                try {
                    const filePath = path.join(UPLOADS_DIR, key);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    console.error('Failed to unlink old file key:', key, e);
                }
            }
        }

        // Update submission with new files
        submission.answerSheetUrls = files.map(f => `/uploads/${f.filename}`);
        submission.answerSheetKeys = files.map(f => f.filename);
        submission.submittedAt = new Date();
        submission.reuploadCount = (submission.reuploadCount || 0) + 1;

        await submission.save();

        res.json({
            success: true,
            data: submission,
            message: 'Answer sheet reuploaded successfully! Previous files have been replaced.',
        });
    } catch (error) {
        console.error('Reupload answer sheet error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Student views their own submissions
// @route   GET /api/mts/submissions/my
// @access  Private (Student)
export const getMySubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { mainsTestSeriesId } = req.query;

        const filter: any = { student: user._id };
        if (mainsTestSeriesId) {
            filter.mainsTestSeries = mainsTestSeriesId;
        }

        const submissions = await MainsSubmission.find(filter)
            .sort({ submittedAt: -1 })
            .populate('mentor', 'name email')
            .populate('evaluatedBy', 'name')
            .lean();

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('Get my submissions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Helper function to check if a mentor is allowed to access/evaluate a submission
async function canMentorAccessSubmission(mentorUserId: string, submission: any): Promise<boolean> {
    const mentorIdStr = mentorUserId.toString();
    const directMentorId = submission.mentor?._id ? submission.mentor._id.toString() : submission.mentor?.toString();

    // If the submission is explicitly assigned to a mentor, ONLY that mentor has access
    if (directMentorId) {
        return directMentorId === mentorIdStr;
    }

    // If submission is unassigned, check if mentor is assigned to batch or student
    const mentorUser = await User.findById(mentorUserId).select('assignedMtsGroups assignedStudents');
    if (!mentorUser) return false;

    const subMtsId = submission.mainsTestSeries?._id ? submission.mainsTestSeries._id.toString() : submission.mainsTestSeries?.toString();
    const subStudentId = submission.student?._id ? submission.student._id.toString() : submission.student?.toString();

    const isStudentAssigned = mentorUser.assignedStudents.some((s: any) => s.toString() === subStudentId);
    const isBatchAssigned = mentorUser.assignedMtsGroups.some((g: any) => g.toString() === subMtsId);

    return isStudentAssigned || isBatchAssigned;
}

// @desc    View a single submission detail
// @route   GET /api/mts/submissions/:id
// @access  Private (Student/Mentor/Admin)
export const getSubmissionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        const submission = await MainsSubmission.findById(req.params.id)
            .populate('student', 'name email phone')
            .populate('mentor', 'name email')
            .populate('evaluatedBy', 'name')
            .populate('mainsTestSeries', 'title uniqueId')
            .lean();

        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }

        // Access control: student can only see own, mentor can see assigned, admin can see all
        if (user.role === 'student' && submission.student._id.toString() !== user._id.toString()) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }
        if (user.role === 'mentor') {
            const hasAccess = await canMentorAccessSubmission(user._id, submission);
            if (!hasAccess) {
                res.status(403).json({ success: false, message: 'Access denied — not assigned to you' });
                return;
            }
        }

        res.json({ success: true, data: submission });
    } catch (error) {
        console.error('Get submission by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin views ALL submissions (with filters)
// @route   GET /api/mts/submissions
// @access  Private/Admin
export const getAllSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, mainsTestSeriesId, mentorId, studentSearch, page = '1', limit = '50' } = req.query;

        const filter: any = {};
        if (status) filter.status = status;
        if (mainsTestSeriesId) filter.mainsTestSeries = mainsTestSeriesId;
        if (mentorId) filter.mentor = mentorId;

        const skip = (Number(page) - 1) * Number(limit);

        // If searching by student name/phone, find matching students first
        if (studentSearch) {
            const matchingStudents = await User.find({
                role: 'student',
                $or: [
                    { name: { $regex: studentSearch, $options: 'i' } },
                    { phone: { $regex: studentSearch, $options: 'i' } },
                ],
            } as any).select('_id');
            filter.student = { $in: matchingStudents.map(s => s._id) };
        }

        const [submissions, total] = await Promise.all([
            MainsSubmission.find(filter)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('student', 'name email phone')
                .populate('mentor', 'name email')
                .populate('evaluatedBy', 'name')
                .populate('mainsTestSeries', 'title uniqueId')
                .lean(),
            MainsSubmission.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get all submissions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Mentor views only their assigned submissions
// @route   GET /api/mts/submissions/mentor
// @access  Private/Mentor
export const getMentorSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { status, mainsTestSeriesId, startDate, endDate } = req.query;

        // Fetch mentor's assigned batches and students
        const mentorUser = await User.findById(user._id).select('assignedMtsGroups assignedStudents');
        const assignedBatches = mentorUser?.assignedMtsGroups || [];
        const assignedStudents = mentorUser?.assignedStudents || [];

        // Build combined filter: directly assigned mentor OR batch match OR student match
        const filter: any = {
            $or: [
                { mentor: user._id },
                { mainsTestSeries: { $in: assignedBatches } },
                { student: { $in: assignedStudents } },
            ],
        };

        if (status) filter.status = status;
        if (mainsTestSeriesId) filter.mainsTestSeries = mainsTestSeriesId;

        if (startDate || endDate) {
            filter.submittedAt = {};
            if (startDate) {
                filter.submittedAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                filter.submittedAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
            }
        }

        const submissions = await MainsSubmission.find(filter)
            .sort({ submittedAt: -1 })
            .populate('student', 'name email phone')
            .populate('mainsTestSeries', 'title uniqueId')
            .lean();

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('Get mentor submissions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin assigns a mentor to submission(s)
// @route   PUT /api/mts/submissions/:id/assign
// @access  Private/Admin
export const assignMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { mentorId } = req.body;

        if (!mentorId) {
            res.status(400).json({ success: false, message: 'Mentor ID is required' });
            return;
        }

        // Verify mentor exists and has the right role
        const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        const submission = await MainsSubmission.findById(req.params.id);
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }

        if (submission.status === 'evaluated') {
            res.status(400).json({ success: false, message: 'Cannot reassign a submission that has already been evaluated' });
            return;
        }

        submission.mentor = mentor._id as any;
        submission.status = 'assigned';
        await submission.save();

        res.json({ success: true, data: submission, message: 'Mentor assigned successfully' });
    } catch (error) {
        console.error('Assign mentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin bulk assigns a mentor to multiple submissions
// @route   PUT /api/mts/submissions/bulk-assign
// @access  Private/Admin
export const bulkAssignMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { submissionIds, mentorId } = req.body;

        if (!mentorId || !submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
            res.status(400).json({ success: false, message: 'Mentor ID and submission IDs array are required' });
            return;
        }

        const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        const result = await MainsSubmission.updateMany(
            { _id: { $in: submissionIds }, status: { $ne: 'evaluated' } },
            { $set: { mentor: mentor._id, status: 'assigned' } }
        );

        res.json({
            success: true,
            message: `Assigned ${result.modifiedCount} submissions to mentor ${mentor.name}`,
        });
    } catch (error) {
        console.error('Bulk assign mentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Mentor/Admin submits evaluation
// @route   PUT /api/mts/submissions/:id/evaluate
// @access  Private/Mentor or Admin
export const submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { score, maxScore, feedback } = req.body;
        const file = req.file;

        const submission = await MainsSubmission.findById(req.params.id);
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }

        // Mentor can evaluate if directly assigned, or assigned via batch/student
        if (user.role === 'mentor') {
            const hasAccess = await canMentorAccessSubmission(user._id, submission);
            if (!hasAccess) {
                res.status(403).json({ success: false, message: 'Not assigned to you' });
                return;
            }
            // Auto-assign direct mentor reference if not set
            if (!submission.mentor) {
                submission.mentor = user._id;
            }
        }

        // Save evaluated copy if uploaded
        if (file) {
            submission.evaluatedCopyUrl = `/uploads/${file.filename}`;
            submission.evaluatedCopyKey = file.filename;
        }

        if (score !== undefined) submission.score = Number(score);
        if (maxScore !== undefined) submission.maxScore = Number(maxScore);
        if (feedback !== undefined) submission.feedback = feedback?.trim() || undefined;
        submission.evaluatedAt = new Date();
        submission.evaluatedBy = user._id;
        submission.status = 'evaluated';

        await submission.save();

        res.json({ success: true, data: submission, message: 'Evaluation submitted successfully' });
    } catch (error) {
        console.error('Submit evaluation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Mentor marks submission as under review
// @route   PUT /api/mts/submissions/:id/start-review
// @access  Private/Mentor or Admin
export const startReview = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        const submission = await MainsSubmission.findById(req.params.id);
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }

        if (user.role === 'mentor') {
            const hasAccess = await canMentorAccessSubmission(user._id, submission);
            if (!hasAccess) {
                res.status(403).json({ success: false, message: 'Not assigned to you' });
                return;
            }
            if (!submission.mentor) {
                submission.mentor = user._id;
            }
        }

        submission.status = 'under_review';
        await submission.save();

        res.json({ success: true, data: submission });
    } catch (error) {
        console.error('Start review error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get submission stats (for admin dashboard)
// @route   GET /api/mts/submissions/stats
// @access  Private/Admin
export const getSubmissionStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { mainsTestSeriesId } = req.query;
        const matchFilter: any = {};
        if (mainsTestSeriesId) matchFilter.mainsTestSeries = mainsTestSeriesId;

        const [stats] = await MainsSubmission.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                    assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
                    underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
                    evaluated: { $sum: { $cond: [{ $eq: ['$status', 'evaluated'] }, 1, 0] } },
                },
            },
        ]);

        res.json({
            success: true,
            data: stats || { total: 0, submitted: 0, assigned: 0, underReview: 0, evaluated: 0 },
        });
    } catch (error) {
        console.error('Get submission stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
