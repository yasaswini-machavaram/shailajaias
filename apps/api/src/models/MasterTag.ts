import mongoose, { Schema, Document } from 'mongoose';

export interface IMasterTag extends Document {
    title: string;
    code: string; // Unique identifier code e.g. GS-1, GS-2, ETHICS, PRELIMS-2027
    description?: string;
    colorHex?: string;
    createdBy?: mongoose.Types.ObjectId;
}

const MasterTagSchema: Schema = new Schema(
    {
        title: { type: String, required: true },
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        description: { type: String, default: '' },
        colorHex: { type: String, default: '#b8502a' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export const MasterTag = mongoose.model<IMasterTag>('MasterTag', MasterTagSchema);
