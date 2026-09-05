import type { Request, Response } from 'express';
import mongoose from 'mongoose';
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

// @desc    Get full course tree for a specific root course (or all trees)
// @route   GET /api/courses/tree/:id
// @access  Public
export const getCourseTree = async (req: Request, res: Response): Promise<void> => {
    try {
        const rootId = req.params.id;

        const buildTree = async (parentId: string | null): Promise<any[]> => {
            const nodes = await CourseNode.find({ parent: parentId }).sort({ order: 1 });
            const tree = [];
            for (const node of nodes) {
                const children: any[] = await buildTree(node._id.toString());
                tree.push({
                    ...node.toObject(),
                    children,
                });
            }
            return tree;
        };

        if (rootId && rootId !== 'all') {
            const rootNode = await CourseNode.findById(rootId);
            if (!rootNode) {
                res.status(404).json({ success: false, message: 'Course node not found' });
                return;
            }
            const children = await buildTree(rootNode._id.toString());
            res.json({
                success: true,
                data: {
                    ...rootNode.toObject(),
                    children,
                },
            });
            return;
        }

        const rootCourses = await CourseNode.find({ parent: null }).sort({ order: 1 });
        const fullTree = [];
        for (const root of rootCourses) {
            const children = await buildTree(root._id.toString());
            fullTree.push({
                ...root.toObject(),
                children,
            });
        }

        res.json({ success: true, data: fullTree });
    } catch (error) {
        console.error('Get course tree error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const sanitizeVideos = (videosList: any[]) => {
    if (!Array.isArray(videosList)) return [];
    return videosList.map((v: any) => {
        const cleaned: any = {
            ...v,
            prelimsQuizId: v.prelimsQuizId && String(v.prelimsQuizId).trim() !== '' && mongoose.Types.ObjectId.isValid(v.prelimsQuizId) ? v.prelimsQuizId : null,
            mainsPracticeTestId: v.mainsPracticeTestId && String(v.mainsPracticeTestId).trim() !== '' && mongoose.Types.ObjectId.isValid(v.mainsPracticeTestId) ? v.mainsPracticeTestId : null,
            pdfFiles: Array.isArray(v.pdfFiles) ? v.pdfFiles.filter((p: any) => p && (p.title?.trim() || p.pdfUrl?.trim())) : [],
            faqs: Array.isArray(v.faqs) ? v.faqs.filter((f: any) => f && (f.question?.trim() || f.answer?.trim())) : [],
        };
        if (!cleaned._id || String(cleaned._id).trim() === '' || !mongoose.Types.ObjectId.isValid(cleaned._id)) {
            delete cleaned._id;
        }
        return cleaned;
    });
};

// @desc    Create course node
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, level, parent, order, videos, contentTabs, isPublished, isPracticeLocked, isHelpLocked, isLocked } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        const parentId = parent && String(parent).trim() !== '' && mongoose.Types.ObjectId.isValid(parent) ? parent : null;

        // Create the node
        const course = await CourseNode.create({
            title: title?.trim() || 'Untitled Course',
            description,
            level,
            parent: parentId,
            order: order || 0,
            videos: sanitizeVideos(videos),
            contentTabs: contentTabs || [],
            isPublished: isPublished ?? false,
            isPracticeLocked: isPracticeLocked ?? false,
            isHelpLocked: isHelpLocked ?? false,
            isLocked: isLocked ?? false,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: course });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(400).json({ success: false, message: (error as Error).message || 'Failed to create course' });
    }
};

// @desc    Update course node
// @route   PUT /api/courses/:id
// @access  Private/Admin
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, level, order, videos, contentTabs, isPublished, isPracticeLocked, isHelpLocked, isLocked } = req.body;

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
        if (videos !== undefined) course.videos = sanitizeVideos(videos);
        if (contentTabs !== undefined) course.contentTabs = contentTabs;
        if (isPublished !== undefined) course.isPublished = isPublished;
        if (isPracticeLocked !== undefined) course.isPracticeLocked = isPracticeLocked;
        if (isHelpLocked !== undefined) course.isHelpLocked = isHelpLocked;
        if (isLocked !== undefined) course.isLocked = isLocked;

        await course.save();

        res.json({ success: true, data: course });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(400).json({ success: false, message: (error as Error).message || 'Failed to update course' });
    }
};

// @desc    Update lock status for a course node
// @route   PUT /api/courses/:id/lock-status
// @access  Private/Admin
export const updateLockStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { isPracticeLocked, isHelpLocked, isLocked } = req.body;

        const course = await CourseNode.findById(req.params.id);
        if (!course) {
            res.status(404).json({ success: false, message: 'Course node not found' });
            return;
        }

        if (isPracticeLocked !== undefined) course.isPracticeLocked = isPracticeLocked;
        if (isHelpLocked !== undefined) course.isHelpLocked = isHelpLocked;
        if (isLocked !== undefined) course.isLocked = isLocked;

        await course.save();

        res.json({ success: true, data: course });
    } catch (error) {
        console.error('Update lock status error:', error);
        res.status(400).json({ success: false, message: (error as Error).message || 'Failed to update lock status' });
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
