'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import PurchaseConfirmModal from '@/components/PurchaseConfirmModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REASONS = [
    'Health',
    'Family Time',
    'Friends & Unproductive Discussions',
    'Mobile Distraction',
    'Work/Studies Commitments',
    'Contemplation',
    'Others',
];

const TRACKS = [
    { id: 'GS', label: 'GS' },
    { id: 'Optional', label: 'Optional' },
    { id: 'Essay', label: 'Essay' },
    { id: 'CA', label: 'CA' },
    { id: 'CSAT', label: 'CSAT' },
];

export default function MentorshipDashboardPage() {
    const { user, token, isLoggedIn } = useStudentAuth();
    const { isMentorshipStudent } = useAuthorization();

    const [activeTab, setActiveTab] = useState<'daily' | 'roadmap' | 'chat' | 'uploads' | 'mentorship'>('daily');
    const [activeTrack, setActiveTrack] = useState<string>('GS');
    const [roadmapView, setRoadmapView] = useState<'subjects' | 'partial'>('subjects');

    // Daily Task state
    const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [hoursInput, setHoursInput] = useState<string>('3.5');
    const [reasonInput, setReasonInput] = useState<string>('');
    const [logsMap, setLogsMap] = useState<Record<string, { hours: number; reason?: string }>>({});
    const [taskCheckoffs, setTaskCheckoffs] = useState<{ video: boolean; notes: boolean; test: boolean; upload: boolean }>({
        video: false,
        notes: false,
        test: false,
        upload: false,
    });
    const [showChartDrawer, setShowChartDrawer] = useState(false);

    // Roadmap state
    const [subscribedTags, setSubscribedTags] = useState<string[]>([]);
    const [subjectsList, setSubjectsList] = useState<any[]>([
        { name: 'Polity', state: 'done', total: 14, done: 14, startedOn: '15 Jul', finishedOn: '31 Jul' },
        { name: 'Economy', state: 'done', total: 16, done: 16, startedOn: '01 Aug', finishedOn: '14 Aug' },
        { name: 'Environment', state: 'current', total: 15, done: 3, startDate: new Date() },
        { name: 'Modern History', state: 'upcoming', total: 12, done: 0 },
        { name: 'Geography', state: 'upcoming', total: 10, done: 0 },
        { name: 'Ethics (GS-IV)', state: 'upcoming', total: 9, done: 0 },
    ]);
    const [partialTasks, setPartialTasks] = useState<any[]>([
        { day: 'Day 94', title: 'Modern India — Company rule', videoDone: true, notesDone: true, testDone: false },
    ]);

    // Chat state
    const [activeThread, setActiveThread] = useState<'mentor' | 'desk'>('mentor');
    const [chatMessages, setChatMessages] = useState<any[]>([
        { from: 'them', text: 'Welcome to your mentorship program! Keep logging your daily study hours and complete your tasks.', meta: '10:00 AM' },
    ]);
    const [chatInput, setChatInput] = useState('');

    // Uploads state
    const [uploadsList, setUploadsList] = useState<any[]>([]);

    // Mentorship state
    const [accountStatus, setAccountStatus] = useState<'active' | 'break' | 'inactive'>('active');
    const [showBreakModal, setShowBreakModal] = useState(false);

    // Purchase Modal
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    useEffect(() => {
        if (isLoggedIn && token) {
            fetchInitialData();
        }
    }, [isLoggedIn, token]);

    const fetchInitialData = async () => {
        try {
            // Daily task data
            const resDaily = await fetch(`${API_URL}/api/mentorship-student/daily-task`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataDaily = await resDaily.json();
            if (dataDaily.success && dataDaily.data?.logs) {
                const map: Record<string, { hours: number; reason?: string }> = {};
                dataDaily.data.logs.forEach((l: any) => {
                    map[l.date] = { hours: l.hours, reason: l.reason };
                });
                setLogsMap(map);
            }

            // Roadmap data
            const resRoadmap = await fetch(`${API_URL}/api/mentorship-student/roadmap`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataRoadmap = await resRoadmap.json();
            if (dataRoadmap.success) {
                setSubscribedTags(dataRoadmap.data.subscribedTags || []);
                if (dataRoadmap.data.subjects?.length > 0) {
                    setSubjectsList(dataRoadmap.data.subjects);
                }
            }

            // Uploads data
            const resUploads = await fetch(`${API_URL}/api/mentorship-student/uploads`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dataUploads = await resUploads.json();
            if (dataUploads.success) {
                setUploadsList(dataUploads.data || []);
            }

            // Chat data
            fetchChatMessages();
        } catch (e) {
            console.error('Fetch initial mentorship data error:', e);
        }
    };

    const fetchChatMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/chat?threadType=${activeThread}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data?.length > 0) {
                setChatMessages(data.data);
            }
        } catch (e) {
            console.error('Fetch chat error:', e);
        }
    };

    const handleSaveHours = async () => {
        const h = parseFloat(hoursInput);
        if (isNaN(h)) return;

        try {
            const res = await fetch(`${API_URL}/api/mentorship-student/log-hours`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    date: selectedDateStr,
                    hours: h,
                    reason: h < 1 ? reasonInput : '',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setLogsMap((prev) => ({
                    ...prev,
                    [selectedDateStr]: { hours: h, reason: h < 1 ? reasonInput : '' },
                }));
            }
        } catch (e) {
            console.error('Save hours error:', e);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const text = chatInput.trim();
        setChatInput('');

        // Optimistic
        setChatMessages((prev) => [
            ...prev,
            { from: 'me', senderRole: 'student', text, meta: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);

        try {
            await fetch(`${API_URL}/api/mentorship-student/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text, threadType: activeThread }),
            });
        } catch (e) {
            console.error('Send chat error:', e);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#f5ead8] flex flex-col items-center justify-center p-6 text-[#3d3a34]">
                <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-8 max-w-md text-center shadow-xl">
                    <div className="text-5xl mb-4">🎓</div>
                    <h2 className="text-2xl font-serif font-bold text-[#b8502a] mb-2">ShailajaIAS Mentorship</h2>
                    <p className="text-[#787163] text-sm mb-6 leading-relaxed">
                        Please sign in to access your daily tasks, subject roadmap, mentor chat, and uploads.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block px-6 py-3 bg-[#b8502a] hover:bg-[#a04322] text-white font-bold rounded-xl shadow-md transition-all"
                    >
                        Sign In to Access Platform
                    </Link>
                </div>
            </div>
        );
    }

    // Helper for week days
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const log = logsMap[dateStr];
        const isSelected = dateStr === selectedDateStr;
        const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isFuture = d > today;

        return {
            dow: DOW[i],
            dateStr,
            dateLabel: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
            hours: log ? log.hours : null,
            reason: log?.reason || '',
            isSelected,
            isToday,
            isFuture,
        };
    });

    const activeSubject = subjectsList.find((s) => s.state === 'current') || subjectsList[2];
    const completedSubjects = subjectsList.filter((s) => s.state === 'done');
    const upcomingSubjects = subjectsList.filter((s) => s.state === 'upcoming');

    return (
        <div className="min-h-screen bg-[#f5ead8] text-[#3d3a34] font-sans pb-12">
            {/* Header Navigation Bar */}
            <header className="bg-[#fffdf8] border-b border-[#e3d5bd] sticky top-0 z-30 shadow-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="font-serif text-2xl font-bold text-[#b8502a]">ShailajaIAS</span>
                        <span className="text-xs tracking-widest text-[#787163] uppercase border-l border-[#e3d5bd] pl-3 font-semibold">
                            Mentorship Programme
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-[#3d3a34]">{user?.name || 'Aditi Kulkarni'}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                            </span>
                        </div>
                        <button
                            onClick={() => setShowBreakModal(true)}
                            className="text-xs text-[#787163] hover:text-[#b8502a] font-semibold underline"
                        >
                            Take a break
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs Bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex items-center gap-2 border-b border-[#e3d5bd]">
                    {[
                        { id: 'daily', label: '• Daily Task' },
                        { id: 'roadmap', label: '• Roadmap' },
                        { id: 'chat', label: '• Chat (2)' },
                        { id: 'uploads', label: '• Uploads' },
                        { id: 'mentorship', label: '• Mentorship' },
                    ].map((tab) => {
                        const on = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-3 rounded-t-xl text-sm font-semibold transition-all ${
                                    on
                                        ? 'bg-[#fffdf8] text-[#3d3a34] border-t-2 border-t-[#b8502a] border-x border-[#e3d5bd] -mb-px font-bold shadow-xs'
                                        : 'bg-[#ebe0cb] text-[#787163] hover:bg-[#e4d7c0]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
                {/* ----------------- 1. DAILY TASK MODULE ----------------- */}
                {activeTab === 'daily' && (
                    <div className="space-y-6">
                        {/* Header Banner */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">PRELIMS TRACK • CSE 2027</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Daily Task</h1>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-[#787163] font-bold">TODAY</span>
                                <p className="text-xl font-bold text-[#b8502a]">
                                    {today.getDate()} {MONTHS[today.getMonth()]}
                                </p>
                            </div>
                        </div>

                        {/* Week Strip Controls */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button className="w-8 h-8 rounded-full border border-[#e3d5bd] bg-[#fdfbf6] text-[#787163] hover:bg-[#f5ead8] flex items-center justify-center font-bold">
                                        ‹
                                    </button>
                                    <button className="w-8 h-8 rounded-full border border-[#e3d5bd] bg-[#fdfbf6] text-[#787163] hover:bg-[#f5ead8] flex items-center justify-center font-bold">
                                        ›
                                    </button>
                                    <span className="text-sm font-bold text-[#3d3a34] ml-2">24 – 30 Aug 2026</span>
                                    <button className="text-xs bg-[#f5ead8] text-[#787163] px-3 py-1 rounded-full font-bold ml-2">
                                        Today
                                    </button>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-[#787163] font-semibold uppercase tracking-wider">LOGGED / TARGET </span>
                                    <span className="text-base font-bold text-[#3d3a34]">15.5 / 42.0 h</span>
                                </div>
                            </div>

                            {/* 7-Day Strip Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                                {weekDays.map((d) => (
                                    <button
                                        key={d.dateStr}
                                        onClick={() => {
                                            if (!d.isFuture) {
                                                setSelectedDateStr(d.dateStr);
                                                if (d.hours !== null) setHoursInput(String(d.hours));
                                            }
                                        }}
                                        className={`p-4 rounded-2xl border text-center transition-all flex flex-col justify-between h-24 ${
                                            d.isSelected
                                                ? 'bg-[#ffe8d6] border-[#b8502a] shadow-sm'
                                                : d.isFuture
                                                ? 'bg-[#f7f0e4]/50 border-[#e8dcc8] opacity-60 cursor-not-allowed'
                                                : 'bg-[#f7f0e4] border-[#e8dcc8] hover:border-[#b8502a]'
                                        }`}
                                    >
                                        <div className="text-[11px] font-semibold text-[#787163] uppercase">
                                            {d.dateLabel}
                                            <p className="text-[9px] text-[#a09888] font-bold">{d.dow}</p>
                                        </div>
                                        <div className="text-lg font-bold text-[#3d3a34]">
                                            {d.hours !== null ? `${d.hours} h` : d.isFuture ? '—' : 'Not logged'}
                                        </div>
                                        {d.reason && (
                                            <span className="text-[9px] font-bold text-[#b8502a] bg-[#fff0e6] px-1.5 py-0.5 rounded border border-[#ffd8c2]">
                                                {d.reason}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Revise / Log Console */}
                            <div className="bg-[#fff5ea] border border-[#ffd8c2] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">REVISE ENTRY</span>
                                    <h4 className="text-base font-bold text-[#3d3a34]">{selectedDateStr}</h4>
                                    <p className="text-xs text-[#787163]">The original submission time is kept on record.</p>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-[#787163] uppercase">HOURS</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={hoursInput}
                                            onChange={(e) => setHoursInput(e.target.value)}
                                            className="w-24 px-3 py-2 bg-[#f5ead8] border border-[#e3d5bd] rounded-xl font-bold text-center text-sm focus:outline-none focus:border-[#b8502a]"
                                        />
                                    </div>

                                    {parseFloat(hoursInput) < 1 && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[#b8502a] uppercase">REASON (&lt; 1H)</span>
                                            <select
                                                value={reasonInput}
                                                onChange={(e) => setReasonInput(e.target.value)}
                                                className="px-3 py-2 bg-[#f5ead8] border border-[#e3d5bd] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#b8502a]"
                                            >
                                                <option value="">Select reason...</option>
                                                {REASONS.map((r) => (
                                                    <option key={r} value={r}>
                                                        {r}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSaveHours}
                                        className="bg-[#b8502a] hover:bg-[#a04322] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors self-end"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Track Filter Chips */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {TRACKS.map((t) => {
                                const on = activeTrack === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTrack(t.id)}
                                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                                            on
                                                ? 'bg-[#b8502a] text-white shadow-sm'
                                                : 'bg-[#fffdf8] text-[#787163] border border-[#e3d5bd] hover:border-[#b8502a]'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Daily Task Card */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                            <div>
                                <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider">CURRENT TASK • DAY 96</span>
                                <h3 className="text-xl font-serif font-bold text-[#3d3a34]">Modern India — Revolt of 1857</h3>
                            </div>

                            {/* 4 Steps Checklist */}
                            <div className="divide-y divide-[#f0e6d4]">
                                {/* Step 1: Video */}
                                <div className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={taskCheckoffs.video}
                                            onChange={(e) => setTaskCheckoffs((p) => ({ ...p, video: e.target.checked }))}
                                            className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-[#3d3a34]">🎥 Revolt of 1857: causes, spread, consequences</p>
                                            <p className="text-xs text-[#787163]">Video Lecture • 48 min</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/courses"
                                        className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                    >
                                        Watch Video ↗
                                    </Link>
                                </div>

                                {/* Step 2: Notes */}
                                <div className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={taskCheckoffs.notes}
                                            onChange={(e) => setTaskCheckoffs((p) => ({ ...p, notes: e.target.checked }))}
                                            className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-[#3d3a34]">📄 Active recall — 1857: actors, centres, aftermath</p>
                                            <p className="text-xs text-[#787163]">Study Handout • 12 prompts</p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]">
                                        Open Notes ↗
                                    </button>
                                </div>

                                {/* Step 3: Test */}
                                <div className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={taskCheckoffs.test}
                                            onChange={(e) => setTaskCheckoffs((p) => ({ ...p, test: e.target.checked }))}
                                            className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-[#3d3a34]">📝 Sectional Test 14 — Modern India I</p>
                                            <p className="text-xs text-[#787163]">Prelims Test • 25 Q · 30 min</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/tests/prelims-test-series"
                                        className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                    >
                                        Take Test ↗
                                    </Link>
                                </div>

                                {/* Step 4: Upload */}
                                <div className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={taskCheckoffs.upload}
                                            onChange={(e) => setTaskCheckoffs((p) => ({ ...p, upload: e.target.checked }))}
                                            className="w-5 h-5 rounded text-[#b8502a] accent-[#b8502a] cursor-pointer"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-[#3d3a34]">✍️ Mains Answer Script Upload</p>
                                            <p className="text-xs text-[#787163]">Mains Practice • Upload PDF for evaluation</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/tests/mains-test-series"
                                        className="text-xs font-bold text-[#b8502a] bg-[#fff5ea] hover:bg-[#ffe8d6] px-4 py-2 rounded-xl border border-[#ffd8c2]"
                                    >
                                        Upload Answer ↗
                                    </Link>
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0e6d4]">
                                <button className="px-5 py-2.5 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163] hover:bg-[#f5ead8]">
                                    Partially done (Finish later)
                                </button>
                                <button className="px-6 py-2.5 rounded-xl bg-[#b8502a] text-white text-xs font-bold hover:bg-[#a04322] shadow-sm">
                                    Mark Complete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- 2. ROADMAP MODULE ----------------- */}
                {activeTab === 'roadmap' && (
                    <div className="space-y-6">
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">SUBJECT PLAN • CSE 2027</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Roadmap &amp; Subscribed Tags</h1>
                            </div>

                            {/* Sub-tabs */}
                            <div className="flex items-center bg-[#f5ead8] p-1 rounded-2xl border border-[#e3d5bd]">
                                <button
                                    onClick={() => setRoadmapView('subjects')}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        roadmapView === 'subjects' ? 'bg-[#fffdf8] text-[#3d3a34] shadow-xs' : 'text-[#787163]'
                                    }`}
                                >
                                    Subjects View
                                </button>
                                <button
                                    onClick={() => setRoadmapView('partial')}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        roadmapView === 'partial' ? 'bg-[#fffdf8] text-[#3d3a34] shadow-xs' : 'text-[#787163]'
                                    }`}
                                >
                                    Partially Done Tasks ({partialTasks.length})
                                </button>
                            </div>
                        </div>

                        {/* Subscribed Tags Pill Container */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-5 shadow-sm">
                            <h4 className="text-xs font-bold text-[#787163] uppercase tracking-wider mb-2">
                                🔖 Subscribed Mentor Tags (Courses, MTS &amp; PTS)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {subscribedTags.length > 0 ? (
                                    subscribedTags.map((tag) => (
                                        <span key={tag} className="px-3 py-1 bg-[#fff5ea] text-[#b8502a] border border-[#ffd8c2] rounded-full text-xs font-bold">
                                            #{tag}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-[#787163]">No active mentor tags subscribed yet.</span>
                                )}
                            </div>
                        </div>

                        {roadmapView === 'subjects' ? (
                            <div className="space-y-6">
                                {/* Active Subject Progress Card */}
                                <div className="bg-[#fffdf8] border-2 border-[#b8502a] rounded-3xl p-6 shadow-md space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-[#b8502a] uppercase tracking-wider bg-[#fff0e6] px-2.5 py-0.5 rounded-full border border-[#ffd8c2]">
                                                IN PROGRESS
                                            </span>
                                            <h3 className="text-2xl font-serif font-bold text-[#3d3a34] mt-1">{activeSubject?.name || 'Environment'}</h3>
                                        </div>
                                        <span className="text-xl font-bold text-[#b8502a]">
                                            {Math.round(((activeSubject?.done || 3) / (activeSubject?.total || 15)) * 100)}%
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-[#f5ead8] rounded-full h-3 overflow-hidden border border-[#e3d5bd]">
                                        <div
                                            className="bg-[#b8502a] h-full transition-all duration-500 rounded-full"
                                            style={{ width: `${((activeSubject?.done || 3) / (activeSubject?.total || 15)) * 100}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-[#787163] font-semibold">
                                        <span>Tasks Completed: {activeSubject?.done || 3} of {activeSubject?.total || 15}</span>
                                        <span>Estimated Test Date: ≈ 05 Sep 2026</span>
                                    </div>
                                </div>

                                {/* Completed Subjects List */}
                                <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-3">
                                    <h4 className="text-sm font-serif font-bold text-[#3d3a34]">Completed Subjects</h4>
                                    <div className="divide-y divide-[#f0e6d4]">
                                        {completedSubjects.map((s) => (
                                            <div key={s.name} className="py-3 flex items-center justify-between text-xs">
                                                <span className="font-bold text-[#3d3a34]">{s.name}</span>
                                                <span className="text-[#787163]">{s.total} tasks completed • {s.startedOn} – {s.finishedOn}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Upcoming Reorderable Queue */}
                                <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-4">
                                    <h4 className="text-sm font-serif font-bold text-[#3d3a34]">Upcoming Subjects Queue</h4>
                                    <div className="space-y-3">
                                        {upcomingSubjects.map((s, idx) => (
                                            <div key={s.name} className="p-4 rounded-2xl bg-[#f7f0e4] border border-[#e8dcc8] flex items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-[10px] font-bold text-[#787163]">{idx + 1} of {upcomingSubjects.length}</span>
                                                    <h5 className="font-bold text-[#3d3a34] text-sm">{s.name}</h5>
                                                    <p className="text-xs text-[#787163]">{s.total} scheduled tasks</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button className="w-8 h-8 rounded-full border border-[#e3d5bd] bg-[#fffdf8] text-xs font-bold hover:bg-[#f5ead8]">↑</button>
                                                    <button className="w-8 h-8 rounded-full border border-[#e3d5bd] bg-[#fffdf8] text-xs font-bold hover:bg-[#f5ead8]">↓</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Partially Done Tasks View */
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-4">
                                <h4 className="text-sm font-serif font-bold text-[#3d3a34]">Partially Done Tasks</h4>
                                {partialTasks.map((pt, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-[#fff5ea] border border-[#ffd8c2] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#b8502a]">{pt.day}</span>
                                            <button className="px-4 py-1.5 bg-[#b8502a] text-white text-xs font-bold rounded-xl">
                                                Mark Completed
                                            </button>
                                        </div>
                                        <h5 className="font-bold text-[#3d3a34] text-sm">{pt.title}</h5>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ----------------- 3. CHAT MODULE ----------------- */}
                {activeTab === 'chat' && (
                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
                        {/* Threads Sidebar */}
                        <div className="border-r border-[#e3d5bd] bg-[#f7f0e4] p-4 space-y-3">
                            <h4 className="text-xs font-bold text-[#787163] uppercase tracking-wider">MESSAGES</h4>
                            {[
                                { id: 'mentor', name: 'R. Anand, IRS', role: 'Assigned mentor' },
                                { id: 'desk', name: 'Programme desk', role: 'Scheduling & fees' },
                            ].map((t) => {
                                const on = activeThread === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setActiveThread(t.id as any);
                                            fetchChatMessages();
                                        }}
                                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                                            on ? 'bg-[#fffdf8] border-[#b8502a] shadow-xs' : 'border-transparent hover:bg-[#ebe0cb]'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#b8502a] text-white font-bold text-xs flex items-center justify-center">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#3d3a34]">{t.name}</p>
                                            <p className="text-[10px] text-[#787163]">{t.role}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Live Chat Panel */}
                        <div className="md:col-span-2 flex flex-col justify-between p-6 space-y-4">
                            <div className="border-b border-[#f0e6d4] pb-3 flex items-center justify-between">
                                <h3 className="font-serif font-bold text-base text-[#3d3a34]">
                                    {activeThread === 'mentor' ? 'R. Anand, IRS' : 'Programme desk'}
                                </h3>
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">● Active</span>
                            </div>

                            {/* Messages Container */}
                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-2">
                                {chatMessages.map((m, idx) => {
                                    const mine = m.from === 'me' || m.senderRole === 'student';
                                    return (
                                        <div key={idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                                    mine
                                                        ? 'bg-[#b8502a] text-white rounded-br-xs'
                                                        : 'bg-[#f5ead8] text-[#3d3a34] rounded-bl-xs border border-[#e3d5bd]'
                                                }`}
                                            >
                                                <p>{m.text}</p>
                                                <span className={`text-[9px] mt-1 block text-right ${mine ? 'text-white/70' : 'text-[#787163]'}`}>
                                                    {m.meta || '10:00 AM'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Input Bar */}
                            <div className="flex items-center gap-3 pt-3 border-t border-[#f0e6d4]">
                                <input
                                    type="text"
                                    placeholder="Type message to mentor..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSendChat();
                                    }}
                                    className="flex-1 px-4 py-3 bg-[#f5ead8] border border-[#e3d5bd] rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#b8502a]"
                                />
                                <button
                                    onClick={handleSendChat}
                                    className="bg-[#b8502a] hover:bg-[#a04322] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-sm"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ----------------- 4. UPLOADS MODULE ----------------- */}
                {activeTab === 'uploads' && (
                    <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">ANSWER SCRIPTS &amp; NOTES</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Uploads &amp; Evaluated Returns</h1>
                            </div>
                            <Link
                                href="/tests/mains-test-series"
                                className="bg-[#b8502a] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#a04322] shadow-sm"
                            >
                                + Upload New Answer Copy
                            </Link>
                        </div>

                        {/* Table View */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#e3d5bd] text-[10px] font-bold text-[#787163] uppercase tracking-wider">
                                        <th className="py-3 px-4">Test Code</th>
                                        <th className="py-3 px-4">Title &amp; Subject</th>
                                        <th className="py-3 px-4">Submitted Date</th>
                                        <th className="py-3 px-4">Evaluation Status</th>
                                        <th className="py-3 px-4">Score</th>
                                        <th className="py-3 px-4 text-center">Evaluated Copy</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0e6d4] text-xs">
                                    {[
                                        { code: 'ST-13', title: 'Sectional Test 13', subject: 'Modern India II', date: '21 Aug 2026', status: 'Evaluated', score: '58 / 75', note: 'Returned by R. Anand' },
                                        { code: 'ES-04', title: 'Essay — Ethics', subject: 'Essay Practice', date: '19 Aug 2026', status: 'Evaluated', score: '112 / 150', note: 'Rubric attached' },
                                        { code: 'ST-14', title: 'Sectional Test 14', subject: 'Modern India I', date: '24 Aug 2026', status: 'Pending', score: '—', note: 'Awaiting evaluation' },
                                    ].map((u) => (
                                        <tr key={u.code} className="hover:bg-[#f7f0e4]">
                                            <td className="py-4 px-4 font-bold text-[#b8502a]">{u.code}</td>
                                            <td className="py-4 px-4">
                                                <p className="font-bold text-[#3d3a34]">{u.title}</p>
                                                <p className="text-[10px] text-[#787163]">{u.subject}</p>
                                            </td>
                                            <td className="py-4 px-4 text-[#787163]">{u.date}</td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        u.status === 'Evaluated'
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    }`}
                                                >
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-[#3d3a34]">{u.score}</td>
                                            <td className="py-4 px-4 text-center">
                                                {u.status === 'Evaluated' ? (
                                                    <button className="text-xs font-bold text-[#b8502a] hover:underline">Download Copy PDF ↗</button>
                                                ) : (
                                                    <span className="text-[#a09888]">In Review</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ----------------- 5. MENTORSHIP MODULE ----------------- */}
                {activeTab === 'mentorship' && (
                    <div className="space-y-6">
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#787163] uppercase tracking-wider">CONSISTENCY RECORD</span>
                                <h1 className="text-2xl font-serif font-bold text-[#3d3a34]">Mentorship &amp; Sessions Log</h1>
                            </div>

                            <span className="px-4 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold">
                                Account Status: ACTIVE
                            </span>
                        </div>

                        {/* Consistency Chart Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center">
                                <span className="text-[10px] font-bold text-[#787163] uppercase">AVG HOURS / WEEK</span>
                                <p className="text-2xl font-bold text-[#3d3a34] mt-1">34.5 h</p>
                            </div>
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center">
                                <span className="text-[10px] font-bold text-[#787163] uppercase">TASK COMPLETION</span>
                                <p className="text-2xl font-bold text-emerald-700 mt-1">78%</p>
                            </div>
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center">
                                <span className="text-[10px] font-bold text-[#787163] uppercase">BEST WEEK</span>
                                <p className="text-2xl font-bold text-[#b8502a] mt-1">44.0 h (W10)</p>
                            </div>
                            <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-2xl p-5 text-center">
                                <span className="text-[10px] font-bold text-[#787163] uppercase">LOGGED DAYS</span>
                                <p className="text-2xl font-bold text-[#3d3a34] mt-1">34 / 38</p>
                            </div>
                        </div>

                        {/* Mentor Review Sessions Log */}
                        <div className="bg-[#fffdf8] border border-[#e3d5bd] rounded-3xl p-6 shadow-sm space-y-4">
                            <h4 className="text-sm font-serif font-bold text-[#3d3a34]">Past Mentor 1-on-1 Review Sessions</h4>
                            <div className="space-y-3">
                                {[
                                    { title: 'Weekly review — answer structure', date: '23 Aug 2026', len: '32 min', note: 'Conclusions are the weak link. Fixed a three-line close: verdict, forward step, one committee.' },
                                    { title: 'Weekly review — pace correction', date: '16 Aug 2026', len: '28 min', note: 'Two low-hour days flagged and reasons accepted. Economy start pushed by three days.' },
                                ].map((s, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-[#f7f0e4] border border-[#e8dcc8] space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-[#3d3a34]">{s.title}</span>
                                            <span className="text-[#787163]">{s.date} • {s.len}</span>
                                        </div>
                                        <p className="text-xs text-[#787163] leading-relaxed">{s.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Break Request Modal */}
            {showBreakModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBreakModal(false)}>
                    <div className="bg-[#fffdf8] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#e3d5bd]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-serif font-bold text-[#3d3a34] mb-2">Request a Break?</h3>
                        <p className="text-xs text-[#787163] mb-4">
                            Your mentor reviews break requests before your account status changes. Daily task deadlines will be paused.
                        </p>
                        <div className="space-y-3">
                            <select className="w-full border border-[#e3d5bd] bg-[#f5ead8] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none">
                                <option value="Health">Health / Medical</option>
                                <option value="Family">Family Emergency</option>
                                <option value="Exams">University Exams</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowBreakModal(false)} className="flex-1 py-3 rounded-xl border border-[#e3d5bd] text-xs font-bold text-[#787163]">
                                Cancel
                            </button>
                            <button onClick={() => setShowBreakModal(false)} className="flex-1 py-3 rounded-xl bg-[#b8502a] text-white text-xs font-bold shadow-md">
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
