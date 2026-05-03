'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearchEngine } from '@/hooks/useSearchEngine';
import type { ArticleMeta } from '@/lib/search-engine';

type FilterType = 'all' | 'daily_prelims' | 'mains' | 'burning_issue' | 'quiz';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const TYPE_TABS: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Prelims', value: 'daily_prelims' },
    { label: 'Mains', value: 'mains' },
    { label: 'Burning Issues', value: 'burning_issue' },
];

const TYPE_COLORS: Record<string, string> = {
    daily_prelims: 'bg-blue-100 text-blue-700',
    mains: 'bg-green-100 text-green-700',
    burning_issue: 'bg-orange-100 text-orange-700',
    burning_issue_gallery: 'bg-orange-100 text-orange-700',
    quiz: 'bg-purple-100 text-purple-700',
};

const TYPE_LABELS: Record<string, string> = {
    daily_prelims: 'Prelims',
    mains: 'Mains',
    burning_issue: 'Burning Issues',
    burning_issue_gallery: 'Burning Issues',
    quiz: 'Quiz',
};

function formatDisplayDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const LIMIT = 10;

function SearchPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { engine, isLoading: engineLoading, error: engineError } = useSearchEngine();

    const [query, setQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [page, setPage] = useState(1);

    // Read URL params on mount
    useEffect(() => {
        const q = searchParams.get('q');
        const tag = searchParams.get('tag');
        if (tag) {
            setActiveTag(tag);
        } else if (q && !query) {
            setQuery(q);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [query, activeTag, typeFilter, year, month]);

    // ─── Client-side search (zero API calls) ────────────────────────────────
    const searchResults = useMemo<ArticleMeta[]>(() => {
        if (!engine) return [];

        const filters = {
            type: typeFilter !== 'all' ? typeFilter : undefined,
            year: year ? Number(year) : undefined,
            month: month ? MONTHS.indexOf(month) + 1 : undefined,
        };

        // Tag search — O(1) lookup
        if (activeTag) {
            return engine.searchByTag(activeTag, filters);
        }

        // Title keyword search — O(k) with 3-char minimum
        if (query.trim().length >= 3) {
            return engine.searchByTitle(query, filters);
        }

        return [];
    }, [engine, query, activeTag, typeFilter, year, month]);

    // Paginate results client-side
    const totalPages = Math.max(1, Math.ceil(searchResults.length / LIMIT));
    const paginatedResults = searchResults.slice((page - 1) * LIMIT, page * LIMIT);
    const hasSearched = activeTag !== null || query.trim().length >= 3;

    const handleArticleClick = (article: ArticleMeta) => {
        const dateStr = article.date.split('T')[0];
        if (article.type === 'daily_prelims') {
            router.push(`/daily-prelims?date=${dateStr}`);
        } else if (article.type === 'mains') {
            router.push(`/daily-mains?date=${dateStr}`);
        } else if (article.type === 'burning_issue' || article.type === 'burning_issue_gallery') {
            router.push(`/burning-issues?id=${article._id}&date=${dateStr}`);
        } else if (article.type === 'quiz') {
            router.push(`/daily-quiz?date=${dateStr}`);
        }
    };

    const clearTag = () => {
        setActiveTag(null);
        // Also clear the URL param
        const url = new URL(window.location.href);
        url.searchParams.delete('tag');
        window.history.replaceState(null, '', url.toString());
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Search Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-16 z-20 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    {/* Active Tag Badge */}
                    {activeTag && (
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm text-gray-500">Showing results for tag:</span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FEF3C7] text-[#92400E] rounded-full text-sm font-semibold border border-[#FDE68A]">
                                #{activeTag}
                                <button
                                    onClick={clearTag}
                                    className="ml-1 text-[#92400E]/60 hover:text-[#92400E] transition"
                                    aria-label="Clear tag filter"
                                >
                                    ×
                                </button>
                            </span>
                        </div>
                    )}

                    {/* Search Input */}
                    {!activeTag && (
                        <div className="relative">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                            </svg>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by title keyword (min. 3 characters)…"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] bg-gray-50"
                                autoFocus
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    {/* 3-character hint */}
                    {!activeTag && query.trim().length > 0 && query.trim().length < 3 && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                            <span>💡</span>
                            Type at least 3 characters to search by title
                        </p>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-4">
                {/* Type Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {TYPE_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setTypeFilter(tab.value)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${typeFilter === tab.value
                                    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#1E3A5F] hover:text-[#1E3A5F]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Year / Month Filters */}
                <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm text-gray-500 font-medium">Filter by:</span>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                    >
                        <option value="">All Years</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                    >
                        <option value="">All Months</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* Results Count */}
                {hasSearched && !engineLoading && (
                    <p className="text-xs text-gray-500 mt-3">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                        {query.trim().length >= 3 && <> for <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span></>}
                        {activeTag && <> for tag <span className="font-semibold text-gray-700">#{activeTag}</span></>}
                        <span className="text-gray-300 ml-2">·</span>
                        <span className="ml-2 text-green-600">⚡ Instant (from index)</span>
                    </p>
                )}

                {/* Results */}
                <div className="mt-3 space-y-3">
                    {engineLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(n => (
                                <div key={n} className="animate-pulse bg-white rounded-xl p-4 border border-gray-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-5 w-16 bg-gray-200 rounded-full" />
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                </div>
                            ))}
                        </div>
                    ) : engineError ? (
                        <div className="text-center py-16 text-red-400">
                            <p className="text-4xl mb-3">⚠️</p>
                            <p className="font-medium text-red-600">Failed to load search index</p>
                            <p className="text-sm mt-1">{engineError}</p>
                        </div>
                    ) : !hasSearched ? (
                        <div className="text-center py-20 text-gray-400">
                            <p className="text-5xl mb-4">🔍</p>
                            <p className="font-medium text-gray-600">Search across all content</p>
                            <p className="text-sm mt-1">Type a keyword (min. 3 characters) or click a tag on any article</p>
                        </div>
                    ) : paginatedResults.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <p className="text-4xl mb-3">😕</p>
                            <p className="font-medium text-gray-600">No results found</p>
                            <p className="text-sm mt-1">Try a different keyword or filter</p>
                        </div>
                    ) : (
                        paginatedResults.map((article) => (
                            <button
                                key={article._id}
                                onClick={() => handleArticleClick(article)}
                                className="w-full text-left bg-white border border-gray-100 rounded-xl px-4 py-3.5 hover:border-[#F59E0B] hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Type Badge */}
                                    <span className={`flex-shrink-0 mt-0.5 px-2.5 py-1 rounded-lg text-xs font-bold ${TYPE_COLORS[article.type] || 'bg-gray-100 text-gray-700'}`}>
                                        {TYPE_LABELS[article.type] || article.type}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[#1E3A5F] text-sm leading-snug group-hover:text-[#D97706] transition-colors line-clamp-2">
                                            {article.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-gray-400">{formatDisplayDate(article.date)}</p>
                                            {article.tags?.[0] && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-xs text-gray-500">{article.tags[0]}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 group-hover:text-[#D97706] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && hasSearched && !engineLoading && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            ← Prev
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const p = Math.min(
                                Math.max(page - 2, 1) + i,
                                totalPages - Math.min(totalPages, 5) + i + 1
                            );
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${page === p
                                            ? 'bg-[#1E3A5F] text-white shadow'
                                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        {totalPages > 5 && page < totalPages - 2 && (
                            <span className="text-gray-400 text-sm">…</span>
                        )}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
            </div>
        }>
            <SearchPageInner />
        </Suspense>
    );
}
