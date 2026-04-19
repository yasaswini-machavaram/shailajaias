'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ArticleSection = 'daily_prelims' | 'mains' | 'burning_issue';

interface Article {
    _id: string;
    title: string;
    date: string;
    tags: string[];
    type: ArticleSection;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const SECTION_LABELS: Record<ArticleSection, string> = {
    daily_prelims: 'Prelims',
    mains: 'Mains',
    burning_issue: 'Burning Issues',
};

function formatDisplayDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TopicsPage() {
    const router = useRouter();
    const [section, setSection] = useState<ArticleSection>('daily_prelims');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('All');
    const [year, setYear] = useState<string>('');
    const [month, setMonth] = useState<string>('');
    const [articles, setArticles] = useState<Article[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [tagsLoading, setTagsLoading] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const LIMIT = 10;

    // Fetch available tags whenever section changes
    useEffect(() => {
        setTagsLoading(true);
        setSelectedTag('All');
        fetch(`${API_URL}/api/articles/tags?type=${section}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setTags(d.data as string[]);
            })
            .catch(() => setTags([]))
            .finally(() => setTagsLoading(false));
    }, [section]);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            if (section === 'burning_issue') {
                // Burning issues are in a separate collection
                let url = `${API_URL}/api/burning-issues?limit=${LIMIT}&page=${page}`;
                if (year) url += `&year=${year}`;
                if (month) url += `&month=${MONTHS.indexOf(month) + 1}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    // Map BurningIssue shape to Article shape for consistent display
                    const mapped = (data.data || []).map((bi: any) => ({
                        _id: bi._id,
                        title: bi.topic,
                        date: bi.date,
                        tags: [],
                        type: 'burning_issue' as ArticleSection,
                    }));
                    setArticles(mapped);
                    setTotalPages(data.pagination?.pages || 1);
                }
            } else {
                let url = `${API_URL}/api/search?type=${section}&limit=${LIMIT}&page=${page}`;
                if (selectedTag !== 'All') url += `&q=${encodeURIComponent(selectedTag)}`;
                if (year) url += `&year=${year}`;
                if (month) url += `&month=${MONTHS.indexOf(month) + 1}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    setArticles(data.data);
                    setTotalPages(data.pagination?.pages || 1);
                }
            }
        } catch {
            setArticles([]);
        } finally {
            setIsLoading(false);
        }
    }, [section, selectedTag, year, month, page]);

    useEffect(() => {
        setPage(1);
    }, [section, selectedTag, year, month]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchArticles();
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchArticles]);

    const handleArticleClick = (article: Article) => {
        const dateStr = article.date.split('T')[0];
        let path = '/daily-prelims';
        if (article.type === 'mains') path = '/daily-mains';
        if (article.type === 'burning_issue' || (article as any).type === 'burning_issue') path = '/burning-issues';
        if (article.type === 'quiz' || (article as any).type === 'quiz') path = '/daily-quiz';
        const idStr = article._id;
        router.push(`${path}?id=${idStr}&date=${dateStr}`);
    };

    const handleSectionChange = (s: ArticleSection) => {
        setSection(s);
        setYear('');
        setMonth('');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            <div className="max-w-3xl mx-auto px-4">
                {/* Prelims / Mains Toggle */}
                <div className="flex gap-1 mt-5 bg-gray-200 rounded-2xl p-1 w-fit mx-auto overflow-x-auto max-w-full">
                    {(['daily_prelims', 'mains', 'burning_issue'] as ArticleSection[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => handleSectionChange(s)}
                            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${section === s
                                    ? 'bg-gray-800 text-white shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {SECTION_LABELS[s]}
                        </button>
                    ))}
                </div>

                {/* Tag Chips */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {tagsLoading ? (
                        <div className="animate-pulse flex gap-2">
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} className="h-8 w-20 bg-gray-200 rounded-full" />
                            ))}
                        </div>
                    ) : (
                        ['All', ...tags].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${selectedTag === tag
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))
                    )}
                </div>

                {/* Year / Month Filters */}
                <div className="flex items-center gap-3 mt-4">
                    <span className="text-sm text-gray-500 font-medium">Filter by:</span>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Years</option>
                        {YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Months</option>
                        {MONTHS.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Article List */}
                <div className="mt-5 space-y-3">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(n => (
                                <div key={n} className="animate-pulse bg-white rounded-xl p-4 border border-gray-100">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                </div>
                            ))}
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <p className="text-4xl mb-3">📂</p>
                            <p className="font-medium text-gray-600">No articles found</p>
                            <p className="text-sm mt-1">Try changing the filters</p>
                        </div>
                    ) : (
                        articles.map((article) => (
                            <button
                                key={article._id}
                                onClick={() => handleArticleClick(article)}
                                className="w-full text-left bg-white border border-gray-100 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                                            {article.title}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatDisplayDate(article.date)}
                                        </p>
                                    </div>
                                    {article.tags[0] && (
                                        <span className="flex-shrink-0 px-2.5 py-1 border border-gray-300 rounded-full text-xs text-gray-600 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                                            {article.tags[0]}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && !isLoading && (
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
                                            ? 'bg-blue-600 text-white shadow'
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
