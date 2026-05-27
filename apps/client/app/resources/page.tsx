'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface ResourceItem {
    _id: string;
    title: string;
    tag: string;
    pdfUrl: string;
    description?: string;
    order: number;
}

interface ResourceCategory {
    _id: string;
    title: string;
    slug: string;
    description?: string;
    icon: string;
    accentColor: string;
    order: number;
    predefinedTags: string[];
    itemCount: number;
    items?: ResourceItem[];
}

// Tag badge color mapping
const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    GS1: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    GS2: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    GS3: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
    GS4: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    Essay: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    Optional: { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' },
};

function getTagColor(tag: string) {
    return TAG_COLORS[tag] || { bg: '#F5F5F5', text: '#64748B', border: '#E5E7EB' };
}

export default function ResourcesPage() {
    const [categories, setCategories] = useState<ResourceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [shareToast, setShareToast] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/resources/categories`);
            const data = await response.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch resource categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCategory = async (cat: ResourceCategory) => {
        const id = cat._id;
        const next = new Set(expandedIds);

        if (next.has(id)) {
            next.delete(id);
            setExpandedIds(next);
            return;
        }

        next.add(id);
        setExpandedIds(next);

        // Fetch items for this category if not already loaded
        if (!cat.items) {
            setLoadingItems(prev => new Set(prev).add(id));
            try {
                const response = await fetch(`${API_URL}/api/resources/categories/${id}`);
                const data = await response.json();
                if (data.success) {
                    setCategories(prev =>
                        prev.map(c => c._id === id ? { ...c, items: data.data.items } : c)
                    );
                }
            } catch (error) {
                console.error('Failed to fetch category items:', error);
            } finally {
                setLoadingItems(prev => {
                    const s = new Set(prev);
                    s.delete(id);
                    return s;
                });
            }
        }
    };

    const handleDownload = async (item: ResourceItem) => {
        setDownloadingId(item._id);
        const safeName = item.title.replace(/[/\\:*?"<>|]/g, '_').trim();
        const fullUrl = getFullUrl(item.pdfUrl);

        try {
            const response = await fetch(fullUrl, { mode: 'cors' });
            if (!response.ok) throw new Error('Fetch failed');
            const blob = await response.blob();
            const pdfBlob = new Blob([blob], { type: 'application/octet-stream' });
            const objectUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${safeName}.pdf`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(objectUrl);
            }, 1000);
        } catch {
            try {
                const proxyUrl = `${API_URL}/api/resources/download/${item._id}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const pdfBlob = new Blob([blob], { type: 'application/octet-stream' });
                    const objectUrl = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = objectUrl;
                    link.download = `${safeName}.pdf`;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(objectUrl);
                    }, 1000);
                } else {
                    window.open(fullUrl, '_blank');
                }
            } catch {
                window.open(fullUrl, '_blank');
            }
        } finally {
            setDownloadingId(null);
        }
    };

    const handleShare = async (item: ResourceItem) => {
        const url = `${window.location.origin}/resources/reader?url=${encodeURIComponent(item.pdfUrl)}&title=${encodeURIComponent(item.title)}`;
        const shareData = {
            title: item.title,
            text: `Check out: ${item.title} — Shailaja IAS Resources`,
            url,
        };

        if (navigator.share) {
            try { await navigator.share(shareData); } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center text-base">📚</span>
                        Resources
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Curated study materials for UPSC preparation</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                    </div>

                ) : categories.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-5xl mb-4">📂</p>
                        <p className="text-lg font-medium">No resources available yet</p>
                        <p className="text-sm mt-1">Check back soon for study materials</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {categories.map((cat) => (
                            <div
                                key={cat._id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                                style={{ borderLeftWidth: '4px', borderLeftColor: cat.accentColor }}
                            >
                                {/* Category Header (Accordion Toggle) */}
                                <button
                                    onClick={() => toggleCategory(cat)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{cat.icon}</span>
                                        <div className="text-left">
                                            <h2 className="text-base font-bold text-gray-900">{cat.title}</h2>
                                            {cat.description && (
                                                <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                                            )}
                                        </div>
                                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                                            {cat.itemCount}
                                        </span>
                                    </div>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedIds.has(cat._id) ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Expanded Items */}
                                {expandedIds.has(cat._id) && (
                                    <div className="px-6 pb-6 border-t border-gray-100 mt-2 pt-4">
                                        {loadingItems.has(cat._id) ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                                            </div>
                                        ) : !cat.items || cat.items.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-6">No items in this category yet</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {cat.items.map((item) => {
                                                    const tagColor = getTagColor(item.tag);
                                                    return (
                                                        <div
                                                            key={item._id}
                                                            className="group flex flex-col p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all bg-white"
                                                        >
                                                            <div className="flex items-start gap-3 mb-3">
                                                                {/* Tag Badge */}
                                                                <span
                                                                    className="inline-flex px-2.5 py-1 text-xs font-bold rounded-md shrink-0"
                                                                    style={{
                                                                        backgroundColor: tagColor.bg,
                                                                        color: tagColor.text,
                                                                        border: `1px solid ${tagColor.border}`,
                                                                    }}
                                                                >
                                                                    {item.tag}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.title}</h3>
                                                                    {item.description && (
                                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-3">
                                                                <a
                                                                    href={`/resources/reader?url=${encodeURIComponent(item.pdfUrl)}&title=${encodeURIComponent(item.title)}`}
                                                                    className="flex items-center gap-1.5 text-[#1E3A5F] hover:text-[#D97706] text-xs font-semibold transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                                    </svg>
                                                                    Read
                                                                </a>
                                                                <button
                                                                    onClick={() => handleDownload(item)}
                                                                    disabled={downloadingId === item._id}
                                                                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-xs font-semibold transition-colors disabled:opacity-50"
                                                                >
                                                                    {downloadingId === item._id ? (
                                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                        </svg>
                                                                    )}
                                                                    {downloadingId === item._id ? 'Downloading...' : 'Download'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleShare(item)}
                                                                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 text-xs font-semibold transition-colors ml-auto"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
