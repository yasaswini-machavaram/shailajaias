'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DatePicker from '@/components/DatePicker';
import RichTextRenderer from '@/components/RichTextRenderer';
import { getArticlesByDate, getAdjacentDates, formatDate, type Article } from '@/lib/api';
import { useRef } from 'react';

function DailyMainsInner() {
    const searchParams = useSearchParams();
    const [selectedDate, setSelectedDate] = useState(() => {
        const paramDate = searchParams.get('date');
        if (paramDate) return paramDate;
        return new Date().toISOString().split('T')[0];
    });
    const [articles, setArticles] = useState<Article[]>([]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [adjacentDates, setAdjacentDates] = useState<{ previous: string | null; next: string | null }>({ previous: null, next: null });
    const pendingIndex = useRef<number | null>(null);

    // Update URL when date changes
    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('date', selectedDate);
        window.history.replaceState(null, '', url.toString());
    }, [selectedDate]);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const [articlesData, datesData] = await Promise.all([
                    getArticlesByDate('mains', selectedDate),
                    getAdjacentDates('mains', selectedDate)
                ]);
                setArticles(articlesData);
                setAdjacentDates(datesData);

                if (pendingIndex.current !== null) {
                    setExpandedIndex(pendingIndex.current === -1 ? articlesData.length - 1 : pendingIndex.current);
                    pendingIndex.current = null;
                } else if (articlesData.length > 0) {
                    setExpandedIndex(0); // Auto-expand first article
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                setArticles([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [selectedDate]);

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const goToPrevArticle = () => {
        if (expandedIndex !== null && expandedIndex > 0) {
            setExpandedIndex(expandedIndex - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (adjacentDates.previous) {
            pendingIndex.current = -1;
            setSelectedDate(adjacentDates.previous.split('T')[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToNextArticle = () => {
        if (expandedIndex !== null && expandedIndex < articles.length - 1) {
            setExpandedIndex(expandedIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (adjacentDates.next) {
            pendingIndex.current = 0;
            setSelectedDate(adjacentDates.next.split('T')[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToPrevDay = () => {
        if (adjacentDates.previous) {
            setSelectedDate(adjacentDates.previous.split('T')[0]);
        }
    };

    const goToNextDay = () => {
        if (adjacentDates.next) {
            setSelectedDate(adjacentDates.next.split('T')[0]);
        }
    };

    // Sample icons for different question types
    const getIcon = (index: number) => {
        const icons = ['🛡️', '⚖️', '📈', '🌍', '🔬', '🎭'];
        return icons[index % icons.length];
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-bold text-[#1E3A5F]">
                            Current Affairs &gt; <span className="text-[#D97706]">Daily Mains</span>
                        </h1>
                    </div>
                    <DatePicker 
                        selectedDate={new Date(selectedDate)} 
                        onDateChange={(date) => setSelectedDate(date.toISOString().split('T')[0])} 
                    />
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📝</div>
                        <h2 className="text-xl font-bold text-[#1E3A5F] mb-2 font-headline">No mains content for this date</h2>
                        <p className="text-gray-500">Try selecting a different date</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Accordion Questions */}
                        <div className="space-y-3">
                            {articles.map((article, index) => (
                                <div
                                    key={article._id}
                                    className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${expandedIndex === index ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/20' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {/* Header - Always visible */}
                                    <button
                                        onClick={() => toggleExpand(index)}
                                        className="w-full px-6 py-5 flex items-center gap-4 text-left transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shadow-inner flex-shrink-0">
                                            {getIcon(index)}
                                        </div>
                                        <span className={`flex-1 font-bold text-lg leading-snug transition-colors ${expandedIndex === index ? 'text-[#1E3A5F]' : 'text-gray-700'
                                            }`}>
                                            {article.title}
                                        </span>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${expandedIndex === index ? 'bg-[#3B82F6] text-white rotate-180' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Expanded Content */}
                                    {expandedIndex === index && (
                                        <div className="px-6 pb-6 animate-fadeIn">
                                            <div className="h-px bg-gray-100 mb-6" />
                                            <div className="prose prose-slate max-w-none">
                                                <RichTextRenderer content={article.content} />
                                            </div>

                                            {/* Article Source */}
                                            {article.source && (
                                                <div className="mt-6 p-4 bg-gray-50 rounded-xl flex items-center gap-2 text-sm text-gray-600 border border-gray-100">
                                                    <span className="font-semibold text-gray-400">Source:</span>
                                                    <span className="text-[#3B82F6] font-medium underline decoration-dotted underline-offset-4 cursor-pointer">
                                                        {article.source}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {article.tags && article.tags.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {article.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold uppercase tracking-wider border border-gray-200"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Internal Prev/Next Article Links */}
                                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center text-sm font-medium">
                                                <button
                                                    onClick={goToPrevArticle}
                                                    disabled={!adjacentDates.previous && index === 0}
                                                    className="flex items-center gap-2 text-gray-500 hover:text-[#1E3A5F] transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
                                                >
                                                    <span className="text-xl group-hover:-translate-x-1 transition-transform">‹</span>
                                                    Previous Article
                                                </button>
                                                <button
                                                    onClick={goToNextArticle}
                                                    disabled={!adjacentDates.next && index === articles.length - 1}
                                                    className="flex items-center gap-2 text-gray-500 hover:text-[#1E3A5F] transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
                                                >
                                                    Next Article
                                                    <span className="text-xl group-hover:translate-x-1 transition-transform">›</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Practice Question Box */}
                        <div className="mt-8">
                            <Link 
                                href={`/daily-quiz?date=${selectedDate}`}
                                className="block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:border-blue-300 transition-all group"
                            >
                                <div className="w-full px-6 py-5 flex items-center justify-between">
                                    <span className="font-bold text-gray-700 flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl">❓</span>
                                        Practice MCQs from today&apos;s CA
                                    </span>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        </div>

                        {/* Day Navigation Buttons */}
                        <div className="mt-12 flex justify-between gap-4">
                            <button
                                onClick={goToPrevDay}
                                disabled={!adjacentDates.previous}
                                className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <span className="text-xl">‹</span> Previous Day
                            </button>
                            <button
                                onClick={goToNextDay}
                                disabled={!adjacentDates.next}
                                className="px-8 py-3 bg-[#1E3A5F] text-white rounded-xl font-bold shadow-lg hover:bg-[#2C4A73] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                Next Day <span className="text-xl">›</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function DailyMainsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" /></div>}>
            <DailyMainsInner />
        </Suspense>
    );
}
