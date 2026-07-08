'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Stats {
    articles: number;
    burningIssues: number;
    magazines: number;
    quizzes: number;
    courses: number;
}

export default function AdminDashboard() {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<Stats>({ articles: 0, burningIssues: 0, magazines: 0, quizzes: 0, courses: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;

            try {
                const [articlesRes, burningIssuesRes, magazinesRes, quizzesRes, coursesRes] = await Promise.all([
                    fetch(`${API_URL}/api/articles?limit=1`),
                    fetch(`${API_URL}/api/burning-issues?limit=1`),
                    fetch(`${API_URL}/api/magazines?limit=1`),
                    fetch(`${API_URL}/api/quizzes?limit=1`),
                    fetch(`${API_URL}/api/courses`),
                ]);

                const [articlesData, burningIssuesData, magazinesData, quizzesData, coursesData] = await Promise.all([
                    articlesRes.json(),
                    burningIssuesRes.json(),
                    magazinesRes.json(),
                    quizzesRes.json(),
                    coursesRes.json(),
                ]);

                setStats({
                    articles: articlesData.pagination?.total || 0,
                    burningIssues: burningIssuesData.pagination?.total || 0,
                    magazines: magazinesData.pagination?.total || 0,
                    quizzes: quizzesData.pagination?.total || 0,
                    courses: coursesData.data?.length || 0,
                });
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    const statCards = [
        { label: 'Total Articles', value: stats.articles, color: 'from-blue-500 to-blue-600', href: '/admin/articles', icon: '📝' },
        { label: 'Burning Issues', value: stats.burningIssues, color: 'from-orange-500 to-orange-600', href: '/admin/burning-issues', icon: '🔥' },
        { label: 'Magazines', value: stats.magazines, color: 'from-purple-500 to-purple-600', href: '/admin/magazines', icon: '📚' },
        { label: 'Quizzes', value: stats.quizzes, color: 'from-green-500 to-green-600', href: '/admin/quizzes', icon: '❓' },
        { label: 'Courses', value: stats.courses, color: 'from-amber-500 to-amber-600', href: '/admin/courses', icon: '🎓' },
    ];

    const quickActions = [
        { label: 'Create Article', href: '/admin/articles/new', icon: '📝' },
        { label: 'Create Burning Issue', href: '/admin/burning-issues/new', icon: '🔥' },
        { label: 'Upload Magazine', href: '/admin/magazines', icon: '📚' },
        { label: 'Create Quiz', href: '/admin/quizzes/new', icon: '❓' },
        { label: 'Import Excel Quiz', href: '/admin/quizzes/import', icon: '📊' },
    ];

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Admin'}!</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {statCards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r ${card.color} mb-4`}>
                            <span className="text-2xl text-white font-bold">{card.icon}</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{card.label}</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {isLoading ? (
                                <span className="inline-block w-16 h-6 bg-gray-200 animate-pulse rounded"></span>
                            ) : (
                                card.value
                            )}
                        </p>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <span className="text-3xl mb-2">{action.icon}</span>
                            <span className="text-sm font-medium text-gray-700">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="text-center py-8 text-gray-500">
                    <p>No recent activity to show.</p>
                    <p className="text-sm mt-2">Start by creating some content!</p>
                </div>
            </div>
        </div>
    );
}
