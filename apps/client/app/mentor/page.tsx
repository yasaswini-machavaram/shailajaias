'use client';

import { useState, useEffect } from 'react';
import { useMentorAuth } from './MentorAuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const NAV = [
    { id: 'roster', label: 'Roster' },
    { id: 'requests', label: 'Requests' },
    { id: 'chat', label: 'Chat' },
    { id: 'evaluation', label: 'Evaluation' },
    { id: 'broadcast', label: 'Broadcast' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'mentee', label: 'Mentee' },
];

const BC_FILTERS = ['All students', 'All inactive', 'Δ Log 1', 'Δ Log 2', 'Δ Log 3+', 'Δ Task 2', 'Δ Task 3+', 'Uploads pending', 'Mains qualified'];

export default function MentorDashboard() {
    const { user, token, logout } = useMentorAuth();

    const [activeTab, setActiveTab] = useState<string>('roster');

    // Roster state
    const [rosterData, setRosterData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [sortKey, setSortKey] = useState<string>('risk');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [showExtraCols, setShowExtraCols] = useState(false);

    // Requests state
    const [requestsList, setRequestsList] = useState<any[]>([]);
    const [requestsFilter, setRequestsFilter] = useState<'pending' | 'all' | 'reviewed'>('pending');
    const [isReviewingId, setIsReviewingId] = useState<string | null>(null);
    const [requestsSuccessMsg, setRequestsSuccessMsg] = useState<string>('');

    // Selected Mentee for Dossier
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    // Chat state
    const [chatFilter, setChatFilter] = useState<'All' | 'Starred'>('All');
    const [openThreadId, setOpenThreadId] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [starredThreads, setStarredThreads] = useState<Record<string, boolean>>({});

    // Evaluation state
    const [evalFilter, setEvalFilter] = useState<'All' | 'Pending' | 'Evaluated' | 'Open pool'>('Pending');
    const [evalSubmissions, setEvalSubmissions] = useState<any[]>([]);

    // Broadcast state
    const [bcFilter, setBcFilter] = useState<string>('All students');
    const [bcUncheckedMap, setBcUncheckedMap] = useState<Record<string, boolean>>({});
    const [bcMessage, setBcMessage] = useState('');
    const [bcConfirming, setBcConfirming] = useState(false);
    const [bcSentNote, setBcSentNote] = useState('');

    // Mentee Dossier Notes state
    const [sessionNoteInput, setSessionNoteInput] = useState('');
    const [internalNoteInput, setInternalNoteInput] = useState('');
    const [dossierData, setDossierData] = useState<any | null>(null);

    useEffect(() => {
        if (token) {
            fetchRoster();
            fetchEvaluations();
            fetchChats();
            fetchRequests();
        }
    }, [token]);

    useEffect(() => {
        if (!token || activeTab !== 'chat') return;
        fetchChats();
        if (!openThreadId && rosterData.length > 0) {
            setOpenThreadId(rosterData[0].id);
            if (!selectedStudent) setSelectedStudent(rosterData[0]);
        }
        const interval = setInterval(() => {
            fetchChats();
        }, 5000);
        return () => clearInterval(interval);
    }, [token, activeTab, openThreadId, rosterData]);

    const fetchRoster = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/roster`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRosterData(data.data || []);
                if (data.data?.length > 0) {
                    if (!selectedStudent) setSelectedStudent(data.data[0]);
                    if (!openThreadId) setOpenThreadId(data.data[0].id);
                }
            }
        } catch (e) {
            console.error('Fetch roster error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEvaluations = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/evaluation`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setEvalSubmissions(data.data || []);
            }
        } catch (e) {
            console.error('Fetch evaluations error:', e);
        }
    };

    const fetchChats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/chat`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setChatMessages(data.data || []);
            }
        } catch (e) {
            console.error('Fetch chats error:', e);
        }
    };

    const fetchDossier = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/mentee/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setDossierData(data.data);
                setInternalNoteInput(data.data.internalNote || '');
            }
        } catch (e) {
            console.error('Fetch dossier error:', e);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRequestsList(data.data || []);
            }
        } catch (e) {
            console.error('Fetch requests error:', e);
        }
    };

    const handleReviewRequest = async (requestId: string, action: 'approve' | 'reject' | 'acknowledge') => {
        setIsReviewingId(requestId);
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/requests/${requestId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (data.success) {
                setRequestsSuccessMsg(data.message || `Request ${action}d successfully`);
                fetchRequests();
                fetchRoster();
                setTimeout(() => setRequestsSuccessMsg(''), 4000);
            }
        } catch (e) {
            console.error('Review request error:', e);
        } finally {
            setIsReviewingId(null);
        }
    };

    const handleSendMentorChat = async () => {
        if (!chatInput.trim() || !openThreadId) return;
        const text = chatInput.trim();
        setChatInput('');

        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ studentId: openThreadId, text }),
            });
            const data = await res.json();
            if (data.success && data.data) {
                setChatMessages((prev) => [...prev, data.data]);
            } else {
                fetchChats();
            }
        } catch (e) {
            console.error('Send mentor chat error:', e);
            fetchChats();
        }
    };

    const handleSendBroadcast = async () => {
        if (!bcMessage.trim()) return;
        const recipientIds = rosterData.filter((r) => !bcUncheckedMap[r.id]).map((r) => r.id);

        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ recipientIds, filterTag: bcFilter, message: bcMessage.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setBcConfirming(false);
                setBcMessage('');
                setBcSentNote(`Broadcast sent to ${recipientIds.length} students.`);
            }
        } catch (e) {
            console.error('Send broadcast error:', e);
        }
    };

    const handleTagInactive = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/tag-inactive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ studentId }),
            });
            const data = await res.json();
            if (data.success) {
                fetchRoster();
            }
        } catch (e) {
            console.error('Tag inactive error:', e);
        }
    };

    const handleSaveMenteeNotes = async () => {
        if (!selectedStudent) return;
        try {
            const res = await fetch(`${API_URL}/api/mentor-portal/mentee/${selectedStudent.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    sessionNote: sessionNoteInput.trim() ? { text: sessionNoteInput.trim() } : undefined,
                    internalNote: internalNoteInput.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSessionNoteInput('');
                fetchDossier(selectedStudent.id);
            }
        } catch (e) {
            console.error('Save mentee notes error:', e);
        }
    };

    // Filter and Sort Roster
    const filteredRoster = rosterData.filter((r) => {
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch = !term ||
            (r.name && r.name.toLowerCase().includes(term)) ||
            (r.displayName && r.displayName.toLowerCase().includes(term)) ||
            (r.id && r.id.toLowerCase().includes(term)) ||
            (r.phone && r.phone.includes(term)) ||
            (r.email && r.email.toLowerCase().includes(term));
        if (filterStatus === 'Not logged 7d+' && r.deltaLog < 7) return false;
        if (filterStatus === 'Tasks stalled 5d+' && r.deltaTasks < 5) return false;
        if (filterStatus === 'Uploads pending' && r.uploadsPending === 0) return false;
        return matchesSearch;
    });

    const sortedRoster = [...filteredRoster].sort((a, b) => {
        const sign = sortDir === 'desc' ? -1 : 1;
        if (sortKey === 'risk') return sign * (b.deltaTasks + b.deltaLog - (a.deltaTasks + a.deltaLog));
        if (sortKey === 'name') return sign * a.name.localeCompare(b.name);
        if (sortKey === 'deltaTasks') return sign * (a.deltaTasks - b.deltaTasks);
        if (sortKey === 'deltaLog') return sign * (a.deltaLog - b.deltaLog);
        return 0;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3A5F]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#1E293B] font-sans flex">
            {/* Left Sidebar Navigation */}
            <aside className="w-64 bg-[#1E3A5F] text-white p-6 flex-shrink-0 flex flex-col justify-between shadow-lg">
                <div className="space-y-6">
                    <div>
                        <h1 className="font-serif text-xl font-bold text-amber-400">ShailajaIAS</h1>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">MENTOR PORTAL</span>
                    </div>

                    {/* Nav Items */}
                    <nav className="space-y-1.5">
                        {NAV.map((n) => {
                            const on = activeTab === n.id;
                            const pendingReqCount = requestsList.filter((r) => r.status === 'pending').length;
                            return (
                                <button
                                    key={n.id}
                                    onClick={() => {
                                        setActiveTab(n.id);
                                        if (n.id === 'mentee' && selectedStudent) fetchDossier(selectedStudent.id);
                                        if (n.id === 'requests') fetchRequests();
                                        if (n.id === 'chat') {
                                            fetchChats();
                                            if (!openThreadId && rosterData.length > 0) {
                                                setOpenThreadId(rosterData[0].id);
                                                if (!selectedStudent) setSelectedStudent(rosterData[0]);
                                            }
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                        on
                                            ? 'bg-amber-500 text-white shadow-sm font-bold'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    <span>{n.label}</span>
                                    {n.id === 'requests' && pendingReqCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                                            {pendingReqCount}
                                        </span>
                                    )}
                                    {n.id === 'chat' && chatMessages.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold">{chatMessages.length}</span>
                                    )}
                                    {n.id === 'evaluation' && evalSubmissions.filter((s) => s.status !== 'evaluated').length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold">
                                            {evalSubmissions.filter((s) => s.status !== 'evaluated').length}
                                        </span>
                                    )}
                                    {n.id === 'analytics' && rosterData.filter((r) => r.deltaTasks >= 5 || r.deltaLog >= 7).length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold">
                                            {rosterData.filter((r) => r.deltaTasks >= 5 || r.deltaLog >= 7).length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="pt-4 border-t border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="truncate pr-2">
                            <p className="text-xs font-bold text-white truncate">{user?.name || 'Mentor'}</p>
                            <p className="text-[10px] text-slate-300 truncate">{user?.email}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                        </span>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 transition-all shadow-xs"
                    >
                        <span>⎋</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Right Main Body Content */}
            <main className="flex-1 p-8 space-y-6 overflow-x-hidden bg-[#FAFAF8]">
                {/* ----------------- 1. ROSTER MODULE ----------------- */}
                {activeTab === 'roster' && (
                    <div className="space-y-6">
                        {/* Header & KPI Summary */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-[#1d3557]">Student Roster</h2>
                                <p className="text-xs text-[#6f6754]">Full student roster with plan position, lapse counters, and upload state.</p>
                            </div>
                            <button
                                onClick={() => setShowExtraCols(!showExtraCols)}
                                className="px-4 py-2 bg-[#fdfbf6] border border-[#ddd4c1] rounded-xl text-xs font-bold text-[#4a4437] hover:bg-[#efe9dc]"
                            >
                                {showExtraCols ? 'Hide 3 columns' : 'Show 3 more columns'}
                            </button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#8a3b2e] uppercase">NOT LOGGED 7 DAYS+</span>
                                <p className="text-2xl font-bold text-[#8a3b2e] mt-1">
                                    {rosterData.filter((r) => r.deltaLog >= 7).length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#8a3b2e] uppercase">TASKS STALLED 5 DAYS+</span>
                                <p className="text-2xl font-bold text-[#8a3b2e] mt-1">
                                    {rosterData.filter((r) => r.deltaTasks >= 5).length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#6f6754] uppercase">UPLOADS PENDING</span>
                                <p className="text-2xl font-bold text-[#221f1a] mt-1">
                                    {rosterData.reduce((a, r) => a + (r.uploadsPending || 0), 0)}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#6f6754] uppercase">EVALUATED TO DATE</span>
                                <p className="text-2xl font-bold text-[#221f1a] mt-1">
                                    {rosterData.reduce((a, r) => a + (r.evaluated || 0), 0)}
                                </p>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <input
                                type="text"
                                placeholder="Search by name or student ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80 px-4 py-2 bg-[#efe9dc] border border-[#ddd4c1] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1d3557]"
                            />

                            <div className="flex items-center gap-2 overflow-x-auto">
                                {['All', 'Not logged 7d+', 'Tasks stalled 5d+', 'Uploads pending'].map((label) => {
                                    const on = filterStatus === label;
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => setFilterStatus(label)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                on ? 'bg-[#1d3557] text-[#f7f4ec]' : 'bg-[#efe9dc] text-[#4a4437] hover:bg-[#e3dac6]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Excel-style Table View */}
                        <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#efe9dc] border-b border-[#ddd4c1] text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">
                                            <th className="py-3 px-4 cursor-pointer" onClick={() => { setSortKey('risk'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}>
                                                ID / Risk ↓
                                            </th>
                                            <th className="py-3 px-4">Name</th>
                                            <th className="py-3 px-4">Start Date</th>
                                            <th className="py-3 px-4">Current Position</th>
                                            <th className="py-3 px-4 text-right cursor-pointer" onClick={() => { setSortKey('deltaTasks'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}>
                                                Δ Tasks
                                            </th>
                                            <th className="py-3 px-4 text-right cursor-pointer" onClick={() => { setSortKey('deltaLog'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}>
                                                Δ Log
                                            </th>
                                            <th className="py-3 px-4 text-right">Pending</th>
                                            <th className="py-3 px-4 text-right">Evaluated</th>
                                            <th className="py-3 px-4">Subjects</th>
                                            {showExtraCols && <th className="py-3 px-4">Optional</th>}
                                            {showExtraCols && <th className="py-3 px-4 text-right">Attempts</th>}
                                            {showExtraCols && <th className="py-3 px-4">Mains</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee6d4] text-xs">
                                        {sortedRoster.length === 0 ? (
                                            <tr>
                                                <td colSpan={showExtraCols ? 12 : 9} className="py-12 text-center text-[#6f6754] text-xs">
                                                    No students found matching your criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedRoster.map((r) => (
                                            <tr
                                                key={r.id}
                                                onClick={() => {
                                                    setSelectedStudent(r);
                                                    setActiveTab('mentee');
                                                    fetchDossier(r.id);
                                                }}
                                                className="hover:bg-[#efe9dc]/60 cursor-pointer transition-colors"
                                            >
                                                <td className="py-3.5 px-4 font-bold text-[#1d3557]">{r.id.slice(-6)}</td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-[#221f1a]">
                                                        {r.displayName && r.displayName !== 'Student' ? r.displayName : (r.phone ? `Student (${r.phone})` : r.name)}
                                                    </div>
                                                    {r.phone && (
                                                        <span className="text-[11px] text-[#6f6754] font-mono block">
                                                            📱 {r.phone}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-[#6f6754]">{r.startDate}</td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-bold text-[#221f1a]">{r.posSubject}</span>
                                                    <span className="text-[10px] text-[#6f6754] block">{r.posTasks}</span>
                                                </td>
                                                <td className={`py-3.5 px-4 text-right font-bold ${r.deltaTasks >= 5 ? 'text-[#8a3b2e]' : 'text-[#221f1a]'}`}>
                                                    {r.deltaTasks} d
                                                </td>
                                                <td className={`py-3.5 px-4 text-right font-bold ${r.deltaLog >= 7 ? 'text-[#8a3b2e]' : 'text-[#221f1a]'}`}>
                                                    {r.deltaLog} d
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-bold text-[#221f1a]">{r.uploadsPending}</td>
                                                <td className="py-3.5 px-4 text-right text-[#6f6754]">{r.evaluated}</td>
                                                <td className="py-3.5 px-4 font-bold text-[#221f1a]">{r.subjects}</td>
                                                {showExtraCols && <td className="py-3.5 px-4 text-[#6f6754]">{r.optional}</td>}
                                                {showExtraCols && <td className="py-3.5 px-4 text-right text-[#6f6754]">{r.attempts}</td>}
                                                {showExtraCols && <td className="py-3.5 px-4 text-[#6f6754]">{r.mains}</td>}
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- 2. REQUESTS & APPROVALS MODULE ----------------- */}
                {activeTab === 'requests' && (
                    <div className="space-y-6">
                        {/* Header & Refresh */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-[#1d3557]">Student Requests &amp; Approvals</h2>
                                <p className="text-xs text-[#6f6754]">
                                    Review student requests for study breaks, subject sequence reordering, and view subject pause intimations.
                                </p>
                            </div>
                            <button
                                onClick={fetchRequests}
                                className="px-4 py-2 bg-[#fdfbf6] border border-[#ddd4c1] rounded-xl text-xs font-bold text-[#4a4437] hover:bg-[#efe9dc] flex items-center gap-1.5 transition-colors"
                            >
                                <span>↻</span> Refresh Requests
                            </button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#8a3b2e] uppercase">PENDING ACTION</span>
                                <p className="text-2xl font-bold text-[#8a3b2e] mt-1">
                                    {requestsList.filter((r) => r.status === 'pending').length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-amber-700 uppercase">BREAK REQUESTS</span>
                                <p className="text-2xl font-bold text-[#221f1a] mt-1">
                                    {requestsList.filter((r) => r.type === 'break' && r.status === 'pending').length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-indigo-700 uppercase">REORDER REQUESTS</span>
                                <p className="text-2xl font-bold text-[#221f1a] mt-1">
                                    {requestsList.filter((r) => r.type === 'reorder' && r.status === 'pending').length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase">RESOLVED / ACK</span>
                                <p className="text-2xl font-bold text-emerald-800 mt-1">
                                    {requestsList.filter((r) => r.status !== 'pending').length}
                                </p>
                            </div>
                        </div>

                        {/* Success Notice Banner */}
                        {requestsSuccessMsg && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between">
                                <span>✓ {requestsSuccessMsg}</span>
                                <button onClick={() => setRequestsSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
                            </div>
                        )}

                        {/* Filter Bar */}
                        <div className="flex items-center gap-2">
                            {[
                                { id: 'pending', label: `Pending (${requestsList.filter((r) => r.status === 'pending').length})` },
                                { id: 'all', label: `All Requests (${requestsList.length})` },
                                { id: 'reviewed', label: `History (${requestsList.filter((r) => r.status !== 'pending').length})` },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setRequestsFilter(f.id as any)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        requestsFilter === f.id ? 'bg-[#1d3557] text-[#f7f4ec]' : 'bg-[#efe9dc] text-[#4a4437] hover:bg-[#e3dac6]'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Requests List */}
                        <div className="space-y-4">
                            {requestsList
                                .filter((r) => {
                                    if (requestsFilter === 'pending') return r.status === 'pending';
                                    if (requestsFilter === 'reviewed') return r.status !== 'pending';
                                    return true;
                                })
                                .length === 0 ? (
                                <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-12 text-center space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-[#efe9dc] text-[#1d3557] flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                                    <h3 className="font-serif font-bold text-base text-[#1d3557]">No requests in this view</h3>
                                    <p className="text-xs text-[#6f6754]">All student requests have been processed or none are currently pending.</p>
                                </div>
                            ) : (
                                requestsList
                                    .filter((r) => {
                                        if (requestsFilter === 'pending') return r.status === 'pending';
                                        if (requestsFilter === 'reviewed') return r.status !== 'pending';
                                        return true;
                                    })
                                    .map((req) => {
                                        const isPending = req.status === 'pending';
                                        const studentName = req.student?.name && req.student?.name !== 'Student' 
                                            ? req.student.name 
                                            : (req.student?.phone ? `Student (${req.student.phone})` : (req.student?.name || 'Student'));
                                        const studentEmail = req.student?.email || '';
                                        const studentPhone = req.student?.phone || '';
                                        const studentStatus = req.student?.mentorshipAccountStatus || 'active';

                                        return (
                                            <div
                                                key={req._id}
                                                className={`bg-[#fdfbf6] border rounded-3xl p-6 shadow-xs space-y-4 transition-all ${
                                                    isPending ? 'border-[#1d3557]/40 ring-1 ring-[#1d3557]/10' : 'border-[#ddd4c1]'
                                                }`}
                                            >
                                                {/* Card Header */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#eee6d4]">
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <span className="font-serif font-bold text-base text-[#1d3557]">{studentName}</span>
                                                        {studentPhone && <span className="text-xs text-[#6f6754] font-mono">📱 {studentPhone}</span>}
                                                        {studentEmail && <span className="text-xs text-[#6f6754]">({studentEmail})</span>}
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                studentStatus === 'break'
                                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            }`}
                                                        >
                                                            {studentStatus === 'break' ? 'On Break' : 'Active'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {/* Type Badge */}
                                                        {req.type === 'break' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                                                🌴 Study Break Request
                                                            </span>
                                                        )}
                                                        {req.type === 'reorder' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                                🔀 Subject Reorder Request
                                                            </span>
                                                        )}
                                                        {req.type === 'pause_intimation' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                                                ⏸ Subject Paused (Intimation)
                                                            </span>
                                                        )}

                                                        {/* Status Badge */}
                                                        {req.status === 'pending' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse">
                                                                Pending Review
                                                            </span>
                                                        )}
                                                        {req.status === 'approved' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                ✓ Approved
                                                            </span>
                                                        )}
                                                        {req.status === 'rejected' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                                ✕ Rejected
                                                            </span>
                                                        )}
                                                        {req.status === 'acknowledged' && (
                                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                                                ✓ Acknowledged
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Break Details */}
                                                {req.type === 'break' && (
                                                    <div className="space-y-2 text-xs">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#efe9dc]/50 p-4 rounded-2xl">
                                                            <div>
                                                                <span className="text-[10px] font-bold text-[#6f6754] uppercase block">Requested Duration</span>
                                                                <span className="font-bold text-[#1d3557] text-sm">
                                                                    {req.requestedBreakDays || req.details?.requestedBreakDays || 7} Days
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold text-[#6f6754] uppercase block">Date Requested</span>
                                                                <span className="font-medium text-[#221f1a]">
                                                                    {new Date(req.createdAt).toLocaleDateString('en-IN', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {req.reason && (
                                                                <div className="sm:col-span-2">
                                                                    <span className="text-[10px] font-bold text-[#6f6754] uppercase block">Student Reason / Note</span>
                                                                    <p className="text-xs text-[#221f1a] italic bg-[#fdfbf6] p-2.5 rounded-xl border border-[#ddd4c1] mt-1">
                                                                        &ldquo;{req.reason}&rdquo;
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-[#6f6754]">
                                                            ℹ Approving will update the student's status to <strong>ON BREAK</strong> and notify them in chat.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Reorder Details */}
                                                {req.type === 'reorder' && (
                                                    <div className="space-y-3 text-xs">
                                                        <div className="bg-[#efe9dc]/50 p-4 rounded-2xl space-y-2">
                                                            <span className="text-[10px] font-bold text-[#6f6754] uppercase block">Proposed New Course / Subject Sequence</span>
                                                            {req.details?.proposedOrder && req.details.proposedOrder.length > 0 ? (
                                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                                    {req.details.proposedOrder.map((subjId: string, idx: number) => {
                                                                        const displayName = req.details?.namesMap?.[subjId] || subjId;
                                                                        return (
                                                                            <div key={subjId} className="flex items-center gap-1.5">
                                                                                <span className="px-3 py-1.5 bg-[#fdfbf6] border border-[#ddd4c1] rounded-xl font-bold text-xs text-[#1d3557] shadow-xs">
                                                                                    <span className="text-[#8a3b2e] mr-1">#{idx + 1}</span> {displayName}
                                                                                </span>
                                                                                {idx < req.details.proposedOrder.length - 1 && (
                                                                                    <span className="text-[#6f6754] font-bold">→</span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-[#6f6754]">Custom sequence proposed.</p>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-[#6f6754]">
                                                            ℹ Approving will update the student's roadmap and carousel task cards to this exact sequence.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Pause Intimation Details */}
                                                {req.type === 'pause_intimation' && (
                                                    <div className="space-y-2 text-xs">
                                                        <div className="bg-[#efe9dc]/50 p-4 rounded-2xl space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-[#6f6754] uppercase">Subject Paused</span>
                                                                <span className="font-bold text-[#8a3b2e] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                                                    {req.details?.subjectName || 'Current Module'}
                                                                </span>
                                                            </div>
                                                            {req.reason && (
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-[#6f6754] uppercase block">Reason</span>
                                                                    <p className="text-xs text-[#221f1a] italic bg-[#fdfbf6] p-2.5 rounded-xl border border-[#ddd4c1] mt-1">
                                                                        &ldquo;{req.reason}&rdquo;
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-[#6f6754]">
                                                            ℹ Student has paused this subject. They can resume anytime from their Roadmap dashboard.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Action Buttons for Pending */}
                                                {isPending && (
                                                    <div className="flex items-center justify-end gap-3 pt-2">
                                                        <button
                                                            disabled={isReviewingId === req._id}
                                                            onClick={() => handleReviewRequest(req._id, 'reject')}
                                                            className="px-4 py-2 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                                        >
                                                            {isReviewingId === req._id ? 'Processing...' : 'Reject Request'}
                                                        </button>
                                                        <button
                                                            disabled={isReviewingId === req._id}
                                                            onClick={() => handleReviewRequest(req._id, 'approve')}
                                                            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            <span>✓</span>
                                                            <span>
                                                                {isReviewingId === req._id
                                                                    ? 'Approving...'
                                                                    : req.type === 'pause_intimation'
                                                                    ? 'Acknowledge'
                                                                    : 'Approve Request'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                {!isPending && req.reviewedAt && (
                                                    <div className="pt-2 text-right text-[10px] text-[#6f6754]">
                                                        Reviewed on{' '}
                                                        {new Date(req.reviewedAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                )}

                {/* ----------------- 3. CHAT MODULE ----------------- */}
                {activeTab === 'chat' && (
                    <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[520px]">
                        {/* Threads Sidebar */}
                        <div className="border-r border-[#ddd4c1] bg-[#efe9dc] p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-[#ddd4c1] pb-2">
                                <h4 className="text-xs font-bold text-[#6f6754] uppercase tracking-wider">STUDENT THREADS</h4>
                                <div className="flex gap-1">
                                    <button onClick={() => setChatFilter('All')} className={`text-[10px] font-bold px-2 py-0.5 rounded ${chatFilter === 'All' ? 'bg-[#1d3557] text-white' : 'text-[#6f6754]'}`}>All</button>
                                    <button onClick={() => setChatFilter('Starred')} className={`text-[10px] font-bold px-2 py-0.5 rounded ${chatFilter === 'Starred' ? 'bg-[#1d3557] text-white' : 'text-[#6f6754]'}`}>Starred</button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[420px] overflow-y-auto">
                                {rosterData
                                    .filter((r) => chatFilter === 'All' || starredThreads[r.id])
                                    .map((r) => {
                                        const on = r.id === openThreadId;
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    setOpenThreadId(r.id);
                                                    setSelectedStudent(r);
                                                }}
                                                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                                                    on ? 'bg-[#fdfbf6] border-[#1d3557] shadow-xs' : 'border-transparent hover:bg-[#e3dac6]'
                                                }`}
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-[#221f1a]">
                                                        {r.displayName && r.displayName !== 'Student' ? r.displayName : (r.phone ? `Student (${r.phone})` : r.name)}
                                                    </p>
                                                    <p className="text-[10px] text-[#6f6754]">{r.posSubject} • {r.posTasks}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setStarredThreads((p) => ({ ...p, [r.id]: !p[r.id] }));
                                                    }}
                                                    className="text-xs text-amber-600 font-bold"
                                                >
                                                    {starredThreads[r.id] ? '★' : '☆'}
                                                </button>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Live Chat Panel */}
                        <div className="md:col-span-2 flex flex-col justify-between p-6 space-y-4">
                            <div className="border-b border-[#eee6d4] pb-3 flex items-center justify-between">
                                <div>
                                    <h3 className="font-serif font-bold text-base text-[#1d3557]">
                                        {(() => {
                                            const r = rosterData.find((x) => x.id === openThreadId);
                                            if (!r) return 'Select Student';
                                            return r.displayName && r.displayName !== 'Student' ? r.displayName : (r.phone ? `Student (${r.phone})` : r.name);
                                        })()}
                                    </h3>
                                    <p className="text-[10px] text-[#6f6754]">Assigned Mentee Thread</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const r = rosterData.find((x) => x.id === openThreadId);
                                        if (r) {
                                            setSelectedStudent(r);
                                            setActiveTab('mentee');
                                            fetchDossier(r.id);
                                        }
                                    }}
                                    className="text-xs text-[#1d3557] hover:underline font-bold"
                                >
                                    Open Mentee Dossier ↗
                                </button>
                            </div>

                            {/* Messages List */}
                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-2">
                                {(() => {
                                    const threadMessages = chatMessages.filter(
                                        (m) => String(m.student?._id || m.student || '') === String(openThreadId)
                                    );
                                    if (threadMessages.length === 0) {
                                        return (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8f8876]">
                                                <p className="text-xs font-medium">No messages in this mentee thread yet.</p>
                                                <p className="text-[11px] mt-1 text-[#6f6754]">Send a message to reach out to this mentee.</p>
                                            </div>
                                        );
                                    }
                                    return threadMessages.map((m, idx) => {
                                        if (m.senderRole === 'system') {
                                            return (
                                                <div key={idx} className="flex justify-center my-2">
                                                    <div className="bg-[#ede7d9] text-[#554e41] text-[11px] px-3.5 py-1.5 rounded-full border border-[#ddd4c1] max-w-[85%] text-center">
                                                        🔔 {m.text}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        const mine = m.senderRole === 'mentor';
                                        return (
                                            <div key={idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                                        mine
                                                            ? 'bg-[#1d3557] text-white rounded-br-xs'
                                                            : 'bg-[#efe9dc] text-[#221f1a] rounded-bl-xs border border-[#ddd4c1]'
                                                    }`}
                                                >
                                                    <p>{m.text}</p>
                                                    <span className={`text-[9px] mt-1 block text-right ${mine ? 'text-white/70' : 'text-[#6f6754]'}`}>
                                                        {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Reply Input */}
                            <div className="flex items-center gap-3 pt-3 border-t border-[#eee6d4]">
                                <input
                                    type="text"
                                    placeholder="Type response to mentee..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendMentorChat();
                                    }}
                                    className="flex-1 px-4 py-3 bg-[#efe9dc] border border-[#ddd4c1] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#1d3557]"
                                />
                                <button
                                    onClick={handleSendMentorChat}
                                    className="bg-[#1d3557] hover:bg-[#152c4a] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-sm"
                                >
                                    Send Reply
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- 3. EVALUATION MODULE ----------------- */}
                {activeTab === 'evaluation' && (
                    <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-[#1d3557]">Evaluation Desk</h2>
                                <p className="text-xs text-[#6f6754]">Uploads awaiting marks, remarks, and model-answer links.</p>
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-2">
                                {['All', 'Pending', 'Evaluated', 'Open pool'].map((label) => {
                                    const on = evalFilter === label;
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => setEvalFilter(label as any)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                on ? 'bg-[#1d3557] text-[#f7f4ec]' : 'bg-[#efe9dc] text-[#4a4437] hover:bg-[#e3dac6]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Copies Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#efe9dc] border-b border-[#ddd4c1] text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">
                                        <th className="py-3 px-4">Student</th>
                                        <th className="py-3 px-4">Test &amp; Subject</th>
                                        <th className="py-3 px-4">Uploaded</th>
                                        <th className="py-3 px-4">Assigned Evaluator</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee6d4] text-xs">
                                    {(() => {
                                        const filteredSubs = evalSubmissions.filter((sub) => {
                                            if (evalFilter === 'Pending') return sub.status !== 'evaluated';
                                            if (evalFilter === 'Evaluated') return sub.status === 'evaluated';
                                            if (evalFilter === 'Open pool') return !sub.mentor;
                                            return true;
                                        });

                                        if (filteredSubs.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-[#6f6754] text-xs">
                                                        No test copies found in this category.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filteredSubs.map((sub) => {
                                            const studentName = sub.student?.name || 'Student';
                                            const testName = sub.testTitle || 'Mains Practice Test';
                                            const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
                                            const evaluatorName = sub.mentor?.name || 'Unassigned (Open pool)';
                                            const isEvaluated = sub.status === 'evaluated';

                                            return (
                                                <tr key={sub._id} className="hover:bg-[#efe9dc]/50">
                                                    <td className="py-3.5 px-4 font-bold text-[#221f1a]">{studentName}</td>
                                                    <td className="py-3.5 px-4 font-semibold text-[#1d3557]">{testName}</td>
                                                    <td className="py-3.5 px-4 text-[#6f6754]">{dateStr}</td>
                                                    <td className="py-3.5 px-4 font-bold text-[#4a4437]">{evaluatorName}</td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                            isEvaluated
                                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 border-amber-200'
                                                        }`}>
                                                            {isEvaluated ? 'Evaluated' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        {sub.answerSheetUrls?.[0] ? (
                                                            <a
                                                                href={sub.answerSheetUrls[0]}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 bg-[#1d3557] text-white text-[11px] font-bold rounded-lg hover:bg-[#152c4a] inline-block shadow-xs"
                                                            >
                                                                Open Sheet ↗
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-[#6f6754]">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ----------------- 4. BROADCAST MODULE ----------------- */}
                {activeTab === 'broadcast' && (
                    <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-[#1d3557]">Broadcast Notice</h2>
                            <p className="text-xs text-[#6f6754]">Send a notice, test schedule, or reading list to a batch or filtered roster.</p>
                        </div>

                        {bcSentNote && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold">
                                ✓ {bcSentNote}
                            </div>
                        )}

                        {/* Recipient Filter Pills */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">TARGET AUDIENCE FILTER</span>
                            <div className="flex flex-wrap gap-2">
                                {BC_FILTERS.map((label) => {
                                    const on = bcFilter === label;
                                    return (
                                        <button
                                            key={label}
                                            onClick={() => setBcFilter(label)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                on ? 'bg-[#1d3557] text-[#f7f4ec]' : 'bg-[#efe9dc] text-[#4a4437] hover:bg-[#e3dac6]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Compose Textarea */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">NOTICE MESSAGE CONTENT</span>
                            <textarea
                                rows={5}
                                placeholder="Type notice for students..."
                                value={bcMessage}
                                onChange={(e) => setBcMessage(e.target.value)}
                                className="w-full p-4 bg-[#efe9dc] border border-[#ddd4c1] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#1d3557]"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-[#6f6754] font-semibold">{bcMessage.length} characters</span>
                            <button
                                onClick={() => {
                                    if (bcMessage.trim()) setBcConfirming(true);
                                }}
                                disabled={!bcMessage.trim()}
                                className="px-6 py-3 bg-[#1d3557] text-white text-xs font-bold rounded-2xl hover:bg-[#152c4a] disabled:opacity-50 shadow-sm"
                            >
                                Send Broadcast Notice ↗
                            </button>
                        </div>
                    </div>
                )}

                {/* ----------------- 5. ANALYTICS MODULE ----------------- */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-[#1d3557]">Cohort Analytics &amp; Risk Review</h2>
                            <p className="text-xs text-[#6f6754]">Cohort trends, score distributions, and inactive student reviews pending sign-off.</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#6f6754] uppercase">TOTAL ASSIGNED</span>
                                <p className="text-2xl font-bold text-[#221f1a] mt-1">{rosterData.length}</p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase">ACTIVE COHORT</span>
                                <p className="text-2xl font-bold text-emerald-800 mt-1">
                                    {rosterData.filter((r) => r.deltaLog < 7 && r.deltaTasks < 5).length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-amber-800 uppercase">PROBABLE INACTIVE</span>
                                <p className="text-2xl font-bold text-amber-800 mt-1">
                                    {rosterData.filter((r) => r.deltaLog >= 7 || r.deltaTasks >= 5).length}
                                </p>
                            </div>
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-5">
                                <span className="text-[10px] font-bold text-[#8a3b2e] uppercase">TAGGED INACTIVE</span>
                                <p className="text-2xl font-bold text-[#8a3b2e] mt-1">
                                    {rosterData.filter((r) => r.isTaggedInactive).length}
                                </p>
                            </div>
                        </div>

                        {/* At-Risk Review Table */}
                        <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-2xl p-6 shadow-sm space-y-4">
                            <h4 className="text-sm font-serif font-bold text-[#1d3557]">Probable Inactive Students (Pending Mentor Review)</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#efe9dc] border-b border-[#ddd4c1] text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">
                                            <th className="py-3 px-4">Student</th>
                                            <th className="py-3 px-4">Position</th>
                                            <th className="py-3 px-4 text-right">Δ Tasks</th>
                                            <th className="py-3 px-4 text-right">Δ Log</th>
                                            <th className="py-3 px-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee6d4] text-xs">
                                        {(() => {
                                            const atRisk = rosterData.filter((r) => r.deltaTasks >= 5 || r.deltaLog >= 7);
                                            if (atRisk.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={5} className="py-12 text-center text-[#6f6754] text-xs">
                                                            ✓ No students currently at risk (all students are actively logging tasks and study hours).
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            return atRisk.map((r) => (
                                                <tr key={r.id} className="hover:bg-[#efe9dc]/50">
                                                    <td className="py-3.5 px-4 font-bold text-[#221f1a]">
                                                        <div>{r.displayName && r.displayName !== 'Student' ? r.displayName : (r.phone ? `Student (${r.phone})` : r.name)}</div>
                                                        {r.phone && <span className="text-[10px] text-[#6f6754] font-mono block">📱 {r.phone}</span>}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-[#6f6754]">{r.posSubject} • {r.posTasks}</td>
                                                    <td className="py-3.5 px-4 text-right font-bold text-[#8a3b2e]">{r.deltaTasks} d</td>
                                                    <td className="py-3.5 px-4 text-right font-bold text-[#8a3b2e]">{r.deltaLog} d</td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        {r.isTaggedInactive ? (
                                                            <span className="text-[10px] font-bold text-[#8a3b2e] bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                                                                Tagged Inactive
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleTagInactive(r.id)}
                                                                className="px-3 py-1 bg-red-100 text-red-800 text-[11px] font-bold rounded-lg hover:bg-red-200 border border-red-200"
                                                            >
                                                                Tag Inactive
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- 6. MENTEE DOSSIER MODULE ----------------- */}
                {activeTab === 'mentee' && (
                    !selectedStudent ? (
                        <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-12 text-center space-y-3">
                            <h3 className="font-serif font-bold text-base text-[#1d3557]">No Mentee Selected</h3>
                            <p className="text-xs text-[#6f6754]">
                                Please select a student from the Student Roster tab to inspect their dossier, logged hours, and session notes.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header Banner */}
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">STUDENT DOSSIER</span>
                                    <h2 className="text-2xl font-serif font-bold text-[#1d3557]">
                                        {selectedStudent.displayName && selectedStudent.displayName !== 'Student' ? selectedStudent.displayName : (selectedStudent.phone ? `Student (${selectedStudent.phone})` : selectedStudent.name)}
                                    </h2>
                                    <p className="text-xs text-[#6f6754]">
                                        ID: {selectedStudent.id} {selectedStudent.phone ? `• 📱 ${selectedStudent.phone}` : ''} • Joined: {selectedStudent.startDate} {selectedStudent.email ? `• ${selectedStudent.email}` : ''}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                                        {selectedStudent.posSubject} • {selectedStudent.posTasks}
                                    </span>
                                </div>
                            </div>

                            {/* Session Notes Composer */}
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm space-y-4">
                                <h4 className="text-sm font-serif font-bold text-[#1d3557]">1-on-1 Session Note Composer</h4>
                                <textarea
                                    rows={3}
                                    placeholder="Add summary after 1-on-1 mentor session (visible to student on their dashboard)..."
                                    value={sessionNoteInput}
                                    onChange={(e) => setSessionNoteInput(e.target.value)}
                                    className="w-full p-3 bg-[#efe9dc] border border-[#ddd4c1] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#1d3557]"
                                />
                                <h4 className="text-sm font-serif font-bold text-[#1d3557]">Internal Private Mentor Note (Mentors Only)</h4>
                                <textarea
                                    rows={2}
                                    placeholder="Internal private observations (not shared with student)..."
                                    value={internalNoteInput}
                                    onChange={(e) => setInternalNoteInput(e.target.value)}
                                    className="w-full p-3 bg-[#efe9dc] border border-[#ddd4c1] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#1d3557]"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveMenteeNotes}
                                        className="px-6 py-2.5 bg-[#1d3557] text-white text-xs font-bold rounded-xl hover:bg-[#152c4a] shadow-xs"
                                    >
                                        Save Notes to MongoDB ↗
                                    </button>
                                </div>
                            </div>

                            {/* Past Session Notes */}
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm space-y-4">
                                <h4 className="text-sm font-serif font-bold text-[#1d3557]">Logged 1-on-1 Session Notes</h4>
                                {dossierData?.sessionNotes && dossierData.sessionNotes.length > 0 ? (
                                    <div className="space-y-3">
                                        {dossierData.sessionNotes.map((note: any, idx: number) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-[#efe9dc]/50 border border-[#ddd4c1] space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-[#1d3557]">1-on-1 Review Note</span>
                                                    <span className="text-[#6f6754] text-[11px]">{note.date || 'Recent'}</span>
                                                </div>
                                                <p className="text-xs text-[#221f1a] leading-relaxed">{note.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#6f6754] italic">No session notes logged yet for this mentee.</p>
                                )}
                            </div>

                            {/* Study Logs History (Last 30 Days) */}
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm space-y-4">
                                <h4 className="text-sm font-serif font-bold text-[#1d3557]">Daily Study Hours Log (Recent Entries)</h4>
                                {dossierData?.logs && dossierData.logs.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-[#efe9dc] border-b border-[#ddd4c1] text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">
                                                    <th className="py-2.5 px-3">Date</th>
                                                    <th className="py-2.5 px-3">Logged Hours</th>
                                                    <th className="py-2.5 px-3">Reason / Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#eee6d4]">
                                                {dossierData.logs.map((log: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-[#efe9dc]/40">
                                                        <td className="py-2.5 px-3 font-semibold text-[#1d3557]">{log.date}</td>
                                                        <td className="py-2.5 px-3 font-bold text-[#221f1a]">{log.hours} hrs</td>
                                                        <td className="py-2.5 px-3 text-[#6f6754]">{log.reason || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#6f6754] italic">No study logs recorded by this mentee yet.</p>
                                )}
                            </div>

                            {/* Submissions History */}
                            <div className="bg-[#fdfbf6] border border-[#ddd4c1] rounded-3xl p-6 shadow-sm space-y-4">
                                <h4 className="text-sm font-serif font-bold text-[#1d3557]">Mains Test Answer Submissions</h4>
                                {dossierData?.submissions && dossierData.submissions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-[#efe9dc] border-b border-[#ddd4c1] text-[10px] font-bold text-[#6f6754] uppercase tracking-wider">
                                                    <th className="py-2.5 px-3">Test Title</th>
                                                    <th className="py-2.5 px-3">Submitted</th>
                                                    <th className="py-2.5 px-3">Status</th>
                                                    <th className="py-2.5 px-3">Score</th>
                                                    <th className="py-2.5 px-3 text-center">Answer Sheet</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#eee6d4]">
                                                {dossierData.submissions.map((sub: any) => (
                                                    <tr key={sub._id} className="hover:bg-[#efe9dc]/40">
                                                        <td className="py-2.5 px-3 font-semibold text-[#1d3557]">{sub.testTitle}</td>
                                                        <td className="py-2.5 px-3 text-[#6f6754]">
                                                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                sub.status === 'evaluated'
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                                            }`}>
                                                                {sub.status || 'Submitted'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-bold text-[#221f1a]">{sub.score !== undefined ? sub.score : '—'}</td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {sub.answerSheetUrls?.[0] ? (
                                                                <a
                                                                    href={sub.answerSheetUrls[0]}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-2.5 py-1 bg-[#1d3557] text-white text-[10px] font-bold rounded-lg hover:bg-[#152c4a] inline-block"
                                                                >
                                                                    View ↗
                                                                </a>
                                                            ) : (
                                                                <span className="text-[#6f6754]">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#6f6754] italic">No answer copies submitted by this mentee yet.</p>
                                )}
                            </div>
                        </div>
                    )
                )}
            </main>

            {/* Broadcast Confirm Modal */}
            {bcConfirming && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBcConfirming(false)}>
                    <div className="bg-[#fdfbf6] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#ddd4c1]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-serif font-bold text-[#1d3557] mb-2">Send Broadcast Notice?</h3>
                        <p className="text-xs text-[#6f6754] mb-4">
                            This will send the announcement to target students in their mentorship inbox.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setBcConfirming(false)} className="flex-1 py-3 rounded-xl border border-[#ddd4c1] text-xs font-bold text-[#6f6754]">
                                Cancel
                            </button>
                            <button onClick={handleSendBroadcast} className="flex-1 py-3 rounded-xl bg-[#1d3557] text-white text-xs font-bold shadow-md">
                                Confirm &amp; Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
