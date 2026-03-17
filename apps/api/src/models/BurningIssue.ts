import mongoose, { Schema, Document } from 'mongoose';

export interface IBurningIssueImage {
    url: string;
    originalName: string;
    order: number;
}

export interface IBurningIssue extends Document {
    topic: string;
    images: IBurningIssueImage[];
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BurningIssueImageSchema = new Schema<IBurningIssueImage>(
    {
        url: {
            type: String,
            required: [true, 'Image URL is required'],
        },
        originalName: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { _id: false }
);

const BurningIssueSchema = new Schema<IBurningIssue>(
    {
        topic: {
            type: String,
            required: [true, 'Topic is required'],
            trim: true,
        },
        images: {
            type: [BurningIssueImageSchema],
            required: true,
            validate: {
                validator: (v: IBurningIssueImage[]) => v.length > 0,
                message: 'At least one image is required',
            },
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

BurningIssueSchema.index({ date: -1 });

export const BurningIssue = mongoose.model<IBurningIssue>('Magazine', BurningIssueSchema);
export default BurningIssue;
