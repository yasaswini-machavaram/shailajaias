'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef, ReactNode } from 'react';

interface StudentUser {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    role: 'admin' | 'student';
    status?: 'active' | 'suspended';
}

interface DeviceInfo {
    deviceId: string;
    deviceName: string;
    lastActive: string;
    isCurrent: boolean;
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
    logoutAllDevices: () => Promise<{ success: boolean; error?: string }>;
    getActiveDevices: () => Promise<{ success: boolean; data?: DeviceInfo[]; error?: string }>;
    removeDevice: (deviceId: string) => Promise<{ success: boolean; isSelf?: boolean; error?: string }>;
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get or create a persistent device ID */
function getDeviceId(): string {
    if (typeof window === 'undefined') return 'ssr';
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}

/** Decode JWT payload without verification (client-side only, for reading exp) */
function decodeJwtPayload(token: string): { exp?: number; id?: string; tokenVersion?: number; deviceId?: string } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch {
        return null;
    }
}

/** Check if token expires within the given number of days */
function tokenExpiresWithinDays(token: string, days: number): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;
    const expiresAt = payload.exp * 1000; // convert to ms
    const threshold = Date.now() + days * 24 * 60 * 60 * 1000;
    return expiresAt < threshold;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StudentAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<StudentUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isRefreshing = useRef(false);

    // ── On mount: restore session from localStorage ──────────────────────────
    useEffect(() => {
        const storedToken = localStorage.getItem('student_token');
        const storedUser = localStorage.getItem('student_user');

        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('student_token');
                localStorage.removeItem('student_user');
            }
        }
        setIsLoading(false);
    }, []);

    // ── Force logout helper ──────────────────────────────────────────────────
    const forceLogout = useCallback((message?: string) => {
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
        setToken(null);
        setUser(null);
        if (message) {
            alert(message);
        }
    }, []);

    // ── Sync profile from server ─────────────────────────────────────────────
    const refreshProfile = useCallback(async (currentToken: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me?_t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.status === 401 || response.status === 403) {
                forceLogout('Your session has expired or your account has been suspended. Please log in again.');
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
    }, [forceLogout]);

    // ── Silent token refresh ─────────────────────────────────────────────────
    const silentRefresh = useCallback(async (currentToken: string) => {
        if (isRefreshing.current) return;
        isRefreshing.current = true;

        try {
            const response = await fetch(`${API_URL}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`,
                },
                body: JSON.stringify({ deviceId: getDeviceId() }),
            });

            if (response.status === 401) {
                forceLogout('Your session has expired. Please log in again.');
                return;
            }

            const data = await response.json();
            if (data.success && data.token) {
                localStorage.setItem('student_token', data.token);
                setToken(data.token);
            }
        } catch (error) {
            console.error('Silent token refresh failed:', error);
        } finally {
            isRefreshing.current = false;
        }
    }, [forceLogout]);

    // ── Event-driven sync: on mount + on tab focus ───────────────────────────
    useEffect(() => {
        if (!token) return;

        // Sync on mount
        refreshProfile(token);

        // Check if token needs refresh
        if (tokenExpiresWithinDays(token, 7)) {
            silentRefresh(token);
        }

        // Sync when user returns to the tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && token) {
                refreshProfile(token);
                if (tokenExpiresWithinDays(token, 7)) {
                    silentRefresh(token);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [token, refreshProfile, silentRefresh]);

    // ── Auth actions ─────────────────────────────────────────────────────────

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
                body: JSON.stringify({ phone, otp, deviceId: getDeviceId() }),
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
        // Remove this device's session from server (fire and forget)
        if (token) {
            const deviceId = getDeviceId();
            fetch(`${API_URL}/api/auth/devices/${deviceId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            }).catch(() => { /* ignore */ });
        }

        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
        setToken(null);
        setUser(null);
    };

    const logoutAllDevices = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/logout-all`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                // Clear local session too
                localStorage.removeItem('student_token');
                localStorage.removeItem('student_user');
                setToken(null);
                setUser(null);
                return { success: true };
            }

            return { success: false, error: data.message || 'Failed to logout from all devices' };
        } catch (error) {
            console.error('Logout all devices error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const getActiveDevices = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/devices`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, data: data.data as DeviceInfo[] };
            }

            return { success: false, error: data.message || 'Failed to fetch devices' };
        } catch (error) {
            console.error('Get active devices error:', error);
            return { success: false, error: 'Network error.' };
        }
    };

    const removeDevice = async (deviceId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/devices/${deviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                // If user removed their own current device, log out locally
                if (data.isSelf) {
                    localStorage.removeItem('student_token');
                    localStorage.removeItem('student_user');
                    setToken(null);
                    setUser(null);
                }
                return { success: true, isSelf: data.isSelf };
            }

            return { success: false, error: data.message || 'Failed to remove device' };
        } catch (error) {
            console.error('Remove device error:', error);
            return { success: false, error: 'Network error.' };
        }
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
                logoutAllDevices,
                getActiveDevices,
                removeDevice,
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
