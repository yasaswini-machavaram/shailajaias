import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMainsQuestionItem {
    questionText: string;
    marks?: number;
    wordLimit?: number;
    difficultyLevel: 'Easy' | 'Moderate' | 'Difficult';
    modelAnswer: string;
    approach?: string;
    topicTags?: string[];
}

export interface IMainsPracticeTest extends Document {
    title: string;
    subjectCategory: string; // "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Essay" | "Optional"
    topicsSummary?: string;
    guidelinesUrl?: string;
    guidelinesKey?: string;
    introVideoUrl?: string;
    questions: IMainsQuestionItem[];
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MainsQuestionItemSchema = new Schema<IMainsQuestionItem>(
    {
        questionText: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
        },
        marks: {
            type: Number,
        },
        wordLimit: {
            type: Number,
        },
        difficultyLevel: {
            type: String,
            enum: ['Easy', 'Moderate', 'Difficult'],
            default: 'Moderate',
        },
        modelAnswer: {
            type: String,
            required: [true, 'Model answer is required'],
            trim: true,
        },
        approach: {
            type: String,
            trim: true,
        },
        topicTags: {
            type: [String],
            default: [],
        },
    },
    { _id: true }
);

const MainsPracticeTestSchema = new Schema<IMainsPracticeTest>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        subjectCategory: {
            type: String,
            required: [true, 'Subject category is required'],
            trim: true,
            index: true,
        },
        topicsSummary: {
            type: String,
            trim: true,
        },
        guidelinesUrl: {
            type: String,
        },
        guidelinesKey: {
            type: String,
        },
        introVideoUrl: {
            type: String,
            trim: true,
        },
        questions: {
            type: [MainsQuestionItemSchema],
            default: [],
        },
        isPublished: {
            type: Boolean,
            default: false,
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

MainsPracticeTestSchema.index({ title: 'text', topicsSummary: 'text' });

export const MainsPracticeTest = mongoose.model<IMainsPracticeTest>('MainsPracticeTest', MainsPracticeTestSchema);
export default MainsPracticeTest;
