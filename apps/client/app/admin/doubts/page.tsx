'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_URL, formatDisplayDate } from '../../../lib/api';

interface IDoubtMessage {
    senderId: string;
    senderName: string;
    message: string;
    createdAt: string;
}

interface IDoubt {
    _id: string;
    student: {
        _id: string;
        name: string;
        phone?: string;
        email?: string;
    };
    testSeries?: {
        _id: string;
        title: string;
    };
    testSeriesUniqueId?: string;
    testItemTitle?: string;
    quiz?: {
        _id: string;
        title: string;
    };
    questionIndex?: number;
    questionText?: string;
    subject: string;
    title: string;
    description: string;
    status: 'pending' | 'answered' | 'resolved';
    messages: IDoubtMessage[];
    createdAt: string;
    updatedAt: string;
}

export default function AdminDoubtsPage() {
    const { token } = useAuth();
    
    // List states
    const [doubts, setDoubts] = useState<IDoubt[]>([]);
    const [totalDoubts, setTotalDoubts] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [subjectFilter, setSubjectFilter] = useState<string>('');
    const [searchText, setSearchText] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Active doubt workspace states
    const [selectedDoubt, setSelectedDoubt] = useState<IDoubt | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Load list
    const fetchDoubts = async (isSilent = false) => {
        if (!token) return;
        if (!isSilent) setIsLoading(true);
        try {
            let url = `${API_URL}/api/doubts?page=${page}&limit=20&_t=${Date.now()}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (subjectFilter) url += `&subject=${subjectFilter}`;
            if (searchText) url += `&search=${encodeURIComponent(searchText)}`;
            
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await res.json();
            if (data.success) {
                setDoubts(data.data || []);
                if (data.pagination) {
                    setTotalDoubts(data.pagination.total);
                    setTotalPages(data.pagination.totalPages);
                }
            }
        } catch (error) {
            console.error('Fetch admin doubts error:', error);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts(false);
    }, [token, page, statusFilter, subjectFilter, searchText]);

    // Load details for workspace
    const fetchDoubtDetail = async (doubtId: string, isSilent = false) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/doubts/${doubtId}?_t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedDoubt(data.data);
                // Sync in main list
                setDoubts(prev => prev.map(d => (d._id || (d as any).id) === doubtId ? data.data : d));
            }
        } catch (error) {
            console.error('Fetch doubt detail error:', error);
        }
    };

    useEffect(() => {
        if (!token) return;

        const interval = setInterval(() => {
            fetchDoubts(true);
            const activeDoubtId = selectedDoubt?._id || (selectedDoubt as any)?.id;
            if (activeDoubtId) {
                fetchDoubtDetail(activeDoubtId, true);
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [token, page, statusFilter, subjectFilter, searchText, selectedDoubt?._id, (selectedDoubt as any)?.id]);

    // Send reply message
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        const doubtId = selectedDoubt?._id || (selectedDoubt as any)?.id;
        if (!token || !doubtId || !replyText.trim()) return;
        setIsSendingReply(true);
        try {
            const res = await fetch(`${API_URL}/api/doubts/${doubtId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: replyText.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setReplyText('');
                await fetchDoubtDetail(doubtId);
                fetchDoubts(true); // refresh list metadata
            }
        } catch (error) {
            console.error('Send reply error:', error);
        } finally {
            setIsSendingReply(false);
        }
    };

    // Toggle status
    const handleUpdateStatus = async (status: 'pending' | 'answered' | 'resolved') => {
        const doubtId = selectedDoubt?._id || (selectedDoubt as any)?.id;
        if (!token || !doubtId) return;
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`${API_URL}/api/doubts/${doubtId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                await fetchDoubtDetail(doubtId);
                fetchDoubts(true);
            }
        } catch (error) {
            console.error('Update status error:', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-6 flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Doubt Desk</h1>
                    <p className="text-sm text-slate-500">Monitor and resolve student subject-matter queries</p>
                </div>
                
                {/* Quick stats */}
                <div className="flex gap-4">
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col justify-center text-center min-w-[100px]">
                        <span className="text-xl font-bold text-slate-800">{totalDoubts}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 shadow-sm flex flex-col justify-center text-center min-w-[100px]">
                        <span className="text-xl font-bold text-amber-700">
                            {doubts.filter(d => d.status === 'pending').length}
                        </span>
                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Pending</span>
                    </div>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <input
                        type="text"
                        placeholder="Search student name, phone, or title..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-3 pr-3 h-10 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
                    />
                </div>

                <div className="w-full sm:w-44">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-10 px-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="answered">Answered</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>

                <div className="w-full sm:w-44">
                    <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="w-full h-10 px-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
                    >
                        <option value="">All Subjects</option>
                        {['Polity', 'Economy', 'Environment', 'Science & Technology', 'International Relations', 'History', 'Geography', 'Art & Culture', 'Social Issues', 'Security', 'Ethics', 'CSAT', 'General'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Desk workspace splits */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                {/* Left pane list: doubts queue */}
                <div className="lg:col-span-5 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[650px]">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                        Doubts Queue
                    </div>
                    
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-500 border-t-transparent" />
                            </div>
                        ) : (doubts || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                                <span className="text-3xl mb-2">📥</span>
                                <p className="text-sm font-medium">No doubts found matching filters</p>
                            </div>
                        ) : (
                            (doubts || []).map((doubt) => {
                                const isAnswered = doubt.status === 'answered';
                                const isResolved = doubt.status === 'resolved';
                                const badgeColor = isResolved
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : isAnswered
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200';
                                
                                const doubtId = doubt._id || (doubt as any).id;
                                const isSelected = (selectedDoubt?._id || (selectedDoubt as any)?.id) === doubtId;

                                return (
                                    <button
                                        key={doubtId}
                                        onClick={() => {
                                            setSelectedDoubt(doubt);
                                            fetchDoubtDetail(doubtId);
                                        }}
                                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col gap-2 ${
                                            isSelected ? 'bg-amber-50/30 border-l-4 border-amber-500 pl-3' : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] uppercase">
                                                    {doubt.subject}
                                                </span>
                                                {doubt.testSeriesUniqueId && (
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px] uppercase border border-indigo-100">
                                                        {doubt.testSeriesUniqueId}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${badgeColor}`}>
                                                {doubt.status}
                                            </span>
                                        </div>
                                        
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{doubt.title}</h4>
                                            <p className="text-slate-400 text-xs truncate mt-0.5">{doubt.description}</p>
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-1">
                                            <span>👤 {doubt.student?.name || 'Student'}</span>
                                            {doubt.testItemTitle && <span className="max-w-[120px] truncate text-indigo-600">🎯 {doubt.testItemTitle}</span>}
                                            <span>📅 {formatDisplayDate(doubt.createdAt)}</span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-between items-center">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 border border-slate-200 rounded bg-white text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-slate-500">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1 border border-slate-200 rounded bg-white text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Right pane: workspace thread */}
                <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[650px]">
                    {!selectedDoubt ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <span className="text-5xl mb-4">💬</span>
                            <h3 className="font-bold text-slate-700 text-sm">Workspace Active Desk</h3>
                            <p className="text-slate-400 text-xs mt-1 text-center max-w-xs">
                                Select a doubt ticket from the queue on the left to start corresponding with the student.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col h-full">
                            {/* Workspace Header */}
                            <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[10px] uppercase">
                                            {selectedDoubt.subject}
                                        </span>
                                        {selectedDoubt.testSeriesUniqueId && (
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px] uppercase border border-indigo-100">
                                                {selectedDoubt.testSeriesUniqueId}
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase ${
                                            selectedDoubt.status === 'resolved'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : selectedDoubt.status === 'answered'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                            {selectedDoubt.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{selectedDoubt.title}</h3>
                                    
                                    {/* Student Card */}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[10px] font-semibold">
                                        <span>Student: <strong>{selectedDoubt.student?.name || 'N/A'}</strong></span>
                                        {selectedDoubt.student?.phone && <span>📲 {selectedDoubt.student.phone}</span>}
                                        {selectedDoubt.student?.email && <span>📧 {selectedDoubt.student.email}</span>}
                                    </div>
                                </div>
                                
                                {/* Status controls */}
                                <div className="flex items-center gap-2">
                                    {selectedDoubt.status !== 'resolved' ? (
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus('resolved')}
                                            disabled={isUpdatingStatus}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                                        >
                                            Resolve
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus('pending')}
                                            disabled={isUpdatingStatus}
                                            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                                        >
                                            Reopen
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Thread area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                                {/* Context Info */}
                                {(selectedDoubt.testSeries || selectedDoubt.quiz || selectedDoubt.testSeriesUniqueId || selectedDoubt.testItemTitle) && (
                                    <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs text-slate-600">
                                        <p className="font-bold text-slate-800 mb-1">Attached Context:</p>
                                        {selectedDoubt.testSeriesUniqueId && <p><strong>Series ID:</strong> <span className="bg-indigo-50 text-indigo-700 font-bold px-1 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">{selectedDoubt.testSeriesUniqueId}</span></p>}
                                        {selectedDoubt.testSeries && <p><strong>Test Series Group:</strong> {selectedDoubt.testSeries.title}</p>}
                                        {selectedDoubt.testItemTitle && <p><strong>Test Paper:</strong> {selectedDoubt.testItemTitle}</p>}
                                        {selectedDoubt.quiz && <p><strong>Quiz:</strong> {selectedDoubt.quiz.title}</p>}
                                        {selectedDoubt.questionIndex !== undefined && (
                                            <p className="mt-1">
                                                <strong>Question #{selectedDoubt.questionIndex + 1}:</strong>{" "}
                                                <span className="italic block mt-0.5 text-slate-500 border-l-2 border-slate-200 pl-2">
                                                    "{selectedDoubt.questionText}"
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Initial query bubble */}
                                <div className="flex flex-col items-start">
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] text-xs shadow-sm">
                                        <p className="font-bold border-b border-slate-100 pb-1 mb-1.5 text-[10px] text-slate-500">
                                            {selectedDoubt.student?.name} (Original Doubt)
                                        </p>
                                        <p className="leading-relaxed whitespace-pre-line text-slate-700">{selectedDoubt.description}</p>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-semibold mt-1 pl-1">
                                        {formatDisplayDate(selectedDoubt.createdAt)}
                                    </span>
                                </div>

                                {/* Thread timeline */}
                                {(selectedDoubt.messages || []).map((msg, idx) => {
                                    const isStudent = msg.senderId === (selectedDoubt.student?._id || (selectedDoubt.student as any)?.id);
                                    const bubbleStyle = isStudent
                                        ? 'bg-white border border-slate-200 rounded-tl-none text-slate-700'
                                        : 'bg-amber-500 text-white rounded-tr-none shadow-md';
                                    
                                    const titleStyle = isStudent
                                        ? 'border-slate-100 text-slate-400'
                                        : 'border-white/10 text-white opacity-90';

                                    return (
                                        <div key={idx} className={`flex flex-col ${isStudent ? 'items-start' : 'items-end'}`}>
                                            <div className={`${bubbleStyle} rounded-2xl px-4 py-3 max-w-[85%] text-xs`}>
                                                <p className={`font-bold border-b pb-1 mb-1.5 text-[10px] ${titleStyle}`}>
                                                    {msg.senderName} {!isStudent && '🎓 (Mentor)'}
                                                </p>
                                                <p className="leading-relaxed whitespace-pre-line">{msg.message}</p>
                                            </div>
                                            <span className="text-[9px] text-slate-400 font-semibold mt-1 px-1">
                                                {formatDisplayDate(msg.createdAt)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply Console footer */}
                            <div className="border-t border-slate-200 p-4 bg-white mt-auto">
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <textarea
                                        rows={2}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type mentor response details..."
                                        className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none resize-none"
                                        required
                                        disabled={isSendingReply}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSendingReply || !replyText.trim()}
                                        className="w-16 h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center"
                                    >
                                        {isSendingReply ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span>Reply</span>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
