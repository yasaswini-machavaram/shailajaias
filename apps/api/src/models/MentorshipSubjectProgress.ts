import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorshipSubjectProgress extends Document {
    student: mongoose.Types.ObjectId;
    track: 'GS' | 'Optional' | 'Essay' | 'CA' | 'CSAT';
    subjectName: string;
    courseId?: mongoose.Types.ObjectId;
    state: 'current' | 'done' | 'upcoming' | 'paused';
    completedTasks: number;
    totalTasks: number;
    order: number;
    startDate?: Date;
    finishedDate?: Date;
    pausedAt?: Date;
    pauseReason?: string;
}

const MentorshipSubjectProgressSchema: Schema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        track: { type: String, enum: ['GS', 'Optional', 'Essay', 'CA', 'CSAT'], required: true },
        subjectName: { type: String, required: true },
        courseId: { type: Schema.Types.ObjectId, ref: 'CourseNode' },
        state: { type: String, enum: ['current', 'done', 'upcoming', 'paused'], default: 'upcoming' },
        completedTasks: { type: Number, default: 0 },
        totalTasks: { type: Number, default: 10 },
        order: { type: Number, default: 0 },
        startDate: { type: Date },
        finishedDate: { type: Date },
        pausedAt: { type: Date },
        pauseReason: { type: String, default: '' },
    },
    { timestamps: true }
);

MentorshipSubjectProgressSchema.index({ student: 1, track: 1 });

export const MentorshipSubjectProgress = mongoose.model<IMentorshipSubjectProgress>(
    'MentorshipSubjectProgress',
    MentorshipSubjectProgressSchema
);
