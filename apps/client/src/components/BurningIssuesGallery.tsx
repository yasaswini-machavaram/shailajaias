'use client';

import Link from 'next/link';
import { type BurningIssue, API_URL } from '@/lib/api';

function getImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    });
}

interface BurningIssuesGalleryProps {
    issues: BurningIssue[];
}

export default function BurningIssuesGallery({ issues }: BurningIssuesGalleryProps) {
    const displayIssues = issues && issues.length > 0 ? issues.slice(0, 8) : [];

    if (displayIssues.length === 0) {
        return (
            <div className="py-10 text-center text-gray-400 bg-white rounded-3xl border border-gray-50 italic text-sm">
                No burning issues found.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {displayIssues.map((issue) => {
                const coverImage = issue.images?.[0];
                const imageCount = issue.images?.length || 0;

                return (
                    <Link
                        key={issue._id}
                        href={`/burning-issues?id=${issue._id}&date=${issue.date.split('T')[0]}`}
                        className="group"
                    >
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5">
                            {/* Cover Image */}
                            {coverImage ? (
                                <img
                                    src={getImageUrl(coverImage.url)}
                                    alt={issue.topic}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] to-[#2C4A73]" />
                            )}

                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                            {/* Image count badge */}
                            {imageCount > 1 && (
                                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {imageCount}
                                </div>
                            )}

                            {/* Bottom content */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                                <div className="space-y-1.5">
                                    <div className="h-[2px] w-6 bg-[#D97706] rounded-full" />
                                    <h3 className="text-white text-[11px] md:text-[13px] font-bold leading-tight line-clamp-3 uppercase tracking-tight drop-shadow-lg">
                                        {issue.topic}
                                    </h3>
                                    <p className="text-white/50 text-[9px] font-medium">
                                        {formatDate(issue.date)}
                                    </p>
                                </div>
                            </div>

                            {/* Hover ring */}
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-[#D97706]/40 transition-all" />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
