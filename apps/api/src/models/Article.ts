import mongoose, { Schema, Document, Types } from 'mongoose';

export type ArticleType = 'daily_prelims' | 'mains' | 'burning_issue';

export interface IKeyword {
    word: string;
    linkedArticleId?: Types.ObjectId;
}

export interface IMainsQuestion {
    question: string;
    answer: string;
}

export interface IArticle extends Document {
    type: ArticleType;
    title: string;
    date: Date;
    tags: string[];
    content: string; // TipTap JSON content (used by prelims; legacy fallback for mains)
    source?: string | { name: string; url: string }; // plain string (legacy) or { name, url } link
    keywords: IKeyword[];
    imageUrl?: string;
    order: number; // For ordering articles within a day
    // Structured Mains fields (optional — only used by type: 'mains')
    context?: string; // Context section (HTML)
    questions?: IMainsQuestion[]; // Up to 6 Q&A pairs
    practice?: string; // Practice section (HTML)
    valueAdditions?: string; // Value additions section (HTML)
    visualSummaryUrl?: string; // Visual summary image URL
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
            type: Schema.Types.Mixed, // string (legacy) or { name, url } object
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
        // Structured Mains fields
        context: {
            type: String,
            trim: true,
        },
        questions: [{
            question: { type: String, required: true },
            answer: { type: String, required: true },
        }],
        practice: {
            type: String,
            trim: true,
        },
        valueAdditions: {
            type: String,
            trim: true,
        },
        visualSummaryUrl: {
            type: String,
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

// Text index for search — only title and tags (not content body)
ArticleSchema.index({ title: 'text', tags: 'text' });

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
export default Article;
