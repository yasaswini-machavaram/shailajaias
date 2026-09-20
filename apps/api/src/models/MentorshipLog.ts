import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorshipLog extends Document {
    student: mongoose.Types.ObjectId;
    date: string; // YYYY-MM-DD
    hours: number;
    reason?: string;
    submittedAt: Date;
    editedAt?: Date;
}

const MentorshipLogSchema: Schema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        date: { type: String, required: true, index: true },
        hours: { type: Number, required: true, min: 0, max: 24 },
        reason: { type: String, default: '' },
        submittedAt: { type: Date, default: Date.now },
        editedAt: { type: Date },
    },
    { timestamps: true }
);

MentorshipLogSchema.index({ student: 1, date: 1 }, { unique: true });

export const MentorshipLog = mongoose.model<IMentorshipLog>('MentorshipLog', MentorshipLogSchema);
