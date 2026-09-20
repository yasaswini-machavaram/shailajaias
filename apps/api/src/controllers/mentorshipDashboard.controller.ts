import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import {
    User,
    TestSeries,
    MainsTestSeries,
    CourseNode,
    CourseGroup,
    MentorshipTaskProgress,
} from '../models/index.js';

export const getMentorshipDashboardData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Check if user is mentorship student
        const isMentorship = user.isMentorshipStudent || false;

        // Collect all distinct mentor tags from database
        const ptsTags = await TestSeries.distinct('mentorTags');
        const mtsTags = await MainsTestSeries.distinct('mentorTags');
        const courseTags = await CourseNode.distinct('mentorTags');
        const courseGroupTags = await CourseGroup.distinct('mentorTags');

        const allTagsSet = new Set<string>();
        [...ptsTags, ...mtsTags, ...courseTags, ...courseGroupTags].forEach((t) => {
            if (t && typeof t === 'string' && t.trim()) {
                allTagsSet.add(t.trim());
            }
        });

        let availableTags: string[] = Array.from(allTagsSet);

        // If user is mentorship student but has specific purchased tags, filter; if none specified, give all tags
        if (isMentorship && user.purchasedMentorTags && user.purchasedMentorTags.length > 0) {
            availableTags = availableTags.filter((t) => user.purchasedMentorTags?.includes(t));
        }

        if (availableTags.length === 0) {
            availableTags = ['General Mentorship', 'GS-1', 'GS-2', 'GS-3', 'GS-4'];
        }

        const requestedTag = (req.query.tag as string) || availableTags[0];

        // Fetch task progress for user and selected tag
        const taskProgressRecords = await MentorshipTaskProgress.find({
            userId: user._id,
            tag: requestedTag,
        });

        // Fetch items associated with the requested tag
        const matchedCourses = await CourseNode.find({
            $or: [{ mentorTags: requestedTag }, { level: 'course' }],
        }).populate('linkedPtsId linkedMtsId');

        const matchedPts = await TestSeries.find({ mentorTags: requestedTag });
        const matchedMts = await MainsTestSeries.find({ mentorTags: requestedTag });

        // Construct 7 daily plan cards (Day 1..Day 7 or dynamic based on matched items)
        const days = [];
        const numDays = 7;

        for (let i = 1; i <= numDays; i++) {
            // Find course video item for this day if available
            let courseVideo = null;
            let parentCourseId = null;
            if (matchedCourses.length > 0) {
                const cNode = matchedCourses[(i - 1) % matchedCourses.length];
                parentCourseId = cNode._id;
                if (cNode.videos && cNode.videos.length > 0) {
                    courseVideo = cNode.videos[(i - 1) % cNode.videos.length];
                }
            }

            // Find PTS test item
            let ptsItem = null;
            let ptsGroupUniqueId = null;
            if (matchedPts.length > 0) {
                const ptsGroup = matchedPts[0];
                ptsGroupUniqueId = ptsGroup.uniqueId;
                if (ptsGroup.tests && ptsGroup.tests.length >= i) {
                    ptsItem = ptsGroup.tests[i - 1];
                }
            }

            // Find MTS test item
            let mtsItem = null;
            let mtsGroupUniqueId = null;
            if (matchedMts.length > 0) {
                const mtsGroup = matchedMts[0];
                mtsGroupUniqueId = mtsGroup.uniqueId;
                if (mtsGroup.tests && mtsGroup.tests.length >= i) {
                    mtsItem = mtsGroup.tests[i - 1];
                }
            }

            days.push({
                dayNumber: i,
                title: `Day ${i}: ${requestedTag} Focus`,
                tag: requestedTag,
                watchTask: {
                    title: courseVideo ? courseVideo.title : `${requestedTag} Daily Video Lecture ${i}`,
                    description: courseVideo?.description || `In-depth analysis for Day ${i}`,
                    videoUrl: courseVideo?.videoUrl || '',
                    videoProvider: courseVideo?.videoProvider || 'youtube',
                },
                notesTask: {
                    title: `Day ${i} Comprehensive Notes & References`,
                    notesText: courseVideo?.notesText || `Class notes and essential reading material for Day ${i}.`,
                    pdfFiles: courseVideo?.pdfFiles || [],
                },
                testTask: {
                    title: ptsItem ? ptsItem.title : `${requestedTag} Daily Prelims Practice Test ${i}`,
                    ptsUniqueId: ptsGroupUniqueId,
                    quizId: ptsItem?.quizId || null,
                    isRevisionCard: true, // Redirects to PTS page when clicked
                },
                uploadTask: {
                    title: mtsItem ? mtsItem.title : `${requestedTag} Daily Mains Answer Writing ${i}`,
                    mtsUniqueId: mtsGroupUniqueId,
                    questionText: courseVideo?.mainsQuestionText || `Critically analyze the key challenges and strategies in ${requestedTag} (Day ${i}).`,
                    modelAnswer: courseVideo?.mainsModelAnswer || '',
                },
            });
        }

        res.json({
            success: true,
            data: {
                isMentorshipStudent: isMentorship,
                availableTags,
                selectedTag: requestedTag,
                days,
                taskProgress: taskProgressRecords,
            },
        });
    } catch (error) {
        console.error('Get mentorship dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const toggleTaskProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { tag, dayNumber, taskType, completed, notesText, mainsAnswerText, mainsAnswerFileUrl } = req.body;

        if (!tag || !dayNumber || !taskType) {
            res.status(400).json({ success: false, message: 'tag, dayNumber, and taskType are required' });
            return;
        }

        const dayNum = parseInt(dayNumber, 10);
        if (isNaN(dayNum)) {
            res.status(400).json({ success: false, message: 'Invalid dayNumber' });
            return;
        }

        let record = await MentorshipTaskProgress.findOne({
            userId: req.user._id,
            tag,
            dayNumber: dayNum,
            taskType,
        });

        if (!record) {
            record = new MentorshipTaskProgress({
                userId: req.user._id,
                tag,
                dayNumber: dayNum,
                taskType,
                completed: completed !== undefined ? completed : true,
                completedAt: completed ? new Date() : undefined,
                notesText,
                mainsAnswerText,
                mainsAnswerFileUrl,
            });
        } else {
            record.completed = completed !== undefined ? completed : !record.completed;
            record.completedAt = record.completed ? new Date() : undefined;
            if (notesText !== undefined) record.notesText = notesText;
            if (mainsAnswerText !== undefined) record.mainsAnswerText = mainsAnswerText;
            if (mainsAnswerFileUrl !== undefined) record.mainsAnswerFileUrl = mainsAnswerFileUrl;
        }

        await record.save();

        res.json({
            success: true,
            data: record,
        });
    } catch (error) {
        console.error('Toggle task progress error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
