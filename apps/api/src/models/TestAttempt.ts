import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITestAttempt extends Document {
    userId: Types.ObjectId;
    ptsId: Types.ObjectId;
    testIndex: number;
    attemptCount: number;
    lastAttemptAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TestAttemptSchema = new Schema<ITestAttempt>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        ptsId: {
            type: Schema.Types.ObjectId,
            ref: 'TestSeries',
            required: true,
            index: true,
        },
        testIndex: {
            type: Number,
            required: true,
        },
        attemptCount: {
            type: Number,
            default: 0,
        },
        lastAttemptAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Unique compound index for user + PTS + test index
TestAttemptSchema.index({ userId: 1, ptsId: 1, testIndex: 1 }, { unique: true });

export const TestAttempt = mongoose.model<ITestAttempt>('TestAttempt', TestAttemptSchema);
export default TestAttempt;
