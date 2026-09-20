import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorSessionNote {
    date: string;
    text: string;
    createdAt?: Date;
}

export interface IMentorNote extends Document {
    student: mongoose.Types.ObjectId;
    mentor?: mongoose.Types.ObjectId;
    sessionNotes: IMentorSessionNote[];
    internalNote?: string;
    isTaggedInactive?: boolean;
    taggedInactiveAt?: Date;
}

const MentorNoteSchema: Schema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        mentor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
        sessionNotes: [
            {
                date: { type: String, required: true },
                text: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        internalNote: { type: String, default: '' },
        isTaggedInactive: { type: Boolean, default: false },
        taggedInactiveAt: { type: Date },
    },
    { timestamps: true }
);

export const MentorNote = mongoose.model<IMentorNote>('MentorNote', MentorNoteSchema);
