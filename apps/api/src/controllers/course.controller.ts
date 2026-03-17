import type { Request, Response } from 'express';
import { CourseNode } from '../models/index.js';

// @desc    Get all root-level courses (tree structure)
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get only root-level courses (no parent)
        const courses = await CourseNode.find({ parent: null })
            .sort({ order: 1 });

        res.json({ success: true, data: courses });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single course node with children
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const course = await CourseNode.findById(req.params.id);

        if (!course) {
            res.status(404).json({ success: false, message: 'Course node not found' });
            return;
        }

        // Get children of this node
        const children = await CourseNode.find({ parent: course._id })
            .sort({ order: 1 });

        res.json({
            success: true,
            data: {
                ...course.toObject(),
                children,
            }
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create course node
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, level, parent, order, contentTabs, isPublished } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        // Create the node
        const course = await CourseNode.create({
            title,
            description,
            level,
            parent: parent || null,
            order: order || 0,
            contentTabs: contentTabs || [],
            isPublished: isPublished || false,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: course });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update course node
// @route   PUT /api/courses/:id
// @access  Private/Admin
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, level, order, contentTabs, isPublished } = req.body;

        const course = await CourseNode.findById(req.params.id);
        if (!course) {
            res.status(404).json({ success: false, message: 'Course node not found' });
            return;
        }

        // Update fields
        if (title) course.title = title;
        if (description !== undefined) course.description = description;
        if (level) course.level = level;
        if (order !== undefined) course.order = order;
        if (contentTabs) course.contentTabs = contentTabs;
        if (isPublished !== undefined) course.isPublished = isPublished;

        await course.save();

        res.json({ success: true, data: course });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete course node (and all children)
// @route   DELETE /api/courses/:id
// @access  Private/Admin
export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const course = await CourseNode.findById(req.params.id);
        if (!course) {
            res.status(404).json({ success: false, message: 'Course node not found' });
            return;
        }

        // Recursively delete all children
        const deleteChildren = async (parentId: string) => {
            const children = await CourseNode.find({ parent: parentId });
            for (const child of children) {
                await deleteChildren(child._id.toString());
                await CourseNode.findByIdAndDelete(child._id);
            }
        };

        await deleteChildren(req.params.id);
        await CourseNode.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Course node and children deleted' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
