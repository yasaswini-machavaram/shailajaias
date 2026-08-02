'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../AuthContext';
import { API_URL } from '@/lib/api';

const SUBJECT_CATEGORIES = ['GS-1', 'GS-2', 'GS-3', 'GS-4', 'Essay', 'Optional'];
const DIFFICULTY_LEVELS = ['Easy', 'Moderate', 'Difficult'];

interface QuestionForm {
    _id?: string;
    questionText: string;
    marks: number | '';
    wordLimit: number | '';
    difficultyLevel: 'Easy' | 'Moderate' | 'Difficult';
    modelAnswer: string;
    approach: string;
    topicTags: string;
}

interface MptForm {
    _id?: string;
    title: string;
    subjectCategory: string;
    topicsSummary: string;
    questions: QuestionForm[];
    isPublished: boolean;
}

const emptyQuestion: QuestionForm = {
    questionText: '',
    marks: 10,
    wordLimit: 150,
    difficultyLevel: 'Moderate',
    modelAnswer: '',
    approach: '',
    topicTags: '',
};

const emptyForm: MptForm = {
    title: '',
    subjectCategory: 'GS-1',
    topicsSummary: '',
    questions: [],
    isPublished: false,
};

export default function AdminMainsPracticeTestPage() {
    const { token } = useAuth();
    const [testList, setTestList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<MptForm>({ ...emptyForm });
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Global MPT Settings State
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [globalGuidelinesUrl, setGlobalGuidelinesUrl] = useState('');
    const [globalIntroVideoUrl, setGlobalIntroVideoUrl] = useState('');
    const [isUploadingGlobalPdf, setIsUploadingGlobalPdf] = useState(false);
    const [globalSettingsMsg, setGlobalSettingsMsg] = useState('');

    // Input mode for questions: 'manual' | 'excel'
    const [questionInputMode, setQuestionInputMode] = useState<'manual' | 'excel'>('manual');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isParsingExcel, setIsParsingExcel] = useState(false);
    const [excelErrors, setExcelErrors] = useState<string[]>([]);
    const [excelSuccessMsg, setExcelSuccessMsg] = useState('');
    const excelInputRef = useRef<HTMLInputElement>(null);

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchTests();
            fetchGlobalConfig();
        }
    }, [token]);

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/mpt?includeUnpublished=true`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setTestList(data.data || []);
        } catch (e) { console.error('Fetch MPT error:', e); }
        finally { setIsLoading(false); }
    };

    const fetchGlobalConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mpt/config`);
            const data = await res.json();
            if (data.success && data.data) {
                setGlobalGuidelinesUrl(data.data.guidelinesUrl || '');
                setGlobalIntroVideoUrl(data.data.introVideoUrl || '');
            }
        } catch (e) { console.error('Fetch global MPT config error:', e); }
    };

    const handleGlobalPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') { alert('Only PDF files allowed'); return; }

        setIsUploadingGlobalPdf(true);
        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await fetch(`${API_URL}/api/mpt/upload-pdf`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setGlobalGuidelinesUrl(data.data.url);
            } else { alert(data.message || 'PDF upload failed'); }
        } catch { alert('Upload error'); }
        finally { setIsUploadingGlobalPdf(false); }
    };

    const handleSaveGlobalConfig = async () => {
        setGlobalSettingsMsg('');
        try {
            const res = await fetch(`${API_URL}/api/mpt/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    guidelinesUrl: globalGuidelinesUrl,
                    introVideoUrl: globalIntroVideoUrl,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setGlobalSettingsMsg('Global MPT Guidelines & Video updated!');
                setTimeout(() => setGlobalSettingsMsg(''), 3000);
            } else { alert(data.message || 'Failed to save config'); }
        } catch { alert('Network error'); }
    };

    const handleParseExcel = async () => {
        if (!excelFile) return;
        setIsParsingExcel(true); setExcelErrors([]); setExcelSuccessMsg('');

        const formData = new FormData();
        formData.append('excel', excelFile);

        try {
            const res = await fetch(`${API_URL}/api/mpt/import-excel`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
            });
            const data = await res.json();

            if (data.success && data.data) {
                const parsedQuestions: QuestionForm[] = data.data.map((q: any) => ({
                    questionText: q.questionText || '',
                    marks: q.marks || '',
                    wordLimit: q.wordLimit || '',
                    difficultyLevel: q.difficultyLevel || 'Moderate',
                    modelAnswer: q.modelAnswer || '',
                    approach: q.approach || '',
                    topicTags: Array.isArray(q.topicTags) ? q.topicTags.join(', ') : '',
                }));

                setForm(p => ({ ...p, questions: [...p.questions, ...parsedQuestions] }));
                setExcelSuccessMsg(`Successfully imported ${parsedQuestions.length} questions from Excel!`);
                setExcelFile(null);
                if (excelInputRef.current) excelInputRef.current.value = '';
            } else {
                setExcelErrors(data.errors || [data.message || 'Excel import failed']);
            }
        } catch { setExcelErrors(['An error occurred while parsing the Excel file']); }
        finally { setIsParsingExcel(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(''); setSuccessMessage('');

        if (!form.title.trim()) { setErrorMessage('Title is required'); return; }
        if (!form.subjectCategory.trim()) { setErrorMessage('Subject category is required'); return; }
        if (form.questions.length === 0) { setErrorMessage('At least one question is required'); return; }

        const invalidQ = form.questions.find(q => !q.questionText.trim() || !q.modelAnswer.trim());
        if (invalidQ) {
            setErrorMessage('All questions must have a Question Text and a Model Answer'); return;
        }

        const method = form._id ? 'PUT' : 'POST';
        const endpoint = form._id ? `${API_URL}/api/mpt/${form._id}` : `${API_URL}/api/mpt`;

        const payload = {
            title: form.title,
            subjectCategory: form.subjectCategory,
            topicsSummary: form.topicsSummary,
            isPublished: form.isPublished,
            questions: form.questions.map(q => ({
                questionText: q.questionText,
                marks: q.marks ? Number(q.marks) : undefined,
                wordLimit: q.wordLimit ? Number(q.wordLimit) : undefined,
                difficultyLevel: q.difficultyLevel,
                modelAnswer: q.modelAnswer,
                approach: q.approach ? q.approach.trim() : undefined,
                topicTags: q.topicTags ? q.topicTags.split(',').map(t => t.trim()).filter(Boolean) : [],
            })),
        };

        try {
            const res = await fetch(endpoint, {
                method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(form._id ? 'Updated successfully!' : 'Created successfully!');
                fetchTests(); setIsEditing(false);
            } else { setErrorMessage(data.message || 'Save failed'); }
        } catch { setErrorMessage('An error occurred'); }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mpt/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setTestList(p => p.filter(t => t._id !== id));
                setShowDeleteModal(null);
            }
        } catch { console.error('Delete error'); }
    };

    const handleEdit = (test: any) => {
        setForm({
            _id: test._id,
            title: test.title || '',
            subjectCategory: test.subjectCategory || 'GS-1',
            topicsSummary: test.topicsSummary || '',
            isPublished: !!test.isPublished,
            questions: (test.questions || []).map((q: any) => ({
                questionText: q.questionText || '',
                marks: q.marks || '',
                wordLimit: q.wordLimit || '',
                difficultyLevel: q.difficultyLevel || 'Moderate',
                modelAnswer: q.modelAnswer || '',
                approach: q.approach || '',
                topicTags: Array.isArray(q.topicTags) ? q.topicTags.join(', ') : '',
            })),
        });
        setIsEditing(true); setErrorMessage(''); setSuccessMessage('');
    };

    const handleNew = () => {
        setForm({ ...emptyForm, questions: [{ ...emptyQuestion }] });
        setIsEditing(true); setErrorMessage(''); setSuccessMessage('');
    };

    if (isEditing) {
        return (
            <div className="p-8 min-h-screen bg-slate-50 font-body">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setIsEditing(false)} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">← Back to list</button>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline mb-6">{form._id ? 'Edit' : 'Create'} Mains Practice Test</h1>

                    {errorMessage && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 border border-red-200">{errorMessage}</div>}
                    {successMessage && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4 border border-green-200">{successMessage}</div>}

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Practice Test Metadata */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                            <h2 className="text-lg font-bold text-slate-700">Practice Test Information</h2>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" placeholder="e.g. Polity Mains Practice 1" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject Category *</label>
                                    <select value={form.subjectCategory} onChange={e => setForm(p => ({ ...p, subjectCategory: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none">
                                        {SUBJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Topics Summary</label>
                                    <input type="text" value={form.topicsSummary} onChange={e => setForm(p => ({ ...p, topicsSummary: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" placeholder="e.g. Historical Background, Citizenship" />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300" id="publishToggle" />
                                <label htmlFor="publishToggle" className="text-sm font-semibold text-slate-700">Publish to students</label>
                            </div>
                        </div>

                        {/* Questions Section: Input Mode Switcher (Manual vs Excel) */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-700">Questions ({form.questions.length})</h2>
                                    <p className="text-xs text-slate-500">Add questions manually or bulk import via Excel.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setQuestionInputMode('manual')}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${questionInputMode === 'manual' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        ✍️ Manual Entry
                                    </button>
                                    <button type="button" onClick={() => setQuestionInputMode('excel')}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${questionInputMode === 'excel' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        📊 Excel Import
                                    </button>
                                </div>
                            </div>

                            {/* Excel Import Panel */}
                            {questionInputMode === 'excel' && (
                                <div className="mb-6 p-5 bg-blue-50/60 rounded-2xl border border-blue-200">
                                    <h3 className="text-sm font-bold text-blue-900 mb-2">Bulk Import Questions via Excel</h3>
                                    <p className="text-xs text-blue-700 mb-4">
                                        Upload an Excel sheet (.xlsx/.xls) to auto-populate questions for this practice test.
                                    </p>

                                    {/* Excel Column Structure Spec Box */}
                                    <div className="bg-white rounded-xl p-4 border border-blue-200 mb-4 text-xs space-y-1">
                                        <p className="font-bold text-slate-800 mb-1">Expected Excel Columns (Row 1 Header, Row 2+ Data):</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-slate-600 font-mono text-[11px]">
                                            <div><strong>Col A:</strong> Question Text (Required)</div>
                                            <div><strong>Col B:</strong> Marks (e.g. 10, 15)</div>
                                            <div><strong>Col C:</strong> Word Limit (e.g. 150, 250)</div>
                                            <div><strong>Col D:</strong> Difficulty (Easy / Moderate / Difficult)</div>
                                            <div><strong>Col E:</strong> Model Answer (Required)</div>
                                            <div><strong>Col F:</strong> Approach / Structuring Guidelines</div>
                                            <div className="md:col-span-2"><strong>Col G:</strong> Tags (Comma-separated)</div>
                                        </div>
                                    </div>

                                    {excelErrors.length > 0 && (
                                        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-3 border border-red-200">
                                            {excelErrors.map((err, i) => <p key={i}>• {err}</p>)}
                                        </div>
                                    )}
                                    {excelSuccessMsg && (
                                        <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl mb-3 border border-green-200">{excelSuccessMsg}</div>
                                    )}

                                    <div className="flex flex-wrap gap-3 items-center">
                                        <input
                                            ref={excelInputRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={e => setExcelFile(e.target.files?.[0] || null)}
                                            className="text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleParseExcel}
                                            disabled={!excelFile || isParsingExcel}
                                            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isParsingExcel ? 'Parsing Excel...' : 'Import Questions'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Manual Question Form Builder */}
                            <div className="space-y-4">
                                {form.questions.map((q, i) => (
                                    <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded">
                                                Question #{i + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }))}
                                                className="text-xs text-red-500 hover:text-red-700 font-bold"
                                            >
                                                Remove Question
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Question Text *</label>
                                                <textarea
                                                    value={q.questionText}
                                                    onChange={e => {
                                                        const qs = [...form.questions]; qs[i].questionText = e.target.value; setForm(p => ({ ...p, questions: qs }));
                                                    }}
                                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                                    rows={2} placeholder="Enter the Mains question prompt..." required
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Marks</label>
                                                    <input
                                                        type="number"
                                                        value={q.marks}
                                                        onChange={e => {
                                                            const qs = [...form.questions]; qs[i].marks = e.target.value === '' ? '' : Number(e.target.value); setForm(p => ({ ...p, questions: qs }));
                                                        }}
                                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" placeholder="e.g. 10"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Word Limit</label>
                                                    <input
                                                        type="number"
                                                        value={q.wordLimit}
                                                        onChange={e => {
                                                            const qs = [...form.questions]; qs[i].wordLimit = e.target.value === '' ? '' : Number(e.target.value); setForm(p => ({ ...p, questions: qs }));
                                                        }}
                                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" placeholder="e.g. 150"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty Tag</label>
                                                    <select
                                                        value={q.difficultyLevel}
                                                        onChange={e => {
                                                            const qs = [...form.questions]; qs[i].difficultyLevel = e.target.value as any; setForm(p => ({ ...p, questions: qs }));
                                                        }}
                                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                                                    >
                                                        {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Approach / Structuring Guidelines (Optional)</label>
                                                <textarea
                                                    value={q.approach}
                                                    onChange={e => {
                                                        const qs = [...form.questions]; qs[i].approach = e.target.value; setForm(p => ({ ...p, questions: qs }));
                                                    }}
                                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none"
                                                    rows={2} placeholder="e.g. Intro: Define 1935 Act... Body: Federal scheme, Provincial autonomy..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Model Answer (HTML / Text) *</label>
                                                <textarea
                                                    value={q.modelAnswer}
                                                    onChange={e => {
                                                        const qs = [...form.questions]; qs[i].modelAnswer = e.target.value; setForm(p => ({ ...p, questions: qs }));
                                                    }}
                                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none font-mono text-xs"
                                                    rows={4} placeholder="Enter full detailed model answer..." required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Topic Tags (Comma-separated)</label>
                                                <input
                                                    type="text"
                                                    value={q.topicTags}
                                                    onChange={e => {
                                                        const qs = [...form.questions]; qs[i].topicTags = e.target.value; setForm(p => ({ ...p, questions: qs }));
                                                    }}
                                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" placeholder="e.g. Polity, Constitution, 1935 Act"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, questions: [...p.questions, { ...emptyQuestion }] }))}
                                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
                                >
                                    + Add Question Manually
                                </button>
                            </div>
                        </div>

                        {/* Save Actions */}
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#152C4A]">
                                {form._id ? 'Update' : 'Create'} Practice Test
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Mains Practice Test Manager</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage standalone Mains practice tests, model answers, and Excel bulk imports.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowGlobalSettings(p => !p)}
                        className="bg-amber-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        ⚙️ Global MPT Guidelines & Video
                    </button>
                    <button onClick={handleNew} className="bg-[#2E7D32] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#1B5E20] transition-colors shadow-sm">
                        + Create Practice Test
                    </button>
                </div>
            </div>

            {/* Global MPT Module Settings Panel */}
            {showGlobalSettings && (
                <div className="bg-amber-50/70 rounded-2xl p-6 border border-amber-200 mb-6 shadow-sm animate-fade-in-up">
                    <h2 className="text-lg font-bold text-amber-900 mb-1">Global MPT Guidelines & Intro Video</h2>
                    <p className="text-xs text-amber-700 mb-4">
                        Configure the module-wide &quot;Download Guidelines&quot; PDF and &quot;INTRO Video&quot; URL shown at the top of the Student Mains Practice Tests page.
                    </p>

                    {globalSettingsMsg && (
                        <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl mb-3 border border-green-200 font-bold">{globalSettingsMsg}</div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-amber-800 mb-1">Global Guidelines PDF</label>
                            <input type="file" accept=".pdf" onChange={handleGlobalPdfUpload} className="text-xs" />
                            {isUploadingGlobalPdf && <span className="text-xs text-amber-600 ml-2 font-bold">Uploading...</span>}
                            {globalGuidelinesUrl && <span className="text-xs text-green-700 font-bold ml-2">✓ Uploaded</span>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-amber-800 mb-1">Global INTRO Video URL (YouTube)</label>
                            <input
                                type="url"
                                value={globalIntroVideoUrl}
                                onChange={e => setGlobalIntroVideoUrl(e.target.value)}
                                className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-600 bg-white"
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveGlobalConfig}
                            className="bg-amber-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-amber-800 transition-colors"
                        >
                            Save Global MPT Settings
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2E7D32]" />
                </div>
            ) : testList.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm mb-4">No Mains Practice Tests created yet.</p>
                    <button onClick={handleNew} className="bg-[#2E7D32] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#1B5E20]">
                        Create Your First Practice Test
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {testList.map(test => (
                        <div key={test._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                        {test.subjectCategory}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${test.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {test.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                        {test.questions?.length || 0} Questions
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 font-headline">{test.title}</h3>
                                {test.topicsSummary && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{test.topicsSummary}</p>}
                            </div>
                            <div className="flex gap-3 ml-4">
                                <button onClick={() => handleEdit(test)} className="text-xs font-bold text-[#1E3A5F] hover:underline">Edit</button>
                                <button onClick={() => setShowDeleteModal(test._id)} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Practice Test?</h3>
                        <p className="text-sm text-slate-500 mb-4">This will permanently delete this practice test and all its questions.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={() => handleDelete(showDeleteModal)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
