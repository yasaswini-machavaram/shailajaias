'use client';

import Link from 'next/link';
import Image from 'next/image';

interface MagazineCardProps {
    id: string;
    title: string;
    coverImageUrl?: string;
    category: 'prelims_monthly' | 'mains_monthly';
    year: number;
    month: string;
}

// Color schemes for different magazines
const colorSchemes = [
    { bg: 'from-red-700 to-red-900', accent: 'bg-yellow-400' },
    { bg: 'from-slate-700 to-slate-900', accent: 'bg-cyan-400' },
    { bg: 'from-blue-700 to-blue-900', accent: 'bg-amber-300' },
    { bg: 'from-emerald-700 to-emerald-900', accent: 'bg-pink-400' },
    { bg: 'from-purple-700 to-purple-900', accent: 'bg-green-400' },
    { bg: 'from-amber-700 to-amber-900', accent: 'bg-blue-400' },
];

export default function MagazineCard({
    id,
    title,
    coverImageUrl,
    category,
    year,
    month
}: MagazineCardProps) {
    // Get a consistent color scheme based on the id
    const colorIndex = parseInt(id, 10) % colorSchemes.length || 0;
    const colorScheme = colorSchemes[colorIndex];

    return (
        <Link
            href={`/magazines/${id}`}
            className="block w-full"
        >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden group card-hover shadow-lg">
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bg}`} />

                {/* Decorative elements */}
                <div className={`absolute top-4 right-4 w-16 h-16 ${colorScheme.accent} rounded-full opacity-20`} />
                <div className={`absolute bottom-12 left-4 w-8 h-8 ${colorScheme.accent} rounded-full opacity-30`} />

                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    {/* Category badge */}
                    <div className="self-start">
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-sm rounded-full text-white">
                            {category === 'prelims_monthly' ? 'Prelims' : 'Mains'}
                        </span>
                    </div>

                    {/* Title */}
                    <div>
                        <h3 className="text-white text-sm font-bold leading-tight line-clamp-3 mb-1">
                            {title}
                        </h3>
                        <p className="text-white/70 text-xs">
                            {month} {year}
                        </p>
                    </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </Link>
    );
}

// Sample magazines data
export const sampleMagazines: MagazineCardProps[] = [
    {
        id: '1',
        title: "How India's New Labour Codes Will Reshape Work, Wages, and Workers' Rights",
        category: 'prelims_monthly',
        year: 2026,
        month: 'January',
    },
    {
        id: '2',
        title: 'The Condition of Education 2026',
        category: 'mains_monthly',
        year: 2026,
        month: 'January',
    },
    {
        id: '3',
        title: 'Higher Education in India: Challenges and Opportunities',
        category: 'prelims_monthly',
        year: 2025,
        month: 'December',
    },
    {
        id: '4',
        title: 'Understanding Higher Education Policies',
        category: 'mains_monthly',
        year: 2025,
        month: 'December',
    },
    {
        id: '5',
        title: 'The Future of Higher Education in India',
        category: 'prelims_monthly',
        year: 2025,
        month: 'November',
    },
];
