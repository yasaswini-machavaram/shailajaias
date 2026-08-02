'use client';

import { useState, useEffect } from 'react';
import { useMentorAuth } from './MentorAuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function MentorDashboard() {
    const { user, token } = useMentorAuth();
    const [stats, setStats] = useState({ pending: 0, underReview: 0, completed: 0, total: 0 });
    const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { if (token) fetchData(); }, [token]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch assigned submissions
            const res = await fetch(`${API_URL}/api/mts/submissions/mentor`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                const subs = data.data || [];
                setRecentSubmissions(subs.slice(0, 10));
                setStats({
                    pending: subs.filter((s: any) => s.status === 'assigned').length,
                    underReview: subs.filter((s: any) => s.status === 'under_review').length,
                    completed: subs.filter((s: any) => s.status === 'evaluated').length,
                    total: subs.length,
                });
            }
        } catch (e) { console.error('Dashboard fetch error:', e); }
        finally { setIsLoading(false); }
    };

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
        catch { return d; }
    };

    const statusColors: Record<string, string> = {
        assigned: 'bg-yellow-100 text-yellow-800',
        under_review: 'bg-orange-100 text-orange-800',
        evaluated: 'bg-green-100 text-green-800',
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Welcome back, {user?.name} 👋</h1>
            <p className="text-sm text-slate-500 mb-6">Here&apos;s your evaluation overview.</p>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Total Assigned</p>
                </div>
                <div className="bg-yellow-50 rounded-2xl p-5 border border-yellow-200">
                    <p className="text-3xl font-bold text-yellow-700">{stats.pending}</p>
                    <p className="text-xs font-bold text-yellow-600 mt-1 uppercase tracking-wider">Pending</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-5 border border-orange-200">
                    <p className="text-3xl font-bold text-orange-700">{stats.underReview}</p>
                    <p className="text-xs font-bold text-orange-600 mt-1 uppercase tracking-wider">Under Review</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
                    <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
                    <p className="text-xs font-bold text-green-600 mt-1 uppercase tracking-wider">Completed</p>
                </div>
            </div>

            {/* Recent Submissions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Recent Submissions</h2>
                </div>
                {recentSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No submissions assigned yet.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recentSubmissions.map(sub => (
                            <div key={sub._id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{sub.student?.name || 'Student'}</p>
                                    <p className="text-xs text-slate-500">{sub.testTitle} • {sub.seriesUniqueId}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Submitted: {formatDate(sub.submittedAt)}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-3 py-1 rounded ${statusColors[sub.status] || 'bg-gray-100'}`}>
                                    {sub.status.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
