'use client';

import { StudentAuthProvider } from '@/contexts/StudentAuthContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <StudentAuthProvider>
            {children}
        </StudentAuthProvider>
    );
}
