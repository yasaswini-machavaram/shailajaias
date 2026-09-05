import mongoose, { Schema, Document, Types } from 'mongoose';

export type ContentTabType = 'video' | 'notes' | 'test' | 'mains' | 'help';
export type VideoProvider = 'youtube' | 'bunny' | 'custom';

export interface IPdfFile {
    title: string;
    pdfUrl: string;
    pdfKey?: string;
}

export interface IFaqItem {
    question: string;
    answer: string;
}

export interface IVideoItem {
    _id?: Types.ObjectId;
    title: string;
    description?: string;
    videoProvider: VideoProvider;
    videoUrl: string;
    // Notes section
    notesText?: string;
    pdfFiles: IPdfFile[];
    // Prelims Practice section
    prelimsQuizId?: Types.ObjectId;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProvider;
    // Mains Practice section
    mainsPracticeTestId?: Types.ObjectId;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProvider;
    // Help & FAQ section
    helpContactInfo?: string;
    faqs: IFaqItem[];
}

export interface IContentTab {
    type: ContentTabType;
    title: string;
    videoProvider?: VideoProvider;
    videoUrl?: string;
    pdfUrl?: string;
    pdfKey?: string;
    notesText?: string;
    testId?: Types.ObjectId;
    mainsTestId?: Types.ObjectId;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    helpContactInfo?: string;
}

export interface ICourseNode extends Document {
    title: string;
    description?: string;
    parent?: Types.ObjectId; // Self-reference for tree structure
    order: number;
    level: 'course' | 'subject' | 'topic' | 'subtopic';
    videos: IVideoItem[];
    contentTabs: IContentTab[];
    isPublished: boolean;
    isPracticeLocked: boolean;
    isHelpLocked: boolean;
    isLocked: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PdfFileSchema = new Schema<IPdfFile>(
    {
        title: { type: String, default: 'Reference Material' },
        pdfUrl: { type: String, default: '' },
        pdfKey: String,
    },
    { _id: false }
);

const FaqItemSchema = new Schema<IFaqItem>(
    {
        question: { type: String, default: '' },
        answer: { type: String, default: '' },
    },
    { _id: false }
);

const VideoItemSchema = new Schema<IVideoItem>(
    {
        title: { type: String, default: 'Untitled Video', trim: true },
        description: String,
        videoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        videoUrl: { type: String, default: '', trim: true },
        notesText: String,
        pdfFiles: { type: [PdfFileSchema], default: [] },
        prelimsQuizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            default: null,
        },
        prelimsDiscussionVideoUrl: String,
        prelimsDiscussionVideoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        mainsPracticeTestId: {
            type: Schema.Types.ObjectId,
            ref: 'MainsPracticeTest',
            default: null,
        },
        mainsQuestionText: String,
        mainsModelAnswer: String,
        mainsDiscussionVideoUrl: String,
        mainsDiscussionVideoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        helpContactInfo: String,
        faqs: { type: [FaqItemSchema], default: [] },
    },
    { _id: true }
);

const ContentTabSchema = new Schema<IContentTab>(
    {
        type: {
            type: String,
            enum: ['video', 'notes', 'test', 'mains', 'help'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        videoProvider: {
            type: String,
            enum: ['youtube', 'bunny', 'custom'],
            default: 'youtube',
        },
        videoUrl: String,
        pdfUrl: String,
        pdfKey: String,
        notesText: String,
        testId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
        },
        mainsTestId: {
            type: Schema.Types.ObjectId,
            ref: 'MainsPracticeTest',
        },
        mainsQuestionText: String,
        mainsModelAnswer: String,
        helpContactInfo: String,
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
        videos: { type: [VideoItemSchema], default: [] },
        contentTabs: { type: [ContentTabSchema], default: [] },
        isPublished: {
            type: Boolean,
            default: false,
        },
        isPracticeLocked: {
            type: Boolean,
            default: false,
        },
        isHelpLocked: {
            type: Boolean,
            default: false,
        },
        isLocked: {
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

CourseNodeSchema.index({ parent: 1, order: 1 });

export const CourseNode = mongoose.model<ICourseNode>('CourseNode', CourseNodeSchema);
export default CourseNode;
