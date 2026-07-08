'use client';

import { useStudentAuth } from '@/contexts/StudentAuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { API_URL, formatDisplayDate } from '@/lib/api';
import type { IDoubt } from '@repo/types';

export default function ProfilePage() {
    const { user, isLoggedIn, isLoading, updateProfile, logout } = useStudentAuth();
    
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Doubt resolution states
    const studentAuth = useStudentAuth();
    const token = studentAuth?.token || null;
    const [activeTab, setActiveTab] = useState<'profile' | 'doubts' | 'reports'>('profile');
    const [doubts, setDoubts] = useState<IDoubt[]>([]);

    // Test reports states
    const [reports, setReports] = useState<any[]>([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [reportDetailsLoading, setReportDetailsLoading] = useState(false);
    const [showReportReview, setShowReportReview] = useState(false);
    const [currentReportQuestionIndex, setCurrentReportQuestionIndex] = useState(0);
    const [selectedDoubt, setSelectedDoubt] = useState<IDoubt | null>(null);
    const [doubtsLoading, setDoubtsLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);

    // New general doubt states
    const [showNewGeneralDoubtModal, setShowNewGeneralDoubtModal] = useState(false);
    const [newDoubtSubject, setNewDoubtSubject] = useState('Polity');
    const [newDoubtTitle, setNewDoubtTitle] = useState('');
    const [newDoubtDescription, setNewDoubtDescription] = useState('');
    const [newDoubtError, setNewDoubtError] = useState('');
    const [newDoubtSubmitting, setNewDoubtSubmitting] = useState(false);

    // Direct routing support for tab redirect from exam popups
    useEffect(() => {
        const storedTab = localStorage.getItem('active_profile_tab');
        if (storedTab === 'doubts') {
            setActiveTab('doubts');
            localStorage.removeItem('active_profile_tab');
        }
    }, []);

    // Fetch student doubts
    const fetchDoubts = async (isSilent = false) => {
        if (!token) return;
        if (!isSilent) setDoubtsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/doubts?_t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await res.json();
            if (data.success) {
                setDoubts(data.data);
            }
        } catch (error) {
            console.error('Fetch doubts error:', error);
        } finally {
            if (!isSilent) setDoubtsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'doubts' || !token) return;

        // Fetch immediately (non-silent)
        fetchDoubts(false);

        const interval = setInterval(() => {
            // Fetch list silently
            fetchDoubts(true);
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [activeTab, token]);

    // Fetch student test reports
    const fetchReports = async () => {
        if (!token) return;
        setReportsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/reports`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setReports(data.data);
            }
        } catch (error) {
            console.error('Fetch reports error:', error);
        } finally {
            setReportsLoading(false);
        }
    };

    // Fetch individual report details
    const fetchReportDetail = async (reportId: string) => {
        if (!token) return;
        setReportDetailsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/reports/${reportId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedReport(data.data);
            }
        } catch (error) {
            console.error('Fetch report detail error:', error);
        } finally {
            setReportDetailsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'reports' && token) {
            fetchReports();
        }
    }, [activeTab, token]);

    // Fetch individual doubt details
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
                setDoubts(prev => prev.map(d => (d._id || d.id) === doubtId ? data.data : d));
            }
        } catch (error) {
            console.error('Fetch doubt detail error:', error);
        }
    };

    useEffect(() => {
        const currentDoubtId = selectedDoubt?._id || selectedDoubt?.id;
        if (activeTab !== 'doubts' || !token || !currentDoubtId) return;

        const interval = setInterval(() => {
            const activeDoubtId = selectedDoubt?._id || selectedDoubt?.id;
            if (activeDoubtId) {
                fetchDoubtDetail(activeDoubtId, true);
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [activeTab, token, selectedDoubt?._id, selectedDoubt?.id]);

    // Send reply message
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        const doubtId = selectedDoubt?._id || selectedDoubt?.id;
        if (!token || !doubtId || !replyText.trim()) return;
        setReplyLoading(true);
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
            }
        } catch (error) {
            console.error('Send reply error:', error);
        } finally {
            setReplyLoading(false);
        }
    };

    // Mark doubt as resolved
    const handleResolveDoubt = async (doubtId: string) => {
        if (!token) return;
        if (!confirm('Are you sure you want to mark this doubt as resolved?')) return;
        try {
            const res = await fetch(`${API_URL}/api/doubts/${doubtId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'resolved' })
            });
            const data = await res.json();
            if (data.success) {
                await fetchDoubtDetail(doubtId);
            }
        } catch (error) {
            console.error('Resolve doubt error:', error);
        }
    };

    // Submit new general doubt
    const handleCreateGeneralDoubt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        if (!newDoubtDescription.trim() || !newDoubtTitle.trim()) {
            setNewDoubtError('Please fill in all fields.');
            return;
        }
        setNewDoubtSubmitting(true);
        setNewDoubtError('');
        try {
            const res = await fetch(`${API_URL}/api/doubts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject: newDoubtSubject,
                    title: newDoubtTitle,
                    description: newDoubtDescription
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowNewGeneralDoubtModal(false);
                setNewDoubtTitle('');
                setNewDoubtDescription('');
                fetchDoubts();
            } else {
                setNewDoubtError(data.message || 'Failed to submit doubt.');
            }
        } catch (error) {
            console.error('Submit general doubt error:', error);
            setNewDoubtError('Failed to connect to server.');
        } finally {
            setNewDoubtSubmitting(false);
        }
    };

    // Sync input values when user loads
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user, isEditing]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
            </div>
        );
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!name.trim()) {
            setErrorMessage('Name is required.');
            return;
        }

        setStatus('loading');
        try {
            const result = await updateProfile(name.trim(), email.trim());
            if (result.success) {
                setStatus('success');
                setSuccessMessage('Profile updated successfully!');
                setIsEditing(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setStatus('error');
                setErrorMessage(result.error || 'Failed to update profile.');
            }
        } catch {
            setStatus('error');
            setErrorMessage('Failed to connect to the server.');
        }
    };

    // Not logged in — show CTA
    if (!isLoggedIn || !user) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 animate-fade-in">
                {/* Header */}
                <div
                    className="pt-12 pb-20 px-4 text-center"
                    style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)' }}
                >
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                        <span className="text-5xl">👤</span>
                    </div>
                    <h1
                        className="text-xl font-bold text-white mb-2"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        Your Profile
                    </h1>
                    <p className="text-white/60 text-sm">
                        Login to track your progress
                    </p>
                </div>

                {/* Login CTA Card */}
                <div className="max-w-md mx-auto px-4 -mt-10">
                    <div
                        className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2">
                            Access Your Account
                        </h2>
                        <p className="text-sm text-[#64748B] mb-6">
                            Track test reports, manage course access, and save your progress across devices.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 w-full py-3 h-12 bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl text-white font-semibold text-sm transition-all shadow-md active:scale-[0.98]"
                        >
                            Go to Login
                        </Link>
                    </div>

                    {/* Features Preview */}
                    <div className="mt-6 space-y-3">
                        {[
                            { icon: '📊', title: 'Test Reports', desc: 'View detailed analysis of all your tests', color: '#EEF2FF' },
                            { icon: '📱', title: 'Course Enrolments', desc: 'Manage your active UPSC course access', color: '#D1FAE5' },
                            { icon: '❓', title: 'My Doubts', desc: 'Track questions you\'ve asked mentors', color: '#FEF3C7' },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="bg-white rounded-xl p-4 flex items-center gap-3 opacity-60 border border-gray-50"
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: item.color }}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#1E3A5F]">{item.title}</p>
                                    <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                                </div>
                                <span className="text-[10px] font-bold text-[#64748B] bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Locked
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Logged in — show profile
    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'ST';

    if (activeTab === 'doubts') {
        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 px-4 pt-8 animate-fade-in">
                <div className="max-w-md mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => {
                                setSelectedDoubt(null);
                                setActiveTab('profile');
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E3A5F] hover:underline"
                        >
                            ← Back to Profile
                        </button>
                        <button
                            onClick={() => setShowNewGeneralDoubtModal(true)}
                            className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-lg shadow transition-all"
                        >
                            + Raise New Doubt
                        </button>
                    </div>

                    {!selectedDoubt ? (
                        /* ─── DOUBTS LIST VIEW ─── */
                        <div>
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-[#1E3A5F] font-headline">My Doubt Desk</h1>
                                <p className="text-gray-500 text-xs mt-1">Discuss conceptual UPSC queries directly with experts</p>
                            </div>

                            {doubtsLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
                                </div>
                            ) : doubts.length === 0 ? (
                                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                                    <span className="text-4xl mb-3 block">💬</span>
                                    <h3 className="font-bold text-[#1E3A5F] text-sm">No doubts asked yet</h3>
                                    <p className="text-gray-400 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                                        Have a question about a Polity topic, test series explanation, or GS concept? Ask our UPSC subject matter experts!
                                    </p>
                                    <button
                                        onClick={() => setShowNewGeneralDoubtModal(true)}
                                        className="mt-5 px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white text-xs font-bold rounded-xl shadow transition-colors"
                                    >
                                        Ask First Doubt
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {doubts.map((doubt) => {
                                        const isAnswered = doubt.status === 'answered';
                                        const isResolved = doubt.status === 'resolved';
                                        const badgeColor = isResolved
                                            ? 'bg-green-50 text-green-700 border-green-100'
                                            : isAnswered
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-100';

                                        return (
                                            <button
                                                key={doubt._id || doubt.id}
                                                onClick={() => {
                                                    setSelectedDoubt(doubt);
                                                    fetchDoubtDetail(doubt._id || doubt.id);
                                                }}
                                                className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-all shadow-sm flex flex-col gap-3 group"
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[10px] uppercase">
                                                            {doubt.subject}
                                                        </span>
                                                        {doubt.testSeriesUniqueId && (
                                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px] uppercase border border-indigo-100">
                                                                {doubt.testSeriesUniqueId}
                                                            </span>
                                                        )}
                                                        {doubt.testItemTitle && (
                                                            <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">
                                                                • {doubt.testItemTitle}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase ${badgeColor}`}>
                                                        {doubt.status}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h4 className="font-bold text-[#1E3A5F] text-sm leading-snug group-hover:text-[#D97706] transition-colors">
                                                        {doubt.title}
                                                    </h4>
                                                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                                                        {doubt.description}
                                                    </p>
                                                </div>

                                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold border-t border-gray-50 pt-2.5 mt-0.5">
                                                    <span>📅 {formatDisplayDate(doubt.createdAt)}</span>
                                                    <span>{doubt.messages.length} messages</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ─── DETAILED DOUBT THREAD VIEW ─── */
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 flex flex-col min-h-[500px]">
                            {/* Detail Header */}
                            <div className="border-b border-gray-100 pb-4 mb-4">
                                <button
                                    onClick={() => setSelectedDoubt(null)}
                                    className="text-xs font-bold text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1"
                                >
                                    ← Back to Desk
                                </button>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[10px] uppercase">
                                                                            {selectedDoubt.subject}
                                                                        </span>
                                                                        {selectedDoubt.testSeriesUniqueId && (
                                                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px] uppercase border border-indigo-100">
                                                                                {selectedDoubt.testSeriesUniqueId}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                    <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase ${
                                        selectedDoubt.status === 'resolved'
                                            ? 'bg-green-50 text-green-700 border-green-100'
                                            : selectedDoubt.status === 'answered'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                        {selectedDoubt.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[#1E3A5F] text-base leading-snug font-headline">
                                    {selectedDoubt.title}
                                </h3>
                                
                                {(selectedDoubt.questionIndex !== undefined || selectedDoubt.testItemTitle) && (
                                    <div className="mt-2 text-[10px] font-semibold text-gray-500 bg-slate-50 p-2 rounded-lg border border-gray-100/50">
                                        {selectedDoubt.testItemTitle && <div><strong>Test:</strong> {selectedDoubt.testItemTitle}</div>}
                                        {selectedDoubt.questionIndex !== undefined && (
                                            <div className="mt-0.5">
                                                <strong>Question:</strong> #{selectedDoubt.questionIndex + 1}
                                                {selectedDoubt.questionText && <span className="italic block font-normal mt-0.5 truncate text-gray-600">"{selectedDoubt.questionText}"</span>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Chat Thread */}
                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] mb-4 pr-1">
                                {/* Initial Query (Original student description) */}
                                <div className="flex flex-col items-end">
                                    <div className="bg-[#1E3A5F] text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] text-xs shadow-sm">
                                        <p className="font-bold border-b border-white/10 pb-1 mb-1.5 text-[10px] opacity-75">
                                            {user?.name} (Query)
                                        </p>
                                        <p className="leading-relaxed whitespace-pre-line text-left">{selectedDoubt.description}</p>
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-medium mt-1 pr-1">
                                        {formatDisplayDate(selectedDoubt.createdAt)}
                                    </span>
                                </div>

                                {/* Replies */}
                                {selectedDoubt.messages.map((msg, idx) => {
                                    const isSelf = msg.senderId === user?._id || msg.senderName === user?.name;
                                    const bubbleBg = isSelf 
                                        ? 'bg-[#1E3A5F] text-white rounded-tr-none' 
                                        : 'bg-[#FEF3C7] text-amber-950 rounded-tl-none border border-amber-100';

                                    return (
                                        <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                                            <div className={`${bubbleBg} rounded-2xl px-4 py-3 max-w-[85%] text-xs shadow-sm`}>
                                                <p className={`font-bold border-b pb-1 mb-1.5 text-[10px] ${
                                                    isSelf ? 'border-white/10 opacity-75' : 'border-amber-900/10 text-amber-800'
                                                }`}>
                                                    {msg.senderName} {!isSelf && '🎓 (Mentor)'}
                                                </p>
                                                <p className="leading-relaxed whitespace-pre-line text-left">{msg.message}</p>
                                            </div>
                                            <span className="text-[9px] text-gray-400 font-medium mt-1 px-1">
                                                {formatDisplayDate(msg.createdAt)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply Input Form */}
                            <div className="border-t border-gray-100 pt-4 mt-auto">
                                {selectedDoubt.status === 'resolved' && (
                                    <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center mb-3 text-xs text-green-800 font-medium">
                                        🎉 This query has been resolved. Sending a new message will mark it as open again.
                                    </div>
                                )}
                                
                                <form onSubmit={handleSendReply} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type follow-up message..."
                                        className="flex-1 h-10 px-3 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                        required
                                        disabled={replyLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={replyLoading || !replyText.trim()}
                                        className="w-10 h-10 bg-[#1E3A5F] hover:bg-[#2A4E7D] disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        {replyLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span>➤</span>
                                        )}
                                    </button>
                                </form>
                                
                                {selectedDoubt.status !== 'resolved' && (
                                    <button
                                        type="button"
                                        onClick={() => handleResolveDoubt(selectedDoubt._id || selectedDoubt.id)}
                                        className="mt-3 w-full py-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-xl border border-green-200 transition-colors"
                                    >
                                        ✓ Mark as Resolved & Close Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* New General Doubt Modal */}
                {showNewGeneralDoubtModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 animate-scale-in">
                            <button
                                onClick={() => setShowNewGeneralDoubtModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl transition-colors font-bold"
                            >
                                ×
                            </button>
                            <div className="mb-6 flex items-center gap-3">
                                <span className="text-3xl">❓</span>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1E3A5F] font-headline">Raise Doubt</h3>
                                    <p className="text-gray-400 text-xs">Direct support from UPSC mentors</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateGeneralDoubt} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5 uppercase tracking-wider">
                                        Subject / Topic
                                    </label>
                                    <select
                                        value={newDoubtSubject}
                                        onChange={(e) => setNewDoubtSubject(e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none"
                                    >
                                        {['Polity', 'Economy', 'Environment', 'Science & Technology', 'International Relations', 'History', 'Geography', 'Art & Culture', 'Social Issues', 'Security', 'Ethics', 'CSAT', 'General'].map((sub) => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5 uppercase tracking-wider">
                                        Doubt Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newDoubtTitle}
                                        onChange={(e) => setNewDoubtTitle(e.target.value)}
                                        placeholder="e.g. Question about Governor's discretionary powers"
                                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5 uppercase tracking-wider">
                                        Doubt Description
                                    </label>
                                    <textarea
                                        value={newDoubtDescription}
                                        onChange={(e) => setNewDoubtDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe your query in detail..."
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                                        required
                                    />
                                </div>

                                {newDoubtError && (
                                    <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                                        ⚠️ {newDoubtError}
                                    </p>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewGeneralDoubtModal(false)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                                        disabled={newDoubtSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                                        disabled={newDoubtSubmitting}
                                    >
                                        {newDoubtSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span>Submit Doubt</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (activeTab === 'reports') {
        const totalQuestions = selectedReport?.quiz?.questions?.length || 0;
        
        // Compute subject breakdown for selected report scorecard
        const getReportSubjectBreakdown = () => {
            if (!selectedReport || !selectedReport.quiz) return [];
            const map: Record<string, { correct: number; incorrect: number; unattempted: number; total: number }> = {};
            selectedReport.quiz.questions.forEach((q: any, idx: number) => {
                const subj = q.subject || 'General';
                if (!map[subj]) map[subj] = { correct: 0, incorrect: 0, unattempted: 0, total: 0 };
                map[subj].total++;
                const selectedOpt = selectedReport.answers[idx.toString()];
                if (selectedOpt === undefined || selectedOpt === -1) map[subj].unattempted++;
                else if (selectedOpt === q.correctIndex) map[subj].correct++;
                else map[subj].incorrect++;
            });
            return Object.entries(map).map(([subject, data]) => ({ subject, ...data }));
        };

        // Format duration helper
        const formatDuration = (seconds: number) => {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}m ${s}s`;
        };

        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 px-4 pt-8 animate-fade-in font-body">
                <div className="max-w-md mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => {
                                if (showReportReview) {
                                    setShowReportReview(false);
                                } else if (selectedReport) {
                                    setSelectedReport(null);
                                } else {
                                    setActiveTab('profile');
                                }
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E3A5F] hover:underline"
                        >
                            ← {showReportReview ? 'Back to Scorecard' : selectedReport ? 'Back to Reports' : 'Back to Profile'}
                        </button>
                        <h2 className="text-base font-bold text-[#1E3A5F] font-headline">
                            {showReportReview ? 'Review Answers' : selectedReport ? 'Scorecard' : 'Test Reports'}
                        </h2>
                    </div>

                    {/* Content Views */}
                    {showReportReview && selectedReport && selectedReport.quiz ? (
                        /* ─── REVIEW QUESTIONS VIEW ─── */
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                                    {selectedReport.quiz.title}
                                </h3>
                                <p className="text-sm font-bold text-[#1E3A5F]">
                                    Question {currentReportQuestionIndex + 1} of {totalQuestions}
                                </p>
                            </div>

                            {(() => {
                                const q = selectedReport.quiz.questions[currentReportQuestionIndex];
                                const selectedOpt = selectedReport.answers[currentReportQuestionIndex.toString()];
                                const isCorrect = selectedOpt !== undefined && selectedOpt !== -1 && selectedOpt === q.correctIndex;

                                return (
                                    <div className="space-y-4">
                                        {/* Question Text */}
                                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                            <p className="text-[#1E3A5F] text-sm font-medium leading-relaxed">
                                                {q.question}
                                            </p>
                                        </div>

                                        {/* Options */}
                                        <div className="space-y-2.5">
                                            {q.options.map((opt: string, optIdx: number) => {
                                                const isThisSelected = selectedOpt === optIdx;
                                                const isThisCorrect = q.correctIndex === optIdx;
                                                
                                                let borderStyle = 'border-gray-100 hover:border-gray-200';
                                                let bgStyle = 'bg-white text-slate-700';
                                                let badge = null;

                                                if (isThisCorrect) {
                                                    borderStyle = 'border-teal-200';
                                                    bgStyle = 'bg-teal-50/60 text-teal-800 font-semibold';
                                                    badge = <span className="text-[10px] font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">Correct Choice</span>;
                                                } else if (isThisSelected && !isCorrect) {
                                                    borderStyle = 'border-red-200';
                                                    bgStyle = 'bg-red-50/60 text-red-800';
                                                    badge = <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">Your Selection</span>;
                                                } else if (isThisSelected && isCorrect) {
                                                    badge = <span className="text-[10px] font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">Your Selection</span>;
                                                }

                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`p-4 rounded-xl border text-xs transition-all flex items-start gap-3 ${borderStyle} ${bgStyle}`}
                                                    >
                                                        <span className="w-5 h-5 rounded-lg bg-slate-100 font-bold flex items-center justify-center flex-shrink-0 text-slate-500">
                                                            {['A', 'B', 'C', 'D'][optIdx]}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="leading-relaxed">{opt}</p>
                                                            {badge && <div className="mt-1.5">{badge}</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        <div className="bg-amber-50/40 rounded-2xl p-5 border border-amber-100/60">
                                            <h4 className="text-xs font-extrabold text-[#D97706] uppercase tracking-wider mb-2">
                                                💡 Detailed Explanation
                                            </h4>
                                            <p className="text-slate-600 text-xs leading-relaxed">
                                                {q.explanation || 'No explanation available.'}
                                            </p>
                                        </div>

                                        {/* Review Navigation */}
                                        <div className="flex justify-between items-center gap-4 pt-2">
                                            <button
                                                disabled={currentReportQuestionIndex === 0}
                                                onClick={() => setCurrentReportQuestionIndex(prev => prev - 1)}
                                                className="flex-1 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-slate-600 text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                ← Previous Question
                                            </button>
                                            <button
                                                disabled={currentReportQuestionIndex === totalQuestions - 1}
                                                onClick={() => setCurrentReportQuestionIndex(prev => prev + 1)}
                                                className="flex-1 py-3 px-4 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next Question →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : selectedReport ? (
                        /* ─── REPORT SCORECARD VIEW ─── */
                        <div className="space-y-6">
                            {/* Score Card */}
                            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2A4E7D] rounded-3xl p-6 text-center text-white shadow-md animate-fade-in">
                                {selectedReport.testSeriesUniqueId && (
                                    <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
                                        {selectedReport.testSeriesUniqueId}
                                    </span>
                                )}
                                <h3 className="text-lg font-bold font-headline mb-1">
                                    {selectedReport.testItemTitle || selectedReport.quiz?.title || 'Online Test'}
                                </h3>
                                <p className="text-white/60 text-xs font-medium">
                                    Attempted on {formatDisplayDate(selectedReport.createdAt)}
                                </p>
                                <div className="mt-5 inline-flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold">{selectedReport.scorecard.totalScore}</span>
                                    <span className="text-sm text-white/65 font-bold">/ {selectedReport.scorecard.maxMarks}</span>
                                </div>
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mt-1">Total Score</p>
                            </div>

                            {/* Stats Table */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <span className="block text-xl font-bold text-green-600">
                                        {selectedReport.scorecard.correct}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Correct</span>
                                </div>
                                <div>
                                    <span className="block text-xl font-bold text-red-500">
                                        {selectedReport.scorecard.incorrect}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Wrong</span>
                                </div>
                                <div>
                                    <span className="block text-xl font-bold text-gray-400">
                                        {selectedReport.scorecard.unattempted}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Skipped</span>
                                </div>
                                <div className="border-t border-gray-100 pt-2 mt-1">
                                    <span className="block text-sm font-bold text-[#1E3A5F]">
                                        {selectedReport.scorecard.accuracy}%
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Accuracy</span>
                                </div>
                                <div className="border-t border-gray-100 pt-2 mt-1">
                                    <span className="block text-sm font-bold text-red-400">
                                        -{selectedReport.scorecard.negativeMarks}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Negatives</span>
                                </div>
                                <div className="border-t border-gray-100 pt-2 mt-1">
                                    <span className="block text-sm font-bold text-[#1E3A5F]">
                                        {formatDuration(selectedReport.scorecard.timeTaken)}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Duration</span>
                                </div>
                            </div>

                            {/* Subject breakdown list */}
                            {(() => {
                                const breakdown = getReportSubjectBreakdown();
                                if (breakdown.length <= 1) return null;
                                return (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                        <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider mb-3">
                                            📊 Subject Breakdown
                                        </h4>
                                        <div className="space-y-2">
                                            {breakdown.map(row => (
                                                <div key={row.subject} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 last:border-0">
                                                    <span className="font-semibold text-slate-700">{row.subject}</span>
                                                    <span className="text-slate-500 font-medium">
                                                        Score: <strong className="text-[#1E3A5F]">{row.correct * 2}</strong> ({row.correct}/{row.total} Correct)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Action Row */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowReportReview(true);
                                        setCurrentReportQuestionIndex(0);
                                    }}
                                    className="flex-1 py-3 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-bold rounded-xl shadow-md transition-colors text-center"
                                >
                                    📖 Review All Answers
                                </button>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-[#64748B] text-xs font-bold rounded-xl transition-colors text-center"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ─── REPORTS LIST VIEW ─── */
                        <div className="space-y-4 animate-fade-in">
                            {reportsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
                                    <p className="text-xs text-[#94A3B8] font-semibold mt-3">Loading test reports...</p>
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                                    <span className="text-4xl block mb-3">📊</span>
                                    <h3 className="text-sm font-bold text-[#1E3A5F] mb-1">No Saved Reports</h3>
                                    <p className="text-xs text-[#94A3B8] mb-5 leading-relaxed">
                                        You haven't saved any test series scorecards to your profile yet.
                                    </p>
                                    <Link
                                        href="/tests"
                                        className="inline-flex py-2 px-4 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                                    >
                                        Go to Tests
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {reports.map((report) => (
                                        <button
                                            key={report._id}
                                            onClick={() => fetchReportDetail(report._id)}
                                            disabled={reportDetailsLoading}
                                            className="w-full text-left bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 shadow-sm transition-all flex items-center justify-between group active:scale-[0.99] disabled:opacity-60"
                                        >
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <h4 className="text-xs font-bold text-[#1E3A5F] truncate">
                                                        {report.testItemTitle || report.quiz?.title || 'Online Exam'}
                                                    </h4>
                                                    {report.testSeriesUniqueId && (
                                                        <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded border border-indigo-100 uppercase tracking-wide flex-shrink-0">
                                                            {report.testSeriesUniqueId}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-[#94A3B8] font-medium mb-1.5">
                                                    {formatDisplayDate(report.createdAt)}
                                                </p>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#64748B] font-semibold">
                                                    <span>Score: <strong className="text-indigo-600">{report.scorecard.totalScore}</strong>/{report.scorecard.maxMarks}</span>
                                                    <span>Accuracy: <strong>{report.scorecard.accuracy}%</strong></span>
                                                    <span>Duration: <strong>{formatDuration(report.scorecard.timeTaken)}</strong></span>
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                                                <span className="text-blue-600 text-xs font-bold">→</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 animate-fade-in">
            {/* Profile Header */}
            <div
                className="pt-12 pb-20 px-4 text-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)' }}
            >
                {/* Decorative circles */}
                <div className="absolute top-[-30px] right-[-30px] w-28 h-28 rounded-full opacity-5 bg-white" />
                <div className="absolute bottom-[-15px] left-[-15px] w-20 h-20 rounded-full opacity-5 bg-[#D97706]" />

                {/* Avatar */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#D97706] to-[#F59E0B] flex items-center justify-center shadow-lg relative z-10">
                    <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {initials}
                    </span>
                </div>
                <h1
                    className="text-xl font-bold text-white mb-1 relative z-10"
                    style={{ fontFamily: 'Playfair Display, serif' }}
                >
                    {user.name}
                </h1>
                {user.phone && (
                    <p className="text-white/60 text-sm flex items-center justify-center gap-1.5 relative z-10">
                        <span>📲</span>
                        {user.phone}
                    </p>
                )}
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1 rounded-full relative z-10">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-white/80 font-medium">UPSC Aspirant</span>
                </div>
            </div>

            {/* Profile Content */}
            <div className="max-w-md mx-auto px-4 -mt-10 relative z-20">
                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                        <span>✓</span>
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Account Details Card */}
                <div
                    className="bg-white rounded-2xl p-5 mb-4 shadow-md border border-gray-100"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-[#1E3A5F]">Account Details</h3>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-xs font-bold text-[#D97706] hover:underline"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {!isEditing ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-[#64748B]">Name</span>
                                <span className="text-sm font-medium text-[#1E3A5F]">{user.name}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-[#64748B]">Phone</span>
                                <span className="text-sm font-medium text-[#1E3A5F]">{user.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-[#64748B]">Email</span>
                                <span className="text-sm font-medium text-[#1E3A5F]">{user.email || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-[#64748B]">Status</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                    {user.status || 'Active'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#1E3A5F] mb-1 uppercase tracking-wider">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-3 h-10 bg-white border border-[#E5E7EB] focus:border-2 focus:border-[#1E3A5F] rounded-lg text-[#1E3A5F] placeholder-[#94A3B8] transition-all outline-none text-sm font-medium"
                                    required
                                    disabled={status === 'loading'}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1E3A5F] mb-1 uppercase tracking-wider">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="w-full px-3 h-10 bg-white border border-[#E5E7EB] focus:border-2 focus:border-[#1E3A5F] rounded-lg text-[#1E3A5F] placeholder-[#94A3B8] transition-all outline-none text-sm font-medium"
                                    disabled={status === 'loading'}
                                />
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setErrorMessage('');
                                    }}
                                    disabled={status === 'loading'}
                                    className="flex-1 py-2 h-10 rounded-lg border border-gray-200 text-[#64748B] font-semibold text-xs hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="flex-1 py-2 h-10 bg-[#1E3A5F] hover:bg-[#152C4A] rounded-lg text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {status === 'loading' ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    ) : (
                                        <span>Save Changes</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Feature Cards placeholders */}
                <div className="space-y-3 mb-6">
                    {/* Test Reports Card */}
                    <button
                        onClick={() => setActiveTab('reports')}
                        className="w-full text-left bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 hover:border-blue-200 shadow-sm transition-all active:scale-[0.99] group"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EEF2FF] group-hover:scale-105 transition-transform">
                            <span className="text-xl">📊</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#1E3A5F] group-hover:text-blue-600 transition-colors">Test Reports</p>
                            <p className="text-xs text-[#94A3B8]">Detailed scorecard evaluations & performance tracking</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-3 py-1 rounded-xl transition-all">
                            Open
                        </span>
                    </button>

                    {/* My Enrollments Card */}
                    <div className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm opacity-60">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D1FAE5]">
                            <span className="text-xl">📱</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#1E3A5F]">My Enrollments</p>
                            <p className="text-xs text-[#94A3B8]">UPSC classroom courses & optional test series access list</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#94A3B8] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Coming Soon
                        </span>
                    </div>

                    {/* My Doubts Card */}
                    <button
                        onClick={() => setActiveTab('doubts')}
                        className="w-full text-left bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100 hover:border-amber-200 shadow-sm transition-all active:scale-[0.99] group"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#FEF3C7] group-hover:scale-105 transition-transform">
                            <span className="text-xl">❓</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#1E3A5F] group-hover:text-[#D97706] transition-colors flex items-center gap-1.5">
                                <span>My Doubts</span>
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            </p>
                            <p className="text-xs text-[#94A3B8]">Direct subject doubts chat history with mentors</p>
                        </div>
                        <span className="text-xs font-bold text-[#D97706] bg-amber-50 group-hover:bg-amber-100 px-3 py-1 rounded-xl transition-all">
                            Open
                        </span>
                    </button>
                </div>

                {/* Logout Button */}
                {!showLogoutConfirm ? (
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors shadow-sm"
                    >
                        Logout
                    </button>
                ) : (
                    <div className="bg-white rounded-xl p-4 border border-red-200" style={{ boxShadow: '0 2px 8px rgba(220,38,38,0.1)' }}>
                        <p className="text-sm text-[#1E3A5F] text-center mb-3">
                            Are you sure you want to logout?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[#64748B] font-medium text-sm hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={logout}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
