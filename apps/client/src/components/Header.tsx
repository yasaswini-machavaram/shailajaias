'use client';

import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
    onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--card-border)]">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="Menu"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                        />
                    </svg>
                </button>

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] bg-clip-text text-transparent">
                        SHAILAJA
                    </span>
                </Link>

                {/* Login Button */}
                <Link
                    href="/login"
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[var(--secondary)] to-blue-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                    Login
                </Link>
            </div>
        </header>
    );
}
