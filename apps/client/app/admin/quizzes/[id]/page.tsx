'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '../../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface QuestionForm {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    subject?: string;
}

const emptyQuestion: QuestionForm = {
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
    subject: '',
};

export default function EditQuizPage() {
    const { token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const quizId = params.id as string;
    const returnTo = searchParams.get('returnTo') || '/admin/quizzes';

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [setName, setSetName] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [customTagInput, setCustomTagInput] = useState('');

    const tagOptions = [
        'polity', 'economy', 'history', 'geography', 'science', 'environment', 
        'current affairs', 'international relations', 'society'
    ];

    const toggleTag = (tag: string) => {
        if (tags.includes(tag)) {
            setTags(tags.filter((t) => t !== tag));
        } else {
            setTags([...tags, tag]);
        }
    };

    const addCustomTag = () => {
        const val = customTagInput.trim().toLowerCase();
        if (val && !tags.includes(val)) {
            setTags([...tags, val]);
        }
        setCustomTagInput('');
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Load existing quiz data
    useEffect(() => {
        if (!token || !quizId) return;
        const fetchQuiz = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success && data.data) {
                    const quiz = data.data;
                    setTitle(quiz.title || '');
                    setDate(quiz.date ? quiz.date.split('T')[0] : '');
                    setSetName(quiz.setName || '');
                    
                    setTags(quiz.tags || []);
                    
                    setQuestions(
                        quiz.questions?.length > 0
                            ? quiz.questions.map((q: QuestionForm) => ({
                                  question: q.question || '',
                                  options: q.options?.length === 4 ? q.options : ['', '', '', ''],
                                  correctIndex: q.correctIndex ?? 0,
                                  explanation: q.explanation || '',
                                  subject: q.subject || '',
                              }))
                            : [{ ...emptyQuestion }]
                    );
                } else {
                    setError('Failed to load quiz. It may have been deleted.');
                }
            } catch {
                setError('Network error loading quiz.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuiz();
    }, [token, quizId]);

    const updateQuestion = (index: number, field: keyof QuestionForm, value: unknown) => {
        setQuestions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        setQuestions((prev) => {
            const updated = [...prev];
            const options = [...updated[qIndex].options];
            options[oIndex] = value;
            updated[qIndex] = { ...updated[qIndex], options };
            return updated;
        });
    };

    const addQuestion = () => {
        setQuestions((prev) => [...prev, { ...emptyQuestion, options: ['', '', '', ''] }]);
    };

    const removeQuestion = (index: number) => {
        if (questions.length <= 1) return;
        setQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate date is valid and within reasonable range
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            setError('Please enter a valid date.');
            return;
        }
        const dateYear = parsedDate.getFullYear();
        if (dateYear < 2020 || dateYear > 2030) {
            setError('Date must be between 2020 and 2030.');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) {
                setError(`Question ${i + 1}: Please enter the question text`);
                return;
            }
            if (q.options.some((o) => !o.trim())) {
                setError(`Question ${i + 1}: All four options are required`);
                return;
            }
            if (!q.explanation.trim()) {
                setError(`Question ${i + 1}: Explanation is required`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title,
                    date,
                    setName: setName || undefined,
                    questions,
                    tags: tags,
                }),
            });

            const data = await response.json();

            if (data.success) {
                router.push(returnTo);
            } else {
                setError(data.message || 'Failed to update quiz');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-headline">Edit Quiz</h1>
                <p className="text-gray-600 mt-1">Update quiz title, date, and questions</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Title, Date, Set Name */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={200}
                            placeholder="e.g., Daily Quiz"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/200</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Set Name</label>
                        <input
                            type="text"
                            value={setName}
                            onChange={(e) => setSetName(e.target.value)}
                            maxLength={100}
                            placeholder="e.g., Set A"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{setName.length}/100</p>
                    </div>
                </div>

                {/* Subject Tags Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Subject Tags</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tagOptions.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    tags.includes(tag)
                                        ? 'bg-amber-500 text-white border-transparent'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                                }`}
                            >
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </button>
                        ))}
                    </div>
                    {/* Custom tag input */}
                    <div className="flex gap-2 max-w-md">
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                            placeholder="Add custom tag…"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            maxLength={30}
                        />
                        <button
                            type="button"
                            onClick={addCustomTag}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            + Add
                        </button>
                    </div>
                    {/* Removable chips */}
                    {tags.filter(t => !tagOptions.includes(t)).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500 self-center">Custom:</span>
                            {tags.filter(t => !tagOptions.includes(t)).map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="text-blue-400 hover:text-blue-600 ml-0.5">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Questions */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Questions ({questions.length})
                        </h2>
                        <button
                            type="button"
                            onClick={addQuestion}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            + Add Question
                        </button>
                    </div>

                    {questions.map((q, qIdx) => (
                        <div
                            key={qIdx}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-medium text-gray-700">Question {qIdx + 1}</h3>
                                {questions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeQuestion(qIdx)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            {/* Question Text */}
                            <textarea
                                value={q.question}
                                onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                                placeholder="Enter question text..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
                            />

                            {/* Options */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {['A', 'B', 'C', 'D'].map((label, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                                q.correctIndex === oIdx
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                            }`}
                                            title={q.correctIndex === oIdx ? 'Correct answer' : 'Click to mark as correct'}
                                        >
                                            {label}
                                        </button>
                                        <input
                                            type="text"
                                            value={q.options[oIdx]}
                                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                            placeholder={`Option ${label}`}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                💡 Click the circle to mark the correct answer (green = correct)
                            </p>

                            {/* Explanation */}
                            <textarea
                                value={q.explanation}
                                onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                                placeholder="Enter explanation text..."
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4"
                            />

                            {/* Subject */}
                            <input
                                type="text"
                                value={q.subject || ''}
                                onChange={(e) => updateQuestion(qIdx, 'subject', e.target.value)}
                                placeholder="Enter subject name (e.g., Polity)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : `Save Changes (${questions.length} questions)`}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push(returnTo)}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
