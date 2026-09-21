'use client';

import { MentorAuthProvider, useMentorAuth } from './MentorAuthContext';
import { usePathname } from 'next/navigation';



function MentorLayoutInner({ children }: { children: React.ReactNode }) {
    const { isLoading, user, token } = useMentorAuth();
    const pathname = usePathname();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3A5F]" />
            </div>
        );
    }

    // Login page doesn't get the layout wrapper
    if (pathname === '/mentor/login') {
        return <>{children}</>;
    }

    // Not authenticated — will redirect
    if (!user || !token) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8]">
            {children}
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
