'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface Quiz {
    _id: string;
    title: string;
    setName?: string;
    date: string;
    tags: string[];
    questionsCount?: number;
    questions?: QuestionForm[];
}

type ViewMode = 'list' | 'create' | 'import';

export default function PrelimsPracticeTestPage() {
    const { token } = useAuth();
    const router = useRouter();

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // --- Create Form State ---
    const [createTitle, setCreateTitle] = useState('');
    const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
    const [createSetName, setCreateSetName] = useState('');
    const [createTags, setCreateTags] = useState('');
    const [createQuestions, setCreateQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    // --- Import Form State ---
    const [importTitle, setImportTitle] = useState('');
    const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
    const [importSetName, setImportSetName] = useState('');
    const [importTags, setImportTags] = useState('');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isSubmittingImport, setIsSubmittingImport] = useState(false);

    useEffect(() => {
        if (token) {
            fetchQuizzes();
        }
    }, [token]);

    const fetchQuizzes = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            // Fetch quizzes with tag prelims-practice
            const response = await fetch(`${API_URL}/api/quizzes?tags=prelims-practice&limit=100`);
            const data = await response.json();
            if (data.success) {
                setQuizzes(data.data);
            } else {
                setErrorMessage(data.message || 'Failed to fetch quizzes');
            }
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
            setErrorMessage('Network error fetching quizzes');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteQuiz = async (id: string) => {
        if (!confirm('Are you sure you want to delete this practice quiz?')) return;
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const response = await fetch(`${API_URL}/api/quizzes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setQuizzes((prev) => prev.filter((q) => q._id !== id));
                setSuccessMessage('Practice test deleted successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const data = await response.json();
                setErrorMessage(data.message || 'Failed to delete quiz');
            }
        } catch (error) {
            console.error('Failed to delete quiz:', error);
            setErrorMessage('Network error deleting quiz');
        }
    };

    // --- Question Builder Handlers ---
    const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
        setCreateQuestions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        setCreateQuestions((prev) => {
            const updated = [...prev];
            const options = [...updated[qIndex].options];
            options[oIndex] = value;
            updated[qIndex] = { ...updated[qIndex], options };
            return updated;
        });
    };

    const addQuestion = () => {
        setCreateQuestions((prev) => [...prev, { ...emptyQuestion, options: ['', '', '', ''] }]);
    };

    const removeQuestion = (index: number) => {
        if (createQuestions.length <= 1) return;
        setCreateQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    // --- Submit Manual Creation ---
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const parsedCreateDate = new Date(createDate);
        if (isNaN(parsedCreateDate.getTime())) {
            setErrorMessage('Please enter a valid date.');
            return;
        }
        const dateYear = parsedCreateDate.getFullYear();
        if (dateYear < 2020 || dateYear > 2030) {
            setErrorMessage('Date must be between 2020 and 2030.');
            return;
        }

        // Validate questions
        for (let i = 0; i < createQuestions.length; i++) {
            const q = createQuestions[i];
            if (!q.question.trim()) {
                setErrorMessage(`Question ${i + 1}: Please enter the question text`);
                return;
            }
            if (q.options.some((o) => !o.trim())) {
                setErrorMessage(`Question ${i + 1}: All four options are required`);
                return;
            }
            if (!q.explanation.trim()) {
                setErrorMessage(`Question ${i + 1}: Explanation is required`);
                return;
            }
        }

        setIsSubmittingCreate(true);

        try {
            const parsedTags = createTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            const finalTags = [...parsedTags, 'prelims-practice'];

            const response = await fetch(`${API_URL}/api/quizzes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: createTitle,
                    date: createDate,
                    setName: createSetName || undefined,
                    questions: createQuestions,
                    tags: finalTags,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage('Practice test created successfully!');
                // Reset form
                setCreateTitle('');
                setCreateSetName('');
                setCreateTags('');
                setCreateQuestions([{ ...emptyQuestion }]);
                setViewMode('list');
                fetchQuizzes();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(data.message || 'Failed to create quiz');
            }
        } catch (err) {
            setErrorMessage('Network error. Please try again.');
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    // --- Submit Excel Import ---
    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!excelFile) {
            setErrorMessage('Please select an Excel file');
            return;
        }

        const parsedImportDate = new Date(importDate);
        if (isNaN(parsedImportDate.getTime())) {
            setErrorMessage('Please enter a valid date.');
            return;
        }
        const dateYear = parsedImportDate.getFullYear();
        if (dateYear < 2020 || dateYear > 2030) {
            setErrorMessage('Date must be between 2020 and 2030.');
            return;
        }

        setIsSubmittingImport(true);

        try {
            const parsedTags = importTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            const finalTags = [...parsedTags, 'prelims-practice'];

            const formData = new FormData();
            formData.append('file', excelFile);
            formData.append('title', importTitle);
            formData.append('date', importDate);
            if (importSetName) formData.append('setName', importSetName);
            if (finalTags.length > 0) formData.append('tags', finalTags.join(','));

            const response = await fetch(`${API_URL}/api/quizzes/import-excel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message || 'Excel imported successfully!');
                // Reset form
                setImportTitle('');
                setImportSetName('');
                setImportTags('');
                setExcelFile(null);
                setViewMode('list');
                fetchQuizzes();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(data.message || 'Failed to import quiz');
            }
        } catch (error) {
            setErrorMessage('Network error. Please try again.');
        } finally {
            setIsSubmittingImport(false);
        }
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            {/* Header / Breadcrumb */}
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin/test-series')}
                    className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider mb-3 gap-1"
                >
                    <span>←</span> Back to Test Modules
                </button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 font-headline">Prelims Practice Tests</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Manage subject-wise MCQ practice tests, configure subject filters, and control explanations.
                        </p>
                    </div>

                    {viewMode === 'list' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setErrorMessage('');
                                    setSuccessMessage('');
                                    setViewMode('import');
                                }}
                                className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold transition-all shadow-xs flex items-center gap-1.5 text-sm"
                            >
                                📊 Import Excel
                            </button>
                            <button
                                onClick={() => {
                                    setErrorMessage('');
                                    setSuccessMessage('');
                                    setViewMode('create');
                                }}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-all shadow-xs flex items-center gap-1.5 text-sm"
                            >
                                + Create Practice Test
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Messages */}
            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold transition-all">
                    ⚠️ {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold transition-all">
                    ✓ {successMessage}
                </div>
            )}

            {/* View Mode Switching */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    {isLoading ? (
                        <div className="p-16 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rose-500 mx-auto"></div>
                            <p className="text-xs text-slate-400 mt-3 font-semibold">Loading practice tests...</p>
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="p-16 text-center text-slate-500">
                            <span className="text-5xl block mb-4">📘</span>
                            <p className="text-lg font-bold font-headline mb-1 text-slate-700">No Practice Tests Yet</p>
                            <p className="text-xs max-w-sm mx-auto text-slate-400 mb-6">
                                Start by creating a practice test manually or uploading an Excel template sheet.
                            </p>
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => setViewMode('import')}
                                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Import Excel
                                </button>
                                <button
                                    onClick={() => setViewMode('create')}
                                    className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
                                >
                                    Create Manual Test
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Test Details</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Release Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Tags</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {quizzes.map((quiz) => (
                                        <tr key={quiz._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm group-hover:text-rose-700 transition-colors">
                                                        {quiz.title}
                                                    </span>
                                                    {quiz.setName && (
                                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                                            Set: <span className="font-semibold text-slate-500">{quiz.setName}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                                {new Date(quiz.date).toLocaleDateString('en-IN', { timeZone: 'UTC' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {quiz.tags
                                                        .filter((t) => t !== 'prelims-practice')
                                                        .map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold lowercase bg-rose-50 text-rose-700 border border-rose-100"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    {quiz.tags.filter((t) => t !== 'prelims-practice').length === 0 && (
                                                        <span className="text-xs text-slate-300 italic font-medium">None</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/admin/quizzes/${quiz._id}?returnTo=/admin/test-series/prelims-practice-test`
                                                            )
                                                        }
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteQuiz(quiz._id)}
                                                        className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* CREATE VIEW */}
            {viewMode === 'create' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 font-headline">Create Practice Quiz</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Define metadata and manual question fields</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Back to List
                        </button>
                    </div>

                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Title *</label>
                                <input
                                    type="text"
                                    value={createTitle}
                                    onChange={(e) => setCreateTitle(e.target.value)}
                                    required
                                    maxLength={200}
                                    placeholder="e.g., Subject MCQ - History"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white shadow-2xs font-semibold text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Date *</label>
                                <input
                                    type="date"
                                    value={createDate}
                                    onChange={(e) => setCreateDate(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white shadow-2xs font-semibold text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Set Name</label>
                                <input
                                    type="text"
                                    value={createSetName}
                                    onChange={(e) => setCreateSetName(e.target.value)}
                                    maxLength={100}
                                    placeholder="e.g., Set A"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white shadow-2xs font-semibold text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Subject Tags</label>
                                <input
                                    type="text"
                                    value={createTags}
                                    onChange={(e) => setCreateTags(e.target.value)}
                                    placeholder="e.g., history, ancient-history"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white shadow-2xs font-semibold text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    Questions ({createQuestions.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                    + Add Question
                                </button>
                            </div>

                            {createQuestions.map((q, qIdx) => (
                                <div
                                    key={qIdx}
                                    className="border border-slate-100 rounded-2xl p-5 bg-white relative group/item"
                                >
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                                        <h4 className="font-bold text-xs text-rose-700 uppercase tracking-wide">
                                            Question {qIdx + 1}
                                        </h4>
                                        {createQuestions.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(qIdx)}
                                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                Remove Question
                                            </button>
                                        )}
                                    </div>

                                    {/* Question Text */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Question Body *</label>
                                        <textarea
                                            value={q.question}
                                            onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                                            placeholder="Enter question text..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Options */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                        {['A', 'B', 'C', 'D'].map((label, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuestion(qIdx, 'correctIndex', oIdx)}
                                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                                        q.correctIndex === oIdx
                                                            ? 'bg-emerald-600 text-white shadow-xs'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                    title={q.correctIndex === oIdx ? 'Correct answer' : 'Mark as correct'}
                                                >
                                                    {label}
                                                </button>
                                                <input
                                                    type="text"
                                                    value={q.options[oIdx]}
                                                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                    placeholder={`Option ${label}`}
                                                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-4 italic">
                                        💡 Click the option circle (A, B, C, D) to select the correct answer. Green indicates selected.
                                    </p>

                                    {/* Explanation */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Explanation *</label>
                                        <textarea
                                            value={q.explanation}
                                            onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                                            placeholder="Enter explanation details..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Question-specific Subject (Optional)</label>
                                        <input
                                            type="text"
                                            value={q.subject || ''}
                                            onChange={(e) => updateQuestion(qIdx, 'subject', e.target.value)}
                                            placeholder="e.g., Indian National Movement"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 border-t border-slate-100 pt-6">
                            <button
                                type="submit"
                                disabled={isSubmittingCreate}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
                            >
                                {isSubmittingCreate ? 'Saving Quiz...' : `Create Practice Test (${createQuestions.length} Questions)`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* IMPORT VIEW */}
            {viewMode === 'import' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 font-headline">Import Excel Practice Test</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Upload a prepared excel spreadsheet of MCQs</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Back to List
                        </button>
                    </div>

                    {/* Format Guide */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-xs text-slate-600">
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1">
                            📋 Excel Spreadsheet Structure
                        </h4>
                        <p className="mb-3">
                            Please ensure your Excel file contains a sheet with the following columns exactly:
                        </p>
                        <div className="bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">
                            <table className="w-full text-left font-mono">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-100">
                                        <th className="pb-1.5 pr-4">Col A</th>
                                        <th className="pb-1.5 pr-4">Col B-E</th>
                                        <th className="pb-1.5 pr-4">Col F</th>
                                        <th className="pb-1.5 pr-4">Col G</th>
                                        <th className="pb-1.5 pr-4">Col H</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="text-slate-700">
                                        <td className="py-1 pr-4">Question</td>
                                        <td className="py-1 pr-4">Option A, B, C, D</td>
                                        <td className="py-1 pr-4">Answer (A/B/C/D)</td>
                                        <td className="py-1 pr-4">Explanation</td>
                                        <td className="py-1 pr-4">Subject</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <form onSubmit={handleImportSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Quiz Title *</label>
                                <input
                                    type="text"
                                    value={importTitle}
                                    onChange={(e) => setImportTitle(e.target.value)}
                                    required
                                    maxLength={200}
                                    placeholder="e.g., Subject MCQ - Economy"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent font-semibold text-slate-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Date *</label>
                                    <input
                                        type="date"
                                        value={importDate}
                                        onChange={(e) => setImportDate(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent font-semibold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Set Name</label>
                                    <input
                                        type="text"
                                        value={importSetName}
                                        onChange={(e) => setImportSetName(e.target.value)}
                                        maxLength={100}
                                        placeholder="e.g., Set 1"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent font-semibold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Subject Tags</label>
                                <input
                                    type="text"
                                    value={importTags}
                                    onChange={(e) => setImportTags(e.target.value)}
                                    placeholder="e.g., economy, macroeconomics"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent font-semibold text-slate-800"
                                />
                            </div>

                            {/* Excel upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Excel File *</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-50/75 transition-colors">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="excel-practice-upload"
                                    />
                                    <label htmlFor="excel-practice-upload" className="cursor-pointer">
                                        {excelFile ? (
                                            <div className="text-rose-700">
                                                <span className="text-4xl block mb-2">✓</span>
                                                <p className="font-bold text-sm">{excelFile.name}</p>
                                                <p className="text-[10px] text-slate-400">{(excelFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400">
                                                <span className="text-4xl block mb-2">📊</span>
                                                <p className="font-bold text-xs text-slate-600">Click to upload spreadsheet</p>
                                                <p className="text-[10px]">Supports .xlsx or .xls</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 border-t border-slate-100 pt-6">
                            <button
                                type="submit"
                                disabled={isSubmittingImport}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
                            >
                                {isSubmittingImport ? 'Importing Excel...' : 'Import Practice Test'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
