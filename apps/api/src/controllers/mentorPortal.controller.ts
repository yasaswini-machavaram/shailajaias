import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import {
    User,
    MentorshipLog,
    MentorshipTaskProgress,
    MainsSubmission,
    MentorChat,
    MentorBroadcast,
    MentorNote,
    MentorshipSubjectProgress
} from '../models/index.js';

// @desc    Get mentor roster with live risk metrics (Δ Tasks, Δ Log, Uploads Pending, Evaluated)
// @route   GET /api/mentor-portal/roster
// @access  Private (Mentor)
export const getMentorRoster = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const mentorId = req.user?._id;
        if (!mentorId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Find mentor and their assigned students
        const mentor = await User.findById(mentorId).populate('assignedStudents').lean();
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        // Fetch all students if admin/test, or assigned students for mentor
        let students: any[] = [];
        if (req.user?.role === 'admin') {
            students = await User.find({ role: 'student' }).lean();
        } else {
            students = (mentor.assignedStudents as any[]) || [];
            // Fallback: if no assigned students, fetch all students for preview
            if (students.length === 0) {
                students = await User.find({ role: 'student' }).limit(50).lean();
            }
        }

        const now = new Date();

        // Calculate live risk metrics for each student
        const rosterData = await Promise.all(
            students.map(async s => {
                // Get latest study log
                const latestLog = await MentorshipLog.findOne({ student: s._id }).sort({ date: -1 }).lean();
                let deltaLog = 0;
                if (latestLog?.date) {
                    const logDate = new Date(latestLog.date);
                    const diffTime = Math.abs(now.getTime() - logDate.getTime());
                    deltaLog = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                } else {
                    deltaLog = 14; // Default if never logged
                }

                // Get latest task progress
                const latestTask = await MentorshipTaskProgress.findOne({ student: s._id }).sort({ updatedAt: -1 }).lean();
                let deltaTasks = 0;
                if (latestTask?.updatedAt) {
                    const taskDate = new Date(latestTask.updatedAt);
                    const diffTime = Math.abs(now.getTime() - taskDate.getTime());
                    deltaTasks = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                } else {
                    deltaTasks = 10;
                }

                // Submissions counts
                const uploadsPending = await MainsSubmission.countDocuments({ student: s._id, status: { $ne: 'evaluated' } });
                const evaluated = await MainsSubmission.countDocuments({ student: s._id, status: 'evaluated' });

                // Subjects completed
                const completedSubjects = await MentorshipSubjectProgress.countDocuments({ student: s._id, state: 'done' });
                const currentSubject = await MentorshipSubjectProgress.findOne({ student: s._id, state: 'current' }).lean();

                // Mentor note info
                const mentorNote = await MentorNote.findOne({ student: s._id }).lean();

                return {
                    id: s._id,
                    name: s.name || 'Student',
                    email: s.email || '',
                    phone: s.phone || '',
                    startDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Jan 2026',
                    posSubject: currentSubject?.subjectName || 'GS Foundation',
                    posTasks: `${currentSubject?.completedTasks || 3}/${currentSubject?.totalTasks || 12} tasks`,
                    deltaTasks,
                    deltaLog,
                    uploadsPending,
                    evaluated,
                    subjects: `${completedSubjects} / 11`,
                    optional: 'PSIR',
                    attempts: 1,
                    mains: 'Yes',
                    isTaggedInactive: mentorNote?.isTaggedInactive || false,
                };
            })
        );

        res.json({ success: true, data: rosterData });
    } catch (error) {
        console.error('getMentorRoster error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get mentor chat threads & send replies
// @route   GET /api/mentor-portal/chat & POST /api/mentor-portal/chat/send
// @access  Private (Mentor)
export const getMentorChats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const mentorId = req.user?._id;
        if (!mentorId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const chats = await MentorChat.find({ threadType: 'mentor' })
            .populate('student', 'name email phone')
            .sort({ createdAt: 1 })
            .lean();

        res.json({ success: true, data: chats });
    } catch (error) {
        console.error('getMentorChats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const sendMentorChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const mentorId = req.user?._id;
        const { studentId, text } = req.body;

        if (!mentorId || !studentId || !text?.trim()) {
            res.status(400).json({ success: false, message: 'Student ID and text are required' });
            return;
        }

        const chat = await MentorChat.create({
            student: studentId,
            mentor: mentorId,
            threadType: 'mentor',
            senderRole: 'mentor',
            text: text.trim(),
            isRead: false,
        });

        res.status(201).json({ success: true, data: chat });
    } catch (error) {
        console.error('sendMentorChat error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get Mains answer submissions for evaluation
// @route   GET /api/mentor-portal/evaluation
// @access  Private (Mentor)
export const getMentorEvaluations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const submissions = await MainsSubmission.find()
            .populate('student', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('getMentorEvaluations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Send broadcast notice to selected mentees
// @route   POST /api/mentor-portal/broadcast
// @access  Private (Mentor)
export const sendMentorBroadcast = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const mentorId = req.user?._id;
        const { recipientIds, filterTag, message } = req.body;

        if (!mentorId || !message?.trim()) {
            res.status(400).json({ success: false, message: 'Message is required' });
            return;
        }

        const broadcast = await MentorBroadcast.create({
            mentor: mentorId,
            recipients: recipientIds || [],
            filterTag: filterTag || 'All',
            message: message.trim(),
        });

        res.status(201).json({ success: true, data: broadcast, message: 'Broadcast sent successfully' });
    } catch (error) {
        console.error('sendMentorBroadcast error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Tag student as inactive in MongoDB
// @route   POST /api/mentor-portal/tag-inactive
// @access  Private (Mentor)
export const tagInactiveStudent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            res.status(400).json({ success: false, message: 'Student ID is required' });
            return;
        }

        const note = await MentorNote.findOneAndUpdate(
            { student: studentId },
            {
                isTaggedInactive: true,
                taggedInactiveAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, data: note, message: 'Student tagged as inactive' });
    } catch (error) {
        console.error('tagInactiveStudent error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get detailed dossier for student & save mentor notes
// @route   GET /api/mentor-portal/mentee/:id & POST /api/mentor-portal/mentee/:id/notes
// @access  Private (Mentor)
export const getMenteeDossier = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.params.id;
        const student = await User.findById(studentId).lean();

        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found' });
            return;
        }

        const logs = await MentorshipLog.find({ student: studentId }).sort({ date: -1 }).limit(30).lean();
        const submissions = await MainsSubmission.find({ student: studentId }).sort({ createdAt: -1 }).lean();
        const mentorNote = await MentorNote.findOne({ student: studentId }).lean();
        const subjects = await MentorshipSubjectProgress.find({ student: studentId }).sort({ order: 1 }).lean();

        res.json({
            success: true,
            data: {
                student,
                logs,
                submissions,
                subjects,
                sessionNotes: mentorNote?.sessionNotes || [],
                internalNote: mentorNote?.internalNote || '',
                isTaggedInactive: mentorNote?.isTaggedInactive || false,
            },
        });
    } catch (error) {
        console.error('getMenteeDossier error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const saveMenteeNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.params.id;
        const mentorId = req.user?._id;
        const { sessionNote, internalNote } = req.body;

        const updateObj: any = {};
        if (internalNote !== undefined) updateObj.internalNote = internalNote;

        let note = await MentorNote.findOne({ student: studentId });
        if (!note) {
            note = new MentorNote({ student: studentId, mentor: mentorId, sessionNotes: [] });
        }

        if (sessionNote?.text?.trim()) {
            note.sessionNotes.unshift({
                date: sessionNote.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                text: sessionNote.text.trim(),
                createdAt: new Date(),
            });
        }

        if (internalNote !== undefined) {
            note.internalNote = internalNote;
        }

        await note.save();

        res.json({ success: true, data: note, message: 'Mentor notes saved successfully' });
    } catch (error) {
        console.error('saveMenteeNotes error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
