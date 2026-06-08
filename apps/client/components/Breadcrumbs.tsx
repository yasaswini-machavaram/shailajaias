'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Route-to-label mapping.
 * Add new routes here when creating new modules.
 * If a route is NOT listed, the component auto-generates a label
 * by title-casing the slug (e.g. "study-plan" → "Study Plan").
 */
const ROUTE_LABELS: Record<string, string> = {
    'daily-prelims':  'Daily Prelims',
    'daily-mains':    'Daily Mains',
    'daily-quiz':     'Daily Quiz',
    'burning-issues': 'Burning Issues',
    'magazines':      'Magazines',
    'topics':         'Browse Topics',
    'search':         'Search',
    'resources':      'Resources',
    'current-affairs': 'Current Affairs',
    'tests':          'Tests',
    'prelims-test-series':  'Prelims Test Series',
    'prelims-practice-test': 'Prelims Practice Test',
    'mains-test-series':    'Mains Test Series',
    'mains-practice-test':  'Mains Practice Test',
    'ca-prelims':           'CA Prelims',
};

/** Convert a slug like "study-plan" to "Study Plan" */
function titleCase(slug: string): string {
    return slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

interface Crumb {
    label: string;
    href: string;
}

export default function Breadcrumbs() {
    const pathname = usePathname();

    // Don't show on landing page or admin pages
    if (!pathname || pathname === '/' || pathname.startsWith('/admin')) return null;

    const segments = pathname.split('/').filter(Boolean);

    const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];

    let accumulatedPath = '';
    for (const segment of segments) {
        accumulatedPath += `/${segment}`;
        const label = ROUTE_LABELS[segment] || titleCase(segment);
        crumbs.push({ label, href: accumulatedPath });
    }

    return (
        <nav
            className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-[68px] pb-2 bg-[#F8FAFC] relative z-30"
            aria-label="Breadcrumb"
        >
            <ol className="flex items-center flex-wrap gap-1 text-xs font-medium">
                {crumbs.map((crumb, idx) => {
                    const isLast = idx === crumbs.length - 1;

                    return (
                        <li key={crumb.href} className="flex items-center">
                            {idx > 0 && (
                                <span className="mx-1.5 text-gray-300 font-bold select-none">
                                    ›
                                </span>
                            )}
                            {isLast ? (
                                <span className="text-[#1E3A5F] font-bold">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    href={crumb.href}
                                    className="text-gray-400 hover:text-[#D97706] transition-colors"
                                >
                                    {crumb.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
