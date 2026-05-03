'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Quiz {
    _id: string;
    title: string;
    date: string;
    tags: string[];
    questionsCount?: number;
}

export default function QuizzesPage() {
    const { token } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchQuizzes();
    }, [token]);

    const fetchQuizzes = async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/quizzes?limit=20`);
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

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>
                    <p className="text-gray-600 mt-1">Manage daily quizzes and practice tests</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/admin/quizzes/import"
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                        📊 Import Excel
                    </Link>
                    <Link
                        href="/admin/quizzes/new"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                        + Create Quiz
                    </Link>
                </div>
            </div>

            {/* Quizzes Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No quizzes found.</p>
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
                            {quizzes.map((quiz) => (
                                <tr key={quiz._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900">{quiz.title}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(quiz.date).toLocaleDateString('en-IN', { timeZone: 'UTC' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {quiz.tags?.slice(0, 3).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                                    {tag}
                                                </span>
                                            ))}
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
