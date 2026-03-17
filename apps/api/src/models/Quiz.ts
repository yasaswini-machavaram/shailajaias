import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface IQuiz extends Document {
    date: Date;
    title: string;
    setName?: string;
    questions: IQuestion[];
    tags: string[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
    {
        question: {
            type: String,
            required: [true, 'Question is required'],
        },
        options: [{
            type: String,
            required: true,
        }],
        correctIndex: {
            type: Number,
            required: [true, 'Correct answer index is required'],
            min: 0,
            max: 3, // Assuming 4 options (A, B, C, D)
        },
        explanation: {
            type: String,
            required: [true, 'Explanation is required'],
        },
    },
    { _id: false }
);

const QuizSchema = new Schema<IQuiz>(
    {
        date: {
            type: Date,
            required: [true, 'Date is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        setName: {
            type: String,
            trim: true,
        },
        questions: {
            type: [QuestionSchema],
            required: true,
            validate: {
                validator: (v: IQuestion[]) => v.length > 0,
                message: 'At least one question is required',
            },
        },
        tags: [{
            type: String,
            trim: true,
        }],
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

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
export default Quiz;
