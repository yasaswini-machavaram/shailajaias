'use client';

import { useRouter } from 'next/navigation';

// ─── Test Submodules ─────────────────────────────────────────────────────────
const TEST_MODULES = [
    {
        title: 'Prelims Test Series',
        href: '/tests/prelims-test-series',
        bgColor: '#DBEAFE',       // light blue
        accentColor: '#1E3A5F',
        iconGradient: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        features: [
            'Proper Schedule',
            'Sectional Tests',
            'Revision Tests',
            'Full Mock Tests',
        ],
    },
    {
        title: 'Prelims Practice Test',
        href: '/tests/prelims-practice-test',
        bgColor: '#FCE4EC',       // light pink
        accentColor: '#C2185B',
        iconGradient: 'linear-gradient(135deg, #C2185B 0%, #E91E63 100%)',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
        features: [
            'Subject wise test segregated Topic Wise',
            'Suitable for Practice when revising',
        ],
    },
    {
        title: 'Mains Test Series',
        href: '/tests/mains-test-series',
        bgColor: '#FFF3E0',       // light peach
        accentColor: '#E65100',
        iconGradient: 'linear-gradient(135deg, #E65100 0%, #FF9800 100%)',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
        ),
        features: [
            'Proper Schedule',
            'Sectional Tests',
            'Revision Tests',
            'Full Mock Tests',
        ],
    },
    {
        title: 'Mains Practice Test',
        href: '/tests/mains-practice-test',
        bgColor: '#E8F5E9',       // light green
        accentColor: '#2E7D32',
        iconGradient: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
        ),
        features: [
            'Subject wise test segregated Topic Wise',
            'Suitable for Practice when revising',
        ],
    },
    {
        title: 'CA Prelims',
        href: '/tests/ca-prelims',
        bgColor: '#F3E5F5',       // light purple
        accentColor: '#6A1B9A',
        iconGradient: 'linear-gradient(135deg, #6A1B9A 0%, #AB47BC 100%)',
        icon: (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
        ),
        features: [
            'Current Affairs focused Prelims tests',
            'Topic-wise CA coverage',
        ],
    },
];

export default function TestsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">

                {/* ══════════════════════════════════════════════════════════ */}
                {/* PAGE HEADER                                               */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up mb-8">
                    <div className="flex items-center gap-4">
                        {/* Clipboard/timer icon */}
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center">
                            <svg className="w-9 h-9 md:w-11 md:h-11 text-[#D97706]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] font-headline">
                                Tests
                            </h1>
                            <p className="text-sm text-[#64748B] mt-0.5">Prelims & Mains Test Series</p>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SUBMODULE CARDS                                           */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="space-y-6">
                    {TEST_MODULES.map((mod, idx) => (
                        <button
                            key={idx}
                            onClick={() => router.push(mod.href)}
                            className="tests-card animate-fade-in-up w-full text-left"
                            style={{
                                animationDelay: `${(idx + 1) * 80}ms`,
                                backgroundColor: mod.bgColor,
                            }}
                        >
                            <div className="tests-card-inner">
                                {/* Left — Placeholder Image / Icon Area */}
                                <div className="tests-card-image-area">
                                    <div
                                        className="tests-card-image-placeholder"
                                        style={{ background: mod.iconGradient }}
                                    >
                                        {mod.icon}
                                        {/* Decorative circles */}
                                        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                                        <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-full bg-white/10" />
                                    </div>
                                </div>

                                {/* Right — Content */}
                                <div className="tests-card-content">
                                    <h2 className="tests-card-title" style={{ color: mod.accentColor }}>
                                        {mod.title}
                                    </h2>
                                    <ol className="tests-feature-list">
                                        {mod.features.map((feat, fIdx) => (
                                            <li key={fIdx}>
                                                <span className="tests-feature-number" style={{ backgroundColor: mod.accentColor }}>
                                                    {fIdx + 1}
                                                </span>
                                                <span className="tests-feature-text">{feat}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>

                            {/* Arrow indicator */}
                            <div className="tests-card-arrow" style={{ color: mod.accentColor }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </section>

            </main>
        </div>
    );
}
