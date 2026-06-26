import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { Doubt, User } from '../models/index.js';

/**
 * @desc    Create a new doubt
 * @route   POST /api/doubts
 * @access  Private (Student)
 */
export const createDoubt = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            testSeries,
            quiz,
            questionIndex,
            questionText,
            subject,
            title,
            description,
        } = req.body;

        if (!subject || !title || !description) {
            res.status(400).json({ success: false, message: 'Subject, title and description are required' });
            return;
        }

        const doubt = new Doubt({
            student: req.user?._id,
            testSeries: testSeries || undefined,
            quiz: quiz || undefined,
            questionIndex,
            questionText,
            subject,
            title,
            description,
            status: 'pending',
            messages: [],
        });

        await doubt.save();

        res.status(201).json({
            success: true,
            data: doubt,
            message: 'Doubt submitted successfully',
        });
    } catch (error) {
        console.error('Create doubt error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get doubts (Student gets their own, Admin gets all with optional filters)
 * @route   GET /api/doubts
 * @access  Private (Student/Admin)
 */
export const getDoubts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const role = req.user?.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        if (role === 'student') {
            // Student gets their own doubts
            const doubts = await Doubt.find({ student: req.user?._id })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Doubt.countDocuments({ student: req.user?._id });

            res.json({
                success: true,
                data: doubts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
            return;
        }

        if (role === 'admin') {
            // Admin gets all doubts, supporting search and filters
            const { status, subject, search } = req.query;
            const query: any = {};

            if (status) {
                query.status = status;
            }
            if (subject) {
                query.subject = subject;
            }

            if (search) {
                // Find users matching search text (name or phone)
                const matchedUsers = await User.find({
                    $or: [
                        { name: { $regex: search as string, $options: 'i' } },
                        { phone: { $regex: search as string, $options: 'i' } },
                        { email: { $regex: search as string, $options: 'i' } },
                    ]
                }).select('_id');

                const userIds = matchedUsers.map(u => u._id);
                query.$or = [
                    { student: { $in: userIds } },
                    { title: { $regex: search as string, $options: 'i' } },
                    { description: { $regex: search as string, $options: 'i' } },
                ];
            }

            const doubts = await Doubt.find(query)
                .populate('student', 'name phone email')
                .populate('quiz', 'title')
                .populate('testSeries', 'title')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Doubt.countDocuments(query);

            res.json({
                success: true,
                data: doubts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
            return;
        }

        res.status(403).json({ success: false, message: 'Unauthorized role' });
    } catch (error) {
        console.error('Get doubts error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Get details of a single doubt
 * @route   GET /api/doubts/:id
 * @access  Private (Student/Admin)
 */
export const getDoubtById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const doubt = await Doubt.findById(req.params.id)
            .populate('student', 'name phone email')
            .populate('quiz', 'title')
            .populate('testSeries', 'title');

        if (!doubt) {
            res.status(404).json({ success: false, message: 'Doubt not found' });
            return;
        }

        // Student can only access their own doubts
        if (req.user?.role === 'student' && doubt.student._id.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        res.json({
            success: true,
            data: doubt,
        });
    } catch (error) {
        console.error('Get doubt by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Add a message reply to the doubt thread
 * @route   POST /api/doubts/:id/messages
 * @access  Private (Student/Admin)
 */
export const addDoubtMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { message } = req.body;
        if (!message) {
            res.status(400).json({ success: false, message: 'Message text is required' });
            return;
        }

        const doubt = await Doubt.findById(req.params.id);
        if (!doubt) {
            res.status(404).json({ success: false, message: 'Doubt not found' });
            return;
        }

        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authenticated' });
            return;
        }

        // Check ownership if student
        if (req.user.role === 'student' && doubt.student.toString() !== req.user._id.toString()) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return;
        }

        const newMessage = {
            senderId: req.user._id as any,
            senderName: req.user.name || 'User',
            message,
            createdAt: new Date(),
        };

        doubt.messages.push(newMessage);

        // Update status:
        // - Admin reply marks status as 'answered'
        // - Student reply reopens status to 'pending' (unless it was already answered/pending - ensures it flags for admin attention)
        if (req.user?.role === 'admin') {
            doubt.status = 'answered';
        } else {
            doubt.status = 'pending';
        }

        await doubt.save();

        res.json({
            success: true,
            data: doubt,
            message: 'Reply sent successfully',
        });
    } catch (error) {
        console.error('Add doubt message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Update doubt status (Resolve or Reopen)
 * @route   PUT /api/doubts/:id/status
 * @access  Private (Student/Admin)
 */
export const updateDoubtStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { status } = req.body;
        if (!status || !['pending', 'answered', 'resolved'].includes(status)) {
            res.status(400).json({ success: false, message: 'Valid status is required' });
            return;
        }

        const doubt = await Doubt.findById(req.params.id);
        if (!doubt) {
            res.status(404).json({ success: false, message: 'Doubt not found' });
            return;
        }

        // Student can only mark their own doubts as resolved (cannot toggle answered/pending directly)
        if (req.user?.role === 'student') {
            if (doubt.student.toString() !== req.user._id.toString()) {
                res.status(403).json({ success: false, message: 'Access denied' });
                return;
            }
            if (status !== 'resolved') {
                res.status(400).json({ success: false, message: 'Students can only mark doubts as resolved' });
                return;
            }
        }

        doubt.status = status;
        await doubt.save();

        res.json({
            success: true,
            data: doubt,
            message: `Doubt marked as ${status}`,
        });
    } catch (error) {
        console.error('Update doubt status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
