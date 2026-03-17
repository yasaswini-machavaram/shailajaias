import mongoose, { Schema, Document, Types } from 'mongoose';

export type ContentTabType = 'video' | 'notes' | 'test';

export interface IContentTab {
    type: ContentTabType;
    title: string;
    videoUrl?: string; // YouTube or Bunny.net URL
    pdfUrl?: string;
    pdfKey?: string;
    testId?: Types.ObjectId; // Reference to Quiz
}

export interface ICourseNode extends Document {
    title: string;
    description?: string;
    parent?: Types.ObjectId; // Self-reference for tree structure
    order: number;
    level: 'course' | 'subject' | 'topic' | 'subtopic';
    contentTabs: IContentTab[];
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ContentTabSchema = new Schema<IContentTab>(
    {
        type: {
            type: String,
            enum: ['video', 'notes', 'test'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        videoUrl: String,
        pdfUrl: String,
        pdfKey: String,
        testId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
        },
    },
    { _id: false }
);

const CourseNodeSchema = new Schema<ICourseNode>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: String,
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'CourseNode',
            default: null,
        },
        order: {
            type: Number,
            default: 0,
        },
        level: {
            type: String,
            enum: ['course', 'subject', 'topic', 'subtopic'],
            required: true,
        },
        contentTabs: [ContentTabSchema],
        isPublished: {
            type: Boolean,
            default: false,
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

// Index for fetching children of a node
CourseNodeSchema.index({ parent: 1, order: 1 });

export const CourseNode = mongoose.model<ICourseNode>('CourseNode', CourseNodeSchema);
export default CourseNode;
