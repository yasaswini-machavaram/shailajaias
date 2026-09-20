import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICourseGroup extends Document {
    title: string;
    description?: string;
    brochureUrl?: string;
    brochureKey?: string;
    introVideoUrl?: string;
    courseIds: Types.ObjectId[];
    price: number;
    mentorTags: string[];
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CourseGroupSchema = new Schema<ICourseGroup>(
    {
        title: {
            type: String,
            required: [true, 'Course group title is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        brochureUrl: {
            type: String,
        },
        brochureKey: {
            type: String,
        },
        introVideoUrl: {
            type: String,
            trim: true,
        },
        courseIds: [
            {
                type: Schema.Types.ObjectId,
                ref: 'CourseNode',
            },
        ],
        price: {
            type: Number,
            default: 0,
        },
        mentorTags: [
            {
                type: String,
                trim: true,
            },
        ],
        isPublished: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

CourseGroupSchema.index({ title: 'text' });

export const CourseGroup = mongoose.model<ICourseGroup>('CourseGroup', CourseGroupSchema);
export default CourseGroup;
