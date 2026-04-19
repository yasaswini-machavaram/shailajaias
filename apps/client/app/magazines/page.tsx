'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

type MagazineCategory = 'prelims_monthly' | 'mains_monthly' | 'mcq_monthly' | 'quarterly';

interface Magazine {
    _id: string;
    title: string;
    pdfUrl: string;
    category: MagazineCategory;
    year: number;
    month: string;
}

const CATEGORIES: { label: string; value: MagazineCategory }[] = [
    { label: 'Prelims Monthly', value: 'prelims_monthly' },
    { label: 'Mains Monthly', value: 'mains_monthly' },
    { label: 'MCQ Monthly', value: 'mcq_monthly' },
    { label: 'Quarterly', value: 'quarterly' },
];

export default function MagazinesPage() {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<MagazineCategory>('prelims_monthly');
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));
    const [shareToast, setShareToast] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        fetchMagazines();
    }, [activeTab]);

    const fetchMagazines = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/magazines?category=${activeTab}&limit=100`);
            const data = await response.json();
            if (data.success) {
                setMagazines(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch magazines:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Group magazines by year
    const groupedByYear = magazines.reduce<Record<number, Magazine[]>>((acc, mag) => {
        if (!acc[mag.year]) acc[mag.year] = [];
        acc[mag.year].push(mag);
        return acc;
    }, {});

    const years = Object.keys(groupedByYear)
        .map(Number)
        .sort((a, b) => b - a);

    const toggleYear = (year: number) => {
        setExpandedYears((prev) => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
            } else {
                next.add(year);
            }
            return next;
        });
    };

    const handleShare = async (magazine: Magazine) => {
        const url = `${window.location.origin}/magazines?cat=${magazine.category}&id=${magazine._id}`;
        const shareData = {
            title: magazine.title,
            text: `Check out: ${magazine.title} — Shailaja IAS`,
            url,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
        }
    };

    const handleDownload = async (mag: Magazine) => {
        setDownloadingId(mag._id);
        try {
            const response = await fetch(getFullUrl(mag.pdfUrl));
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            // Sanitize title: remove characters not safe for filenames
            const safeName = mag.title.replace(/[/\\:*?"<>|]/g, '_').trim();
            link.download = `${safeName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            {/* Category Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setActiveTab(cat.value)}
                                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeTab === cat.value
                                    ? 'bg-[#1E3A5F] text-white shadow-md'
                                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#1E3A5F] hover:text-[#1E3A5F]'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                    </div>

                ) : magazines.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-5xl mb-4">📚</p>
                        <p className="text-lg font-medium">No magazines available</p>
                        <p className="text-sm mt-1">Check back soon for new content</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {years.map((year) => (
                            <div key={year} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Year Header (Accordion Toggle) */}
                                <button
                                    onClick={() => toggleYear(year)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-[#F5F5F5] text-[#1E3A5F] flex items-center justify-center text-sm">
                                            {year}
                                        </span>
                                        Year {year}
                                    </h2>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedYears.has(year) ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Magazine Grid (Collapsible) */}
                                {expandedYears.has(year) && (
                                    <div className="px-6 pb-6 border-t border-gray-100 mt-2 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {groupedByYear[year].map((mag) => (
                                                <div
                                                    key={mag._id}
                                                    className="group flex flex-col p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all bg-white"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 text-sm">{mag.title}</h3>
                                                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{mag.month}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center gap-3">
                                                        <a
                                                            href={`/magazines/reader?url=${encodeURIComponent(mag.pdfUrl)}&title=${encodeURIComponent(mag.title)}`}
                                                            className="flex items-center gap-1.5 text-[#1E3A5F] hover:text-[#D97706] text-xs font-semibold transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                            </svg>
                                                            Read
                                                        </a>
                                                        <button
                                                            onClick={() => handleDownload(mag)}
                                                            disabled={downloadingId === mag._id}
                                                            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-xs font-semibold transition-colors disabled:opacity-50"
                                                        >
                                                            {downloadingId === mag._id ? (
                                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                            )}
                                                            {downloadingId === mag._id ? 'Downloading...' : 'Download'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleShare(mag)}
                                                            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-xs font-semibold transition-colors ml-auto"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Share Toast */}
            {shareToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 animate-fade-in-up">
                    Link copied to clipboard!
                </div>
            )}
        </div>
    );
}
