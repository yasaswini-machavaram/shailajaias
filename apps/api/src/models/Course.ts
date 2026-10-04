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
    // Video-level locks
    isPracticeLocked?: boolean;
    isHelpLocked?: boolean;
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

export type TaskCardType = 'video' | 'pts_test' | 'mts_test';

export interface ITaskCardItem {
    _id?: Types.ObjectId;
    cardType: TaskCardType;
    order: number;
    title: string;
    description?: string;
    dayNumber?: number;

    // Video card properties (reusing video item fields)
    videoProvider?: VideoProvider;
    videoUrl?: string;
    notesText?: string;
    pdfFiles?: IPdfFile[];
    prelimsQuizId?: Types.ObjectId;
    prelimsDiscussionVideoUrl?: string;
    prelimsDiscussionVideoProvider?: VideoProvider;
    mainsPracticeTestId?: Types.ObjectId;
    mainsQuestionText?: string;
    mainsModelAnswer?: string;
    mainsDiscussionVideoUrl?: string;
    mainsDiscussionVideoProvider?: VideoProvider;
    helpContactInfo?: string;
    faqs?: IFaqItem[];
    isPracticeLocked?: boolean;
    isHelpLocked?: boolean;

    // PTS test card properties
    ptsSeriesId?: Types.ObjectId;
    ptsTestIndex?: number;
    ptsTestTitle?: string;
    ptsQuizId?: Types.ObjectId;
    ptsQuestionPaperUrl?: string;
    ptsSolutionPaperUrl?: string;
    ptsDiscussionVideoUrl?: string;
    ptsSyllabus?: string;

    // MTS test card properties
    mtsSeriesId?: Types.ObjectId;
    mtsTestIndex?: number;
    mtsTestTitle?: string;
    mtsSubjectCategory?: string;
    mtsQuestionPaperUrl?: string;
    mtsSolutionPaperUrl?: string;
    mtsDiscussionVideoUrl?: string;
    mtsSyllabus?: string;
}

export interface ICourseNode extends Document {
    title: string;
    description?: string;
    parent?: Types.ObjectId; // Self-reference for tree structure
    order: number;
    level: 'course' | 'subject' | 'topic' | 'subtopic';
    videos: IVideoItem[];
    taskCards?: ITaskCardItem[];
    contentTabs: IContentTab[];
    isPublished: boolean;
    isPracticeLocked?: boolean; // Deprecated: moved to VideoItem
    isHelpLocked?: boolean;     // Deprecated: moved to VideoItem
    isLocked: boolean;
    price?: number;
    mentorTags?: string[];
    ptsGroupCode?: string;
    mtsGroupCode?: string;
    linkedPtsId?: Types.ObjectId;
    linkedMtsId?: Types.ObjectId;
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
        isPracticeLocked: { type: Boolean, default: false },
        isHelpLocked: { type: Boolean, default: false },
    },
    { _id: true }
);

const TaskCardItemSchema = new Schema<ITaskCardItem>(
    {
        cardType: {
            type: String,
            enum: ['video', 'pts_test', 'mts_test'],
            default: 'video',
        },
        order: { type: Number, default: 0 },
        title: { type: String, default: 'Untitled Card', trim: true },
        description: String,
        dayNumber: Number,

        // Video card
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
        isPracticeLocked: { type: Boolean, default: false },
        isHelpLocked: { type: Boolean, default: false },

        // PTS test card
        ptsSeriesId: {
            type: Schema.Types.ObjectId,
            ref: 'TestSeries',
            default: null,
        },
        ptsTestIndex: { type: Number, default: 0 },
        ptsTestTitle: String,
        ptsQuizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            default: null,
        },
        ptsQuestionPaperUrl: String,
        ptsSolutionPaperUrl: String,
        ptsDiscussionVideoUrl: String,
        ptsSyllabus: String,

        // MTS test card
        mtsSeriesId: {
            type: Schema.Types.ObjectId,
            ref: 'MainsTestSeries',
            default: null,
        },
        mtsTestIndex: { type: Number, default: 0 },
        mtsTestTitle: String,
        mtsSubjectCategory: String,
        mtsQuestionPaperUrl: String,
        mtsSolutionPaperUrl: String,
        mtsDiscussionVideoUrl: String,
        mtsSyllabus: String,
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
        taskCards: { type: [TaskCardItemSchema], default: [] },
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
        ptsGroupCode: {
            type: String,
            trim: true,
        },
        mtsGroupCode: {
            type: String,
            trim: true,
        },
        linkedPtsId: {
            type: Schema.Types.ObjectId,
            ref: 'TestSeries',
            default: null,
        },
        linkedMtsId: {
            type: Schema.Types.ObjectId,
            ref: 'MainsTestSeries',
            default: null,
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
