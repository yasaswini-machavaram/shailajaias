import type { Request, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import { CourseGroup } from '../models/index.js';

export const getCourseGroups = async (req: Request, res: Response): Promise<void> => {
    try {
        const groups = await CourseGroup.find({ isPublished: true })
            .populate('courseIds', 'title description level isPublished price mentorTags')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: groups });
    } catch (error) {
        console.error('Get course groups error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getAdminCourseGroups = async (req: Request, res: Response): Promise<void> => {
    try {
        const groups = await CourseGroup.find()
            .populate('courseIds', 'title description level isPublished price mentorTags')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: groups });
    } catch (error) {
        console.error('Get admin course groups error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getCourseGroupById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const group = await CourseGroup.findById(id).populate('courseIds');

        if (!group) {
            res.status(404).json({ success: false, message: 'Course group not found' });
            return;
        }

        res.json({ success: true, data: group });
    } catch (error) {
        console.error('Get course group by id error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const createCourseGroup = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }

        const { title, description, brochureUrl, brochureKey, introVideoUrl, courseIds, price, mentorTags, ptsGroupCode, mtsGroupCode, isPublished } = req.body;

        if (!title) {
            res.status(400).json({ success: false, message: 'Title is required' });
            return;
        }

        const group = await CourseGroup.create({
            title,
            description,
            brochureUrl,
            brochureKey,
            introVideoUrl,
            courseIds: courseIds || [],
            price: price || 0,
            mentorTags: mentorTags || [],
            ptsGroupCode: ptsGroupCode ? String(ptsGroupCode).trim() : undefined,
            mtsGroupCode: mtsGroupCode ? String(mtsGroupCode).trim() : undefined,
            isPublished: isPublished !== undefined ? isPublished : true,
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, data: group });
    } catch (error) {
        console.error('Create course group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateCourseGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, brochureUrl, brochureKey, introVideoUrl, courseIds, price, mentorTags, ptsGroupCode, mtsGroupCode, isPublished } = req.body;

        const group = await CourseGroup.findById(id);
        if (!group) {
            res.status(404).json({ success: false, message: 'Course group not found' });
            return;
        }

        if (title !== undefined) group.title = title;
        if (description !== undefined) group.description = description;
        if (brochureUrl !== undefined) group.brochureUrl = brochureUrl;
        if (brochureKey !== undefined) group.brochureKey = brochureKey;
        if (introVideoUrl !== undefined) group.introVideoUrl = introVideoUrl;
        if (courseIds !== undefined) group.courseIds = courseIds;
        if (price !== undefined) group.price = price;
        if (mentorTags !== undefined) group.mentorTags = mentorTags;
        if (ptsGroupCode !== undefined) group.ptsGroupCode = ptsGroupCode ? String(ptsGroupCode).trim() : undefined;
        if (mtsGroupCode !== undefined) group.mtsGroupCode = mtsGroupCode ? String(mtsGroupCode).trim() : undefined;
        if (isPublished !== undefined) group.isPublished = isPublished;

        await group.save();

        res.json({ success: true, data: group });
    } catch (error) {
        console.error('Update course group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteCourseGroup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const group = await CourseGroup.findByIdAndDelete(id);

        if (!group) {
            res.status(404).json({ success: false, message: 'Course group not found' });
            return;
        }

        res.json({ success: true, message: 'Course group deleted successfully' });
    } catch (error) {
        console.error('Delete course group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
