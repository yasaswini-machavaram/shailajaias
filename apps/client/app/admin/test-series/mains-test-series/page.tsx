'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { API_URL } from '@/lib/api';

const SUBJECT_CATEGORIES = ['GS-1', 'GS-2', 'GS-3', 'GS-4', 'Essay', 'Optional'];

interface TestItemForm {
    title: string;
    date: string;
    subjectCategory: string;
    questionPaperUrl: string;
    questionPaperKey: string;
    solutionPaperUrl: string;
    solutionPaperKey: string;
    discussionVideoUrl: string;
    isLocked: boolean;
}

interface MtsForm {
    _id?: string;
    uniqueId?: string;
    title: string;
    description: string;
    brochureUrl: string;
    brochureKey: string;
    introVideoUrl: string;
    sectionalCount: number;
    fullLengthCount: number;
    tests: TestItemForm[];
    isPublished: boolean;
}

const emptyTest: TestItemForm = {
    title: '', date: new Date().toISOString().split('T')[0],
    subjectCategory: 'GS-1', questionPaperUrl: '', questionPaperKey: '',
    solutionPaperUrl: '', solutionPaperKey: '', discussionVideoUrl: '', isLocked: false,
};

const emptyForm: MtsForm = {
    title: '', description: '', brochureUrl: '', brochureKey: '',
    introVideoUrl: '', sectionalCount: 0, fullLengthCount: 0, tests: [], isPublished: false,
};

export default function AdminMainsTestSeriesPage() {
    const { token } = useAuth();
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<MtsForm>({ ...emptyForm });
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

    useEffect(() => { if (token) fetchSeries(); }, [token]);

    const fetchSeries = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/mts/series?includeUnpublished=true`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setSeriesList(data.data);
        } catch (error) { console.error('Failed to fetch MTS:', error); }
        finally { setIsLoading(false); }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, index?: number) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') { alert('Only PDF files allowed'); return; }

        setUploadingField(fieldName);
        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const res = await fetch(`${API_URL}/api/mts/series/upload`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
            });
            const data = await res.json();
            if (data.success) {
                const { url, key } = data.data;
                if (fieldName === 'brochure') {
                    setForm(prev => ({ ...prev, brochureUrl: url, brochureKey: key }));
                } else if (fieldName.startsWith('questionPaper-') && index !== undefined) {
                    setForm(prev => {
                        const t = [...prev.tests];
                        t[index].questionPaperUrl = url;
                        t[index].questionPaperKey = key;
                        return { ...prev, tests: t };
                    });
                } else if (fieldName.startsWith('solutionPaper-') && index !== undefined) {
                    setForm(prev => {
                        const t = [...prev.tests];
                        t[index].solutionPaperUrl = url;
                        t[index].solutionPaperKey = key;
                        return { ...prev, tests: t };
                    });
                }
            } else { alert(data.message || 'Upload failed'); }
        } catch { alert('Upload error'); }
        finally { setUploadingField(null); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(''); setSuccessMessage('');
        if (!form.title.trim()) { setErrorMessage('Title is required'); return; }

        // Verify that all test items have a question paper PDF uploaded
        const missingQuestionPaper = form.tests.find(t => !t.questionPaperUrl);
        if (missingQuestionPaper) {
            setErrorMessage(`Question Paper PDF is mandatory for all tests. Please upload a Question Paper for test "${missingQuestionPaper.title || 'Untitled Test'}".`);
            return;
        }

        const method = form._id ? 'PUT' : 'POST';
        const endpoint = form._id ? `${API_URL}/api/mts/series/${form._id}` : `${API_URL}/api/mts/series`;

        try {
            const res = await fetch(endpoint, {
                method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: form.title, description: form.description,
                    brochureUrl: form.brochureUrl, brochureKey: form.brochureKey,
                    introVideoUrl: form.introVideoUrl,
                    sectionalCount: form.sectionalCount, fullLengthCount: form.fullLengthCount,
                    isPublished: form.isPublished,
                    tests: form.tests,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(form._id ? 'Updated successfully!' : 'Created successfully!');
                fetchSeries(); setIsEditing(false);
            } else { setErrorMessage(data.message || 'Save failed'); }
        } catch { setErrorMessage('An error occurred'); }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mts/series/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) { setSeriesList(prev => prev.filter(s => s._id !== id)); setShowDeleteModal(null); }
            else { alert(data.message || 'Delete failed'); }
        } catch { console.error('Delete error'); }
    };

    const handleEdit = (series: any) => {
        setForm({
            _id: series._id, uniqueId: series.uniqueId,
            title: series.title, description: series.description || '',
            brochureUrl: series.brochureUrl || '', brochureKey: series.brochureKey || '',
            introVideoUrl: series.introVideoUrl || '',
            sectionalCount: series.sectionalCount || 0, fullLengthCount: series.fullLengthCount || 0,
            isPublished: series.isPublished || false,
            tests: (series.tests || []).map((t: any) => ({
                title: t.title || '', date: t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0],
                subjectCategory: t.subjectCategory || 'GS-1',
                questionPaperUrl: t.questionPaperUrl || '', questionPaperKey: t.questionPaperKey || '',
                solutionPaperUrl: t.solutionPaperUrl || '', solutionPaperKey: t.solutionPaperKey || '',
                discussionVideoUrl: t.discussionVideoUrl || '', isLocked: !!t.isLocked,
            })),
        });
        setIsEditing(true); setErrorMessage(''); setSuccessMessage('');
    };

    const handleNew = () => {
        setForm({ ...emptyForm }); setIsEditing(true); setErrorMessage(''); setSuccessMessage('');
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    if (isEditing) {
        return (
            <div className="p-8 min-h-screen bg-slate-50 font-body">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setIsEditing(false)} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">← Back to list</button>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline mb-6">{form._id ? 'Edit' : 'Create'} Mains Test Series</h1>

                    {errorMessage && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 border border-red-200">{errorMessage}</div>}
                    {successMessage && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4 border border-green-200">{successMessage}</div>}

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Group Info */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                            <h2 className="text-lg font-bold text-slate-700">Group Information</h2>
                            {form.uniqueId && <div className="text-xs font-bold text-amber-700 bg-amber-50 inline-block px-3 py-1 rounded">{form.uniqueId}</div>}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" maxLength={200} required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sectional Test Count</label>
                                    <input type="number" value={form.sectionalCount} onChange={e => setForm(p => ({ ...p, sectionalCount: Number(e.target.value) }))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" min={0} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Length Test Count</label>
                                    <input type="number" value={form.fullLengthCount} onChange={e => setForm(p => ({ ...p, fullLengthCount: Number(e.target.value) }))}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" min={0} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Intro Video URL (YouTube)</label>
                                <input type="url" value={form.introVideoUrl} onChange={e => setForm(p => ({ ...p, introVideoUrl: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-[#1E3A5F] focus:outline-none" placeholder="https://youtube.com/watch?v=..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Brochure PDF (Schedule & Syllabus)</label>
                                <input type="file" accept=".pdf" onChange={e => handlePdfUpload(e, 'brochure')} className="text-sm" />
                                {uploadingField === 'brochure' && <span className="text-xs text-amber-600 ml-2">Uploading...</span>}
                                {form.brochureUrl && <span className="text-xs text-green-600 ml-2">✓ Uploaded</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300" id="publishToggle" />
                                <label htmlFor="publishToggle" className="text-sm font-semibold text-slate-700">Publish to students</label>
                            </div>
                        </div>

                        {/* Tests */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-700">Tests ({form.tests.length})</h2>
                                <button type="button" onClick={() => setForm(p => ({ ...p, tests: [...p.tests, { ...emptyTest }] }))}
                                    className="text-sm font-bold text-white bg-[#E65100] px-4 py-2 rounded-xl hover:bg-[#BF360C] transition-colors">+ Add Test</button>
                            </div>

                            {form.tests.map((test, i) => (
                                <div key={i} className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-slate-600">Test #{i + 1}</span>
                                        <button type="button" onClick={() => setForm(p => ({ ...p, tests: p.tests.filter((_, idx) => idx !== i) }))}
                                            className="text-xs text-red-500 hover:text-red-700 font-bold">Remove</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Title *</label>
                                            <input type="text" value={test.title} onChange={e => {
                                                const t = [...form.tests]; t[i].title = e.target.value; setForm(p => ({ ...p, tests: t }));
                                            }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                                            <input type="date" value={test.date} onChange={e => {
                                                const t = [...form.tests]; t[i].date = e.target.value; setForm(p => ({ ...p, tests: t }));
                                            }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Category</label>
                                            <select value={test.subjectCategory} onChange={e => {
                                                const t = [...form.tests]; t[i].subjectCategory = e.target.value; setForm(p => ({ ...p, tests: t }));
                                            }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                                                {SUBJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Discussion Video URL</label>
                                            <input type="url" value={test.discussionVideoUrl} onChange={e => {
                                                const t = [...form.tests]; t[i].discussionVideoUrl = e.target.value; setForm(p => ({ ...p, tests: t }));
                                            }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="YouTube URL" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Question Paper PDF * <span className="text-red-500 font-bold">(Mandatory)</span></label>
                                            <input type="file" accept=".pdf" onChange={e => handlePdfUpload(e, `questionPaper-${i}`, i)} className="text-xs" />
                                            {uploadingField === `questionPaper-${i}` && <span className="text-xs text-amber-600">Uploading...</span>}
                                            {test.questionPaperUrl && <span className="text-xs text-green-600 ml-1">✓</span>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Solution PDF</label>
                                            <input type="file" accept=".pdf" onChange={e => handlePdfUpload(e, `solutionPaper-${i}`, i)} className="text-xs" />
                                            {uploadingField === `solutionPaper-${i}` && <span className="text-xs text-amber-600">Uploading...</span>}
                                            {test.solutionPaperUrl && <span className="text-xs text-green-600 ml-1">✓</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <input type="checkbox" checked={test.isLocked} onChange={e => {
                                            const t = [...form.tests]; t[i].isLocked = e.target.checked; setForm(p => ({ ...p, tests: t }));
                                        }} className="w-4 h-4 rounded" id={`lock-${i}`} />
                                        <label htmlFor={`lock-${i}`} className="text-xs font-semibold text-slate-600">Lock (disable student uploads)</label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#152C4A]">
                                {form._id ? 'Update' : 'Create'} Test Series
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 font-headline">Mains Test Series Manager</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage MTS groups, test schedules, question papers, and solution PDFs.</p>
                </div>
                <button onClick={handleNew} className="bg-[#E65100] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#BF360C] transition-colors shadow-sm">
                    + Create New MTS
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#E65100]" />
                </div>
            ) : seriesList.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-sm mb-4">No Mains Test Series created yet.</p>
                    <button onClick={handleNew} className="bg-[#E65100] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#BF360C]">Create Your First MTS</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {seriesList.map(series => (
                        <div key={series._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {series.uniqueId && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{series.uniqueId}</span>}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${series.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {series.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 font-headline">{series.title}</h3>
                                    {series.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{series.description}</p>}
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">{series.tests?.length || 0} Tests</span>
                                        <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded">{series.sectionalCount || 0} Sectional</span>
                                        <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded">{series.fullLengthCount || 0} Full Length</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button onClick={() => handleEdit(series)} className="text-xs font-bold text-[#1E3A5F] hover:underline">Edit</button>
                                    <button onClick={() => setShowDeleteModal(series._id)} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete MTS Group?</h3>
                        <p className="text-sm text-slate-500 mb-4">This will permanently delete the group and all its files. This action cannot be undone.</p>
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
