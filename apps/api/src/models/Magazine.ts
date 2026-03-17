import mongoose, { Schema, Document } from 'mongoose';

export type MagazineCategory = 'prelims_monthly' | 'mains_monthly' | 'mcq_monthly' | 'quarterly';

export interface IMagazine extends Document {
    title: string;
    pdfUrl: string;
    pdfKey: string;
    category: MagazineCategory;
    year: number;
    month: string;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MagazineSchema = new Schema<IMagazine>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        pdfUrl: {
            type: String,
            required: [true, 'PDF URL is required'],
        },
        pdfKey: {
            type: String,
            required: [true, 'PDF key is required'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: ['prelims_monthly', 'mains_monthly', 'mcq_monthly', 'quarterly'],
        },
        year: {
            type: Number,
            required: [true, 'Year is required'],
            index: true,
        },
        month: {
            type: String,
            required: [true, 'Month is required'],
            trim: true,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

MagazineSchema.index({ category: 1, year: -1 });
MagazineSchema.index({ year: -1, month: 1 });

export const Magazine = mongoose.model<IMagazine>('MagazinePdf', MagazineSchema);
export default Magazine;
