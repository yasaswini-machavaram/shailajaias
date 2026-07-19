import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBookmark extends Document {
    userId: Types.ObjectId;
    quizId: Types.ObjectId;
    questionIndex: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    subject?: string;
    testTitle?: string;
    testSeriesId?: string;
    source: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
            required: true,
        },
        questionIndex: {
            type: Number,
            required: true,
        },
        question: {
            type: String,
            required: true,
        },
        options: {
            type: [String],
            required: true,
        },
        correctIndex: {
            type: Number,
            required: true,
        },
        explanation: {
            type: String,
            required: true,
        },
        subject: {
            type: String,
            trim: true,
        },
        testTitle: {
            type: String,
            trim: true,
        },
        testSeriesId: {
            type: String,
            trim: true,
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index to prevent duplicate bookmarks
BookmarkSchema.index({ userId: 1, quizId: 1, questionIndex: 1 }, { unique: true });

export const Bookmark = mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
export default Bookmark;
