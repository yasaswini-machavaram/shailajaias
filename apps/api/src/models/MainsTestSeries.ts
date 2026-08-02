import mongoose, { Schema, Document, Types } from 'mongoose';
import { getNextSequence } from './Counter.js';

export interface IMainsTestSeriesItem {
    title: string;
    date: Date;
    subjectCategory: string; // "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Essay" | "Optional"
    questionPaperUrl?: string;
    questionPaperKey?: string;
    solutionPaperUrl?: string;
    solutionPaperKey?: string;
    discussionVideoUrl?: string;
    isLocked: boolean;
}

export interface IMainsTestSeries extends Document {
    uniqueId: string;
    title: string;
    description?: string;
    brochureUrl?: string;
    brochureKey?: string;
    introVideoUrl?: string;
    tests: IMainsTestSeriesItem[];
    sectionalCount: number;
    fullLengthCount: number;
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MainsTestSeriesItemSchema = new Schema<IMainsTestSeriesItem>(
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
        subjectCategory: {
            type: String,
            required: [true, 'Subject category is required'],
            trim: true,
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

const MainsTestSeriesSchema = new Schema<IMainsTestSeries>(
    {
        uniqueId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
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
            type: [MainsTestSeriesItemSchema],
            default: [],
        },
        sectionalCount: {
            type: Number,
            default: 0,
        },
        fullLengthCount: {
            type: Number,
            default: 0,
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

// Auto-generate uniqueId on creation
MainsTestSeriesSchema.pre('save', async function () {
    if (this.isNew && !this.uniqueId) {
        const seq = await getNextSequence('mains_test_series');
        this.uniqueId = `MTS-${seq}`;
    }
});

MainsTestSeriesSchema.index({ title: 'text' });

export const MainsTestSeries = mongoose.model<IMainsTestSeries>('MainsTestSeries', MainsTestSeriesSchema);
export default MainsTestSeries;
