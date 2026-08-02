import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMainsSubmission extends Document {
    student: Types.ObjectId;
    mainsTestSeries: Types.ObjectId;
    testIndex: number;
    testTitle: string;
    seriesUniqueId: string;

    // Student uploads
    answerSheetUrls: string[];
    answerSheetKeys: string[];
    submittedAt: Date;

    // Evaluation
    mentor?: Types.ObjectId;
    status: 'submitted' | 'assigned' | 'under_review' | 'evaluated';

    // Mentor/Admin fills these
    evaluatedCopyUrl?: string;
    evaluatedCopyKey?: string;
    score?: number;
    maxScore?: number;
    feedback?: string;
    evaluatedAt?: Date;
    evaluatedBy?: Types.ObjectId; // Could be mentor or admin

    createdAt: Date;
    updatedAt: Date;
}

const MainsSubmissionSchema = new Schema<IMainsSubmission>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        mainsTestSeries: {
            type: Schema.Types.ObjectId,
            ref: 'MainsTestSeries',
            required: true,
        },
        testIndex: {
            type: Number,
            required: true,
        },
        testTitle: {
            type: String,
            required: true,
            trim: true,
        },
        seriesUniqueId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        // Student uploads
        answerSheetUrls: {
            type: [String],
            default: [],
        },
        answerSheetKeys: {
            type: [String],
            default: [],
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },

        // Evaluation
        mentor: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        status: {
            type: String,
            enum: ['submitted', 'assigned', 'under_review', 'evaluated'],
            default: 'submitted',
            index: true,
        },

        // Mentor/Admin evaluation
        evaluatedCopyUrl: {
            type: String,
        },
        evaluatedCopyKey: {
            type: String,
        },
        score: {
            type: Number,
        },
        maxScore: {
            type: Number,
        },
        feedback: {
            type: String,
            trim: true,
        },
        evaluatedAt: {
            type: Date,
        },
        evaluatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
MainsSubmissionSchema.index({ student: 1, mainsTestSeries: 1 });
MainsSubmissionSchema.index({ mentor: 1, status: 1 });
MainsSubmissionSchema.index({ status: 1, submittedAt: -1 });
MainsSubmissionSchema.index({ mainsTestSeries: 1, testIndex: 1 });

export const MainsSubmission = mongoose.model<IMainsSubmission>('MainsSubmission', MainsSubmissionSchema);
export default MainsSubmission;
