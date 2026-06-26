'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface StudentUser {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    role: 'admin' | 'student';
    status?: 'active' | 'suspended';
}

interface StudentAuthContextType {
    user: StudentUser | null;
    token: string | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    sendOtp: (phone: string) => Promise<{ success: boolean; message?: string; error?: string; devOtp?: string }>;
    verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>;
    updateProfile: (name: string, email: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function StudentAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<StudentUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored session on mount
        const storedToken = localStorage.getItem('student_token');
        const storedUser = localStorage.getItem('student_user');

        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                // Invalid stored data — clear it
                localStorage.removeItem('student_token');
                localStorage.removeItem('student_user');
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!token) return;

        const refreshProfile = async () => {
            try {
                const response = await fetch(`${API_URL}/api/auth/me?_t=${Date.now()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    console.warn('Student account suspended or unauthorized. Logging out.');
                    localStorage.removeItem('student_token');
                    localStorage.removeItem('student_user');
                    setToken(null);
                    setUser(null);
                    alert('Your session has expired or your account has been suspended. Please contact support.');
                    return;
                }

                const data = await response.json();
                if (data.success && data.data) {
                    localStorage.setItem('student_user', JSON.stringify(data.data));
                    setUser(data.data);
                }
            } catch (error) {
                console.error('Failed to sync student user details:', error);
            }
        };

        // Run immediately
        refreshProfile();

        // Setup 20-second interval
        const interval = setInterval(refreshProfile, 20000);
        return () => clearInterval(interval);
    }, [token]);


    const sendOtp = async (phone: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, message: data.message, devOtp: data.devOtp };
            }

            return { success: false, error: data.message || 'Failed to send OTP' };
        } catch (error) {
            console.error('Send OTP error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const verifyOtp = async (phone: string, otp: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const { token: newToken, isNewUser, ...userData } = data.data;

                localStorage.setItem('student_token', newToken);
                localStorage.setItem('student_user', JSON.stringify(userData));
                setToken(newToken);
                setUser(userData);

                return { success: true, isNewUser };
            }

            return { success: false, error: data.message || 'Verification failed' };
        } catch (error) {
            console.error('Verify OTP error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const updateProfile = async (name: string, email: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const userData = data.data;
                localStorage.setItem('student_user', JSON.stringify(userData));
                setUser(userData);
                return { success: true };
            }

            return { success: false, error: data.message || data.error || 'Failed to update profile' };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
        setToken(null);
        setUser(null);
    };

    return (
        <StudentAuthContext.Provider
            value={{
                user,
                token,
                isLoggedIn: !!user && !!token,
                isLoading,
                sendOtp,
                verifyOtp,
                updateProfile,
                logout,
            }}
        >
            {children}
        </StudentAuthContext.Provider>
    );
}

export function useStudentAuth() {
    const context = useContext(StudentAuthContext);
    if (!context) {
        throw new Error('useStudentAuth must be used within StudentAuthProvider');
    }
    return context;
}
