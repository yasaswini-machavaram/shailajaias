'use client';

import Link from 'next/link';

export default function MainsPracticeTestPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">
                <section className="animate-fade-in-up">
                    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100 text-center">
                        {/* Icon */}
                        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2E7D32] to-[#4CAF50] flex items-center justify-center mb-6 shadow-lg">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                            </svg>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] font-headline mb-3">
                            Mains Practice Test
                        </h1>
                        <p className="text-[#64748B] text-sm md:text-base max-w-md mx-auto mb-8">
                            Subject wise tests segregated topic wise. Ideal for focused practice during Mains revision.
                        </p>

                        {/* Coming Soon Badge */}
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8F5E9] rounded-full mb-8">
                            <div className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
                            <span className="text-sm font-bold text-[#2E7D32]">Coming Soon</span>
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
