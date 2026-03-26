'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBurningIssues, getArticlesByDate, getBurningIssuesList, type Article, type BurningIssue, API_URL } from '@/lib/api';

interface StoryItem {
    _id: string;
    displayTitle: string;
    displayImage?: string;
    isGallery: boolean;
    date: string;
    content?: string;
    images?: { url: string; order: number }[];
    originalTopic?: string; // Added for gallery items
}

function BurningIssuesInner() {
    const searchParams = useSearchParams();
    const date = searchParams.get('date');
    const id = searchParams.get('id');
    const [issues, setIssues] = useState<StoryItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        fetchIssues(dateParam);
    }, [searchParams]);

    const fetchIssues = async (date?: string | null) => {
        setIsLoading(true);
        try {
            let articleData: Article[] = [];
            let galleryData: BurningIssue[] = [];

            if (date) {
                [articleData, galleryData] = await Promise.all([
                    getArticlesByDate('burning_issue', date),
                    getBurningIssuesList(date)
                ]);
            } else {
                [articleData, galleryData] = await Promise.all([
                    getBurningIssues(10),
                    getBurningIssuesList()
                ]);
            }

            // Flatten and combine
            const combined: StoryItem[] = [];
            
            // Add Articles
            articleData.forEach(a => {
                if (id && a._id !== id) return;
                combined.push({
                    _id: a._id,
                    displayTitle: a.title,
                    displayImage: a.imageUrl,
                    isGallery: false,
                    date: a.date,
                    content: a.content
                });
            });

            // Add Gallery Stories (Flattened)
            galleryData.forEach(g => {
                if (id && g._id !== id) return;
                const galleryImages = g.images || [];
                if (galleryImages.length === 0) {
                    combined.push({
                        _id: g._id,
                        displayTitle: g.topic,
                        isGallery: true,
                        date: g.date
                    });
                } else {
                    galleryImages.forEach((img, idx) => {
                        combined.push({
                            _id: `${g._id}-${idx}`,
                            displayTitle: g.topic,
                            displayImage: img.url,
                            isGallery: true,
                            date: g.date,
                            // Store the original topic as a heading for gallery slides
                        });
                    });
                }
            });

            combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setIssues(combined);
            if (date && combined.length > 0) {
                setIsFullScreen(true);
                setCurrentIndex(0);
            }
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
                                {issue.displayImage && (
                                    <img
                                        src={issue.displayImage.startsWith('http') ? issue.displayImage : `${API_URL}${issue.displayImage}`}
                                        alt={issue.displayTitle}
                                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <p className="text-xs text-amber-300 font-medium mb-1">
                                        {issue.isGallery ? '🔥 GALLERY' : '📰 INSIGHTS'}
                                    </p>
                                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-3">
                                        {issue.displayTitle}
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
                    {/* Header with Back Button */}
                    <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between text-white">
                        <button
                            onClick={closeStory}
                            className="flex items-center gap-2 font-bold hover:text-amber-400 transition-colors"
                        >
                            <span className="text-2xl">‹</span>
                            <span className="text-sm uppercase tracking-widest">Burning Issues</span>
                        </button>
                        <button
                            onClick={closeStory}
                            className="w-10 h-10 flex items-center justify-center text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Progress Bar (Subtle) */}
                    <div className="absolute top-14 left-0 right-0 z-30 px-4 flex gap-1.5 p-2">
                        {issues.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]' :
                                        idx < currentIndex ? 'bg-white' : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Background Strategy (Non-stretching) */}
                    <div className="absolute inset-0 z-0 bg-gray-950 overflow-hidden">
                        {issues[currentIndex].displayImage && (
                            <>
                                {/* Blurred Background Layer */}
                                <img
                                    src={issues[currentIndex].displayImage!.startsWith('http')
                                        ? issues[currentIndex].displayImage!
                                        : `${API_URL}${issues[currentIndex].displayImage}`}
                                    className="w-full h-full object-cover blur-3xl opacity-30 scale-125 select-none"
                                />
                                {/* Aspect-ratio preserving foreground image */}
                                <img
                                    src={issues[currentIndex].displayImage!.startsWith('http')
                                        ? issues[currentIndex].displayImage!
                                        : `${API_URL}${issues[currentIndex].displayImage}`}
                                    className="absolute inset-0 w-full h-full object-contain z-10 transition-all duration-500 ease-out select-none"
                                />
                            </>
                        )}
                        {/* Immersive Gradient Overlay - Focused at bottom for text */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent z-20" />
                    </div>

                    {/* Story Content (Left Aligned, Bottom) */}
                    <div className="flex-1 flex flex-col justify-end p-8 pb-16 relative z-10 text-left text-white pointer-events-none">
                        <div className="max-w-xl w-full">
                            <div className="mb-4">
                                <span className="px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider rounded-md shadow-lg">
                                    {issues[currentIndex].isGallery ? 'Gallery Story' : 'Deep Insight'}
                                </span>
                            </div>
                            
                            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-[1.1] tracking-tight font-headline drop-shadow-2xl">
                                {issues[currentIndex].displayTitle}
                            </h2>
                            
                            {!issues[currentIndex].isGallery && (
                                <div
                                    className="text-lg md:text-xl text-white/90 leading-relaxed font-body drop-shadow-lg"
                                    dangerouslySetInnerHTML={{
                                        __html: (issues[currentIndex].content || '').substring(0, 500) + ((issues[currentIndex].content?.length || 0) > 500 ? '...' : '')
                                    }}
                                />
                            )}
                            
                            <div className="mt-10 flex items-center gap-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                                    <span className="w-8 h-[2px] bg-amber-500/50" />
                                    {issues[currentIndex].isGallery ? 'Swipe for more photos' : 'Swipe for next story'}
                                </div>
                            </div>
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

export default function BurningIssuesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" /></div>}>
            <BurningIssuesInner />
        </Suspense>
    );
}
