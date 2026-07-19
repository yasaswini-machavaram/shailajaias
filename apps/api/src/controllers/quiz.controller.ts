import type { Request, Response } from 'express';
import { Quiz } from '../models/index.js';
import { parseQuizExcel } from '../services/excel.service.js';

// @desc    Get all quizzes with filters
// @route   GET /api/quizzes
// @access  Public
export const getQuizzes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tags, excludeTags, page = 1, limit = 10, date, includeQuestions, search, year, month } = req.query;

        const query: Record<string, any> = {};

        if (tags) {
            query.tags = { $in: (tags as string).split(',') };
        }

        if (excludeTags) {
            const excludeList = (excludeTags as string).split(',');
            if (query.tags) {
                query.tags = { ...query.tags, $nin: excludeList };
            } else {
                query.tags = { $nin: excludeList };
            }
        }

        if (search) {
            query.$text = { $search: search as string };
        }

        if (date) {
            const targetDate = new Date(date as string);
            const nextDate = new Date(targetDate);
            nextDate.setDate(nextDate.getDate() + 1);
            query.date = { $gte: targetDate, $lt: nextDate };
        } else if (year || month) {
            // Year / month date range filter
            const y = year ? Number(year) : new Date().getFullYear();
            if (month) {
                const m = Number(month); // 1-based
                const start = new Date(y, m - 1, 1);
                const end = new Date(y, m, 1);
                query.date = { $gte: start, $lt: end };
            } else {
                const start = new Date(y, 0, 1);
                const end = new Date(y + 1, 0, 1);
                query.date = { $gte: start, $lt: end };
            }
        }

        const total = await Quiz.countDocuments(query);

        const selectFields = includeQuestions === 'true' ? {} : { questions: 0 };

        const quizzes = await Quiz.find(query, selectFields)
            .sort({ date: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            success: true,
            data: quizzes,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get quizzes error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single quiz with questions
// @route   GET /api/quizzes/:id
// @access  Public
export const getQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found' });
            return;
        }

        res.json({ success: true, data: quiz });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create quiz
// @route   POST /api/quizzes
// @access  Private/Admin
export const createQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, date, questions, tags, setName } = req.body;
        const user = (req as Request & { user: { _id: string } }).user;

        const quiz = await Quiz.create({
            title,
            date: new Date(date),
            questions: questions || [],
            tags: tags || [],
            setName: setName || undefined,
            createdBy: user._id,
        });

        res.status(201).json({ success: true, data: quiz });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Import quiz from Excel file
// @route   POST /api/quizzes/import-excel
// @access  Private/Admin
export const importQuizFromExcel = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        const { title, date, setName, tags } = req.body;

        if (!file) {
            res.status(400).json({ success: false, message: 'Please upload an Excel file' });
            return;
        }

        if (!title || !date) {
            res.status(400).json({ success: false, message: 'Please provide title and date' });
            return;
        }

        // Parse Excel file
        const parseResult = parseQuizExcel(file.buffer);

        if (parseResult.questions.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No valid questions found in Excel file',
                errors: parseResult.errors,
            });
            return;
        }

        const user = (req as Request & { user: { _id: string } }).user;

        let quizTags: string[] = [];
        if (tags) {
            if (Array.isArray(tags)) {
                quizTags = tags;
            } else if (typeof tags === 'string') {
                quizTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
            }
        }

        // Create quiz with parsed questions
        const quiz = await Quiz.create({
            title,
            date: new Date(date),
            questions: parseResult.questions,
            tags: quizTags,
            setName: setName || undefined,
            createdBy: user._id,
        });

        res.status(201).json({
            success: true,
            data: quiz,
            message: `Successfully imported ${parseResult.questions.length} questions`,
            warnings: parseResult.errors.length > 0 ? parseResult.errors : undefined,
        });
    } catch (error) {
        console.error('Import quiz error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private/Admin
export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, date, questions, tags, setName } = req.body;

        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found' });
            return;
        }

        // Update fields
        if (title) quiz.title = title;
        if (date) quiz.date = new Date(date);
        if (questions) quiz.questions = questions;
        if (tags) quiz.tags = tags;
        if (setName !== undefined) quiz.setName = setName;

        await quiz.save();

        res.json({ success: true, data: quiz });
    } catch (error) {
        console.error('Update quiz error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private/Admin
export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found' });
            return;
        }

        await quiz.deleteOne();

        res.json({ success: true, message: 'Quiz deleted' });
    } catch (error) {
        console.error('Delete quiz error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get adjacent dates with quizzes
// @route   GET /api/quizzes/adjacent-dates
// @access  Public
export const getAdjacentQuizDates = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, excludeTags } = req.query;
        if (!date) {
            res.status(400).json({ success: false, message: 'Date is required' });
            return;
        }

        const targetDate = new Date(date as string);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const queryExtra: Record<string, any> = {};
        if (excludeTags) {
            queryExtra.tags = { $nin: (excludeTags as string).split(',') };
        }

        // Find previous date (less than targetDate)
        const prevQuiz = await Quiz.findOne({
            date: { $lt: targetDate },
            ...queryExtra
        }).sort({ date: -1 });

        // Find next date (greater than or equal to nextDay)
        const nextQuiz = await Quiz.findOne({
            date: { $gte: nextDay },
            ...queryExtra
        }).sort({ date: 1 });

        res.json({
            success: true,
            data: {
                previous: prevQuiz ? prevQuiz.date : null,
                next: nextQuiz ? nextQuiz.date : null
            }
        });
    } catch (error) {
        console.error('Get adjacent quiz dates error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
