'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Article {
    _id: string;
    title: string;
    type: 'daily_prelims' | 'mains' | 'burning_issue';
    date: string;
    tags: string[];
    createdAt: string;
}

type ArticleType = 'all' | 'daily_prelims' | 'mains' | 'burning_issue';

const typeLabels: Record<string, string> = {
    daily_prelims: 'Daily Prelims',
    mains: 'Mains',
    burning_issue: 'Burning Issue',
};

const typeColors: Record<string, string> = {
    daily_prelims: 'bg-blue-100 text-blue-800',
    mains: 'bg-purple-100 text-purple-800',
    burning_issue: 'bg-orange-100 text-orange-800',
};

export default function ArticlesPage() {
    const { token } = useAuth();
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<ArticleType>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchArticles();
    }, [token, filter, page]);

    const fetchArticles = async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const typeParam = filter !== 'all' ? `&type=${filter}` : '';
            const response = await fetch(
                `${API_URL}/api/articles?page=${page}&limit=10${typeParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json();

            if (data.success) {
                setArticles(data.data);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteArticle = async (id: string) => {
        if (!confirm('Are you sure you want to delete this article?')) return;

        try {
            const response = await fetch(`${API_URL}/api/articles/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setArticles(articles.filter((a) => a._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete article:', error);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
                    <p className="text-gray-600 mt-1">Manage Daily Prelims, Mains, and Burning Issues</p>
                </div>
                <Link
                    href="/admin/articles/new"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                    + Create Article
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex gap-2">
                    {(['all', 'daily_prelims', 'mains', 'burning_issue'] as ArticleType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => { setFilter(type); setPage(1); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === type
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {type === 'all' ? 'All' : typeLabels[type]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Articles Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No articles found.</p>
                        <Link href="/admin/articles/new" className="text-amber-500 hover:underline mt-2 inline-block">
                            Create your first article
                        </Link>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Title</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Type</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Tags</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {articles.map((article) => (
                                <tr key={article._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900">{article.title}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[article.type]}`}>
                                            {typeLabels[article.type]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(article.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {article.tags.slice(0, 3).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                                    {tag}
                                                </span>
                                            ))}
                                            {article.tags.length > 3 && (
                                                <span className="text-xs text-gray-400">+{article.tags.length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/articles/${article._id}`}
                                            className="text-blue-600 hover:underline text-sm mr-4"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => deleteArticle(article._id)}
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
