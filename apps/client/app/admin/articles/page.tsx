'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { useSearchEngine } from '@/hooks/useSearchEngine';
import { SearchCache } from '@/lib/search-cache';
import type { ArticleMeta } from '@/lib/search-engine';

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
    const {
        engine,
        isLoading: engineLoading,
        isCached,
        cacheAge,
        refresh: refreshIndex,
    } = useSearchEngine();

    // ─── State for the main table (API-backed, paginated) ───────────────
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<ArticleType>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Whether we're using client-side search or server-side table
    const isSearchActive = searchQuery.trim().length >= 3;
    const isSearchTooShort = searchQuery.trim().length > 0 && searchQuery.trim().length < 3;

    // ─── Client-side search results (from engine) ───────────────────────
    const searchResults = useMemo<ArticleMeta[]>(() => {
        if (!engine || !isSearchActive) return [];
        return engine.searchByTitle(searchQuery, {
            type: filter !== 'all' ? filter : undefined,
        });
    }, [engine, searchQuery, filter, isSearchActive]);

    // Paginate client-side search results
    const searchPage = useMemo(() => {
        const limit = 15;
        const start = (page - 1) * limit;
        return searchResults.slice(start, start + limit);
    }, [searchResults, page]);

    const searchTotalPages = Math.max(1, Math.ceil(searchResults.length / 15));

    // ─── Server-side table (no search active) ───────────────────────────
    useEffect(() => {
        if (isSearchActive) return; // Skip when using client-side search
        fetchArticles();
    }, [token, filter, page, dateFilter, isSearchActive]);

    // Reset page on filter changes
    useEffect(() => {
        setPage(1);
    }, [searchQuery, filter, dateFilter]);

    const fetchArticles = async () => {
        if (!token) return;
        setIsLoading(true);

        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '15');
            if (filter !== 'all') params.set('type', filter);
            if (dateFilter) params.set('date', dateFilter);

            const response = await fetch(
                `${API_URL}/api/articles?${params.toString()}`,
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

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            const response = await fetch(`${API_URL}/api/articles/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                setArticles(prev => prev.filter((a) => a._id !== deleteTarget.id));
                // Refresh search index so deleted article disappears from search
                SearchCache.clear();
                refreshIndex();
            }
        } catch (error) {
            console.error('Failed to delete article:', error);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setDateFilter('');
        setFilter('all');
        setPage(1);
    };

    const hasActiveFilters = searchQuery || dateFilter;

    // Determine which data to display
    const displayArticles = isSearchActive ? searchPage : articles;
    const displayTotalPages = isSearchActive ? searchTotalPages : totalPages;
    const showLoading = isSearchActive ? engineLoading : isLoading;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
                    <p className="text-gray-600 mt-1">Manage Daily Prelims, Mains, and Burning Issues</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/admin/articles/import"
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                        📊 Import Prelims
                    </Link>
                    <Link
                        href="/admin/articles/import-mains"
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                    >
                        📊 Import Mains
                    </Link>
                    <Link
                        href="/admin/articles/new"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                        + Create Article
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
                {/* Type filter chips */}
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

                {/* Search + Date filter row */}
                <div className="flex gap-3 items-center">
                    {/* Search by title/tags */}
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title (min. 3 characters)..."
                            className="w-full pl-10 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Date filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 whitespace-nowrap">📅 Date:</span>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>

                    {/* Clear all */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>

                {/* 3-character hint */}
                {isSearchTooShort && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                        <span>💡</span>
                        Type at least 3 characters to search by title
                    </p>
                )}

                {/* Cache indicator (admin-only feature) */}
                {isSearchActive && (
                    <div className="flex items-center gap-2 text-xs">
                        {isCached ? (
                            <>
                                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-gray-500">
                                    Results from cache
                                    {cacheAge && <span className="text-gray-400"> · updated {cacheAge}</span>}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full" />
                                <span className="text-gray-500">Results from live index</span>
                            </>
                        )}
                        <button
                            onClick={async () => {
                                SearchCache.clear();
                                await refreshIndex();
                            }}
                            className="ml-1 text-amber-600 hover:text-amber-700 font-medium hover:underline"
                        >
                            🔄 Refresh
                        </button>
                        <span className="text-gray-300">·</span>
                        <span className="text-green-600 font-medium">⚡ {searchResults.length} results (instant)</span>
                    </div>
                )}
            </div>

            {/* Articles Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {showLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                    </div>
                ) : displayArticles.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No articles found.</p>
                        {!isSearchActive && (
                            <Link href="/admin/articles/new" className="text-amber-500 hover:underline mt-2 inline-block">
                                Create your first article
                            </Link>
                        )}
                    </div>
                ) : (
                    <table className="w-full" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500" style={{ width: '35%' }}>Title</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500" style={{ width: '15%' }}>Type</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500" style={{ width: '15%' }}>Date</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500" style={{ width: '20%' }}>Tags</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500" style={{ width: '15%' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {displayArticles.map((article) => (
                                <tr key={article._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4" style={{ maxWidth: '300px' }}>
                                        <span className="font-medium text-gray-900 block truncate">{article.title}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[article.type] || 'bg-gray-100 text-gray-700'}`}>
                                            {typeLabels[article.type] || article.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(article.date).toLocaleDateString('en-IN', { timeZone: 'UTC' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {(article.tags || []).slice(0, 3).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                                    {tag}
                                                </span>
                                            ))}
                                            {(article.tags || []).length > 3 && (
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
                                            onClick={() => setDeleteTarget({ id: article._id, title: article.title })}
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
                {displayTotalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">
                            Page {page} of {displayTotalPages}
                            {isSearchActive && <span className="text-green-600 ml-2">(⚡ from index)</span>}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(displayTotalPages, page + 1))}
                            disabled={page === displayTotalPages}
                            className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => !isDeleting && setDeleteTarget(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Article</h3>
                        <p className="text-gray-600 text-sm mb-1">Are you sure you want to delete:</p>
                        <p className="text-gray-900 font-medium text-sm mb-4 break-words whitespace-pre-wrap">&quot;{deleteTarget.title}&quot;</p>
                        <p className="text-red-600 text-xs mb-5">This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
