import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITestSeriesItem {
    title: string;
    date: Date;
    quizId?: Types.ObjectId; // References the online Quiz model
    questionPaperUrl?: string;
    questionPaperKey?: string;
    solutionPaperUrl?: string;
    solutionPaperKey?: string;
    syllabus?: string;
    discussionVideoUrl?: string;
    isLocked: boolean;
}

export interface ITestSeries extends Document {
    title: string;
    description?: string;
    brochureUrl?: string;
    brochureKey?: string;
    introVideoUrl?: string;
    tests: ITestSeriesItem[];
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TestSeriesItemSchema = new Schema<ITestSeriesItem>(
    {
        title: {
            type: String,
            required: [true, 'Test title is required'],
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'Test date is required'],
        },
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
        },
        questionPaperUrl: {
            type: String,
        },
        questionPaperKey: {
            type: String,
        },
        solutionPaperUrl: {
            type: String,
        },
        solutionPaperKey: {
            type: String,
        },
        syllabus: {
            type: String,
            trim: true,
        },
        discussionVideoUrl: {
            type: String,
            trim: true,
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const TestSeriesSchema = new Schema<ITestSeries>(
    {
        title: {
            type: String,
            required: [true, 'Test series title is required'],
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
        tests: {
            type: [TestSeriesItemSchema],
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

// Simple index on title
TestSeriesSchema.index({ title: 'text' });

export const TestSeries = mongoose.model<ITestSeries>('TestSeries', TestSeriesSchema);
export default TestSeries;
