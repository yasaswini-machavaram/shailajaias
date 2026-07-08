import mongoose, { Schema, Document, type Types } from 'mongoose';

export interface ITestReport extends Document {
    student: Types.ObjectId;
    quiz: Types.ObjectId;
    testSeries?: Types.ObjectId;
    testSeriesUniqueId?: string;
    testItemTitle?: string;
    scorecard: {
        totalScore: number;
        maxMarks: number;
        correct: number;
        incorrect: number;
        unattempted: number;
        accuracy: number;
        negativeMarks: number;
        timeTaken: number;
    };
    answers: Record<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const TestReportSchema = new Schema<ITestReport>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        quiz: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true,
        },
        testSeries: {
            type: Schema.Types.ObjectId,
            ref: 'TestSeries',
            required: false,
        },
        testSeriesUniqueId: {
            type: String,
            required: false,
            trim: true,
        },
        testItemTitle: {
            type: String,
            required: false,
            trim: true,
        },
        scorecard: {
            totalScore: { type: Number, required: true },
            maxMarks: { type: Number, required: true },
            correct: { type: Number, required: true },
            incorrect: { type: Number, required: true },
            unattempted: { type: Number, required: true },
            accuracy: { type: Number, required: true },
            negativeMarks: { type: Number, required: true },
            timeTaken: { type: Number, required: true },
        },
        answers: {
            type: Map,
            of: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const TestReport = mongoose.model<ITestReport>('TestReport', TestReportSchema);
export default TestReport;
