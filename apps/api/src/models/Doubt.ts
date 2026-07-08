import mongoose, { Schema, Document, type Types } from 'mongoose';

export interface IDoubtMessage {
    senderId: Types.ObjectId;
    senderName: string;
    message: string;
    createdAt: Date;
}

export interface IDoubt extends Document {
    student: Types.ObjectId;
    testSeries?: Types.ObjectId;
    testSeriesUniqueId?: string;
    testItemTitle?: string;
    quiz?: Types.ObjectId;
    questionIndex?: number;
    questionText?: string;
    subject: string;
    title: string;
    description: string;
    status: 'pending' | 'answered' | 'resolved';
    messages: IDoubtMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const DoubtMessageSchema = new Schema<IDoubtMessage>(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        senderName: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const DoubtSchema = new Schema<IDoubt>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
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
            index: true,
        },
        testItemTitle: {
            type: String,
            required: false,
            trim: true,
        },
        quiz: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            required: false,
        },
        questionIndex: {
            type: Number,
            required: false,
        },
        questionText: {
            type: String,
            required: false,
            trim: true,
        },
        subject: {
            type: String,
            required: [true, 'Subject category is required'],
            trim: true,
        },
        title: {
            type: String,
            required: [true, 'Doubt title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Doubt description is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'answered', 'resolved'],
            default: 'pending',
            index: true,
        },
        messages: {
            type: [DoubtMessageSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

DoubtSchema.index({ status: 1, updatedAt: -1 });
DoubtSchema.index({ student: 1, updatedAt: -1 });

export const Doubt = mongoose.model<IDoubt>('Doubt', DoubtSchema);
export default Doubt;
