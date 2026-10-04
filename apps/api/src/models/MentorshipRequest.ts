import mongoose, { Schema, Document } from 'mongoose';

export type MentorshipRequestType = 'break' | 'reorder' | 'pause_intimation';
export type MentorshipRequestStatus = 'pending' | 'approved' | 'rejected' | 'acknowledged';

export interface IMentorshipRequest extends Document {
    student: mongoose.Types.ObjectId;
    mentor?: mongoose.Types.ObjectId;
    type: MentorshipRequestType;
    status: MentorshipRequestStatus;
    reason?: string;
    details?: {
        mode?: 'fixed' | 'open';
        returnDate?: Date;
        proposedOrder?: string[];
        previousOrder?: string[];
        subjectName?: string;
        note?: string;
    };
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const MentorshipRequestSchema: Schema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        mentor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        type: {
            type: String,
            enum: ['break', 'reorder', 'pause_intimation'],
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'acknowledged'],
            default: 'pending',
            index: true,
        },
        reason: { type: String, default: '' },
        details: {
            mode: { type: String, enum: ['fixed', 'open'] },
            returnDate: { type: Date },
            proposedOrder: [{ type: String }],
            previousOrder: [{ type: String }],
            subjectName: { type: String },
            note: { type: String },
        },
        reviewedAt: { type: Date },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

MentorshipRequestSchema.index({ student: 1, type: 1, status: 1 });
MentorshipRequestSchema.index({ mentor: 1, status: 1 });

export const MentorshipRequest = mongoose.model<IMentorshipRequest>(
    'MentorshipRequest',
    MentorshipRequestSchema
);
export default MentorshipRequest;
