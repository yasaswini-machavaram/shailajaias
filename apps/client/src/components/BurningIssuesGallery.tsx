'use client';

import Link from 'next/link';
import { type BurningIssue, API_URL } from '@/lib/api';

interface BurningIssuesGalleryProps {
    issues: BurningIssue[];
}

export default function BurningIssuesGallery({ issues }: BurningIssuesGalleryProps) {
    // If no issues, we create placeholders to match the grid requirements
    const displayIssues = issues && issues.length > 0
        ? issues.slice(0, 18)
        : [];

    if (displayIssues.length === 0) {
        return (
            <div className="py-10 text-center text-gray-400 bg-white rounded-3xl border border-gray-50 italic text-sm">
                No burning issues found.
            </div>
        );
    }

    return (
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {displayIssues.map((issue, index) => {
                // Logic for Desktop (4 then 5 pattern)
                const isDesktopFour = (index % 9) < 4;

                // Logic for Mobile (2 then 3 pattern)
                const isMobileTwo = (index % 5) < 2;

                // Use first image or a gradient
                const hasImage = issue.images && issue.images.length > 0;
                const imageUrl = hasImage ? issue.images[0].url : null;

                return (
                    <Link
                        key={issue._id}
                        href={`/burning-issues?id=${issue._id}&date=${issue.date.split('T')[0]}`}
                        className={`
                            relative aspect-[3/4.2] rounded-2xl overflow-hidden group shadow-sm border border-gray-100
                            flex-shrink-0 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-xl
                            
                            /* Mobile: 2 items vs 3 items */
                            ${isMobileTwo
                                ? 'w-[calc(50%-0.5rem)]'
                                : 'w-[calc(33.33%-0.6rem)]'
                            }

                            /* Desktop: 4 items (25%) vs 5 items (20%) */
                            ${isDesktopFour
                                ? 'md:w-[calc(25%-0.8rem)]'
                                : 'md:w-[calc(20%-0.85rem)]'
                            }
                        `}
                    >
                        {/* Background Image or Gradient */}
                        {imageUrl ? (
                            <img
                                src={imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`}
                                alt={issue.topic}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${index % 3 === 0 ? 'from-slate-900 to-slate-800' :
                                    index % 3 === 1 ? 'from-indigo-950 to-indigo-900' :
                                        'from-gray-900 to-gray-800'
                                }`}
                            />
                        )}

                        {/* Overlay to darken image */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                        {/* Card Content Overlay */}
                        <div className="absolute inset-0 p-3 md:p-4 flex flex-col justify-between z-10">
                            <div className="space-y-1.5">
                                <div className="h-[2.5px] w-8 bg-[#D97706] rounded-full shadow-[0_0_8px_rgba(217,119,6,0.8)]" />
                                <p className="text-[9px] md:text-[10px] font-bold text-[#D97706] uppercase tracking-[0.12em] drop-shadow-md">Must Read</p>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-white text-[11px] md:text-[14px] font-bold leading-[1.2] line-clamp-4 uppercase tracking-tight drop-shadow-lg font-headline">
                                    {issue.topic}
                                </h3>

                                <div className="pt-2.5 border-t border-white/20 flex items-center justify-between">
                                    <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] group-hover:text-[#FEF3C7] transition-colors drop-shadow-md">
                                        Swipe Left
                                    </p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#D97706] shadow-[0_0_10px_rgba(217,119,6,1)] animate-pulse" />
                                </div>
                            </div>
                        </div>


                        {/* Interactive Border */}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 group-hover:ring-white/30 transition-all rounded-2xl" />
                    </Link>
                );
            })}
        </div>
    );
}
