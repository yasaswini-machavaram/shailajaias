'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/daily-prelims', label: 'Prelims', icon: '📰' },
    { href: '/daily-quiz', label: 'Quiz', icon: '✍️' },
    { href: '/magazines', label: 'Resources', icon: '📚' },
    { href: '/search', label: 'Search', icon: '🔍' },
];

export default function BottomNav() {
    const pathname = usePathname();

    // Don't show on admin pages
    if (pathname?.startsWith('/admin')) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? 'text-amber-600'
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <span className="text-xl mb-0.5">{item.icon}</span>
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
