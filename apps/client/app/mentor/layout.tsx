'use client';

import { MentorAuthProvider, useMentorAuth } from './MentorAuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/mentor', icon: '📊' },
    { label: 'Submissions', href: '/mentor/submissions', icon: '📝' },
];

function MentorSidebar() {
    const { user, logout } = useMentorAuth();
    const pathname = usePathname();

    return (
        <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
            {/* Logo/Brand */}
            <div className="p-6 border-b border-slate-700">
                <h1 className="text-lg font-bold text-teal-400 font-headline">Shailaja IAS</h1>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Mentor Portal</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
                {NAV_ITEMS.map(item => {
                    const isActive = pathname === item.href || (item.href !== '/mentor' && pathname?.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                isActive ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}>
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User info */}
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{user?.name || 'Mentor'}</p>
                        <p className="text-[10px] text-slate-400">{user?.email || ''}</p>
                    </div>
                </div>
                <button onClick={logout}
                    className="w-full text-xs font-bold text-red-400 hover:text-red-300 text-left">
                    🚪 Logout
                </button>
            </div>
        </div>
    );
}

function MentorLayoutInner({ children }: { children: React.ReactNode }) {
    const { isLoading, user, token } = useMentorAuth();
    const pathname = usePathname();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600" />
            </div>
        );
    }

    // Login page doesn't get the sidebar
    if (pathname === '/mentor/login') {
        return <>{children}</>;
    }

    // Not authenticated — will redirect
    if (!user || !token) {
        return null;
    }

    return (
        <div className="flex min-h-screen">
            <MentorSidebar />
            <main className="flex-1 bg-slate-50 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

export default function MentorLayout({ children }: { children: React.ReactNode }) {
    return (
        <MentorAuthProvider>
            <MentorLayoutInner>{children}</MentorLayoutInner>
        </MentorAuthProvider>
    );
}
