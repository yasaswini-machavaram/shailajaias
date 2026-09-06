'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface MentorUser {
    _id: string;
    name: string;
    email: string;
    role: 'mentor';
}

interface MentorAuthContextType {
    user: MentorUser | null;
    token: string | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isLoading: boolean;
}

const MentorAuthContext = createContext<MentorAuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function MentorAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<MentorUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const storedToken = localStorage.getItem('mentor_token');
        const storedUser = localStorage.getItem('mentor_user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            if (pathname === '/mentor/login' && token && user?.role === 'mentor') {
                router.push('/mentor');
            } else if ((pathname === '/mentor' || pathname?.startsWith('/mentor/')) && pathname !== '/mentor/login') {

                if (!token || !user) {
                    router.push('/mentor/login');
                } else if (user.role !== 'mentor') {
                    router.push('/');
                }
            }
        }
    }, [isLoading, token, user, pathname, router]);

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const { token: newToken, ...userData } = data.data;

                if (userData.role !== 'mentor') {
                    return { success: false, error: 'Mentor access required. Please contact admin.' };
                }

                localStorage.setItem('mentor_token', newToken);
                localStorage.setItem('mentor_user', JSON.stringify(userData));
                setToken(newToken);
                setUser(userData);

                router.push('/mentor');

                return { success: true };
            }

            return { success: false, error: data.message || 'Login failed' };
        } catch (error) {
            console.error('Mentor login error:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        localStorage.removeItem('mentor_token');
        localStorage.removeItem('mentor_user');
        setToken(null);
        setUser(null);
        router.push('/mentor/login');
    };

    return (
        <MentorAuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </MentorAuthContext.Provider>
    );
}

export function useMentorAuth() {
    const context = useContext(MentorAuthContext);
    if (!context) {
        throw new Error('useMentorAuth must be used within MentorAuthProvider');
    }
    return context;
}
