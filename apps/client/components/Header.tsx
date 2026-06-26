'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { isLoggedIn, user } = useStudentAuth();

    // Don't show on admin pages
    if (pathname?.startsWith('/admin')) return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16">
            <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-between px-4 md:px-8">
                {/* Brand Logo — links to landing */}
                <Link href="/" className="flex items-center gap-x-3 group">
                    {/* Zoom into symbol to crop whitespace */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                            src="/images/symbol.png"
                            alt="Shailaja IAS"
                            fill
                            className="object-cover scale-[1.7] transition-transform duration-300 group-hover:scale-[1.85]"
                            priority
                        />
                    </div>
                    <Image
                        src="/images/name.png"
                        alt="Shailaja — Justice for IAS Aspirants"
                        width={90}
                        height={21}
                        className="hidden sm:block object-contain"
                        priority
                    />
                </Link>

                {/* Future tabs slot — empty for now */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <button
                        onClick={() => router.push('/search')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all group"
                        aria-label="Search"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            className="w-5 h-5 stroke-gray-500 group-hover:stroke-[#D97706] transition-colors"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                        </svg>
                    </button>

                    {isLoggedIn ? (
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 px-3.5 py-2 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <span className="text-sm">👤</span>
                            <span className="hidden sm:inline">{user?.name || 'Profile'}</span>
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center gap-2 px-4 py-2 border border-[#1E3A5F] hover:bg-[#1E3A5F]/5 text-[#1E3A5F] text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
                        >
                            <span>Sign In</span>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
