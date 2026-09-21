import mongoose, { Schema, Document, Types } from 'mongoose';

export type TaskType = 'watch' | 'notes' | 'test' | 'upload' | 'overall';

export interface IMentorshipTaskProgress extends Document {
    userId: Types.ObjectId;
    tag: string;
    dayNumber: number;
    taskType: TaskType;
    completed: boolean;
    isPartial?: boolean;
    status?: 'completed' | 'partial' | 'pending';
    completedAt?: Date;
    notesText?: string;
    mainsAnswerText?: string;
    mainsAnswerFileUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const MentorshipTaskProgressSchema = new Schema<IMentorshipTaskProgress>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        tag: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        dayNumber: {
            type: Number,
            required: true,
        },
        taskType: {
            type: String,
            enum: ['watch', 'notes', 'test', 'upload', 'overall'],
            required: true,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        isPartial: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['completed', 'partial', 'pending'],
            default: 'pending',
        },
        completedAt: {
            type: Date,
        },
        notesText: {
            type: String,
        },
        mainsAnswerText: {
            type: String,
        },
        mainsAnswerFileUrl: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Unique compound index
MentorshipTaskProgressSchema.index(
    { userId: 1, tag: 1, dayNumber: 1, taskType: 1 },
    { unique: true }
);

export const MentorshipTaskProgress = mongoose.model<IMentorshipTaskProgress>(
    'MentorshipTaskProgress',
    MentorshipTaskProgressSchema
);
export default MentorshipTaskProgress;
