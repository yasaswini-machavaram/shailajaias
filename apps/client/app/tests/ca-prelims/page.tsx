'use client';

import Link from 'next/link';

export default function CaPrelimsPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">
                <section className="animate-fade-in-up">
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100 text-center">
                        {/* Icon */}
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6A1B9A] to-[#AB47BC] flex items-center justify-center mb-6 shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                            </svg>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] font-headline mb-3">
                            CA Prelims
                        </h1>
                        <p className="text-[#64748B] text-sm md:text-base max-w-md mx-auto mb-8">
                            Current Affairs focused Prelims tests with comprehensive topic-wise coverage for UPSC preparation.
                        </p>

                        {/* Coming Soon Badge */}
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F3E5F5] rounded-full mb-8">
                            <div className="w-2 h-2 rounded-full bg-[#6A1B9A] animate-pulse" />
                            <span className="text-sm font-bold text-[#6A1B9A]">Coming Soon</span>
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
