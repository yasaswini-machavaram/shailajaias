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
    MentorshipSubjectProgress,
    MentorshipRequest,
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
        const mentor = await User.findById(mentorId).lean();
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        // Fetch all students if admin/test, or assigned students for mentor
        let students: any[] = [];
        if (req.user?.role === 'admin') {
            students = await User.find({ role: 'student' }).lean();
        } else {
            const assignedIds = Array.isArray(mentor.assignedStudents) ? mentor.assignedStudents : [];
            students = await User.find({
                role: 'student',
                $or: [
                    { assignedMentor: mentorId },
                    { _id: { $in: assignedIds } },
                ],
            }).lean();
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
                const latestTask = await MentorshipTaskProgress.findOne({
                    $or: [{ userId: s._id }, { student: s._id }],
                }).sort({ updatedAt: -1 }).lean();
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

                // Subjects tracking
                const totalSubjectsCount = await MentorshipSubjectProgress.countDocuments({ student: s._id });
                const completedSubjects = await MentorshipSubjectProgress.countDocuments({ student: s._id, state: 'done' });
                const currentSubject = await MentorshipSubjectProgress.findOne({ student: s._id, state: 'current' }).lean();

                const cComp = currentSubject?.completedTasks || 0;
                const cTotal = currentSubject?.totalTasks || 0;
                let posSubject = currentSubject?.subjectName || '';
                let posTasks = cTotal > 0 ? `${cComp}/${cTotal} tasks` : (currentSubject ? 'Active' : '');

                if (!posSubject && latestTask) {
                    posSubject = latestTask.tag ? (latestTask.tag.charAt(0).toUpperCase() + latestTask.tag.slice(1)) : 'General Studies';
                    posTasks = latestTask.dayNumber ? `Day ${latestTask.dayNumber}` : 'In Progress';
                }
                if (!posSubject) {
                    posSubject = 'General Studies';
                    posTasks = '—';
                }

                // Mentor note info
                const mentorNote = await MentorNote.findOne({ student: s._id }).lean();

                return {
                    id: s._id.toString(),
                    name: s.name && s.name !== 'Student' ? s.name : (s.phone ? `Student (${s.phone})` : (s.name || 'Student')),
                    displayName: s.name || 'Student',
                    email: s.email || '',
                    phone: s.phone || '',
                    startDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                    posSubject,
                    posTasks,
                    deltaTasks,
                    deltaLog,
                    uploadsPending,
                    evaluated,
                    subjects: totalSubjectsCount > 0 ? `${completedSubjects} / ${totalSubjectsCount}` : `${completedSubjects}`,
                    optional: s.optionalSubject || '—',
                    attempts: s.upscAttempts !== undefined ? s.upscAttempts : '—',
                    mains: s.mainsQualified ? 'Yes' : 'No',
                    isTaggedInactive: mentorNote?.isTaggedInactive || false,
                    risk: deltaTasks + deltaLog,
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

        let query: any = {};
        if (req.user?.role !== 'admin') {
            const mentor = await User.findById(mentorId).lean();
            const assignedIds = Array.isArray(mentor?.assignedStudents) ? mentor.assignedStudents : [];
            let assignedStudents = await User.find({
                role: 'student',
                $or: [
                    { assignedMentor: mentorId },
                    { _id: { $in: assignedIds } },
                ],
            }).select('_id').lean();

            // Fallback: if mentor has no assigned students yet, allow fallback roster students
            if (assignedStudents.length === 0) {
                assignedStudents = await User.find({ role: 'student' }).limit(50).select('_id').lean();
            }
            const studentIds = assignedStudents.map(s => s._id);

            query = {
                $or: [
                    { mentor: mentorId },
                    { student: { $in: studentIds } },
                ],
            };
        }

        const chats = await MentorChat.find(query)
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

        const populated = await MentorChat.findById(chat._id).populate('student', 'name email phone').lean();

        res.status(201).json({ success: true, data: populated || chat });
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
            .populate('student', 'name email phone')
            .populate('mentor', 'name email')
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

// @desc    Get pending break, reorder, and pause intimation requests for mentor's mentees
// @route   GET /api/mentor-portal/requests
// @access  Private (Mentor)
export const getMentorRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const mentorId = req.user?._id;
        if (!mentorId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const mentor = await User.findById(mentorId).lean();
        const assignedStudentIds = mentor?.assignedStudents || [];

        let query: any = {};
        if (req.user?.role === 'admin') {
            query = {};
        } else {
            query = {
                $or: [
                    { mentor: mentorId },
                    { student: { $in: assignedStudentIds } },
                ],
            };
        }

        const requests = await MentorshipRequest.find(query)
            .populate('student', 'name email phone mentorshipAccountStatus')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('getMentorRequests error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Approve or reject a student break request or reorder request
// @route   POST /api/mentor-portal/requests/:id/review
// @access  Private (Mentor)
export const reviewMentorRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const mentorId = req.user?._id;
        const { id } = req.params;
        const { action } = req.body; // 'approve' | 'reject' | 'acknowledge'

        if (!mentorId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const request = await MentorshipRequest.findById(id);
        if (!request) {
            res.status(404).json({ success: false, message: 'Request not found' });
            return;
        }

        const student = await User.findById(request.student);
        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found' });
            return;
        }

        const isApprove = action === 'approve';
        request.status = isApprove ? 'approved' : 'rejected';
        request.reviewedAt = new Date();
        request.reviewedBy = mentorId;
        await request.save();

        if (request.type === 'break') {
            student.mentorshipAccountStatus = isApprove ? 'break' : 'active';
            await student.save();
        } else if (request.type === 'reorder') {
            if (isApprove && request.details?.proposedOrder) {
                student.mentorshipCourseOrder = request.details.proposedOrder;
                await student.save();

                // Also update MentorshipSubjectProgress orders
                for (let i = 0; i < request.details.proposedOrder.length; i++) {
                    const identifier = request.details.proposedOrder[i];
                    await MentorshipSubjectProgress.updateMany(
                        {
                            student: student._id,
                            $or: [{ courseId: identifier }, { subjectName: identifier }],
                        },
                        { order: i }
                    );
                }
            }
        }

        // Intimate student in chat
        await MentorChat.create({
            student: student._id,
            threadType: 'mentor',
            senderRole: 'mentor',
            text: isApprove
                ? `Your ${request.type === 'break' ? 'Break' : 'Subject Reorder'} request has been APPROVED.`
                : `Your ${request.type === 'break' ? 'Break' : 'Subject Reorder'} request was not approved. Please consult during our next session.`,
            isRead: false,
        });

        res.json({
            success: true,
            data: request,
            message: `Request successfully ${isApprove ? 'approved' : 'rejected'}`,
        });
    } catch (error) {
        console.error('reviewMentorRequest error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
