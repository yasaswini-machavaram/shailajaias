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
    MentorshipRequest,
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

        let user = await User.findById(studentId).populate('assignedMentor', 'name email role').lean();
        if (user && !user.assignedMentor) {
            const mentor = await User.findOne({ role: 'mentor', assignedStudents: studentId }).select('name email role').lean();
            if (mentor) {
                await User.findByIdAndUpdate(studentId, { assignedMentor: mentor._id });
                user.assignedMentor = mentor as any;
            }
        }
        const purchasedTags = user?.purchasedMentorTags || [];

        // Fetch logs for past 30 days
        const logs = await MentorshipLog.find({ student: studentId })
            .sort({ date: -1 })
            .limit(30)
            .lean();

        // Fetch task completion checkoffs
        const taskProgress = await MentorshipTaskProgress.find({
            userId: studentId,
        }).lean();

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

        // Sort courses: If student has approved mentorshipCourseOrder, respect it; otherwise respect c.order (admin order)
        const customOrder: string[] = user?.mentorshipCourseOrder || [];
        if (customOrder.length > 0) {
            courses.sort((a: any, b: any) => {
                const idA = a._id.toString();
                const idB = b._id.toString();
                const idxA = customOrder.indexOf(idA);
                const idxB = customOrder.indexOf(idB);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return (a.order || 0) - (b.order || 0);
            });
        } else {
            courses.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
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
                    taskCards: Array.isArray(c.taskCards) && c.taskCards.length > 0
                        ? [...c.taskCards].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                        : [],
                };
            })
        );

        // Fetch any pending student break or reorder requests
        const pendingBreakRequest = await MentorshipRequest.findOne({
            student: studentId,
            type: 'break',
            status: 'pending',
        }).lean();

        const pendingReorderRequest = await MentorshipRequest.findOne({
            student: studentId,
            type: 'reorder',
            status: 'pending',
        }).lean();

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
                mentorshipAccountStatus: user?.mentorshipAccountStatus || 'active',
                pendingBreakRequest,
                pendingReorderRequest,
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
// @desc    Get student roadmap & course module tracking (strictly synced with student profile, no dummy cards)
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

        const track = (req.query.track as string) || 'GS';
        const customOrder: string[] = user.mentorshipCourseOrder || [];

        // 1. Identify enrolled / purchased courses and tags from student profile
        const purchasedTags = (user.purchasedMentorTags || []).map((t: string) => t.trim().toUpperCase());
        const enrolledCourseIds = [
            ...(user.purchasedCourses || []),
            ...(user.enrolledCourses || []),
        ];

        let courseQuery: any = { level: 'course', isPublished: true };
        if (enrolledCourseIds.length > 0 || purchasedTags.length > 0) {
            const conditions: any[] = [];
            if (enrolledCourseIds.length > 0) {
                conditions.push({ _id: { $in: enrolledCourseIds } });
            }
            if (purchasedTags.length > 0) {
                conditions.push({
                    $or: [
                        { mentorTags: { $in: purchasedTags } },
                        { title: { $in: user.purchasedMentorTags || [] } },
                    ],
                });
            }
            courseQuery.$or = conditions;
        }

        let allUserCourses = await CourseNode.find(courseQuery).lean();

        // Always fallback to published root courses so student never has an empty/broken roadmap
        if (allUserCourses.length === 0) {
            allUserCourses = await CourseNode.find({ level: 'course', isPublished: true }).lean();
        }

        // 2. Track matching helper
        const matchTrack = (c: any, targetTrack: string): boolean => {
            const tags = (c.mentorTags || []).map((t: string) => t.toUpperCase());
            const title = (c.title || '').toUpperCase();
            const tt = targetTrack.toUpperCase();

            if (tt === 'ALL') return true;

            if (tt === 'ESSAY') {
                return tags.some((t: string) => t.includes('ESSAY')) || title.includes('ESSAY');
            }
            if (tt === 'CSAT') {
                return tags.some((t: string) => t.includes('CSAT')) || title.includes('CSAT');
            }
            if (tt === 'CA') {
                return tags.some((t: string) => t.includes('CA') || t.includes('CURRENT')) || title.includes('CURRENT AFFAIRS');
            }
            if (tt === 'OPTIONAL') {
                return (
                    tags.some((t: string) => t.includes('OPTIONAL')) ||
                    title.includes('OPTIONAL') ||
                    title.includes('ZOOLOGY') ||
                    title.includes('ANTHROPOLOGY') ||
                    title.includes('SOCIOLOGY') ||
                    title.includes('PSIR') ||
                    title.includes('GEOGRAPHY OPTIONAL') ||
                    title.includes('HISTORY OPTIONAL')
                );
            }
            // Default GS
            const isOther = (
                tags.some((t: string) => t.includes('ESSAY') || t.includes('CSAT') || t.includes('OPTIONAL')) ||
                title.includes('ESSAY') || title.includes('CSAT') || title.includes('OPTIONAL') || title.includes('ZOOLOGY')
            );
            return !isOther || tags.some((t: string) => t.includes('GS'));
        };

        const tracksList = ['GS', 'Optional', 'Essay', 'CA', 'CSAT'];
        const activeTracks = tracksList.filter((t) => allUserCourses.some((c) => matchTrack(c, t)));

        // If requested track is default 'GS' and has no courses, but another active track exists, switch to the active track
        let effectiveTrack = track;
        let trackCourses = allUserCourses.filter((c) => matchTrack(c, effectiveTrack));
        if (trackCourses.length === 0 && activeTracks.length > 0 && track === 'GS' && !activeTracks.includes('GS')) {
            effectiveTrack = activeTracks[0];
            trackCourses = allUserCourses.filter((c) => matchTrack(c, effectiveTrack));
        }

        // Sort trackCourses according to approved customOrder or c.order
        if (customOrder.length > 0) {
            trackCourses.sort((a: any, b: any) => {
                const idA = a._id.toString();
                const idB = b._id.toString();
                const idxA = customOrder.indexOf(idA);
                const idxB = customOrder.indexOf(idB);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return (a.order || 0) - (b.order || 0);
            });
        } else {
            trackCourses.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        }

        // Fetch existing subject progress for student
        const existingProgress = await MentorshipSubjectProgress.find({
            student: studentId,
            track: track as any,
        }).lean();
        const progressMap = new Map<string, any>();
        existingProgress.forEach((p) => {
            if (p.courseId) progressMap.set(p.courseId.toString(), p);
            progressMap.set(p.subjectName, p);
        });

        // 3. Build real subject list from trackCourses (NO DUMMY SUBJECTS)
        const combinedSubjectItems: any[] = [];

        for (let i = 0; i < trackCourses.length; i++) {
            const c = trackCourses[i];
            const courseIdStr = c._id.toString();
            const prog = progressMap.get(courseIdStr) || progressMap.get(c.title);

            let totalTasks = Array.isArray(c.taskCards) && c.taskCards.length > 0
                ? c.taskCards.length
                : (Array.isArray(c.videos) ? c.videos.length : 0);

            if (totalTasks === 0) {
                const childNodes = await CourseNode.find({
                    $or: [{ _id: c._id }, { parent: c._id }],
                }).lean();
                childNodes.forEach((cn: any) => {
                    if (Array.isArray(cn.taskCards) && cn.taskCards.length > 0) {
                        totalTasks += cn.taskCards.length;
                    } else if (Array.isArray(cn.videos) && cn.videos.length > 0) {
                        totalTasks += cn.videos.length;
                    }
                });
            }

            const completedTasks = await MentorshipTaskProgress.countDocuments({
                userId: studentId,
                taskType: 'overall',
                completed: true,
                $or: [
                    { courseId: c._id },
                    { tag: { $in: [c.title, ...(c.mentorTags || [])] } },
                ],
            });

            const startedOn = prog?.startDate
                ? new Date(prog.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                : prog?.startedOn || null;
            const finishedOn = prog?.finishedDate
                ? new Date(prog.finishedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                : prog?.finishedOn || null;

            combinedSubjectItems.push({
                courseId: c._id,
                name: c.title,
                totalTasks,
                completedTasks: prog?.completedTasks !== undefined && prog.completedTasks > completedTasks ? prog.completedTasks : completedTasks,
                state: prog?.state || (totalTasks > 0 && completedTasks >= totalTasks ? 'done' : 'upcoming'),
                pauseReason: prog?.pauseReason || '',
                pausedAt: prog?.pausedAt,
                startedOn,
                finishedOn,
                order: i,
            });
        }

        // 4. Categorize real states
        const completedSubjects: any[] = [];
        const pausedSubjects: any[] = [];
        let currentSubject: any = null;
        const upcomingSubjects: any[] = [];

        let foundCurrent = false;
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();

        combinedSubjectItems.forEach((s) => {
            if (s.state === 'paused') {
                s.percentage = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
                pausedSubjects.push(s);
            } else if (s.completedTasks >= s.totalTasks && s.totalTasks > 0) {
                s.state = 'done';
                s.percentage = 100;
                completedSubjects.push(s);
            } else if (!foundCurrent && s.totalTasks > 0) {
                s.state = 'current';
                foundCurrent = true;
                const remaining = Math.max(0, s.totalTasks - s.completedTasks);
                const testDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + remaining);
                s.targetTestDate = remaining > 0 ? `≈ ${testDate.getDate()} ${MONTHS[testDate.getMonth()]}` : 'Ready for Test';
                s.percentage = Math.round((s.completedTasks / s.totalTasks) * 100);

                let daysActive = 0;
                if (s.startedOn) {
                    const parsedStart = new Date(s.startedOn);
                    if (!isNaN(parsedStart.getTime())) {
                        daysActive = Math.max(0, Math.floor((today.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)));
                    }
                }
                s.daysInSubject = daysActive;
                currentSubject = s;
            } else {
                s.state = 'upcoming';
                s.percentage = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
                upcomingSubjects.push(s);
            }
        });

        // Compute projected test dates for upcoming subjects
        let cursorDays = currentSubject ? Math.max(0, currentSubject.totalTasks - currentSubject.completedTasks) : 0;
        upcomingSubjects.forEach((u) => {
            cursorDays += u.totalTasks;
            if (u.totalTasks > 0) {
                const projDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + cursorDays);
                u.targetTestDate = `≈ ${projDate.getDate()} ${MONTHS[projDate.getMonth()]}`;
            } else {
                u.targetTestDate = 'To be scheduled';
            }
        });

        // Real Stat Strip calculation
        let statStrip = '';
        if (currentSubject) {
            const startDateRaw = user.mentorshipPurchasedAt || user.createdAt;
            const startDateStr = startDateRaw
                ? new Date(startDateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                : '';
            const sincePart = startDateStr ? `SINCE ${startDateStr.toUpperCase()} · ` : '';
            statStrip = `${sincePart}${completedSubjects.length} SUBJECTS DONE · ${currentSubject.name.toUpperCase()} ${currentSubject.completedTasks}/${currentSubject.totalTasks}`;
        } else if (completedSubjects.length > 0) {
            statStrip = `${completedSubjects.length} SUBJECTS COMPLETED IN ${effectiveTrack.toUpperCase()}`;
        } else if (trackCourses.length > 0) {
            statStrip = `${trackCourses.length} SUBJECTS SCHEDULED IN ${effectiveTrack.toUpperCase()}`;
        }

        // Fetch partially done tasks and their actual sub-steps
        const partialRecords = await MentorshipTaskProgress.find({
            userId: studentId,
            taskType: 'overall',
            isPartial: true,
            completed: false,
        }).lean();

        const allSubSteps = await MentorshipTaskProgress.find({
            userId: studentId,
            taskType: { $in: ['watch', 'notes', 'test', 'upload'] },
        }).lean();

        const subStepMap = new Map<string, { watch: boolean; notes: boolean; test: boolean; upload: boolean }>();
        allSubSteps.forEach((st: any) => {
            const keys = [`${st.tag}_${st.dayNumber}`];
            if (st.courseId) keys.push(`${st.courseId.toString()}_${st.dayNumber}`);

            keys.forEach((k) => {
                if (!subStepMap.has(k)) {
                    subStepMap.set(k, { watch: false, notes: false, test: false, upload: false });
                }
                const entry = subStepMap.get(k)!;
                if (st.taskType === 'watch' || st.taskType === 'notes' || st.taskType === 'test' || st.taskType === 'upload') {
                    entry[st.taskType as 'watch' | 'notes' | 'test' | 'upload'] = !!st.completed;
                }
            });
        });

        const courseMap = new Map<string, any>();
        allUserCourses.forEach((c) => {
            courseMap.set(c._id.toString(), c);
            courseMap.set(c.title, c);
            if (Array.isArray(c.mentorTags)) {
                c.mentorTags.forEach((t: string) => courseMap.set(t, c));
            }
        });

        const partialTasks = partialRecords.map((pt: any) => {
            const cId = pt.courseId ? pt.courseId.toString() : '';
            const keyCourse = cId ? `${cId}_${pt.dayNumber}` : '';
            const keyTag = `${pt.tag}_${pt.dayNumber}`;
            const steps = (keyCourse && subStepMap.get(keyCourse)) || subStepMap.get(keyTag) || { watch: false, notes: false, test: false, upload: false };

            const course = (cId && courseMap.get(cId)) || courseMap.get(pt.tag);
            let cardTitle = `${pt.tag} — Day ${pt.dayNumber} Task`;
            if (course) {
                if (Array.isArray(course.taskCards) && course.taskCards.length >= pt.dayNumber) {
                    const card = course.taskCards[pt.dayNumber - 1];
                    if (card?.title) cardTitle = `${course.title} — ${card.title}`;
                } else if (Array.isArray(course.videos) && course.videos.length >= pt.dayNumber) {
                    const v = course.videos[pt.dayNumber - 1];
                    if (v?.title || v?.nodeTitle) cardTitle = `${course.title} — ${v.nodeTitle || v.title}`;
                } else {
                    cardTitle = `${course.title} — Task #${pt.dayNumber}`;
                }
            }

            return {
                _id: pt._id,
                courseId: pt.courseId,
                tag: pt.tag,
                dayNumber: pt.dayNumber,
                day: `Day ${pt.dayNumber}`,
                title: cardTitle,
                notesText: pt.notesText || '',
                status: pt.status || 'partial',
                watchDone: !!steps.watch,
                notesDone: !!steps.notes,
                testDone: !!steps.test,
                uploadDone: !!steps.upload,
            };
        });

        // Fetch pending break & reorder requests
        const pendingBreakRequest = await MentorshipRequest.findOne({
            student: studentId,
            type: 'break',
            status: 'pending',
        }).lean();

        const pendingReorderRequest = await MentorshipRequest.findOne({
            student: studentId,
            type: 'reorder',
            status: 'pending',
        }).lean();

        res.json({
            success: true,
            data: {
                track: effectiveTrack,
                activeTracks,
                statStrip,
                completedSubjects,
                currentSubject,
                pausedSubjects,
                upcomingSubjects,
                partialTasks,
                pendingBreakRequest,
                pendingReorderRequest,
                mentorshipAccountStatus: user.mentorshipAccountStatus || 'active',
            },
        });
    } catch (error) {
        console.error('getRoadmapData error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Submit student break request to assigned mentor
// @route   POST /api/mentorship-student/break-request
// @access  Private (Student)
export const requestBreak = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { reason, mode, returnDate } = req.body;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        if (!reason) {
            res.status(400).json({ success: false, message: 'Reason is required for break request' });
            return;
        }

        const user = await User.findById(studentId).lean();
        const mentorId = user?.assignedMentor;

        const request = await MentorshipRequest.findOneAndUpdate(
            { student: studentId, type: 'break', status: 'pending' },
            {
                student: studentId,
                mentor: mentorId,
                type: 'break',
                status: 'pending',
                reason,
                details: {
                    mode: mode || 'fixed',
                    returnDate: returnDate ? new Date(returnDate) : undefined,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (mentorId) {
            await MentorChat.create({
                student: studentId,
                mentor: mentorId,
                threadType: 'mentor',
                senderRole: 'system',
                text: `Student ${user?.name || 'Mentee'} has submitted a Break Request (Reason: ${reason}${mode === 'fixed' && returnDate ? `, Return: ${new Date(returnDate).toLocaleDateString('en-GB')}` : ', Open-ended'}). Please review and approve/reject in Mentor Portal.`,
                isRead: false,
            });
        }

        res.json({ success: true, data: request, message: 'Break request submitted to mentor' });
    } catch (error) {
        console.error('requestBreak error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Withdraw/cancel student pending break request
// @route   POST /api/mentorship-student/cancel-break-request
// @access  Private (Student)
export const cancelBreakRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        await MentorshipRequest.deleteMany({ student: studentId, type: 'break', status: 'pending' });
        res.json({ success: true, message: 'Break request withdrawn' });
    } catch (error) {
        console.error('cancelBreakRequest error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Pause active subject with reason and intimate mentor
// @route   POST /api/mentorship-student/pause-subject
// @access  Private (Student)
export const pauseSubject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { subjectName, courseId, reason, note } = req.body;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const user = await User.findById(studentId).lean();
        const mentorId = user?.assignedMentor;

        // Upsert subject progress with paused state
        const query: any = { student: studentId };
        if (courseId) query.courseId = courseId;
        else query.subjectName = subjectName || 'Environment';

        const subj = await MentorshipSubjectProgress.findOneAndUpdate(
            query,
            {
                subjectName: subjectName || 'Environment',
                track: 'GS',
                state: 'paused',
                pausedAt: new Date(),
                pauseReason: reason || 'Other',
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Record intimation request
        await MentorshipRequest.create({
            student: studentId,
            mentor: mentorId,
            type: 'pause_intimation',
            status: 'acknowledged',
            reason: reason || 'Other',
            details: {
                subjectName: subjectName || subj?.subjectName,
                note: note || '',
            },
        });

        // Intimate mentor in chat
        if (mentorId) {
            await MentorChat.create({
                student: studentId,
                mentor: mentorId,
                threadType: 'mentor',
                senderRole: 'system',
                text: `Student ${user?.name || 'Mentee'} has paused subject "${subjectName || subj?.subjectName}" (Reason: ${reason || 'Other'}).`,
                isRead: false,
            });
        }

        res.json({ success: true, data: subj, message: 'Subject paused and mentor intimated' });
    } catch (error) {
        console.error('pauseSubject error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Resume a paused subject
// @route   POST /api/mentorship-student/resume-subject
// @access  Private (Student)
export const resumeSubject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { subjectName, courseId } = req.body;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const user = await User.findById(studentId).lean();
        const mentorId = user?.assignedMentor;

        const query: any = { student: studentId };
        if (courseId) query.courseId = courseId;
        else query.subjectName = subjectName;

        const subj = await MentorshipSubjectProgress.findOneAndUpdate(
            query,
            {
                state: 'current',
                pausedAt: null,
                pauseReason: '',
            },
            { new: true }
        );

        if (mentorId) {
            await MentorChat.create({
                student: studentId,
                mentor: mentorId,
                threadType: 'mentor',
                senderRole: 'system',
                text: `Student ${user?.name || 'Mentee'} has resumed subject "${subjectName || subj?.subjectName}".`,
                isRead: false,
            });
        }

        res.json({ success: true, data: subj, message: 'Subject resumed' });
    } catch (error) {
        console.error('resumeSubject error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Submit student upcoming subjects reorder request for mentor approval
// @route   POST /api/mentorship-student/reorder-request
// @access  Private (Student)
export const requestReorder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const studentId = req.user?._id;
        const { proposedOrder, previousOrder } = req.body;
        if (!studentId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        if (!Array.isArray(proposedOrder) || proposedOrder.length === 0) {
            res.status(400).json({ success: false, message: 'Proposed order is required' });
            return;
        }

        const user = await User.findById(studentId).lean();
        const mentorId = user?.assignedMentor;

        const request = await MentorshipRequest.findOneAndUpdate(
            { student: studentId, type: 'reorder', status: 'pending' },
            {
                student: studentId,
                mentor: mentorId,
                type: 'reorder',
                status: 'pending',
                details: {
                    proposedOrder,
                    previousOrder: previousOrder || [],
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (mentorId) {
            await MentorChat.create({
                student: studentId,
                mentor: mentorId,
                threadType: 'mentor',
                senderRole: 'system',
                text: `Student ${user?.name || 'Mentee'} has requested a Subject Reorder (${proposedOrder.join(' → ')}). Please review and approve/reject in Mentor Portal.`,
                isRead: false,
            });
        }

        res.json({ success: true, data: request, message: 'Reorder request submitted to mentor for approval' });
    } catch (error) {
        console.error('requestReorder error:', error);
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
        const totalTasksAssigned = await MentorshipTaskProgress.countDocuments({
            userId: studentId,
        });
        const taskCompletionPct = totalTasksAssigned > 0
            ? Math.min(100, Math.round((totalCompletedTasks / totalTasksAssigned) * 100))
            : (totalCompletedTasks > 0 ? 100 : 0);

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

        const user = await User.findById(studentId).lean();
        let mentorId = user?.assignedMentor;
        if (!mentorId) {
            const mentor = await User.findOne({ role: 'mentor', assignedStudents: studentId }).select('_id').lean();
            if (mentor) {
                mentorId = mentor._id;
                await User.findByIdAndUpdate(studentId, { assignedMentor: mentorId });
            }
        }

        const chat = await MentorChat.create({
            student: studentId,
            mentor: mentorId || undefined,
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
        const { tag, dayNumber, taskType, completed, isPartial, notesText, mainsAnswerFileUrl, courseId } = req.body;

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

        const updateData: any = {
            userId: studentId,
            tag: String(tag),
            dayNumber: Number(dayNumber),
            taskType,
            completed: isComp,
            isPartial: isPart,
            status,
            completedAt: isComp ? new Date() : undefined,
            notesText,
            mainsAnswerFileUrl,
        };
        if (courseId) updateData.courseId = courseId;

        const progress = await MentorshipTaskProgress.findOneAndUpdate(
            {
                userId: studentId,
                tag: String(tag),
                dayNumber: Number(dayNumber),
                taskType,
            },
            updateData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // If taskType === 'overall', synchronize sub-steps as well
        if (taskType === 'overall') {
            const subTypes = ['watch', 'notes', 'test', 'upload'];
            if (isComp) {
                // Mark all sub-steps completed
                await Promise.all(
                    subTypes.map((st) =>
                        MentorshipTaskProgress.findOneAndUpdate(
                            {
                                userId: studentId,
                                tag: String(tag),
                                dayNumber: Number(dayNumber),
                                taskType: st,
                            },
                            {
                                userId: studentId,
                                tag: String(tag),
                                dayNumber: Number(dayNumber),
                                taskType: st,
                                courseId: courseId || undefined,
                                completed: true,
                                isPartial: false,
                                status: 'completed',
                                completedAt: new Date(),
                            },
                            { upsert: true, new: true, setDefaultsOnInsert: true }
                        )
                    )
                );
            } else if (!isComp && !isPart) {
                // Undone / reset to pending -> reset all sub-steps too
                await Promise.all(
                    subTypes.map((st) =>
                        MentorshipTaskProgress.findOneAndUpdate(
                            {
                                userId: studentId,
                                tag: String(tag),
                                dayNumber: Number(dayNumber),
                                taskType: st,
                            },
                            {
                                userId: studentId,
                                tag: String(tag),
                                dayNumber: Number(dayNumber),
                                taskType: st,
                                courseId: courseId || undefined,
                                completed: false,
                                isPartial: false,
                                status: 'pending',
                                completedAt: undefined,
                            },
                            { upsert: true, new: true, setDefaultsOnInsert: true }
                        )
                    )
                );
            }
        } else {
            // A sub-step ('watch', 'notes', 'test', or 'upload') was updated!
            // Check all 4 sub-steps for this dayNumber to auto-update 'overall'
            const subSteps = await MentorshipTaskProgress.find({
                userId: studentId,
                tag: String(tag),
                dayNumber: Number(dayNumber),
                taskType: { $in: ['watch', 'notes', 'test', 'upload'] },
            }).lean();

            const completedCount = subSteps.filter((s: any) => s.completed).length;
            const allCompleted = completedCount >= 4;
            const anyCompleted = completedCount > 0;

            if (allCompleted) {
                await MentorshipTaskProgress.findOneAndUpdate(
                    {
                        userId: studentId,
                        tag: String(tag),
                        dayNumber: Number(dayNumber),
                        taskType: 'overall',
                    },
                    {
                        userId: studentId,
                        tag: String(tag),
                        dayNumber: Number(dayNumber),
                        taskType: 'overall',
                        courseId: courseId || undefined,
                        completed: true,
                        isPartial: false,
                        status: 'completed',
                        completedAt: new Date(),
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            } else if (anyCompleted) {
                await MentorshipTaskProgress.findOneAndUpdate(
                    {
                        userId: studentId,
                        tag: String(tag),
                        dayNumber: Number(dayNumber),
                        taskType: 'overall',
                    },
                    {
                        userId: studentId,
                        tag: String(tag),
                        dayNumber: Number(dayNumber),
                        taskType: 'overall',
                        courseId: courseId || undefined,
                        completed: false,
                        isPartial: true,
                        status: 'partial',
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            } else {
                await MentorshipTaskProgress.findOneAndUpdate(
                    {
                        userId: studentId,
                        tag: String(tag),
                        dayNumber: Number(dayNumber),
                        taskType: 'overall',
                    },
                    {
                        userId: studentId,
                        tag: String(tag),
                        dayNumber: Number(dayNumber),
                        taskType: 'overall',
                        courseId: courseId || undefined,
                        completed: false,
                        isPartial: false,
                        status: 'pending',
                        completedAt: undefined,
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
        }

        res.json({ success: true, data: progress });
    } catch (error) {
        console.error('saveTaskProgress error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
