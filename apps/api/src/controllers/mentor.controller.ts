import type { Request, Response } from 'express';
import { User, MainsSubmission, MentorshipCourse, MainsTestSeries } from '../models/index.js';

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

// @desc    Admin gets mentor allocation configuration for all Mentorship Programmes and MTS Batches
// @route   GET /api/mentors/program-config
// @access  Private/Admin
export const getProgramMentorConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
        const mentorshipCourses = await MentorshipCourse.find()
            .populate('defaultMentor', 'name email status')
            .populate('assignedMentors', 'name email status')
            .sort({ order: 1 })
            .lean();

        const mtsBatches = await MainsTestSeries.find()
            .populate('defaultMentor', 'name email status')
            .populate('assignedMentors', 'name email status')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate student allocation counts per program
        const formattedMentorshipCourses = await Promise.all(
            mentorshipCourses.map(async (c: any) => {
                const studentCount = await User.countDocuments({
                    role: 'student',
                    $or: [
                        { purchasedCourseGroups: c._id },
                        { purchasedMentorTags: { $in: c.mentorTags || [] } }
                    ]
                });
                const isUnallocated = !c.defaultMentor && (!c.assignedMentors || c.assignedMentors.length === 0);
                return { ...c, studentCount, isUnallocated };
            })
        );

        const formattedMtsBatches = await Promise.all(
            mtsBatches.map(async (m: any) => {
                const studentCount = await User.countDocuments({
                    role: 'student',
                    purchasedMtsGroups: m._id
                });
                const isUnallocated = !m.defaultMentor && (!m.assignedMentors || m.assignedMentors.length === 0);
                return { ...m, studentCount, isUnallocated };
            })
        );

        res.json({
            success: true,
            data: {
                mentorshipCourses: formattedMentorshipCourses,
                mtsBatches: formattedMtsBatches
            }
        });
    } catch (error) {
        console.error('getProgramMentorConfigs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin updates mentor allocation pool (default mentor + assigned mentors) for a Programme or MTS Batch
// @route   PUT /api/mentors/program-config/:type/:id
// @access  Private/Admin
export const updateProgramMentorConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type, id } = req.params;
        const { defaultMentor, assignedMentors } = req.body;

        if (type === 'mentorship') {
            const course = await MentorshipCourse.findById(id);
            if (!course) {
                res.status(404).json({ success: false, message: 'Mentorship course not found' });
                return;
            }
            if (defaultMentor !== undefined) course.defaultMentor = defaultMentor || undefined;
            if (assignedMentors !== undefined && Array.isArray(assignedMentors)) course.assignedMentors = assignedMentors;
            await course.save();

            res.json({ success: true, message: 'Mentorship program mentor configuration updated', data: course });
        } else if (type === 'mts') {
            const batch = await MainsTestSeries.findById(id);
            if (!batch) {
                res.status(404).json({ success: false, message: 'MTS batch not found' });
                return;
            }
            if (defaultMentor !== undefined) batch.defaultMentor = defaultMentor || undefined;
            if (assignedMentors !== undefined && Array.isArray(assignedMentors)) batch.assignedMentors = assignedMentors;
            await batch.save();

            // Link batch to assigned mentors' assignedMtsGroups
            if (assignedMentors && Array.isArray(assignedMentors)) {
                await User.updateMany(
                    { _id: { $in: assignedMentors }, role: 'mentor' },
                    { $addToSet: { assignedMtsGroups: batch._id } }
                );
            }

            res.json({ success: true, message: 'MTS batch mentor configuration updated', data: batch });
        } else {
            res.status(400).json({ success: false, message: 'Invalid program type. Must be mentorship or mts' });
        }
    } catch (error) {
        console.error('updateProgramMentorConfig error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Admin manually reassigns a student to a specific mentor (or unassigns)
// @route   PUT /api/mentors/reassign-student
// @access  Private/Admin
export const reassignStudentMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, mentorId } = req.body;

        if (!studentId) {
            res.status(400).json({ success: false, message: 'studentId is required' });
            return;
        }

        const student = await User.findOne({ _id: studentId, role: 'student' });
        if (!student) {
            res.status(404).json({ success: false, message: 'Student not found' });
            return;
        }

        const previousMentorId = student.assignedMentor;

        if (mentorId) {
            const newMentor = await User.findOne({ _id: mentorId, role: 'mentor' });
            if (!newMentor) {
                res.status(404).json({ success: false, message: 'Selected mentor not found' });
                return;
            }

            student.assignedMentor = newMentor._id;
            await student.save();

            // Remove student from old mentor's list
            if (previousMentorId && String(previousMentorId) !== String(mentorId)) {
                await User.findByIdAndUpdate(previousMentorId, { $pull: { assignedStudents: student._id } });
            }

            // Add student to new mentor's list
            await User.findByIdAndUpdate(newMentor._id, { $addToSet: { assignedStudents: student._id } });
        } else {
            // Unassign mentor
            student.assignedMentor = undefined;
            await student.save();

            if (previousMentorId) {
                await User.findByIdAndUpdate(previousMentorId, { $pull: { assignedStudents: student._id } });
            }
        }

        res.json({ success: true, message: 'Student mentor reassigned successfully', data: { studentId, assignedMentor: student.assignedMentor } });
    } catch (error) {
        console.error('reassignStudentMentor error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Helper function: Auto-allocates student to mentor using weighted round-robin (minimum student load)
export const autoAllocateStudentMentor = async (studentId: string, programType: 'mentorship' | 'mts', programId: string): Promise<any> => {
    try {
        const student = await User.findOne({ _id: studentId, role: 'student' });
        if (!student) return null;

        let poolMentorIds: any[] = [];
        let defaultMentorId: any = null;

        if (programType === 'mentorship') {
            const course = await MentorshipCourse.findById(programId).lean();
            if (course) {
                poolMentorIds = course.assignedMentors || [];
                defaultMentorId = course.defaultMentor;
            }
        } else if (programType === 'mts') {
            const batch = await MainsTestSeries.findById(programId).lean();
            if (batch) {
                poolMentorIds = batch.assignedMentors || [];
                defaultMentorId = batch.defaultMentor;
            }
        }

        // If pool is empty, check default mentor
        if (poolMentorIds.length === 0 && defaultMentorId) {
            poolMentorIds = [defaultMentorId];
        }

        // Fallback: get all active mentors if no specific mentor pool is defined
        if (poolMentorIds.length === 0) {
            const activeMentors = await User.find({ role: 'mentor', status: 'active' }).select('_id').lean();
            poolMentorIds = activeMentors.map((m) => m._id);
        }

        if (poolMentorIds.length === 0) return null;

        // Weighted Round-Robin Allocation: calculate current assigned student load per candidate mentor
        const mentorsWithLoads = await Promise.all(
            poolMentorIds.map(async (mId) => {
                const mentorDoc = await User.findById(mId).select('_id name assignedStudents status').lean();
                if (!mentorDoc || mentorDoc.status !== 'active') return null;
                const load = Array.isArray(mentorDoc.assignedStudents) ? mentorDoc.assignedStudents.length : 0;
                return { mentor: mentorDoc, load };
            })
        );

        const validMentors = mentorsWithLoads.filter((m) => m !== null) as { mentor: any; load: number }[];
        if (validMentors.length === 0) return null;

        // Sort by minimum load (equal weight distribution)
        validMentors.sort((a, b) => a.load - b.load);
        const selectedMentor = validMentors[0].mentor;

        // Assign to student
        student.assignedMentor = selectedMentor._id;
        await student.save();

        // Add to mentor's assignedStudents list
        await User.findByIdAndUpdate(selectedMentor._id, { $addToSet: { assignedStudents: student._id } });

        return selectedMentor;
    } catch (error) {
        console.error('autoAllocateStudentMentor error:', error);
        return null;
    }
};
