'use client';

import Link from 'next/link';

export default function MainsTestSeriesPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">
                <section className="animate-fade-in-up">
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100 text-center">
                        {/* Icon */}
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E65100] to-[#FF9800] flex items-center justify-center mb-6 shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] font-headline mb-3">
                            Mains Test Series
                        </h1>
                        <p className="text-[#64748B] text-sm md:text-base max-w-md mx-auto mb-8">
                            Structured test series with proper schedule, sectional tests, revision tests, and full mock tests for UPSC Mains preparation.
                        </p>

                        {/* Coming Soon Badge */}
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFF3E0] rounded-full mb-8">
                            <div className="w-2 h-2 rounded-full bg-[#E65100] animate-pulse" />
                            <span className="text-sm font-bold text-[#E65100]">Coming Soon</span>
                        </div>

                        <div>
                            <Link
                                href="/tests"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] hover:text-[#B45309] transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Tests
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
