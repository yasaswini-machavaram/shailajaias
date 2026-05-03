'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBurningIssuesList, type BurningIssue, API_URL } from '@/lib/api';

function getImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function BurningIssuesInner() {
    const searchParams = useSearchParams();
    const [issues, setIssues] = useState<BurningIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Gallery state
    const [selectedIssue, setSelectedIssue] = useState<BurningIssue | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [shareCopied, setShareCopied] = useState(false);

    // Touch swipe support
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const galleryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const dateParam = searchParams.get('date');
                const idParam = searchParams.get('id');
                const data = await getBurningIssuesList(dateParam || undefined);

                const sorted = (data || []).sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setIssues(sorted);

                // If deep-linked to a specific issue, open it
                if (idParam && sorted.length > 0) {
                    const target = sorted.find((i) => i._id === idParam);
                    if (target) {
                        setSelectedIssue(target);
                        setCurrentImageIndex(0);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch burning issues:', error);
                setIssues([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [searchParams]);

    // Gallery navigation
    const images = selectedIssue?.images || [];
    const totalImages = images.length;

    const goToPrev = useCallback(() => {
        setCurrentImageIndex((i) => Math.max(0, i - 1));
    }, []);

    const goToNext = useCallback(() => {
        setCurrentImageIndex((i) => Math.min(totalImages - 1, i + 1));
    }, [totalImages]);

    const openGallery = (issue: BurningIssue) => {
        setSelectedIssue(issue);
        setCurrentImageIndex(0);
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const closeGallery = () => {
        setSelectedIssue(null);
        setCurrentImageIndex(0);
    };

    const shareIssue = async () => {
        if (!selectedIssue) return;
        const dateStr = selectedIssue.date.split('T')[0];
        const shareUrl = `${window.location.origin}/burning-issues?id=${selectedIssue._id}&date=${dateStr}`;
        const shareData = {
            title: selectedIssue.topic,
            text: `Burning Issue: ${selectedIssue.topic}`,
            url: shareUrl,
        };

        // Try native share first (works on mobile)
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                // User cancelled or share failed — fall through to clipboard
            }
        }

        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch {
            // Final fallback
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        if (!selectedIssue) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrev();
            else if (e.key === 'ArrowRight') goToNext();
            else if (e.key === 'Escape') closeGallery();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [selectedIssue, goToPrev, goToNext]);

    // Touch swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;
        if (diff > threshold) goToNext();
        else if (diff < -threshold) goToPrev();
    };

    // ─── TOPIC LIST VIEW ───
    const renderTopicList = () => (
        <div className="min-h-screen bg-[#FAFAF8] pb-24">
            <main className="max-w-6xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#D97706]" />
                    </div>
                ) : issues.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔥</div>
                        <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">No burning issues available</h2>
                        <p className="text-gray-500">Check back soon for important updates</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        {issues.map((issue) => {
                            const coverImage = issue.images?.[0];
                            const imageCount = issue.images?.length || 0;

                            return (
                                <button
                                    key={issue._id}
                                    onClick={() => openGallery(issue)}
                                    className="group text-left"
                                >
                                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                                        {coverImage ? (
                                            <img
                                                src={getImageUrl(coverImage.url)}
                                                alt={issue.topic}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] to-[#2C4A73]" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                        {imageCount > 1 && (
                                            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {imageCount}
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="text-white text-sm md:text-base font-bold leading-tight line-clamp-3 drop-shadow-lg">
                                                {issue.topic}
                                            </h3>
                                            <p className="text-white/60 text-[10px] md:text-xs font-medium mt-2">
                                                {formatDate(issue.date)}
                                            </p>
                                        </div>
                                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-[#D97706]/40 transition-all" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );

    // ─── FULLSCREEN GALLERY OVERLAY ───
    if (selectedIssue) {
        const currentImage = images[currentImageIndex];
        return (
            <>
                {/* Keep the topic list rendered behind */}
                {renderTopicList()}

                {/* Fullscreen overlay */}
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
                    {/* Top Bar: Close + Title + Share + Counter */}
                    <div className="flex items-center justify-between px-4 md:px-8 py-4 text-white">
                        <button
                            onClick={closeGallery}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            aria-label="Close gallery"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h2 className="text-sm md:text-base font-bold truncate max-w-[50%] text-center">
                            {selectedIssue.topic}
                        </h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={shareIssue}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                aria-label="Share"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                            <span className="text-sm font-semibold text-white/70 tabular-nums min-w-[3rem] text-right">
                                {currentImageIndex + 1} / {totalImages}
                            </span>
                        </div>
                    </div>

                    {/* Main Image Area */}
                    <div
                        ref={galleryRef}
                        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {currentImage && (
                            <img
                                key={currentImage.url}
                                src={getImageUrl(currentImage.url)}
                                alt={`${selectedIssue.topic} - Image ${currentImageIndex + 1}`}
                                className="max-w-full max-h-full object-contain px-4 md:px-16 transition-opacity duration-300"
                                draggable={false}
                            />
                        )}

                        {/* Prev Button */}
                        {currentImageIndex > 0 && (
                            <button
                                onClick={goToPrev}
                                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        {/* Next Button */}
                        {currentImageIndex < totalImages - 1 && (
                            <button
                                onClick={goToNext}
                                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Bottom: Thumbnail Strip + Dots */}
                    <div className="px-4 md:px-8 pb-6 pt-3">
                        {/* Dot Indicators */}
                        {totalImages > 1 && totalImages <= 20 && (
                            <div className="flex items-center justify-center gap-1.5 mb-3">
                                {images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`rounded-full transition-all duration-200 ${
                                            idx === currentImageIndex
                                                ? 'w-6 h-2 bg-[#D97706]'
                                                : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Thumbnail Strip */}
                        {totalImages > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar justify-center">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                            idx === currentImageIndex
                                                ? 'border-[#D97706] ring-2 ring-[#D97706]/30 scale-110'
                                                : 'border-white/20 opacity-50 hover:opacity-80'
                                        }`}
                                    >
                                        <img
                                            src={getImageUrl(img.url)}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {renderTopicList()}

            {/* Share copied toast */}
            {shareCopied && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
                    ✓ Link copied to clipboard
                </div>
            )}
        </>
    );
}

export default function BurningIssuesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#D97706]" /></div>}>
            <BurningIssuesInner />
        </Suspense>
    );
}
