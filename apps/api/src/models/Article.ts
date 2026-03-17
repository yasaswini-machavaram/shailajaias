import mongoose, { Schema, Document, Types } from 'mongoose';

export type ArticleType = 'daily_prelims' | 'mains' | 'burning_issue';

export interface IKeyword {
    word: string;
    linkedArticleId?: Types.ObjectId;
}

export interface IArticle extends Document {
    type: ArticleType;
    title: string;
    date: Date;
    tags: string[];
    content: string; // TipTap JSON content
    source?: string; // e.g. "The Hindu"
    keywords: IKeyword[];
    imageUrl?: string;
    order: number; // For ordering articles within a day
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ArticleSchema = new Schema<IArticle>(
    {
        type: {
            type: String,
            enum: ['daily_prelims', 'mains', 'burning_issue'],
            required: [true, 'Article type is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'Date is required'],
            index: true,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        content: {
            type: String,
            required: [true, 'Content is required'],
        },
        source: {
            type: String,
            trim: true,
        },
        keywords: [{
            word: { type: String, required: true },
            linkedArticleId: { type: Schema.Types.ObjectId, ref: 'Article' },
        }],
        imageUrl: {
            type: String,
        },
        order: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient date + type queries
ArticleSchema.index({ date: -1, type: 1 });

// Text index for search
ArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
export default Article;
