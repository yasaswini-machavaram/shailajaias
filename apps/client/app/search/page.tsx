'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ArticleType = 'daily_prelims' | 'mains' | 'burning_issue' | 'quiz';
type FilterType = 'all' | ArticleType;

interface Article {
    _id: string;
    title: string;
    date: string;
    tags: string[];
    type: ArticleType;
}

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
    { label: 'Test Series', value: 'quiz' },
];

const TYPE_COLORS: Record<ArticleType, string> = {
    daily_prelims: 'bg-blue-100 text-blue-700',
    mains: 'bg-green-100 text-green-700',
    burning_issue: 'bg-orange-100 text-orange-700',
    quiz: 'bg-purple-100 text-purple-700',
};

const TYPE_LABELS: Record<ArticleType, string> = {
    daily_prelims: 'Prelims',
    mains: 'Mains',
    burning_issue: 'Burning Issues',
    quiz: 'Test Series',
};

function formatDisplayDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const LIMIT = 10;

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [articles, setArticles] = useState<Article[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchResults = useCallback(async (q: string, type: FilterType, y: string, m: string, p: number) => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            let url = `${API_URL}/api/search?limit=${LIMIT}&page=${p}`;
            if (q.trim()) url += `&q=${encodeURIComponent(q.trim())}`;
            if (type !== 'all') url += `&type=${type}`;
            if (y) url += `&year=${y}`;
            if (m) url += `&month=${MONTHS.indexOf(m) + 1}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setArticles(data.data);
                setTotalPages(data.pagination?.pages || 1);
                setTotal(data.pagination?.total || 0);
            }
        } catch {
            setArticles([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search on query change
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (query.trim() || typeFilter !== 'all' || year || month) {
                setPage(1);
                fetchResults(query, typeFilter, year, month, 1);
            }
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, typeFilter, year, month]);

    // Re-fetch on page change
    useEffect(() => {
        if (hasSearched) {
            fetchResults(query, typeFilter, year, month, page);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const resetPage = () => setPage(1);

    const handleArticleClick = (article: Article) => {
        const dateStr = article.date.split('T')[0];
        if (article.type === 'daily_prelims') {
            router.push(`/daily-prelims?date=${dateStr}`);
        } else if (article.type === 'mains') {
            router.push(`/daily-mains?date=${dateStr}`);
        } else if (article.type === 'burning_issue') {
            router.push(`/burning-issues?id=${article._id}&date=${dateStr}`);
        } else if (article.type === 'quiz') {
            router.push(`/daily-quiz?date=${dateStr}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-base font-bold text-[#1E3A5F] mb-3 font-headline">
                        Current Affairs <span className="text-gray-400">›</span>{' '}
                        <span className="text-[#D97706]">Search</span>
                    </h1>
                    {/* Search Input */}
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
                            placeholder="Search articles, topics, keywords…"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] bg-gray-50"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setArticles([]); setHasSearched(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-4">
                {/* Type Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {TYPE_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => { setTypeFilter(tab.value); resetPage(); }}
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
                        onChange={(e) => { setYear(e.target.value); resetPage(); }}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                    >
                        <option value="">All Years</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={month}
                        onChange={(e) => { setMonth(e.target.value); resetPage(); }}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                    >
                        <option value="">All Months</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* Results Count */}
                {hasSearched && !isLoading && (
                    <p className="text-xs text-gray-500 mt-3">
                        {total} result{total !== 1 ? 's' : ''} found
                        {query.trim() && <> for <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span></>}
                    </p>
                )}

                {/* Results */}
                <div className="mt-3 space-y-3">
                    {isLoading ? (
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
                    ) : !hasSearched ? (
                        <div className="text-center py-20 text-gray-400">
                            <p className="text-5xl mb-4">🔍</p>
                            <p className="font-medium text-gray-600">Search across all content</p>
                            <p className="text-sm mt-1">Type a keyword, topic or article name</p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <p className="text-4xl mb-3">😕</p>
                            <p className="font-medium text-gray-600">No results found</p>
                            <p className="text-sm mt-1">Try a different keyword or filter</p>
                        </div>
                    ) : (
                        articles.map((article) => (
                            <button
                                key={article._id}
                                onClick={() => handleArticleClick(article)}
                                className="w-full text-left bg-white border border-gray-100 rounded-xl px-4 py-3.5 hover:border-[#F59E0B] hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Type Badge */}
                                    <span className={`flex-shrink-0 mt-0.5 px-2.5 py-1 rounded-lg text-xs font-bold ${TYPE_COLORS[article.type]}`}>
                                        {TYPE_LABELS[article.type]}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[#1E3A5F] text-sm leading-snug group-hover:text-[#D97706] transition-colors line-clamp-2">
                                            {article.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-gray-400">{formatDisplayDate(article.date)}</p>
                                            {article.tags[0] && (
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
                {totalPages > 1 && hasSearched && !isLoading && (
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
