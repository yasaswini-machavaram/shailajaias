import type { Request, Response } from 'express';
import { MentorshipCourse } from '../models/index.js';

const DEFAULT_COURSES = [
    {
        title: 'GS Foundation Mentorship',
        tagline: 'For freshers',
        price: '₹9,999',
        audience: 'Beginner',
        stages: ['Mains'],
        levels: ['Beginner'],
        coverage: 'GS1-4 & Essay',
        deliverables: ['Mentor-set daily tasks', 'Weekly review'],
        availability: 'Start Now',
        description: 'Complete end-to-end guidance for freshers starting their UPSC Civil Services preparation. Personal mentor assigns daily study plans, monitors progress, evaluates answer scripts, and conducts weekly 1-on-1 strategy sessions.',
        order: 1,
        isPublished: true,
    },
    {
        title: 'Advanced Revision Mains Mentorship',
        tagline: 'For veterans',
        price: '₹8,999',
        audience: 'Veteran',
        stages: ['Mains'],
        levels: ['Veteran'],
        coverage: 'GS1-4 & Essay',
        deliverables: ['35 Tests', 'Daily Practice'],
        availability: 'Start Now',
        description: 'Targeted Mains revision for candidates who have covered the syllabus at least once. Includes 35 high-yield sectional & full-length tests with expert feedback within 48 hours.',
        order: 2,
        isPublished: true,
    },
    {
        title: 'Prelims Revision/Crash Course Mentorship',
        tagline: 'For beginners & veterans',
        price: '₹999',
        audience: 'Both',
        stages: ['Prelims'],
        levels: ['Beginner', 'Veteran'],
        coverage: 'Prelims — full syllabus revision',
        deliverables: ['45 Tests', 'Revision Videos', 'Daily Targets'],
        availability: 'Opens December',
        description: 'Comprehensive high-intensity crash course covering GS Paper 1 and CSAT. Daily schedule, subject-wise revision videos, formula sheets, and 45 full-scale prelims tests.',
        order: 3,
        isPublished: true,
    },
    {
        title: 'Yearlong Advanced Mains + Prelims Mentorship',
        tagline: 'Bundle',
        price: '₹9,899',
        audience: 'Both',
        stages: ['Both', 'Prelims', 'Mains'],
        levels: ['Beginner', 'Veteran'],
        coverage: 'Mains GS1-4 & Essay + Prelims',
        deliverables: ['35 Tests', '45 Tests', 'Daily Practice'],
        availability: 'Start Now',
        bundleNote: 'Bundles Advanced Revision Mains + Prelims Crash Course · saves ₹99',
        description: 'Integrated yearlong program bundling both Mains Advanced Revision and Prelims Crash Course with complete mentor tracking and test evaluation.',
        order: 4,
        isPublished: true,
    },
];

// @desc    Get published mentorship courses
// @route   GET /api/mentorship-courses
// @access  Public
export const getMentorshipCourses = async (_req: Request, res: Response): Promise<void> => {
    try {
        let courses = await MentorshipCourse.find({ isPublished: true }).sort({ order: 1, createdAt: -1 });

        // Auto seed default courses if collection is empty
        if (courses.length === 0) {
            await MentorshipCourse.insertMany(DEFAULT_COURSES);
            courses = await MentorshipCourse.find({ isPublished: true }).sort({ order: 1, createdAt: -1 });
        }

        res.json({
            success: true,
            data: courses,
        });
    } catch (error) {
        console.error('Get mentorship courses error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all mentorship courses for admin
// @route   GET /api/mentorship-courses/admin
// @access  Private/Admin
export const getAdminMentorshipCourses = async (_req: Request, res: Response): Promise<void> => {
    try {
        let courses = await MentorshipCourse.find({}).sort({ order: 1, createdAt: -1 });

        if (courses.length === 0) {
            await MentorshipCourse.insertMany(DEFAULT_COURSES);
            courses = await MentorshipCourse.find({}).sort({ order: 1, createdAt: -1 });
        }

        res.json({
            success: true,
            data: courses,
        });
    } catch (error) {
        console.error('Get admin mentorship courses error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create mentorship course
// @route   POST /api/mentorship-courses
// @access  Private/Admin
export const createMentorshipCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            title,
            tagline,
            price,
            audience,
            stages,
            levels,
            coverage,
            deliverables,
            availability,
            bundleNote,
            description,
            order,
            isPublished,
        } = req.body;

        if (!title || !tagline || !price || !coverage || !description) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }

        const course = await MentorshipCourse.create({
            title,
            tagline,
            price,
            audience: audience || 'Both',
            stages: Array.isArray(stages) ? stages : ['Mains'],
            levels: Array.isArray(levels) ? levels : ['Beginner'],
            coverage,
            deliverables: Array.isArray(deliverables) ? deliverables : [],
            availability: availability || 'Start Now',
            bundleNote,
            description,
            order: order ?? 0,
            isPublished: isPublished ?? true,
            createdBy: (req as any).user?._id,
        });

        res.status(201).json({
            success: true,
            data: course,
        });
    } catch (error) {
        console.error('Create mentorship course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update mentorship course
// @route   PUT /api/mentorship-courses/:id
// @access  Private/Admin
export const updateMentorshipCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const course = await MentorshipCourse.findById(req.params.id);

        if (!course) {
            res.status(404).json({ success: false, message: 'Mentorship course not found' });
            return;
        }

        const updatedCourse = await MentorshipCourse.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            data: updatedCourse,
        });
    } catch (error) {
        console.error('Update mentorship course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete mentorship course
// @route   DELETE /api/mentorship-courses/:id
// @access  Private/Admin
export const deleteMentorshipCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const course = await MentorshipCourse.findById(req.params.id);

        if (!course) {
            res.status(404).json({ success: false, message: 'Mentorship course not found' });
            return;
        }

        await course.deleteOne();

        res.json({
            success: true,
            message: 'Mentorship course deleted successfully',
        });
    } catch (error) {
        console.error('Delete mentorship course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
