'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMainsPracticeTestList, getMainsPracticeTestConfig, API_URL, type MainsPracticeTest, type MainsPracticeTestConfig } from '@/lib/api';

const SUBJECT_CATEGORIES = ['All', 'GS-1', 'GS-2', 'GS-3', 'GS-4', 'Essay', 'Optional'];

function getYoutubeEmbedUrl(url?: string) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
}

// Subject card styling (Polity blue, Economy green, etc.)
function getSubjectCardStyles(cat: string) {
    switch (cat) {
        case 'GS-1': return { bg: 'bg-[#EBF3FC]', border: 'border-[#BBE0F9]', text: 'text-[#1E3A5F]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
        case 'GS-2': return { bg: 'bg-[#EBF3FC]', border: 'border-[#BBE0F9]', text: 'text-[#1E3A5F]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
        case 'GS-3': return { bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-[#1B5E20]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
        case 'GS-4': return { bg: 'bg-[#F3E5F5]', border: 'border-[#E1BEE7]', text: 'text-[#4A148C]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
        case 'Essay': return { bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-[#E65100]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
        case 'Optional': return { bg: 'bg-[#E0F2F1]', border: 'border-[#B2DFDB]', text: 'text-[#004D40]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
        default: return { bg: 'bg-[#EBF3FC]', border: 'border-[#BBE0F9]', text: 'text-[#1E3A5F]', btn: 'bg-[#4A90E2] hover:bg-[#357ABD]' };
    }
}

export default function MainsPracticeTestListPage() {
    const [tests, setTests] = useState<MainsPracticeTest[]>([]);
    const [config, setConfig] = useState<MainsPracticeTestConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Video modal
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, [selectedCategory]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [list, globalConfig] = await Promise.all([
                getMainsPracticeTestList({ subjectCategory: selectedCategory }),
                getMainsPracticeTestConfig(),
            ]);
            setTests(list);
            if (globalConfig) setConfig(globalConfig);
        } catch (error) {
            console.error('Failed to fetch MPT data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const guidelinesUrl = config?.guidelinesUrl;
    const introVideoUrl = config?.introVideoUrl;

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-3xl mx-auto">
                {/* Back Nav */}
                <div className="mb-4">
                    <Link href="/tests" className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back to Tests
                    </Link>
                </div>

                {/* Page Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-center text-[#0F172A] font-headline mb-6">
                    Mains Practice Tests
                </h1>

                {/* Top Action Buttons (Global Module Guidelines & Intro Video) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {/* Download Guidelines */}
                    <a
                        href={guidelinesUrl ? `${API_URL}${guidelinesUrl}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            guidelinesUrl
                                ? 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0369A1] hover:shadow-md cursor-pointer'
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                        onClick={e => { if (!guidelinesUrl) e.preventDefault(); }}
                    >
                        <div>
                            <h3 className="font-bold text-sm leading-tight">Download Guidelines</h3>
                            <p className="text-[11px] opacity-80 mt-0.5">How to make best use of it?</p>
                        </div>
                        <span className="text-2xl">📄</span>
                    </a>

                    {/* INTRO Video */}
                    <button
                        onClick={() => {
                            if (introVideoUrl) {
                                setVideoUrl(introVideoUrl);
                                setShowVideoModal(true);
                            }
                        }}
                        disabled={!introVideoUrl}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                            introVideoUrl
                                ? 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828] hover:shadow-md cursor-pointer'
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <div className="text-left">
                            <h3 className="font-bold text-sm leading-tight uppercase tracking-wider">INTRO Video</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md">
                            ▶
                        </div>
                    </button>
                </div>

                {/* Subject Filter Bar */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="p-2 text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                    </div>
                    {SUBJECT_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                selectedCategory === cat
                                    ? 'bg-[#1E3A5F] text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#4A90E2]" />
                    </div>
                ) : tests.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                        <p className="text-gray-500 text-sm">No Mains Practice Tests found in this category.</p>
                    </div>
                ) : (
                    /* Practice Test Cards List */
                    <div className="space-y-4">
                        {tests.map((test, idx) => {
                            const styles = getSubjectCardStyles(test.subjectCategory);
                            const topicList = test.topicsSummary
                                ? test.topicsSummary.split(',').map(t => t.trim()).filter(Boolean)
                                : [];

                            return (
                                <div
                                    key={test._id}
                                    className={`${styles.bg} ${styles.border} border-2 rounded-2xl p-5 md:p-6 shadow-sm flex items-center justify-between gap-4 transition-all hover:shadow-md animate-fade-in-up`}
                                    style={{ animationDelay: `${0.05 * idx}s` }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 text-gray-700 border border-gray-200">
                                                {test.subjectCategory}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-500">
                                                {test.questions?.length || 0} Questions
                                            </span>
                                        </div>

                                        <h3 className={`text-lg font-bold ${styles.text} font-headline mb-2`}>
                                            {test.title}
                                        </h3>

                                        {topicList.length > 0 && (
                                            <div className="space-y-0.5">
                                                {topicList.map((tp, i) => (
                                                    <p key={i} className="text-xs text-slate-700 font-medium leading-relaxed">
                                                        {tp}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* START Button */}
                                    <Link
                                        href={`/tests/mains-practice-test/${test._id}`}
                                        className={`${styles.btn} text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap transition-transform active:scale-95 flex-shrink-0`}
                                    >
                                        START &gt;&gt;
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Video Modal */}
            {showVideoModal && videoUrl && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => { setShowVideoModal(false); setVideoUrl(''); }}>
                    <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end mb-2">
                            <button onClick={() => { setShowVideoModal(false); setVideoUrl(''); }} className="text-white text-2xl font-bold">✕</button>
                        </div>
                        <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden shadow-2xl">
                            <iframe
                                src={getYoutubeEmbedUrl(videoUrl)}
                                className="absolute top-0 left-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
