import mongoose, { Schema, Document, Types } from 'mongoose';

export type TaskType = 'watch' | 'notes' | 'test' | 'upload';

export interface IMentorshipTaskProgress extends Document {
    userId: Types.ObjectId;
    tag: string;
    dayNumber: number;
    taskType: TaskType;
    completed: boolean;
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
            enum: ['watch', 'notes', 'test', 'upload'],
            required: true,
        },
        completed: {
            type: Boolean,
            default: false,
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
