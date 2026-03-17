'use client';

import Link from 'next/link';
import Image from 'next/image';

interface BurningIssue {
    id: string;
    title: string;
    imageUrl: string;
    date: string;
}

interface BurningIssuesGalleryProps {
    issues: BurningIssue[];
}

// Sample data for demonstration
const sampleIssues: BurningIssue[] = [
    {
        id: '1',
        title: "How India's New Labour Codes Will Reshape Work, Wages, and Workers' Rights",
        imageUrl: '/images/burning/labour-codes.jpg',
        date: '2026-01-30',
    },
    {
        id: '2',
        title: 'The Condition of Education 2026',
        imageUrl: '/images/burning/education.jpg',
        date: '2026-01-28',
    },
    {
        id: '3',
        title: 'Higher Education in India: Challenges and Opportunities',
        imageUrl: '/images/burning/higher-education.jpg',
        date: '2026-01-25',
    },
    {
        id: '4',
        title: 'The Future of Higher Education in India',
        imageUrl: '/images/burning/future-education.jpg',
        date: '2026-01-22',
    },
];

export default function BurningIssuesGallery({ issues = sampleIssues }: BurningIssuesGalleryProps) {
    return (
        <div className="w-full">
            <div
                className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-snap-x"
                style={{ scrollPaddingLeft: '1rem' }}
            >
                {issues.map((issue, index) => (
                    <Link
                        key={issue.id}
                        href={`/burning-issues/${issue.id}`}
                        className="flex-shrink-0 scroll-snap-start animate-fade-in-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="relative w-44 h-60 rounded-2xl overflow-hidden group card-hover">
                            {/* Placeholder gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-amber-500 to-orange-600" />

                            {/* Overlay gradient for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Swipe indicator */}
                            {index === 0 && (
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="white"
                                        className="w-3.5 h-3.5"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                                    </svg>
                                    <span className="text-white text-xs font-medium">SWIPE LEFT</span>
                                </div>
                            )}

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="text-white text-sm font-semibold leading-tight line-clamp-3 group-hover:text-amber-200 transition-colors">
                                    {issue.title}
                                </h3>
                            </div>

                            {/* Hover effect */}
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
