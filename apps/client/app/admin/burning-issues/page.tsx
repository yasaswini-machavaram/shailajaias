'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface BurningIssueImage {
    url: string;
    originalName: string;
    order: number;
}

interface BurningIssue {
    _id: string;
    topic: string;
    images: BurningIssueImage[];
    date: string;
    createdAt: string;
}

export default function BurningIssuesAdminPage() {
    const { token } = useAuth();
    const [issues, setIssues] = useState<BurningIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchIssues();
    }, [token]);

    const fetchIssues = async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/burning-issues?limit=20`);
            const data = await response.json();

            if (data.success) {
                setIssues(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch burning issues:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteIssue = async (id: string) => {
        if (!confirm('Are you sure you want to delete this burning issue and all its images?')) return;

        try {
            const response = await fetch(`${API_URL}/api/burning-issues/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setIssues(issues.filter((i) => i._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete burning issue:', error);
        }
    };

    const getImageUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        return `${API_URL}${url}`;
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Burning Issues</h1>
                    <p className="text-gray-600 mt-1">Manage image-based burning issue carousels</p>
                </div>
                <Link
                    href="/admin/burning-issues/new"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                    + Create Burning Issue
                </Link>
            </div>

            {/* Issues Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                </div>
            ) : issues.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    <p>No burning issues found.</p>
                    <Link href="/admin/burning-issues/new" className="text-amber-500 hover:underline mt-2 inline-block">
                        Create your first burning issue
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {issues.map((issue) => (
                        <div
                            key={issue._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Cover Image (first image) */}
                            <div className="aspect-[9/16] bg-gray-100 relative">
                                {issue.images && issue.images.length > 0 ? (
                                    <img
                                        src={getImageUrl(issue.images.sort((a, b) => a.order - b.order)[0].url)}
                                        alt={issue.topic}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <span className="text-4xl">📷</span>
                                    </div>
                                )}
                                {/* Image count badge */}
                                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
                                    {issue.images?.length || 0} slides
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{issue.topic}</h3>
                                <p className="text-sm text-gray-500">
                                    {new Date(issue.date).toLocaleDateString('en-IN', {
                                        timeZone: 'UTC',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>

                                {/* Actions */}
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => deleteIssue(issue._id)}
                                        className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm text-center rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
