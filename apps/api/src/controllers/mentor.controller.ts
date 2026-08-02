import type { Request, Response } from 'express';
import { User, MainsSubmission } from '../models/index.js';

// @desc    Admin creates a mentor account
// @route   POST /api/mentors
// @access  Private/Admin
export const createMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            res.status(400).json({ success: false, message: 'Name, email, and password are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            return;
        }

        // Check if email already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            res.status(400).json({ success: false, message: 'Email is already registered' });
            return;
        }

        const mentor = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: 'mentor',
            authProvider: 'local',
            status: 'active',
        });

        res.status(201).json({
            success: true,
            data: {
                _id: mentor._id,
                name: mentor.name,
                email: mentor.email,
                role: mentor.role,
                status: mentor.status,
            },
            message: 'Mentor account created successfully',
        });
    } catch (error) {
        console.error('Create mentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin lists all mentor accounts
// @route   GET /api/mentors
// @access  Private/Admin
export const getAllMentors = async (req: Request, res: Response): Promise<void> => {
    try {
        const mentors = await User.find({ role: 'mentor' })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: mentors });
    } catch (error) {
        console.error('Get all mentors error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin gets mentor details + assignment info
// @route   GET /api/mentors/:id
// @access  Private/Admin
export const getMentorById = async (req: Request, res: Response): Promise<void> => {
    try {
        const mentor = await User.findOne({ _id: req.params.id, role: 'mentor' })
            .select('-password')
            .populate('assignedMtsGroups', 'title uniqueId')
            .populate('assignedStudents', 'name email phone')
            .lean();

        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        res.json({ success: true, data: mentor });
    } catch (error) {
        console.error('Get mentor by ID error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin updates mentor account (name, password, status)
// @route   PUT /api/mentors/:id
// @access  Private/Admin
export const updateMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, status } = req.body;

        const mentor = await User.findOne({ _id: req.params.id, role: 'mentor' });
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        if (name !== undefined) mentor.name = name.trim();
        if (status !== undefined) mentor.status = status;

        // Check email uniqueness if changed
        if (email && email.toLowerCase() !== mentor.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                res.status(400).json({ success: false, message: 'Email is already registered' });
                return;
            }
            mentor.email = email.toLowerCase().trim();
        }

        // Update password if provided
        if (password && password.length >= 6) {
            mentor.password = password; // pre-save hook will hash it
        }

        await mentor.save();

        res.json({
            success: true,
            data: {
                _id: mentor._id,
                name: mentor.name,
                email: mentor.email,
                role: mentor.role,
                status: mentor.status,
            },
            message: 'Mentor updated successfully',
        });
    } catch (error) {
        console.error('Update mentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin deletes a mentor account
// @route   DELETE /api/mentors/:id
// @access  Private/Admin
export const deleteMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const mentor = await User.findOneAndDelete({ _id: req.params.id, role: 'mentor' });

        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        res.json({ success: true, message: 'Mentor account deleted successfully' });
    } catch (error) {
        console.error('Delete mentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin assigns MTS batch(es) to mentor
// @route   PUT /api/mentors/:id/assign-batch
// @access  Private/Admin
export const assignMtsBatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { mtsGroupIds } = req.body;

        if (!mtsGroupIds || !Array.isArray(mtsGroupIds)) {
            res.status(400).json({ success: false, message: 'mtsGroupIds array is required' });
            return;
        }

        const mentor = await User.findOne({ _id: req.params.id, role: 'mentor' });
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        mentor.assignedMtsGroups = mtsGroupIds;
        await mentor.save();

        // Auto-assign any unassigned submissions for these batches to this mentor
        if (mtsGroupIds.length > 0) {
            await MainsSubmission.updateMany(
                { mainsTestSeries: { $in: mtsGroupIds }, status: 'submitted' },
                { $set: { mentor: mentor._id, status: 'assigned' } }
            );
        }

        res.json({ success: true, message: 'MTS batches assigned to mentor', data: { assignedMtsGroups: mentor.assignedMtsGroups } });
    } catch (error) {
        console.error('Assign MTS batch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin assigns specific students to mentor
// @route   PUT /api/mentors/:id/assign-students
// @access  Private/Admin
export const assignStudentsToMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentIds } = req.body;

        if (!studentIds || !Array.isArray(studentIds)) {
            res.status(400).json({ success: false, message: 'studentIds array is required' });
            return;
        }

        const mentor = await User.findOne({ _id: req.params.id, role: 'mentor' });
        if (!mentor) {
            res.status(404).json({ success: false, message: 'Mentor not found' });
            return;
        }

        mentor.assignedStudents = studentIds;
        await mentor.save();

        // Auto-assign any unassigned submissions for these students to this mentor
        if (studentIds.length > 0) {
            await MainsSubmission.updateMany(
                { student: { $in: studentIds }, status: 'submitted' },
                { $set: { mentor: mentor._id, status: 'assigned' } }
            );
        }

        res.json({ success: true, message: 'Students assigned to mentor', data: { assignedStudents: mentor.assignedStudents } });
    } catch (error) {
        console.error('Assign students to mentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
