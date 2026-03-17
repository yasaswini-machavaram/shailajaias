'use client';

import { useState, useEffect } from 'react';
import { getBurningIssues, type Article } from '@/lib/api';

export default function BurningIssuesPage() {
    const [issues, setIssues] = useState<Article[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        setIsLoading(true);
        try {
            const data = await getBurningIssues(10);
            setIssues(data);
        } catch (error) {
            console.error('Failed to fetch burning issues:', error);
            setIssues([]);
        } finally {
            setIsLoading(false);
        }
    };

    const openStory = (index: number) => {
        setCurrentIndex(index);
        setIsFullScreen(true);
    };

    const closeStory = () => {
        setIsFullScreen(false);
    };

    const goToNext = () => {
        if (currentIndex < issues.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            closeStory();
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    // Sample gradient backgrounds for stories
    const gradients = [
        'from-purple-600 to-blue-600',
        'from-orange-500 to-red-500',
        'from-green-500 to-teal-500',
        'from-pink-500 to-purple-500',
        'from-yellow-500 to-orange-500',
    ];

    return (
        <div className="min-h-screen bg-gray-900 pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-40">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-white">
                        <span className="text-amber-400">🔥</span> Burning Issues
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Swipe through important current affairs stories</p>
                </div>
            </header>

            {/* Content - Grid of Stories */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔥</div>
                        <h2 className="text-xl font-semibold text-white mb-2">No burning issues available</h2>
                        <p className="text-gray-400">Check back soon for important updates</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {issues.map((issue, index) => (
                            <button
                                key={issue._id}
                                onClick={() => openStory(index)}
                                className={`relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br ${gradients[index % gradients.length]
                                    } group`}
                            >
                                {issue.imageUrl && (
                                    <img
                                        src={issue.imageUrl}
                                        alt={issue.title}
                                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <p className="text-xs text-amber-300 font-medium mb-1">🔥 INSIGHTS</p>
                                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-3">
                                        {issue.title}
                                    </h3>
                                    <p className="text-gray-300 text-xs mt-2 flex items-center gap-1">
                                        ← Swipe Left
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Full Screen Story Viewer */}
            {isFullScreen && issues[currentIndex] && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    {/* Progress Bar */}
                    <div className="flex gap-1 p-2">
                        {issues.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 flex-1 rounded-full ${idx <= currentIndex ? 'bg-white' : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={closeStory}
                        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl z-10"
                    >
                        ×
                    </button>

                    {/* Story Content */}
                    <div
                        className={`flex-1 flex items-center justify-center bg-gradient-to-br ${gradients[currentIndex % gradients.length]
                            } p-8`}
                    >
                        <div className="max-w-lg text-center text-white">
                            <p className="text-amber-300 font-medium mb-4">🔥 INSIGHTS</p>
                            <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight">
                                {issues[currentIndex].title}
                            </h2>
                            <div
                                className="text-lg text-white/90 leading-relaxed line-clamp-6"
                                dangerouslySetInnerHTML={{
                                    __html: issues[currentIndex].content.substring(0, 300) + '...'
                                }}
                            />
                        </div>
                    </div>

                    {/* Navigation Areas */}
                    <button
                        onClick={goToPrev}
                        className="absolute left-0 top-0 bottom-0 w-1/3"
                    />
                    <button
                        onClick={goToNext}
                        className="absolute right-0 top-0 bottom-0 w-1/3"
                    />
                </div>
            )}
        </div>
    );
}
