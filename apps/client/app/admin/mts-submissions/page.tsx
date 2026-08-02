'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_URL } from '@/lib/api';

interface Submission {
    _id: string;
    student: { _id: string; name: string; phone?: string; email?: string };
    mainsTestSeries: { _id: string; title: string; uniqueId: string };
    testIndex: number;
    testTitle: string;
    seriesUniqueId: string;
    answerSheetUrls: string[];
    submittedAt: string;
    mentor?: { _id: string; name: string; email?: string };
    status: 'submitted' | 'assigned' | 'under_review' | 'evaluated';
    evaluatedCopyUrl?: string;
    score?: number;
    maxScore?: number;
    feedback?: string;
    evaluatedAt?: string;
    evaluatedBy?: { _id: string; name: string };
}

interface Stats {
    total: number;
    submitted: number;
    assigned: number;
    underReview: number;
    evaluated: number;
}

export default function AdminMtsSubmissionsPage() {
    const { token } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, submitted: 0, assigned: 0, underReview: 0, evaluated: 0 });
    const [mentors, setMentors] = useState<any[]>([]);
    const [mtsList, setMtsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMts, setFilterMts] = useState('');
    const [filterMentor, setFilterMentor] = useState('');
    const [searchStudent, setSearchStudent] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Assignment
    const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignMentorId, setAssignMentorId] = useState('');

    // Detail modal
    const [showDetailModal, setShowDetailModal] = useState<Submission | null>(null);

    // Evaluate modal (admin can evaluate too)
    const [showEvalModal, setShowEvalModal] = useState<Submission | null>(null);
    const [evalForm, setEvalForm] = useState({ score: '', maxScore: '', feedback: '' });
    const [evalFile, setEvalFile] = useState<File | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);

    useEffect(() => {
        if (token) { fetchMentors(); fetchMtsList(); }
    }, [token]);

    useEffect(() => {
        if (token) { fetchSubmissions(); fetchStats(); }
    }, [token, filterStatus, filterMts, filterMentor, page]);

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (filterMts) params.set('mainsTestSeriesId', filterMts);
            if (filterMentor) params.set('mentorId', filterMentor);
            if (searchStudent) params.set('studentSearch', searchStudent);
            params.set('page', String(page));
            params.set('limit', '25');

            const res = await fetch(`${API_URL}/api/mts/submissions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setSubmissions(data.data);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (e) { console.error('Fetch submissions:', e); }
        finally { setIsLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const params = filterMts ? `?mainsTestSeriesId=${filterMts}` : '';
            const res = await fetch(`${API_URL}/api/mts/submissions/stats${params}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch (e) { console.error('Fetch stats:', e); }
    };

    const fetchMentors = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentors`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setMentors(data.data);
        } catch { }
    };

    const fetchMtsList = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mts/series?includeUnpublished=true`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setMtsList(data.data);
        } catch { }
    };

    const handleBulkAssign = async () => {
        if (!assignMentorId || selectedSubmissions.length === 0) return;

        // Check if any selected submission is under review
        const underReviewCount = submissions.filter(s => selectedSubmissions.includes(s._id) && s.status === 'under_review').length;
        if (underReviewCount > 0) {
            const confirmed = confirm(
                `⚠️ WARNING: ${underReviewCount} of the selected submission(s) are currently "Under Review" by their assigned mentor.\n\nAre you sure you want to override and reassign them to a different mentor?`
            );
            if (!confirmed) return;
        }

        try {
            const res = await fetch(`${API_URL}/api/mts/submissions/bulk-assign`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ submissionIds: selectedSubmissions, mentorId: assignMentorId }),
            });
            const data = await res.json();
            if (data.success) {
                setShowAssignModal(false); setSelectedSubmissions([]);
                fetchSubmissions(); fetchStats();
            } else {
                alert(data.message || 'Failed to bulk assign mentor');
            }
        } catch { console.error('Bulk assign error'); }
    };

    const handleSingleAssign = async (sub: Submission, newMentorId: string) => {
        if (!newMentorId) return;

        // If mentor is unchanged, do nothing
        const currentMentorId = sub.mentor?._id || sub.mentor;
        if (currentMentorId === newMentorId) return;

        // Warning if submission is currently under review
        if (sub.status === 'under_review') {
            const confirmed = confirm(
                `⚠️ WARNING: This test submission is currently "Under Review" by ${sub.mentor?.name || 'the assigned mentor'}.\n\nAre you sure you want to override and reassign it to a different mentor?`
            );
            if (!confirmed) {
                fetchSubmissions(); // reset dropdown
                return;
            }
        }

        try {
            const res = await fetch(`${API_URL}/api/mts/submissions/${sub._id}/assign`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mentorId: newMentorId }),
            });
            const data = await res.json();
            if (data.success) { fetchSubmissions(); fetchStats(); }
            else { alert(data.message || 'Failed to assign mentor'); }
        } catch { console.error('Assign error'); }
    };

    const handleSubmitEval = async () => {
        if (!showEvalModal) return;
        setIsEvaluating(true);
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
            if (data.success) { setShowEvalModal(null); fetchSubmissions(); fetchStats(); }
        } catch { console.error('Eval error'); }
        finally { setIsEvaluating(false); }
    };

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
        catch { return d; }
    };

    const statusColors: Record<string, string> = {
        submitted: 'bg-blue-100 text-blue-800',
        assigned: 'bg-yellow-100 text-yellow-800',
        under_review: 'bg-orange-100 text-orange-800',
        evaluated: 'bg-green-100 text-green-800',
    };

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            <h1 className="text-2xl font-bold text-slate-800 font-headline mb-1">MTS Submissions Tracker</h1>
            <p className="text-sm text-slate-500 mb-6">Track all student answer sheet submissions, assign mentors, and manage evaluations.</p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                    { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-800' },
                    { label: 'Submitted', value: stats.submitted, color: 'bg-blue-50 text-blue-700' },
                    { label: 'Assigned', value: stats.assigned, color: 'bg-yellow-50 text-yellow-700' },
                    { label: 'Under Review', value: stats.underReview, color: 'bg-orange-50 text-orange-700' },
                    { label: 'Evaluated', value: stats.evaluated, color: 'bg-green-50 text-green-700' },
                ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">All Statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="assigned">Assigned</option>
                        <option value="under_review">Under Review</option>
                        <option value="evaluated">Evaluated</option>
                    </select>
                    <select value={filterMts} onChange={e => { setFilterMts(e.target.value); setPage(1); }}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">All MTS Groups</option>
                        {mtsList.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
                    </select>
                    <select value={filterMentor} onChange={e => { setFilterMentor(e.target.value); setPage(1); }}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">All Mentors</option>
                        {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Search student..." value={searchStudent}
                            onChange={e => setSearchStudent(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                        <button onClick={() => { setPage(1); fetchSubmissions(); }}
                            className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-bold">Go</button>
                    </div>
                    {selectedSubmissions.length > 0 && (
                        <button onClick={() => setShowAssignModal(true)}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                            Assign ({selectedSubmissions.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-400" />
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">No submissions found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-3 py-3 text-left">
                                        <input type="checkbox"
                                            checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                                            onChange={e => setSelectedSubmissions(e.target.checked ? submissions.map(s => s._id) : [])}
                                            className="w-4 h-4 rounded" />
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">Student</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">Test</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">MTS Group</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">Submitted</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">Status</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">Mentor</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map(sub => (
                                    <tr key={sub._id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-3">
                                            <input type="checkbox" checked={selectedSubmissions.includes(sub._id)}
                                                onChange={e => setSelectedSubmissions(p => e.target.checked ? [...p, sub._id] : p.filter(id => id !== sub._id))}
                                                className="w-4 h-4 rounded" />
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-semibold text-slate-800">{sub.student?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-500">{sub.student?.phone || sub.student?.email || ''}</p>
                                        </td>
                                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">{sub.testTitle}</td>
                                        <td className="px-3 py-3">
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{sub.seriesUniqueId}</span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-slate-500">{formatDate(sub.submittedAt)}</td>
                                        <td className="px-3 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColors[sub.status] || 'bg-gray-100'}`}>
                                                {sub.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {sub.status === 'evaluated' ? (
                                                <span className="text-xs text-teal-700 font-semibold">{sub.mentor?.name || 'Evaluated'}</span>
                                            ) : (
                                                <select
                                                    value={sub.mentor?._id || (typeof sub.mentor === 'string' ? sub.mentor : '') || ''}
                                                    onChange={e => handleSingleAssign(sub, e.target.value)}
                                                    className="text-[10px] border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-slate-700 focus:outline-none"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowDetailModal(sub)} className="text-[10px] font-bold text-[#1E3A5F] hover:underline">View</button>
                                                {sub.answerSheetUrls?.length > 0 && (
                                                    <a href={`${API_URL}${sub.answerSheetUrls[0]}`} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] font-bold text-blue-600 hover:underline">Download</a>
                                                )}
                                                {sub.status !== 'evaluated' && (
                                                    <button onClick={() => {
                                                        setShowEvalModal(sub);
                                                        setEvalForm({ score: sub.score?.toString() || '', maxScore: sub.maxScore?.toString() || '', feedback: sub.feedback || '' });
                                                        setEvalFile(null);
                                                    }} className="text-[10px] font-bold text-green-600 hover:underline">Evaluate</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-200">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="text-xs font-bold text-slate-500 disabled:opacity-30">← Prev</button>
                        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="text-xs font-bold text-slate-500 disabled:opacity-30">Next →</button>
                    </div>
                )}
            </div>

            {/* Bulk Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Bulk Assign Mentor</h3>
                        <p className="text-xs text-slate-500 mb-4">Assign {selectedSubmissions.length} submissions to a mentor</p>
                        <select value={assignMentorId} onChange={e => setAssignMentorId(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm mb-4">
                            <option value="">Select mentor...</option>
                            {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </select>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={handleBulkAssign} disabled={!assignMentorId} className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-50">Assign</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Submission Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-slate-500">Student:</span><br /><strong>{showDetailModal.student?.name}</strong></div>
                                <div><span className="text-slate-500">Contact:</span><br /><strong>{showDetailModal.student?.phone || showDetailModal.student?.email || 'N/A'}</strong></div>
                                <div><span className="text-slate-500">Test:</span><br /><strong>{showDetailModal.testTitle}</strong></div>
                                <div><span className="text-slate-500">MTS ID:</span><br /><strong>{showDetailModal.seriesUniqueId}</strong></div>
                                <div><span className="text-slate-500">Submitted:</span><br /><strong>{formatDate(showDetailModal.submittedAt)}</strong></div>
                                <div><span className="text-slate-500">Status:</span><br /><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColors[showDetailModal.status]}`}>{showDetailModal.status.replace('_', ' ')}</span></div>
                            </div>
                            {showDetailModal.mentor && <div><span className="text-slate-500">Assigned Mentor:</span> <strong>{showDetailModal.mentor.name}</strong></div>}
                            {showDetailModal.score !== undefined && <div><span className="text-slate-500">Score:</span> <strong className="text-green-700">{showDetailModal.score}/{showDetailModal.maxScore}</strong></div>}
                            {showDetailModal.feedback && <div className="bg-amber-50 p-3 rounded-xl border border-amber-100"><p className="text-[10px] font-bold text-amber-700 mb-1">Feedback:</p><p>{showDetailModal.feedback}</p></div>}

                            <div>
                                <p className="text-slate-500 mb-2">Answer Sheets ({showDetailModal.answerSheetUrls?.length || 0}):</p>
                                <div className="flex flex-wrap gap-2">
                                    {showDetailModal.answerSheetUrls?.map((url, i) => (
                                        <a key={i} href={`${API_URL}${url}`} target="_blank" rel="noopener noreferrer"
                                            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">
                                            File {i + 1}
                                        </a>
                                    ))}
                                </div>
                            </div>
                            {showDetailModal.evaluatedCopyUrl && (
                                <div>
                                    <a href={`${API_URL}${showDetailModal.evaluatedCopyUrl}`} target="_blank" rel="noopener noreferrer"
                                        className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded hover:bg-green-100">
                                        📥 Download Evaluated Copy
                                    </a>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowDetailModal(null)} className="w-full mt-4 py-3 rounded-xl border border-slate-300 text-sm font-bold">Close</button>
                    </div>
                </div>
            )}

            {/* Evaluate Modal */}
            {showEvalModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEvalModal(null)}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Evaluate Submission</h3>
                        <p className="text-xs text-slate-500 mb-4">Student: {showEvalModal.student?.name} | Test: {showEvalModal.testTitle}</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Score</label>
                                    <input type="number" value={evalForm.score} onChange={e => setEvalForm(p => ({ ...p, score: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 45" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Score</label>
                                    <input type="number" value={evalForm.maxScore} onChange={e => setEvalForm(p => ({ ...p, maxScore: e.target.value }))}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 250" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Feedback</label>
                                <textarea value={evalForm.feedback} onChange={e => setEvalForm(p => ({ ...p, feedback: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Write feedback for the student..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Upload Evaluated Copy (PDF/Image)</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setEvalFile(e.target.files?.[0] || null)} className="text-xs" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowEvalModal(null)} className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button>
                            <button onClick={handleSubmitEval} disabled={isEvaluating}
                                className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                                {isEvaluating ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
