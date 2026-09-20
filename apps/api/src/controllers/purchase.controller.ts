import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { User, TestSeries, MainsTestSeries, CourseGroup, CourseNode } from '../models/index.js';

export const purchaseItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { itemType, itemId, tag } = req.body;

        if (!itemType || !['mentorship', 'pts', 'mts', 'courseGroup', 'course'].includes(itemType)) {
            res.status(400).json({ success: false, message: 'Invalid or missing itemType' });
            return;
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        if (itemType === 'mentorship') {
            user.isMentorshipStudent = true;
            user.mentorshipPurchasedAt = user.mentorshipPurchasedAt || new Date();
            if (tag && !user.purchasedMentorTags?.includes(tag)) {
                user.purchasedMentorTags = [...(user.purchasedMentorTags || []), tag];
            }
        } else if (itemType === 'pts') {
            if (!itemId) {
                res.status(400).json({ success: false, message: 'itemId required for pts purchase' });
                return;
            }
            const pts = await TestSeries.findById(itemId);
            if (!pts) {
                res.status(404).json({ success: false, message: 'Test series not found' });
                return;
            }
            const existing = user.purchasedPtsGroups?.map((id) => id.toString()) || [];
            if (!existing.includes(itemId.toString())) {
                user.purchasedPtsGroups = [...(user.purchasedPtsGroups || []), pts._id];
            }
        } else if (itemType === 'mts') {
            if (!itemId) {
                res.status(400).json({ success: false, message: 'itemId required for mts purchase' });
                return;
            }
            const mts = await MainsTestSeries.findById(itemId);
            if (!mts) {
                res.status(404).json({ success: false, message: 'Mains test series not found' });
                return;
            }
            const existing = user.purchasedMtsGroups?.map((id) => id.toString()) || [];
            if (!existing.includes(itemId.toString())) {
                user.purchasedMtsGroups = [...(user.purchasedMtsGroups || []), mts._id];
            }
        } else if (itemType === 'courseGroup') {
            if (!itemId) {
                res.status(400).json({ success: false, message: 'itemId required for courseGroup purchase' });
                return;
            }
            const cg = await CourseGroup.findById(itemId);
            if (!cg) {
                res.status(404).json({ success: false, message: 'Course group not found' });
                return;
            }
            const existing = user.purchasedCourseGroups?.map((id) => id.toString()) || [];
            if (!existing.includes(itemId.toString())) {
                user.purchasedCourseGroups = [...(user.purchasedCourseGroups || []), cg._id];
            }
        } else if (itemType === 'course') {
            if (!itemId) {
                res.status(400).json({ success: false, message: 'itemId required for course purchase' });
                return;
            }
            const course = await CourseNode.findById(itemId);
            if (!course) {
                res.status(404).json({ success: false, message: 'Course not found' });
                return;
            }
            const existing = user.purchasedCourses?.map((id) => id.toString()) || [];
            if (!existing.includes(itemId.toString())) {
                user.purchasedCourses = [...(user.purchasedCourses || []), course._id];
            }
        }

        await user.save();

        res.json({
            success: true,
            message: 'Purchase completed successfully',
            data: {
                isMentorshipStudent: user.isMentorshipStudent,
                purchasedMentorTags: user.purchasedMentorTags || [],
                purchasedPtsGroups: user.purchasedPtsGroups || [],
                purchasedMtsGroups: user.purchasedMtsGroups || [],
                purchasedCourseGroups: user.purchasedCourseGroups || [],
                purchasedCourses: user.purchasedCourses || [],
            },
        });
    } catch (error) {
        console.error('Purchase item error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
