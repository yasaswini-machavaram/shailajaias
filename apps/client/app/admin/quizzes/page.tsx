'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Quiz {
    _id: string;
    title: string;
    setName?: string;
    date: string;
    tags: string[];
    questionsCount?: number;
}

export default function QuizzesPage() {
    const { token } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'practice' | 'series'>('all');

    useEffect(() => {
        fetchQuizzes();

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam === 'practice') {
                setActiveTab('practice');
            } else if (tabParam === 'daily') {
                setActiveTab('daily');
            } else if (tabParam === 'series') {
                setActiveTab('series');
            }
        }
    }, [token]);

    const fetchQuizzes = async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/quizzes?limit=100`);
            const data = await response.json();

            if (data.success) {
                setQuizzes(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteQuiz = async (id: string) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;

        try {
            const response = await fetch(`${API_URL}/api/quizzes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setQuizzes(quizzes.filter((q) => q._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete quiz:', error);
        }
    };

    // Filter quizzes based on active tab
    const filteredQuizzes = quizzes.filter((quiz) => {
        const isPractice = quiz.tags?.includes('prelims-practice');
        const isSeries = quiz.tags?.includes('prelims-test-series');
        
        if (activeTab === 'daily') {
            return !isPractice && !isSeries;
        }
        if (activeTab === 'practice') {
            return isPractice;
        }
        if (activeTab === 'series') {
            return isSeries;
        }
        return true;
    });

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 font-headline">Quizzes & Tests</h1>
                    <p className="text-gray-600 mt-1">Manage daily quizzes, practice tests, and test series questions</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={activeTab === 'practice' ? '/admin/quizzes/import?type=practice' : '/admin/quizzes/import'}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        📊 Import Excel
                    </Link>
                    <Link
                        href={activeTab === 'practice' ? '/admin/quizzes/new?type=practice' : '/admin/quizzes/new'}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        + Create Quiz
                    </Link>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6 gap-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'all'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    All Quizzes ({quizzes.length})
                </button>
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'daily'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Daily Quizzes ({quizzes.filter(q => !q.tags?.includes('prelims-practice') && !q.tags?.includes('prelims-test-series')).length})
                </button>
                <button
                    onClick={() => setActiveTab('practice')}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'practice'
                            ? 'border-purple-500 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Prelims Practice Tests ({quizzes.filter(q => q.tags?.includes('prelims-practice')).length})
                </button>
                <button
                    onClick={() => setActiveTab('series')}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'series'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    Test Series Quizzes ({quizzes.filter(q => q.tags?.includes('prelims-test-series')).length})
                </button>
            </div>

            {/* Quizzes Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                    </div>
                ) : filteredQuizzes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No quizzes found under this tab.</p>
                        <Link href="/admin/quizzes/new" className="text-amber-500 hover:underline mt-2 inline-block">
                            Create your first quiz
                        </Link>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Title</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Tags</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredQuizzes.map((quiz) => (
                                <tr key={quiz._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-gray-900">{quiz.title}</span>
                                        {quiz.setName && (
                                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                {quiz.setName}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(quiz.date).toLocaleDateString('en-IN', { timeZone: 'UTC' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {quiz.tags?.map((tag) => {
                                                let tagStyle = 'bg-gray-100 text-gray-600 border border-gray-200';
                                                if (tag === 'prelims-practice') {
                                                    tagStyle = 'bg-purple-100 text-purple-800 border border-purple-200 font-semibold';
                                                } else if (tag === 'prelims-test-series') {
                                                    tagStyle = 'bg-blue-100 text-blue-800 border border-blue-200 font-semibold';
                                                }
                                                return (
                                                    <span key={tag} className={`px-2 py-0.5 rounded text-xs lowercase ${tagStyle}`}>
                                                        {tag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/quizzes/${quiz._id}`}
                                            className="text-blue-600 hover:underline text-sm mr-4"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => deleteQuiz(quiz._id)}
                                            className="text-red-600 hover:underline text-sm"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
