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
    CourseNode,
    CourseGroup,
} from '../models/index.js';

// @desc    Get student daily task data + 14-day study log + subscribed course tasks & revision cards
// @route   GET /api/mentorship-student/daily-task
// @access  Private (Student)
export const getDailyTaskData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const user = await User.findById(studentId).populate('assignedMentor', 'name email role').lean();
        const purchasedTags = user?.purchasedMentorTags || [];

        // Fetch logs for past 30 days
        const logs = await MentorshipLog.find({ student: studentId })
            .sort({ date: -1 })
            .limit(30)
            .lean();

        // Fetch task completion checkoffs
        const taskProgress = await MentorshipTaskProgress.find({ student: studentId }).lean();

        // Fetch courses linked to student's master tags or all published root courses
        let courseQuery: any = { level: 'course', isPublished: true };
        if (purchasedTags.length > 0) {
            courseQuery.mentorTags = { $in: purchasedTags };
        }
        let courses = await CourseNode.find(courseQuery).lean();
        if (courses.length === 0) {
            // Fallback to all published root courses so student always has study task cards
            courses = await CourseNode.find({ level: 'course', isPublished: true }).lean();
        }

        // For each root course, fetch its child topics/subtopics to aggregate video items
        const populatedCourses = await Promise.all(
            courses.map(async (c: any) => {
                const childNodes = await CourseNode.find({
                    $or: [{ _id: c._id }, { parent: c._id }],
                }).lean();

                const allVideos: any[] = [];
                childNodes.forEach((cn: any) => {
                    if (Array.isArray(cn.videos) && cn.videos.length > 0) {
                        cn.videos.forEach((v: any) => {
                            allVideos.push({
                                ...v,
                                courseId: c._id,
                                courseTitle: c.title,
                                nodeTitle: cn.title,
                            });
                        });
                    }
                });

                return {
                    _id: c._id,
                    title: c.title,
                    description: c.description,
                    mentorTags: c.mentorTags || [],
                    ptsGroupCode: c.ptsGroupCode || '',
                    mtsGroupCode: c.mtsGroupCode || '',
                    videos: allVideos,
                };
            })
        );

        res.json({
            success: true,
            data: {
                logs,
                taskProgress,
                subscribedCourses: populatedCourses,
                assignedMentor: user?.assignedMentor ? {
                    _id: (user.assignedMentor as any)._id,
                    name: (user.assignedMentor as any).name,
                    email: (user.assignedMentor as any).email,
                } : null,
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

// @desc    Get student roadmap & subscribed tags tracking (aggregated across Courses, MTS, and PTS)
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

        const tagSet = new Set<string>(user.purchasedMentorTags || []);

        // 1. Tags from purchased Course Groups
        if (user.purchasedCourseGroups && user.purchasedCourseGroups.length > 0) {
            const cgs = await CourseGroup.find({ _id: { $in: user.purchasedCourseGroups } }).lean();
            cgs.forEach((cg: any) => {
                if (Array.isArray(cg.mentorTags)) {
                    cg.mentorTags.forEach((t: string) => t?.trim() && tagSet.add(t.trim()));
                }
            });
        }

        // 2. Tags from purchased Courses (CourseNodes)
        if (user.purchasedCourses && user.purchasedCourses.length > 0) {
            const cns = await CourseNode.find({ _id: { $in: user.purchasedCourses } }).lean();
            cns.forEach((cn: any) => {
                if (Array.isArray(cn.mentorTags)) {
                    cn.mentorTags.forEach((t: string) => t?.trim() && tagSet.add(t.trim()));
                }
            });
        }

        // 3. Tags from purchased MTS Groups (Mains Test Series)
        if (user.purchasedMtsGroups && user.purchasedMtsGroups.length > 0) {
            const mtsList = await MainsTestSeries.find({ _id: { $in: user.purchasedMtsGroups } }).lean();
            mtsList.forEach((m: any) => {
                if (Array.isArray(m.mentorTags)) {
                    m.mentorTags.forEach((t: string) => t?.trim() && tagSet.add(t.trim()));
                }
            });
        }

        // 4. Tags from purchased PTS Groups (Prelims Test Series)
        if (user.purchasedPtsGroups && user.purchasedPtsGroups.length > 0) {
            const ptsList = await TestSeries.find({ _id: { $in: user.purchasedPtsGroups } }).lean();
            ptsList.forEach((p: any) => {
                if (Array.isArray(p.mentorTags)) {
                    p.mentorTags.forEach((t: string) => t?.trim() && tagSet.add(t.trim()));
                }
            });
        }

        const allSubscribedTags = Array.from(tagSet);

        // Fetch subject progress records for student
        const subjects = await MentorshipSubjectProgress.find({ student: studentId })
            .sort({ order: 1 })
            .lean();

        // 1. Compute Courses Roadmap (In Progress & Completed)
        const courses = await CourseNode.find({ level: 'course', isPublished: true }).lean();
        const coursesInProgress: any[] = [];
        const coursesCompleted: any[] = [];

        await Promise.all(
            courses.map(async (c: any) => {
                const totalTasks = c.videos?.length || 10;
                const completedTasks = await MentorshipTaskProgress.countDocuments({
                    userId: studentId,
                    tag: c.mentorTags?.[0] || c.title,
                    completed: true,
                });

                const pct = totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;
                const itemData = {
                    _id: c._id,
                    title: c.title,
                    tag: c.mentorTags?.[0] || 'GS Foundation',
                    totalTasks,
                    completedTasks,
                    percentage: pct,
                    ptsGroupCode: c.ptsGroupCode || 'PTS-GS-2026',
                    mtsGroupCode: c.mtsGroupCode || 'MTS-GS-2026',
                    startedOn: '15 Jul 2026',
                    finishedOn: '31 Jul 2026',
                };

                if (pct >= 100) {
                    coursesCompleted.push(itemData);
                } else {
                    coursesInProgress.push(itemData);
                }
            })
        );

        // 2. Compute MTS (Mains Test Series) Roadmap (In Progress & Completed)
        const mtsBatches = await MainsTestSeries.find({ isPublished: true }).lean();

        const mtsInProgress: any[] = [];
        const mtsCompleted: any[] = [];

        await Promise.all(
            mtsBatches.map(async (m: any) => {
                const totalTests = m.tests?.length || m.sectionalCount + m.fullLengthCount || 12;
                const completedTests = await MainsSubmission.countDocuments({
                    student: studentId,
                    $or: [
                        { testSeriesId: m._id },
                        { tag: m.mentorTags?.[0] }
                    ]
                });
                const pct = totalTests > 0 ? Math.min(100, Math.round((completedTests / totalTests) * 100)) : 0;

                const itemData = {
                    _id: m._id,
                    title: m.title,
                    tag: m.mentorTags?.[0] || 'MTS-BATCH',
                    totalTests,
                    completedTests,
                    percentage: pct,
                    lastSubmission: 'Recently',
                    finishedOn: '10 Aug 2026',
                };

                if (pct >= 100) {
                    mtsCompleted.push(itemData);
                } else {
                    mtsInProgress.push(itemData);
                }
            })
        );

        // 3. Compute PTS (Prelims Test Series) Roadmap (In Progress & Completed)
        const ptsBatches = await TestSeries.find({ isPublished: true }).lean();
        const ptsInProgress: any[] = [];
        const ptsCompleted: any[] = [];

        await Promise.all(
            ptsBatches.map(async (p: any) => {
                const totalTests = p.tests?.length || 15;
                const completedTests = await MentorshipTaskProgress.countDocuments({
                    userId: studentId,
                    tag: p.mentorTags?.[0] || p.title,
                    taskType: 'test',
                    completed: true,
                });
                const pct = totalTests > 0 ? Math.min(100, Math.round((completedTests / totalTests) * 100)) : 0;

                const itemData = {
                    _id: p._id,
                    title: p.title,
                    tag: p.mentorTags?.[0] || 'PTS-BATCH',
                    totalTests,
                    completedTests,
                    percentage: pct,
                    lastAttempt: 'Recently',
                    finishedOn: '05 Aug 2026',
                };

                if (pct >= 100) {
                    ptsCompleted.push(itemData);
                } else {
                    ptsInProgress.push(itemData);
                }
            })
        );

        // 4. Compute Partially Done Tasks
        const partialRecords = await MentorshipTaskProgress.find({
            userId: studentId,
            isPartial: true,
            completed: false,
        }).lean();

        const partialTasks = partialRecords.map((pt: any) => ({
            _id: pt._id,
            tag: pt.tag,
            dayNumber: pt.dayNumber,
            day: `Day ${pt.dayNumber}`,
            title: `${pt.tag} — Day ${pt.dayNumber} Task (Partially Done)`,
            notesText: pt.notesText || '',
        }));

        res.json({
            success: true,
            data: {
                subscribedTags: allSubscribedTags,
                subjects,
                coursesRoadmap: { inProgress: coursesInProgress, completed: coursesCompleted },
                mtsRoadmap: { inProgress: mtsInProgress, completed: mtsCompleted },
                ptsRoadmap: { inProgress: ptsInProgress, completed: ptsCompleted },
                partialTasks,
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

// @desc    Get student mentorship session notes & consistency statistics (KPIs)
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

        const totalLoggedHours = logs.reduce((acc: number, l: any) => acc + (l.hours || 0), 0);
        const loggedDaysCount = logs.filter((l: any) => (l.hours || 0) > 0).length;

        const weeksCount = Math.max(1, Math.ceil(loggedDaysCount / 7));
        const avgHoursPerWeek = (totalLoggedHours / weeksCount).toFixed(1);

        let bestWeekHours = 0;
        for (let i = 0; i < logs.length; i += 7) {
            const weekSlice = logs.slice(i, i + 7);
            const weekSum = weekSlice.reduce((sum: number, l: any) => sum + (l.hours || 0), 0);
            if (weekSum > bestWeekHours) bestWeekHours = weekSum;
        }
        const bestWeekHoursStr = (bestWeekHours || totalLoggedHours).toFixed(1);

        const totalCompletedTasks = await MentorshipTaskProgress.countDocuments({
            userId: studentId,
            completed: true,
        });
        const totalTasksAssigned = Math.max(1, 30);
        const taskCompletionPct = Math.min(100, Math.round((totalCompletedTasks / totalTasksAssigned) * 100));

        const kpis = {
            avgHoursPerWeek: logs.length > 0 ? avgHoursPerWeek : '0.0',
            taskCompletionPct,
            bestWeekHours: logs.length > 0 ? bestWeekHoursStr : '0.0',
            loggedDaysCount,
            targetDays: 30,
        };

        res.json({
            success: true,
            data: {
                sessionNotes: mentorNote?.sessionNotes || [],
                logs,
                kpis,
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

// @desc    Save step checkoff progress (watch, notes, test, upload, overall)
// @route   POST /api/mentorship-student/task-progress
// @access  Private (Student)
export const saveTaskProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { tag, dayNumber, taskType, completed, isPartial, notesText, mainsAnswerFileUrl } = req.body;

        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!tag || dayNumber === undefined || !taskType) {
            res.status(400).json({ success: false, message: 'tag, dayNumber, and taskType are required' });
            return;
        }

        const isComp = !!completed;
        const isPart = !!isPartial && !isComp;
        const status = isComp ? 'completed' : isPart ? 'partial' : 'pending';

        const progress = await MentorshipTaskProgress.findOneAndUpdate(
            { userId: studentId, tag: String(tag), dayNumber: Number(dayNumber), taskType },
            {
                completed: isComp,
                isPartial: isPart,
                status,
                completedAt: isComp ? new Date() : undefined,
                notesText,
                mainsAnswerFileUrl,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // If taskType === 'overall', update sub-steps as well
        if (taskType === 'overall') {
            const subTypes = ['watch', 'notes', 'test', 'upload'];
            await Promise.all(
                subTypes.map((st) =>
                    MentorshipTaskProgress.findOneAndUpdate(
                        { userId: studentId, tag: String(tag), dayNumber: Number(dayNumber), taskType: st },
                        {
                            completed: isComp,
                            isPartial: isPart,
                            status,
                            completedAt: isComp ? new Date() : undefined,
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    )
                )
            );
        }

        res.json({ success: true, data: progress });
    } catch (error) {
        console.error('saveTaskProgress error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
