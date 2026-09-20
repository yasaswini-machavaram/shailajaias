import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorBroadcast extends Document {
    mentor: mongoose.Types.ObjectId;
    recipients: mongoose.Types.ObjectId[];
    filterTag?: string;
    message: string;
    createdAt: Date;
}

const MentorBroadcastSchema: Schema = new Schema(
    {
        mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        filterTag: { type: String, default: 'All' },
        message: { type: String, required: true },
    },
    { timestamps: true }
);

export const MentorBroadcast = mongoose.model<IMentorBroadcast>('MentorBroadcast', MentorBroadcastSchema);
