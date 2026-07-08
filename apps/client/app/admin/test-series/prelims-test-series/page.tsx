'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { API_URL } from '@/lib/api';

interface TestItemForm {
    title: string;
    date: string;
    quizId: string; // Auto-populated via Excel import
    syllabus: string;
    discussionVideoUrl: string;
    isLocked: boolean;
    questionPaperUrl?: string;
    questionPaperKey?: string;
    solutionPaperUrl?: string;
    solutionPaperKey?: string;
}

interface TestSeriesForm {
    _id?: string;
    uniqueId?: string;
    title: string;
    description: string;
    brochureUrl: string;
    brochureKey: string;
    introVideoUrl: string;
    tests: TestItemForm[];
    isPublished: boolean;
}

export default function AdminPrelimsTestSeriesPage() {
    const { token } = useAuth();
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<TestSeriesForm>({
        title: '',
        description: '',
        brochureUrl: '',
        brochureKey: '',
        introVideoUrl: '',
        tests: [],
        isPublished: false,
    });
    
    const [uploadingField, setUploadingField] = useState<string | null>(null); // brochure, or 'excel-{index}'
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (token) {
            fetchSeries();
        }
    }, [token]);

    const fetchSeries = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/tests/series?includeUnpublished=true`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSeriesList(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch test series:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed for brochures');
            return;
        }

        setUploadingField('brochure');
        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await fetch(`${API_URL}/api/tests/series/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                const { url, key } = data.data;
                setForm(prev => ({
                    ...prev,
                    brochureUrl: url,
                    brochureKey: key,
                }));
            } else {
                alert(data.message || 'Failed to upload brochure PDF');
            }
        } catch (error) {
            console.error('Upload brochure error:', error);
            alert('An error occurred while uploading brochure');
        } finally {
            setUploadingField(null);
        }
    };

    const handlePaperUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number, fieldType: 'questionPaper' | 'solutionPaper') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed');
            return;
        }

        setUploadingField(`${fieldType}-${index}`);
        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await fetch(`${API_URL}/api/tests/series/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                const { url, key } = data.data;
                setForm(prev => {
                    const newTests = [...prev.tests];
                    if (fieldType === 'questionPaper') {
                        newTests[index].questionPaperUrl = url;
                        newTests[index].questionPaperKey = key;
                    } else {
                        newTests[index].solutionPaperUrl = url;
                        newTests[index].solutionPaperKey = key;
                    }
                    return { ...prev, tests: newTests };
                });
            } else {
                alert(data.message || 'Failed to upload PDF');
            }
        } catch (error) {
            console.error('Upload paper error:', error);
            alert('An error occurred while uploading PDF');
        } finally {
            setUploadingField(null);
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const testItem = form.tests[index];
        if (!testItem.title.trim() || !testItem.date) {
            alert('Please enter Test Title and Release Date first so they can be assigned to the imported Quiz.');
            // Clear input
            e.target.value = '';
            return;
        }

        setUploadingField(`excel-${index}`);
        const formData = new FormData();
        formData.append('excel', file);
        formData.append('title', testItem.title);
        formData.append('date', testItem.date);

        try {
            const res = await fetch(`${API_URL}/api/tests/series/import-excel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                const quizId = data.data._id;
                setForm(prev => {
                    const newTests = [...prev.tests];
                    newTests[index].quizId = quizId;
                    return { ...prev, tests: newTests };
                });
                alert(`Successfully imported ${data.data.questions?.length || 0} questions and auto-created Quiz!`);
            } else {
                alert(data.message || 'Failed to parse Excel file');
            }
        } catch (error) {
            console.error('Excel upload error:', error);
            alert('An error occurred while uploading Excel file');
        } finally {
            setUploadingField(null);
        }
    };

    const handleSaveSeries = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!form.title.trim()) {
            setErrorMessage('Title is required');
            return;
        }

        // Verify that all test items have questions uploaded
        const missingQuiz = form.tests.find(t => !t.quizId);
        if (missingQuiz) {
            if (!confirm(`Warning: The test "${missingQuiz.title}" does not have questions uploaded. Students won't be able to print or solve it. Save anyway?`)) {
                return;
            }
        }

        const method = form._id ? 'PUT' : 'POST';
        const endpoint = form._id ? `${API_URL}/api/tests/series/${form._id}` : `${API_URL}/api/tests/series`;

        try {
            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    brochureUrl: form.brochureUrl,
                    brochureKey: form.brochureKey,
                    introVideoUrl: form.introVideoUrl,
                    isPublished: form.isPublished,
                    tests: form.tests,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setSuccessMessage(form._id ? 'Test Series updated successfully!' : 'Test Series created successfully!');
                fetchSeries();
                setIsEditing(false);
            } else {
                setErrorMessage(data.message || 'Failed to save test series');
            }
        } catch (error) {
            console.error('Failed to save test series:', error);
            setErrorMessage('An error occurred while saving');
        }
    };

    const handleDeleteSeries = async (id: string) => {
        if (!confirm('Are you sure you want to delete this test series group? This will permanently delete the group and all its auto-created quizzes.')) return;

        try {
            const res = await fetch(`${API_URL}/api/tests/series/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                setSeriesList(prev => prev.filter(s => s._id !== id));
            } else {
                alert(data.message || 'Failed to delete test series');
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleEditClick = (series: any) => {
        setForm({
            _id: series._id,
            uniqueId: series.uniqueId,
            title: series.title,
            description: series.description || '',
            brochureUrl: series.brochureUrl || '',
            brochureKey: series.brochureKey || '',
            introVideoUrl: series.introVideoUrl || '',
            isPublished: series.isPublished || false,
            tests: (series.tests || []).map((t: any) => ({
                title: t.title || '',
                date: t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0],
                quizId: t.quizId?._id || t.quizId || '',
                syllabus: t.syllabus || '',
                discussionVideoUrl: t.discussionVideoUrl || '',
                isLocked: !!t.isLocked,
                questionPaperUrl: t.questionPaperUrl || '',
                questionPaperKey: t.questionPaperKey || '',
                solutionPaperUrl: t.solutionPaperUrl || t.solutionPaperUrl === undefined ? t.solutionPaperUrl : (t as any).detailedSolutionUrl || '',
                solutionPaperKey: t.solutionPaperKey || t.solutionPaperKey === undefined ? t.solutionPaperKey : (t as any).detailedSolutionKey || '',
            })),
        });
        setErrorMessage('');
        setSuccessMessage('');
        setIsEditing(true);
    };

    const handleAddNewTest = () => {
        setForm(prev => ({
            ...prev,
            tests: [
                ...prev.tests,
                {
                    title: '',
                    date: new Date().toISOString().split('T')[0],
                    quizId: '',
                    syllabus: '',
                    discussionVideoUrl: '',
                    isLocked: false,
                    questionPaperUrl: '',
                    questionPaperKey: '',
                    solutionPaperUrl: '',
                    solutionPaperKey: '',
                },
            ],
        }));
    };

    const handleRemoveTest = (index: number) => {
        setForm(prev => ({
            ...prev,
            tests: prev.tests.filter((_, idx) => idx !== index),
        }));
    };

    const handleMoveTest = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === form.tests.length - 1) return;

        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        setForm(prev => {
            const newTests = [...prev.tests];
            const temp = newTests[index];
            newTests[index] = newTests[swapIndex];
            newTests[swapIndex] = temp;
            return { ...prev, tests: newTests };
        });
    };

    const handleTestFieldChange = (index: number, field: keyof TestItemForm, value: any) => {
        setForm(prev => {
            const newTests = [...prev.tests];
            newTests[index] = { ...newTests[index], [field]: value };
            return { ...prev, tests: newTests };
        });
    };

    return (
        <div className="p-8 font-body min-h-screen bg-slate-50">
            {/* Success & Error alerts */}
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <span>✓</span> {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
                    <span>⚠️</span> {errorMessage}
                </div>
            )}

            {!isEditing ? (
                /* MAIN LIST VIEW */
                <div>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 font-headline">Prelims Test Series</h1>
                            <p className="text-slate-500 text-sm mt-1">Manage Prelims Test Series groups (using CA Excel Question format)</p>
                        </div>
                        <button
                            onClick={() => {
                                setForm({
                                    title: '',
                                    description: '',
                                    brochureUrl: '',
                                    brochureKey: '',
                                    introVideoUrl: '',
                                    tests: [],
                                    isPublished: false,
                                });
                                setIsEditing(true);
                            }}
                            className="px-5 py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                        >
                            + Create Test Series Group
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                        </div>
                    ) : seriesList.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                            <span className="text-4xl">📂</span>
                            <h3 className="text-lg font-bold text-slate-700 mt-4">No test series available</h3>
                            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                                Create your first Test Series group to upload Excel quiz questions for students.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {seriesList.map((series) => (
                                <div key={series._id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                series.isPublished
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {series.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                            {series.uniqueId && (
                                                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                                                    {series.uniqueId}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {series.tests?.length || 0} Test Papers
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 font-headline">
                                            {series.title}
                                        </h3>
                                        {series.description && (
                                            <p className="text-slate-500 text-sm mt-1 line-clamp-2 max-w-2xl">{series.description}</p>
                                        )}
                                        <div className="flex gap-4 mt-3 text-xs font-semibold text-slate-400">
                                            {series.brochureUrl && (
                                                <span className="flex items-center gap-1">
                                                    📄 Brochure Uploaded
                                                </span>
                                            )}
                                            {series.introVideoUrl && (
                                                <span className="flex items-center gap-1">
                                                    🎥 Video Attached
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <button
                                            onClick={() => handleEditClick(series)}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                                        >
                                            Edit Group
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSeries(series._id)}
                                            className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* EDIT / CREATE FORM VIEW */
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A5F] hover:text-[#D97706] mb-2 transition-colors"
                            >
                                ← Back to list
                            </button>
                            <h2 className="text-3xl font-bold text-slate-800 font-headline">
                                {form._id ? `Edit Test Series Group (${form.uniqueId || 'PTS-XXX'})` : 'Create Test Series Group'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={handleSaveSeries} className="space-y-8">
                        {/* Group info card */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                            <h3 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-3">Test Series Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Test Series Title *</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g. Prelims Test Series 2026"
                                        className="w-full h-11 px-4 border border-slate-200 focus:border-2 focus:border-[#1E3A5F] rounded-xl text-sm font-medium outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Intro Video URL (YouTube, Vimeo, etc.)</label>
                                    <input
                                        type="url"
                                        value={form.introVideoUrl}
                                        onChange={(e) => setForm(prev => ({ ...prev, introVideoUrl: e.target.value }))}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full h-11 px-4 border border-slate-200 focus:border-2 focus:border-[#1E3A5F] rounded-xl text-sm font-medium outline-none transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Description</label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Provide brief details about schedule, syllabus, and test pattern..."
                                        className="w-full h-24 p-4 border border-slate-200 focus:border-2 focus:border-[#1E3A5F] rounded-xl text-sm font-medium outline-none resize-y transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Brochure PDF (Schedule & Syllabus)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleBrochureUpload}
                                            className="hidden"
                                            id="brochure-file"
                                        />
                                        <label
                                            htmlFor="brochure-file"
                                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                        >
                                            Choose PDF Brochure
                                        </label>
                                        {uploadingField === 'brochure' && (
                                            <span className="text-xs text-slate-400 animate-pulse">Uploading...</span>
                                        )}
                                        {form.brochureUrl && (
                                            <span className="text-xs text-emerald-600 font-bold truncate max-w-[200px]">
                                                ✓ Uploaded ({form.brochureKey?.slice(0, 15)}...)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        checked={form.isPublished}
                                        onChange={(e) => setForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                                        id="isPublished"
                                        className="w-4 h-4 text-[#1E3A5F] border-slate-200 rounded focus:ring-[#1E3A5F]"
                                    />
                                    <label htmlFor="isPublished" className="text-sm font-bold text-slate-700 cursor-pointer">
                                        Publish to students (Visible on website)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Tests List section */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-700">Tests in this Series</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Import Excel files to auto-create quizzes (Current Affairs format)</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddNewTest}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                                >
                                    + Add Test Paper
                                </button>
                            </div>

                            {form.tests.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No test papers added yet. Click "Add Test Paper" to add.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {form.tests.map((test, index) => (
                                        <div key={index} className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/40 relative space-y-4">
                                            {/* Order / Control Header */}
                                            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Test Details</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveTest(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                                                        title="Move Up"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveTest(index, 'down')}
                                                        disabled={index === form.tests.length - 1}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                                                        title="Move Down"
                                                    >
                                                        ▼
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTest(index)}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded transition-colors text-xs font-semibold"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Row 1: Title, Date, Excel Upload */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Test Title *</label>
                                                    <input
                                                        type="text"
                                                        value={test.title}
                                                        onChange={(e) => handleTestFieldChange(index, 'title', e.target.value)}
                                                        placeholder="e.g. Polity Sectional 1"
                                                        className="w-full h-10 px-3 border border-slate-200 focus:border-[#1E3A5F] rounded-lg text-sm font-semibold outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Release Date *</label>
                                                    <input
                                                        type="date"
                                                        value={test.date}
                                                        onChange={(e) => handleTestFieldChange(index, 'date', e.target.value)}
                                                        className="w-full h-10 px-3 border border-slate-200 focus:border-[#1E3A5F] rounded-lg text-sm font-semibold outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Questions Excel (.xlsx / .xls)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="file"
                                                            accept=".xlsx, .xls"
                                                            onChange={(e) => handleExcelUpload(e, index)}
                                                            className="hidden"
                                                            id={`excel-file-${index}`}
                                                        />
                                                        <label
                                                            htmlFor={`excel-file-${index}`}
                                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                                        >
                                                            Import Quiz Questions
                                                        </label>
                                                        {uploadingField === `excel-${index}` && (
                                                            <span className="text-[10px] text-slate-400 animate-pulse">Uploading...</span>
                                                        )}
                                                        {test.quizId ? (
                                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold shrink-0">
                                                                ✓ Questions Loaded
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-250 border-dashed rounded-lg text-[10px] font-bold shrink-0">
                                                                ⚠️ Excel Required
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 2: Syllabus, Video, Locked Status */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/40 pt-3">
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Syllabus (Topics covered - Enter items separated by newlines)</label>
                                                    <textarea
                                                        value={test.syllabus}
                                                        onChange={(e) => handleTestFieldChange(index, 'syllabus', e.target.value)}
                                                        placeholder="INTRODUCTION TO CONSTITUTION&#10;- Preamble&#10;- Salient Features"
                                                        className="w-full h-20 p-2.5 border border-slate-200 rounded-lg text-xs font-medium outline-none resize-none"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Discussion Video URL</label>
                                                        <input
                                                            type="url"
                                                            value={test.discussionVideoUrl}
                                                            onChange={(e) => handleTestFieldChange(index, 'discussionVideoUrl', e.target.value)}
                                                            placeholder="https://youtube.com/watch?v=..."
                                                            className="w-full h-10 px-3 border border-slate-200 focus:border-[#1E3A5F] rounded-lg text-xs font-semibold outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={test.isLocked}
                                                            onChange={(e) => handleTestFieldChange(index, 'isLocked', e.target.checked)}
                                                            id={`lock-${index}`}
                                                            className="w-3.5 h-3.5 text-[#1E3A5F] border-slate-200 rounded"
                                                        />
                                                        <label htmlFor={`lock-${index}`} className="text-[11px] font-bold text-slate-600 cursor-pointer uppercase tracking-wide">
                                                            Lock Doubt & Video
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 3: Question Paper PDF & Detailed Solution PDF */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/40 pt-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Question Paper PDF</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="file"
                                                            accept="application/pdf"
                                                            onChange={(e) => handlePaperUpload(e, index, 'questionPaper')}
                                                            className="hidden"
                                                            id={`qp-file-${index}`}
                                                        />
                                                        <label
                                                            htmlFor={`qp-file-${index}`}
                                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                                        >
                                                            Upload Question PDF
                                                        </label>
                                                        {uploadingField === `questionPaper-${index}` && (
                                                            <span className="text-[10px] text-slate-400 animate-pulse">Uploading...</span>
                                                        )}
                                                        {test.questionPaperUrl ? (
                                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold truncate max-w-[200px]" title={test.questionPaperKey}>
                                                                ✓ {test.questionPaperKey?.slice(0, 20)}...
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs italic">No PDF uploaded</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Detailed Solution PDF</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="file"
                                                            accept="application/pdf"
                                                            onChange={(e) => handlePaperUpload(e, index, 'solutionPaper')}
                                                            className="hidden"
                                                            id={`sol-file-${index}`}
                                                        />
                                                        <label
                                                            htmlFor={`sol-file-${index}`}
                                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                                                        >
                                                            Upload Solution PDF
                                                        </label>
                                                        {uploadingField === `solutionPaper-${index}` && (
                                                            <span className="text-[10px] text-slate-400 animate-pulse">Uploading...</span>
                                                        )}
                                                        {test.solutionPaperUrl ? (
                                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold truncate max-w-[200px]" title={test.solutionPaperKey}>
                                                                ✓ {test.solutionPaperKey?.slice(0, 20)}...
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs italic">No PDF uploaded</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit Action Row */}
                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                className="px-6 py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white text-sm font-bold rounded-xl shadow-md transition-colors"
                            >
                                Save Test Series Group
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
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
