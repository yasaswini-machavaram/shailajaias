import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    email?: string;
    password?: string;
    phone?: string;
    name: string;
    role: 'admin' | 'student';
    authProvider: 'local' | 'whatsapp';
    status: 'active' | 'suspended';
    tokenVersion: number;
    enrolledCourses: mongoose.Types.ObjectId[];
    enrolledTestSeries: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            unique: true,
            sparse: true, // Allows null — WhatsApp-only students won't have email
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            minlength: 6,
            select: false, // Don't include password in queries by default
        },
        phone: {
            type: String,
            unique: true,
            sparse: true, // Allows null — admin users won't have phone
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        role: {
            type: String,
            enum: ['admin', 'student'],
            default: 'student',
        },
        authProvider: {
            type: String,
            enum: ['local', 'whatsapp'],
            default: 'local',
        },
        status: {
            type: String,
            enum: ['active', 'suspended'],
            default: 'active',
        },
        tokenVersion: {
            type: Number,
            default: 0,
        },
        enrolledCourses: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CourseNode',
            },
        ],
        enrolledTestSeries: [
            {
                type: Schema.Types.ObjectId,
                ref: 'TestSeries',
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = (await bcrypt.hash(this.password, salt)) as string;
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password || '');
};

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;
