'use client';

import { useState, useEffect } from 'react';
import { useMentorAuth } from '../MentorAuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Submission {
    _id: string;
    student: { _id: string; name: string; phone?: string; email?: string };
    mainsTestSeries: { _id: string; title: string; uniqueId: string };
    testIndex: number;
    testTitle: string;
    seriesUniqueId: string;
    answerSheetUrls: string[];
    submittedAt: string;
    status: 'assigned' | 'under_review' | 'evaluated';
    evaluatedCopyUrl?: string;
    score?: number;
    maxScore?: number;
    feedback?: string;
}

type DatePreset = 'all' | 'today' | '7days' | '30days' | 'custom';

// Helper to format date to YYYY-MM-DD string
function toYmd(date: Date): string {
    return date.toISOString().split('T')[0];
}

export default function MentorSubmissionsPage() {
    const { token } = useMentorAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Status filter
    const [filterStatus, setFilterStatus] = useState('');

    // Date filters
    const [datePreset, setDatePreset] = useState<DatePreset>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Eval modal
    const [showEvalModal, setShowEvalModal] = useState<Submission | null>(null);
    const [evalForm, setEvalForm] = useState({ score: '', maxScore: '', feedback: '' });
    const [evalFile, setEvalFile] = useState<File | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evalError, setEvalError] = useState('');
    const [evalSuccess, setEvalSuccess] = useState('');

    useEffect(() => {
        if (token) fetchSubmissions();
    }, [token, filterStatus, datePreset, startDate, endDate]);

    // Handle preset selection
    const handlePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        const now = new Date();

        if (preset === 'all') {
            setStartDate('');
            setEndDate('');
        } else if (preset === 'today') {
            const todayStr = toYmd(now);
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (preset === '7days') {
            const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(toYmd(ago7));
            setEndDate(toYmd(now));
        } else if (preset === '30days') {
            const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setStartDate(toYmd(ago30));
            setEndDate(toYmd(now));
        }
    };

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);

            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_URL}/api/mts/submissions/mentor${queryString}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setSubmissions(data.data || []);
        } catch (e) { console.error('Fetch error:', e); }
        finally { setIsLoading(false); }
    };

    const handleStartReview = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mts/submissions/${id}/start-review`, {
                method: 'PUT', headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) fetchSubmissions();
        } catch { console.error('Start review error'); }
    };

    const handleSubmitEval = async () => {
        if (!showEvalModal) return;
        setIsEvaluating(true); setEvalError(''); setEvalSuccess('');

        try {
            const formData = new FormData();
            if (evalFile) formData.append('evaluatedCopy', evalFile);
            if (evalForm.score) formData.append('score', evalForm.score);
            if (evalForm.maxScore) formData.append('maxScore', evalForm.maxScore);
            if (evalForm.feedback) formData.append('feedback', evalForm.feedback);

            const res = await fetch(`${API_URL}/api/mts/submissions/${showEvalModal._id}/evaluate`, {
                method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setEvalSuccess('Evaluation submitted!');
                fetchSubmissions();
                setTimeout(() => setShowEvalModal(null), 1500);
            } else { setEvalError(data.message || 'Failed'); }
        } catch { setEvalError('Network error'); }
        finally { setIsEvaluating(false); }
    };

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
        catch { return d; }
    };

    const statusColors: Record<string, string> = {
        assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        under_review: 'bg-orange-100 text-orange-800 border-orange-200',
        evaluated: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
        <div className="p-8 font-body">
            <h1 className="text-2xl font-bold text-slate-800 mb-1 font-headline">Assigned Submissions</h1>
            <p className="text-sm text-slate-500 mb-6">Review student answer sheets and submit evaluations.</p>

            {/* Filter Controls Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6 space-y-4">
                {/* Row 1: Status Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider w-24">Status:</span>
                    <div className="flex flex-wrap gap-2">
                        {['', 'assigned', 'under_review', 'evaluated'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    filterStatus === s
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {s ? s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All Statuses'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4" />

                {/* Row 2: Date Uploaded Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider w-24">Date Uploaded:</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handlePresetChange('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                datePreset === 'all' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All Dates
                        </button>
                        <button
                            onClick={() => handlePresetChange('today')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                datePreset === 'today' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            📅 Today
                        </button>
                        <button
                            onClick={() => handlePresetChange('7days')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                datePreset === '7days' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => handlePresetChange('30days')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                datePreset === '30days' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={() => handlePresetChange('custom')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                datePreset === 'custom' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            🗓️ Custom Range
                        </button>
                    </div>
                </div>

                {/* Custom Date Pickers */}
                {datePreset === 'custom' && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600">From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600">To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold ml-auto"
                            >
                                Clear Range
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Submissions List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600" />
                </div>
            ) : submissions.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-sm">No submissions found matching your filters.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {submissions.map(sub => (
                        <div key={sub._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-800">{sub.student?.name || 'Student'}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColors[sub.status]}`}>
                                            {sub.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 font-medium">{sub.testTitle}</p>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            {sub.seriesUniqueId}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                            📅 Uploaded: {formatDate(sub.submittedAt)}
                                        </span>
                                        {sub.student?.phone && (
                                            <span className="text-[10px] text-slate-500">📱 {sub.student.phone}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 ml-4 flex-wrap justify-end">
                                    {/* Download answer sheets */}
                                    {sub.answerSheetUrls?.map((url, i) => (
                                        <a key={i} href={`${API_URL}${url}`} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                                            📥 Sheet {i + 1}
                                        </a>
                                    ))}

                                    {/* Start review button */}
                                    {sub.status === 'assigned' && (
                                        <button onClick={() => handleStartReview(sub._id)}
                                            className="text-[10px] font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                                            🔍 Start Review
                                        </button>
                                    )}

                                    {/* Evaluate button */}
                                    {sub.status !== 'evaluated' && (
                                        <button onClick={() => {
                                            setShowEvalModal(sub);
                                            setEvalForm({ score: '', maxScore: '', feedback: '' });
                                            setEvalFile(null); setEvalError(''); setEvalSuccess('');
                                        }}
                                            className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                                            ✅ Evaluate
                                        </button>
                                    )}

                                    {/* View evaluated copy */}
                                    {sub.status === 'evaluated' && sub.evaluatedCopyUrl && (
                                        <a href={`${API_URL}${sub.evaluatedCopyUrl}`} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                                            📄 Evaluated Copy
                                        </a>
                                    )}
                                </div>
                            </div>

                            {sub.status === 'evaluated' && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-4 text-xs">
                                    {sub.score !== undefined && <span className="font-bold text-green-700">Score: {sub.score}/{sub.maxScore}</span>}
                                    {sub.feedback && <span className="text-slate-600 truncate">Feedback: {sub.feedback}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Evaluate Modal */}
            {showEvalModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEvalModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Evaluate Submission</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Student: <strong>{showEvalModal.student?.name}</strong> | Test: <strong>{showEvalModal.testTitle}</strong>
                        </p>

                        {evalError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-3 border border-red-200">{evalError}</div>}
                        {evalSuccess && <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl mb-3 border border-green-200">{evalSuccess}</div>}

                        {!evalSuccess && (
                            <>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Score</label>
                                            <input type="number" value={evalForm.score} onChange={e => setEvalForm(p => ({ ...p, score: e.target.value }))}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" placeholder="45" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Max Score</label>
                                            <input type="number" value={evalForm.maxScore} onChange={e => setEvalForm(p => ({ ...p, maxScore: e.target.value }))}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" placeholder="250" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Feedback</label>
                                        <textarea value={evalForm.feedback} onChange={e => setEvalForm(p => ({ ...p, feedback: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" rows={3} placeholder="Write feedback..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Upload Evaluated Copy</label>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setEvalFile(e.target.files?.[0] || null)} className="text-xs" />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button onClick={() => setShowEvalModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                                    <button onClick={handleSubmitEval} disabled={isEvaluating}
                                        className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                                        {isEvaluating ? 'Submitting...' : 'Submit Evaluation'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
