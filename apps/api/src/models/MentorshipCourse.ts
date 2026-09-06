import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorshipCourse extends Document {
    title: string;
    tagline: string;
    price: string;
    audience: 'Beginner' | 'Veteran' | 'Both';
    stages: ('Prelims' | 'Mains' | 'Both')[];
    levels: ('Beginner' | 'Veteran')[];
    coverage: string;
    deliverables: string[];
    availability: string;
    bundleNote?: string;
    description: string;
    order: number;
    isPublished: boolean;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MentorshipCourseSchema = new Schema<IMentorshipCourse>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        tagline: {
            type: String,
            required: [true, 'Tagline is required'],
            trim: true,
        },
        price: {
            type: String,
            required: [true, 'Price is required'],
            trim: true,
        },
        audience: {
            type: String,
            enum: ['Beginner', 'Veteran', 'Both'],
            default: 'Both',
        },
        stages: {
            type: [String],
            default: ['Mains'],
        },
        levels: {
            type: [String],
            default: ['Beginner'],
        },
        coverage: {
            type: String,
            required: [true, 'Coverage description is required'],
            trim: true,
        },
        deliverables: {
            type: [String],
            default: [],
        },
        availability: {
            type: String,
            default: 'Start Now',
            trim: true,
        },
        bundleNote: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

MentorshipCourseSchema.index({ order: 1, createdAt: -1 });

export const MentorshipCourse = mongoose.model<IMentorshipCourse>('MentorshipCourse', MentorshipCourseSchema);
export default MentorshipCourse;
