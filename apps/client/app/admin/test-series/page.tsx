'use client';

import { useRouter } from 'next/navigation';

const TEST_SUBMODULES = [
    {
        title: 'Prelims Test Series',
        description: 'Manage Prelims Mock Test Groups, schedules, syllabus, Excel imports, locks, and discussion videos.',
        href: '/admin/test-series/prelims-test-series',
        bgColor: '#DBEAFE',       // light blue
        accentColor: '#1E3A5F',
        icon: '📋',
        features: [
            'Create Mock Test Groups',
            'Import Questions via Excel',
            'Manage Syllabus & Lock States',
            'Attach Discussion Videos',
        ],
        isAvailable: true,
    },
    {
        title: 'Prelims Practice Test',
        description: 'Manage subject-wise MCQ practice tests, configure subject filters, and control explanations.',
        href: '/admin/test-series/prelims-practice-test',
        bgColor: '#FCE4EC',       // light pink
        accentColor: '#C2185B',
        icon: '📘',
        features: [
            'Filter Quizzes by Subject',
            'Verify Correct Index & Explanation',
            'Import/Create Practice Tests',
        ],
        isAvailable: true,
    },
    {
        title: 'Mains Test Series',
        description: 'Manage Mains mock exam groups, schedules, question papers, and detailed model answers.',
        href: '#',
        bgColor: '#FFF3E0',       // light peach
        accentColor: '#E65100',
        icon: '📝',
        features: [
            'Configure Mains schedules',
            'Structured questions & answers',
            'Detailed model answers PDF',
        ],
        isAvailable: false,
    },
    {
        title: 'Mains Practice Test',
        description: 'Manage topic-wise practice questions and model answers for Mains revision.',
        href: '#',
        bgColor: '#E8F5E9',       // light green
        accentColor: '#2E7D32',
        icon: '🎓',
        features: [
            'Topic-wise Mains questions',
            'Self-evaluation guidelines',
        ],
        isAvailable: false,
    },
    {
        title: 'CA Prelims',
        description: 'Manage Current Affairs specific Prelims quizzes and monthly review questions.',
        href: '#',
        bgColor: '#F3E5F5',       // light purple
        accentColor: '#6A1B9A',
        icon: '📰',
        features: [
            'Current Affairs Quizzes',
            'Targeted monthly mock papers',
        ],
        isAvailable: false,
    },
];

export default function AdminTestSeriesHubPage() {
    const router = useRouter();

    return (
        <div className="p-8 min-h-screen bg-slate-50 font-body">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 font-headline">Test Modules CMS</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Select a submodule to manage mock tests, practice questions, and answer keys.
                </p>
            </div>

            {/* Grid layout for Admin Hub */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                {TEST_SUBMODULES.map((sub, index) => {
                    const cardContent = (
                        <div
                            style={{ backgroundColor: sub.bgColor }}
                            className={`rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-full transition-all group ${
                                sub.isAvailable 
                                    ? 'hover:shadow-md cursor-pointer transform hover:-translate-y-0.5' 
                                    : 'opacity-70 cursor-not-allowed'
                            }`}
                        >
                            <div>
                                {/* Card Icon and Status Badge */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-3xl p-2 bg-white/60 rounded-2xl border border-white/85 flex items-center justify-center shadow-xs">
                                        {sub.icon}
                                    </span>
                                    <span
                                        style={{ backgroundColor: sub.accentColor }}
                                        className="px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider shadow-xs"
                                    >
                                        {sub.isAvailable ? 'Active' : 'Coming Soon'}
                                    </span>
                                </div>

                                {/* Title & Description */}
                                <h3 
                                    style={{ color: sub.accentColor }}
                                    className="text-xl font-bold font-headline mb-2"
                                >
                                    {sub.title}
                                </h3>
                                <p className="text-slate-600 text-xs leading-relaxed mb-4">
                                    {sub.description}
                                </p>

                                {/* Features List */}
                                <ul className="space-y-2 border-t border-slate-900/5 pt-4">
                                    {sub.features.map((feat, fIdx) => (
                                        <li key={fIdx} className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                                            <span 
                                                style={{ color: sub.accentColor }} 
                                                className="font-bold"
                                            >
                                                ✓
                                            </span>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Button Area */}
                            {sub.isAvailable && (
                                <div className="mt-6 flex justify-end">
                                    <span 
                                        style={{ color: sub.accentColor }} 
                                        className="text-xs font-bold flex items-center gap-1 hover:underline uppercase tracking-wider"
                                    >
                                        Manage Submodule →
                                    </span>
                                </div>
                            )}
                        </div>
                    );

                    if (sub.isAvailable) {
                        return (
                            <button
                                key={index}
                                onClick={() => router.push(sub.href)}
                                className="text-left focus:outline-none"
                            >
                                {cardContent}
                            </button>
                        );
                    } else {
                        return (
                            <div key={index}>
                                {cardContent}
                            </div>
                        );
                    }
                })}
            </div>
        </div>
    );
}
