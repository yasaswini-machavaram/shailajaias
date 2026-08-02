'use client';

import { useState } from 'react';
import { useMentorAuth } from '../MentorAuthContext';

export default function MentorLoginPage() {
    const { login } = useMentorAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);
        if (result.success) {
            window.location.href = '/mentor';
        } else {
            setError(result.error || 'Login failed');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl">📝</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Mentor Portal</h1>
                    <p className="text-sm text-slate-400 mt-1">Shailaja IAS Academy</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Sign In</h2>

                    {error && (
                        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 border border-red-200">{error}</div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="mentor@example.com" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="••••••••" required />
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading}
                        className="w-full mt-6 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors">
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="text-[10px] text-center text-slate-400 mt-4">
                        Credentials are provided by the admin. Contact admin for access.
                    </p>
                </form>
            </div>
        </div>
    );
}
