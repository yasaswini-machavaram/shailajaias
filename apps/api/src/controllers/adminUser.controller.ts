import type { Request, Response } from 'express';
import { User } from '../models/index.js';

// @desc    Get all student users with filters
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const skip = (page - 1) * limit;

        const search = req.query.search ? String(req.query.search) : '';
        const status = req.query.status ? String(req.query.status) : '';

        // Build query
        const query: any = { role: 'student' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        if (status) {
            query.status = status;
        }

        const students = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-password');

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get all students error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get student details by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getStudentById = async (req: Request, res: Response): Promise<void> => {
    try {
        const student = await User.findOne({ _id: req.params.id, role: 'student' })
            .select('-password')
            .populate('enrolledCourses', 'title level isPublished')
            .populate('enrolledTestSeries', 'title isPublished');

        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found' });
            return;
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error('Get student details error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update student details, status, and course/test-series enrollments
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, phone, status, enrolledCourses, enrolledTestSeries } = req.body;

        const student = await User.findOne({ _id: req.params.id, role: 'student' });
        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found' });
            return;
        }

        // Validate unique email if provided and changed
        if (email && email !== student.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                res.status(400).json({ success: false, message: 'Email is already registered' });
                return;
            }
        }

        // Validate unique phone if provided and changed
        if (phone && phone !== student.phone) {
            const phoneExists = await User.findOne({ phone });
            if (phoneExists) {
                res.status(400).json({ success: false, message: 'Phone number is already registered' });
                return;
            }
        }

        // Update basic fields
        if (name !== undefined) student.name = name;
        if (status !== undefined) student.status = status;
        student.email = email || undefined;
        student.phone = phone || undefined;

        // Update enrollments
        if (enrolledCourses !== undefined) {
            student.enrolledCourses = enrolledCourses;
        }
        if (enrolledTestSeries !== undefined) {
            student.enrolledTestSeries = enrolledTestSeries;
        }

        await student.save();

        res.json({
            success: true,
            message: 'Student updated successfully',
            data: student,
        });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete student account
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' });

        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Student account deleted successfully',
        });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
