import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorChat extends Document {
    student: mongoose.Types.ObjectId;
    mentor?: mongoose.Types.ObjectId;
    threadType: 'mentor' | 'desk';
    senderRole: 'student' | 'mentor' | 'desk';
    text: string;
    attachments?: string[];
    isRead: boolean;
    createdAt: Date;
}

const MentorChatSchema: Schema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        mentor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        threadType: { type: String, enum: ['mentor', 'desk'], default: 'mentor' },
        senderRole: { type: String, enum: ['student', 'mentor', 'desk'], required: true },
        text: { type: String, required: true },
        attachments: [{ type: String }],
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

MentorChatSchema.index({ student: 1, threadType: 1, createdAt: 1 });

export const MentorChat = mongoose.model<IMentorChat>('MentorChat', MentorChatSchema);
