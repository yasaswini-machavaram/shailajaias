import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import {
    User,
    MentorshipLog,
    MentorshipSubjectProgress,
    MentorshipTaskProgress,
    MainsSubmission,
    MentorChat,
    MentorNote,
    TestSeries,
    MainsTestSeries,
    CourseNode
} from '../models/index.js';

// @desc    Get student daily task data + 14-day study log
// @route   GET /api/mentorship-student/daily-task
// @access  Private (Student)
export const getDailyTaskData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Fetch logs for past 30 days
        const logs = await MentorshipLog.find({ student: studentId })
            .sort({ date: -1 })
            .limit(30)
            .lean();

        // Fetch task completion checkoffs
        const taskProgress = await MentorshipTaskProgress.find({ student: studentId }).lean();

        res.json({
            success: true,
            data: {
                logs,
                taskProgress,
            },
        });
    } catch (error) {
        console.error('getDailyTaskData error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Log or revise daily study hours + reason
// @route   POST /api/mentorship-student/log-hours
// @access  Private (Student)
export const logStudyHours = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { date, hours, reason } = req.body;

        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!date || hours === undefined) {
            res.status(400).json({ success: false, message: 'Date and hours are required' });
            return;
        }

        const log = await MentorshipLog.findOneAndUpdate(
            { student: studentId, date },
            {
                hours: Number(hours),
                reason: reason || '',
                editedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, data: log, message: 'Study hours logged successfully' });
    } catch (error) {
        console.error('logStudyHours error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get student roadmap & subscribed tags tracking
// @route   GET /api/mentorship-student/roadmap
// @access  Private (Student)
export const getRoadmapData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const user = await User.findById(studentId).lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Aggregate subscribed mentor tags across user's purchases
        const purchasedMentorTags = user.purchasedMentorTags || [];

        // Also fetch tags from purchased standalone PTS, MTS, Courses
        const ptsItems = await TestSeries.find({ _id: { $in: user.purchasedPtsGroups || [] } }).lean();
        const mtsItems = await MainsTestSeries.find({ _id: { $in: user.purchasedMtsGroups || [] } }).lean();
        const courseItems = await CourseNode.find({ _id: { $in: user.purchasedCourseGroups || [] } }).lean();

        const ptsTags = ptsItems.flatMap(i => i.mentorTags || []);
        const mtsTags = mtsItems.flatMap(i => i.mentorTags || []);
        const courseTags = courseItems.flatMap(i => i.mentorTags || []);

        const allSubscribedTags = Array.from(
            new Set([...purchasedMentorTags, ...ptsTags, ...mtsTags, ...courseTags])
        );

        // Fetch subject progress records for student
        const subjects = await MentorshipSubjectProgress.find({ student: studentId })
            .sort({ order: 1 })
            .lean();

        res.json({
            success: true,
            data: {
                subscribedTags: allSubscribedTags,
                subjects,
            },
        });
    } catch (error) {
        console.error('getRoadmapData error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get student answer script uploads & evaluated copies
// @route   GET /api/mentorship-student/uploads
// @access  Private (Student)
export const getStudentUploads = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const submissions = await MainsSubmission.find({ student: studentId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('getStudentUploads error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get student mentorship session notes & consistency statistics
// @route   GET /api/mentorship-student/sessions
// @access  Private (Student)
export const getStudentSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const mentorNote = await MentorNote.findOne({ student: studentId }).lean();
        const logs = await MentorshipLog.find({ student: studentId }).sort({ date: 1 }).lean();

        res.json({
            success: true,
            data: {
                sessionNotes: mentorNote?.sessionNotes || [],
                logs,
            },
        });
    } catch (error) {
        console.error('getStudentSessions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get or send chat messages between student and mentor / desk
// @route   GET /api/mentorship-student/chat & POST /api/mentorship-student/chat
// @access  Private (Student)
export const getStudentChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const threadType = (req.query.threadType as string) || 'mentor';

        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const chats = await MentorChat.find({ student: studentId, threadType })
            .sort({ createdAt: 1 })
            .lean();

        res.json({ success: true, data: chats });
    } catch (error) {
        console.error('getStudentChat error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const sendStudentChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { text, threadType, attachments } = req.body;

        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!text?.trim()) {
            res.status(400).json({ success: false, message: 'Message text is required' });
            return;
        }

        const chat = await MentorChat.create({
            student: studentId,
            threadType: threadType || 'mentor',
            senderRole: 'student',
            text: text.trim(),
            attachments: attachments || [],
            isRead: false,
        });

        res.status(201).json({ success: true, data: chat });
    } catch (error) {
        console.error('sendStudentChat error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
