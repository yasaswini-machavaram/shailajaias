'use client';

import { useState, useEffect } from 'react';
import DatePicker from '@/components/DatePicker';
import RichTextRenderer from '@/components/RichTextRenderer';
import { getArticlesByDate, formatDate, type Article } from '@/lib/api';

export default function DailyMainsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [articles, setArticles] = useState<Article[]>([]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchArticles();
    }, [selectedDate]);

    const fetchArticles = async () => {
        setIsLoading(true);
        try {
            const data = await getArticlesByDate('mains', formatDate(selectedDate));
            setArticles(data);
            setExpandedIndex(null);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            setArticles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    // Sample icons for different question types
    const getIcon = (index: number) => {
        const icons = ['🎯', '📊', '🚀', '💡', '🔍', '📝'];
        return icons[index % icons.length];
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-bold text-gray-900">
                            Current Affairs &gt; <span className="text-blue-600">Daily Mains</span>
                        </h1>
                    </div>
                    <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📝</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No mains content for this date</h2>
                        <p className="text-gray-500">Try selecting a different date</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Main Topic Card */}
                        {articles[0] && (
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                                <h2 className="text-2xl font-bold mb-3">{articles[0].title}</h2>
                                <div className="bg-white/20 rounded-xl p-4 text-blue-50">
                                    <RichTextRenderer
                                        content={articles[0].content.substring(0, 500) + '...'}
                                        className="prose-invert prose-p:text-blue-50 prose-strong:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Accordion Questions */}
                        <div className="space-y-3">
                            {articles.slice(1).map((article, index) => (
                                <div
                                    key={article._id}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                                >
                                    {/* Header - Always visible */}
                                    <button
                                        onClick={() => toggleExpand(index)}
                                        className="w-full px-6 py-4 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="text-2xl flex-shrink-0">{getIcon(index)}</span>
                                        <span className="flex-1 font-medium text-gray-900 leading-relaxed">
                                            {article.title}
                                        </span>
                                        <span
                                            className={`text-2xl text-gray-400 transform transition-transform ${expandedIndex === index ? 'rotate-45' : ''
                                                }`}
                                        >
                                            +
                                        </span>
                                    </button>

                                    {/* Expanded Content */}
                                    {expandedIndex === index && (
                                        <div className="px-6 pb-6 border-t border-gray-100 animate-fadeIn">
                                            <div className="pt-4">
                                                <RichTextRenderer content={article.content} />
                                            </div>
                                            {article.tags && article.tags.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                    <div className="flex flex-wrap gap-2">
                                                        {article.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Practice Question Box */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                <span>❓</span> Can You Answer the Following Question
                            </h3>
                            <p className="text-amber-800 italic">
                                Based on today&apos;s content, try formulating your own answer approach.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
