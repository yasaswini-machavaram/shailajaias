import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import {
    MasterTag,
    CourseGroup,
    CourseNode,
    TestSeries,
    MainsTestSeries,
    MentorshipCourse
} from '../models/index.js';

// Default master tags seed if DB is empty
const DEFAULT_TAGS = [
    { code: 'GS-1', title: 'GS Paper I — History, Art, Culture & Geography', colorHex: '#b8502a' },
    { code: 'GS-2', title: 'GS Paper II — Governance, Polity, IR & Constitution', colorHex: '#1d3557' },
    { code: 'GS-3', title: 'GS Paper III — Economy, S&T, Environment & Security', colorHex: '#3c5a3f' },
    { code: 'GS-4', title: 'GS Paper IV — Ethics, Integrity & Aptitude', colorHex: '#6b5b45' },
    { code: 'PRELIMS-2027', title: 'Prelims Track — Integrated 2027', colorHex: '#d97706' },
    { code: 'MAINS-2027', title: 'Mains Test Series & Answer Writing 2027', colorHex: '#4f46e5' },
    { code: 'ESSAY', title: 'Essay Masterclass & Test Series', colorHex: '#0284c7' },
    { code: 'CSAT', title: 'CSAT Quantitative & Logical Aptitude', colorHex: '#059669' },
];

// @desc    Get all master tags (auto-seeds defaults if empty)
// @route   GET /api/master-tags
// @access  Public / Private
export const getAllMasterTags = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        let tags = await MasterTag.find().sort({ code: 1 }).lean();

        if (tags.length === 0) {
            await MasterTag.insertMany(DEFAULT_TAGS);
            tags = await MasterTag.find().sort({ code: 1 }).lean();
        }

        res.json({ success: true, data: tags });
    } catch (error) {
        console.error('getAllMasterTags error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create a new master tag
// @route   POST /api/master-tags
// @access  Private/Admin
export const createMasterTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, code, description, colorHex } = req.body;

        if (!title?.trim() || !code?.trim()) {
            res.status(400).json({ success: false, message: 'Title and code are required' });
            return;
        }

        const normalizedCode = code.trim().toUpperCase();

        const existing = await MasterTag.findOne({ code: normalizedCode });
        if (existing) {
            res.status(400).json({ success: false, message: `Tag code '${normalizedCode}' already exists` });
            return;
        }

        const tag = await MasterTag.create({
            title: title.trim(),
            code: normalizedCode,
            description: description || '',
            colorHex: colorHex || '#b8502a',
            createdBy: req.user?._id,
        });

        res.status(201).json({ success: true, data: tag, message: 'Master tag created successfully' });
    } catch (error) {
        console.error('createMasterTag error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update a master tag
// @route   PUT /api/master-tags/:id
// @access  Private/Admin
export const updateMasterTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, code, description, colorHex } = req.body;

        const tag = await MasterTag.findById(id);
        if (!tag) {
            res.status(404).json({ success: false, message: 'Master tag not found' });
            return;
        }

        if (code && code.trim().toUpperCase() !== tag.code) {
            const existing = await MasterTag.findOne({ code: code.trim().toUpperCase() });
            if (existing) {
                res.status(400).json({ success: false, message: `Tag code '${code.trim().toUpperCase()}' already exists` });
                return;
            }
            tag.code = code.trim().toUpperCase();
        }

        if (title !== undefined) tag.title = title.trim();
        if (description !== undefined) tag.description = description;
        if (colorHex !== undefined) tag.colorHex = colorHex;

        await tag.save();

        res.json({ success: true, data: tag, message: 'Master tag updated successfully' });
    } catch (error) {
        console.error('updateMasterTag error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete a master tag
// @route   DELETE /api/master-tags/:id
// @access  Private/Admin
export const deleteMasterTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const tag = await MasterTag.findById(id);
        if (!tag) {
            res.status(404).json({ success: false, message: 'Master tag not found' });
            return;
        }

        await tag.deleteOne();

        res.json({ success: true, message: 'Master tag deleted successfully' });
    } catch (error) {
        console.error('deleteMasterTag error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Deep-Link Inspector / Visualizer: Get all connected items where this tag is linked
// @route   GET /api/master-tags/:id/linked-items
// @access  Private/Admin
export const getLinkedItemsForTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const tag = await MasterTag.findById(id).lean();
        if (!tag) {
            res.status(404).json({ success: false, message: 'Master tag not found' });
            return;
        }

        const tagRegex = new RegExp(`^${tag.code}$`, 'i');

        // Search Course Groups
        const courseGroups = await CourseGroup.find({
            $or: [{ mentorTags: tagRegex }, { mentorTags: { $in: [tag.code, tag.title] } }],
        }).lean();

        // Search Root Course Nodes
        const courseNodes = await CourseNode.find({
            level: 'course',
            $or: [{ mentorTags: tagRegex }, { mentorTags: { $in: [tag.code, tag.title] } }],
        }).lean();

        // Search Prelims Test Series (PTS) Groups
        const ptsGroups = await TestSeries.find({
            $or: [{ mentorTags: tagRegex }, { mentorTags: { $in: [tag.code, tag.title] } }],
        }).lean();

        // Search Mains Test Series (MTS) Groups
        const mtsGroups = await MainsTestSeries.find({
            $or: [{ mentorTags: tagRegex }, { mentorTags: { $in: [tag.code, tag.title] } }],
        }).lean();

        // Search Mentorship Programs
        const mentorshipCourses = await MentorshipCourse.find({
            $or: [{ mentorTags: tagRegex }, { mentorTags: { $in: [tag.code, tag.title] } }],
        }).lean();

        res.json({
            success: true,
            data: {
                tag,
                linkedItems: {
                    courseGroups,
                    courseNodes,
                    ptsGroups,
                    mtsGroups,
                    mentorshipCourses,
                },
                totalLinkedCount:
                    courseGroups.length +
                    courseNodes.length +
                    ptsGroups.length +
                    mtsGroups.length +
                    mentorshipCourses.length,
            },
        });
    } catch (error) {
        console.error('getLinkedItemsForTag error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
