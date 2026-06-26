'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { isLoggedIn, sendOtp, verifyOtp, isLoading: authLoading } = useStudentAuth();
    
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [devOtpCode, setDevOtpCode] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && isLoggedIn) {
            const redirectTo = localStorage.getItem('redirect_after_login') || '/profile';
            localStorage.removeItem('redirect_after_login');
            router.push(redirectTo);
        }
    }, [authLoading, isLoggedIn, router]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        
        // Basic phone validation (10 digits)
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            setErrorMessage('Please enter a valid 10-digit phone number.');
            return;
        }

        setStatus('loading');
        try {
            const result = await sendOtp(cleanPhone);
            if (result.success) {
                setStatus('idle');
                setStep('otp');
                setSuccessMessage(result.message || 'OTP sent successfully!');
                if (result.devOtp) {
                    setDevOtpCode(result.devOtp);
                    console.log(
                        `%c🔑 [DEV MODE] OTP CODE FOR ${cleanPhone}: ${result.devOtp}`,
                        "color: white; background: #1E3A5F; font-size: 14px; font-weight: bold; padding: 6px 12px; border-radius: 6px;"
                    );
                }
            } else {
                setStatus('error');
                setErrorMessage(result.error || 'Failed to send OTP. Please try again.');
            }
        } catch {
            setStatus('error');
            setErrorMessage('Failed to connect to the server.');
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            setErrorMessage('Please enter a valid 6-digit verification code.');
            return;
        }

        setStatus('loading');
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const result = await verifyOtp(cleanPhone, otp);
            
            if (result.success) {
                setStatus('success');
                const redirectTo = localStorage.getItem('redirect_after_login') || '/profile';
                localStorage.removeItem('redirect_after_login');
                router.push(redirectTo);
            } else {
                setStatus('error');
                setErrorMessage(result.error || 'Invalid OTP code. Please check and try again.');
            }
        } catch {
            setStatus('error');
            setErrorMessage('Failed to connect to the server.');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1E3A5F] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24">
            {/* Hero Section */}
            <div
                className="relative overflow-hidden pt-12 pb-16 px-4"
                style={{
                    background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
                }}
            >
                {/* Decorative circles */}
                <div className="absolute top-[-40px] right-[-40px] w-32 h-32 rounded-full opacity-10 bg-white" />
                <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 rounded-full opacity-10 bg-[#D97706]" />

                <div className="max-w-md mx-auto text-center relative z-10">
                    {/* Logo / Brand */}
                    <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg">
                        <span className="text-4xl">📚</span>
                    </div>
                    <h1
                        className="text-2xl font-bold text-white mb-2"
                        style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                        Welcome to Shailaja IAS
                    </h1>
                    <p className="text-white/70 text-sm font-light">
                        Your UPSC preparation journey starts here
                    </p>
                </div>
            </div>

            {/* Login Card */}
            <div className="max-w-md mx-auto px-4 -mt-8 relative z-20">
                <div
                    className="bg-white rounded-2xl shadow-lg p-6"
                    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
                >
                    <h2 className="text-lg font-semibold text-[#1E3A5F] text-center mb-1">
                        Student Login
                    </h2>
                    <p className="text-sm text-[#64748B] text-center mb-6">
                        {step === 'phone' ? 'Verify your phone number to access your account' : 'Enter the verification code sent to your phone'}
                    </p>

                    {/* Step 1: Phone Form */}
                    {step === 'phone' && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        placeholder="Enter 10-digit number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="w-full pl-12 pr-4 h-12 bg-white border border-[#E5E7EB] focus:border-2 focus:border-[#1E3A5F] rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] transition-all outline-none font-medium text-sm"
                                        required
                                        disabled={status === 'loading'}
                                    />
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">⚠️</span>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full h-12 bg-[#1E3A5F] hover:bg-[#152C4A] disabled:bg-[#1E3A5F]/50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                        <span>Sending OTP...</span>
                                    </>
                                ) : (
                                    <span>Send OTP Code</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP Form */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-semibold text-[#1E3A5F] uppercase tracking-wider">
                                        Verification Code (OTP)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('phone');
                                            setOtp('');
                                            setErrorMessage('');
                                            setStatus('idle');
                                        }}
                                        className="text-xs font-bold text-[#D97706] hover:underline"
                                    >
                                        Edit Number
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 h-12 bg-white border border-[#E5E7EB] focus:border-2 focus:border-[#1E3A5F] rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] transition-all outline-none font-mono text-center text-lg tracking-[0.5em] font-bold"
                                    required
                                    disabled={status === 'loading'}
                                />
                            </div>

                            {/* Dev notice */}
                            <div className="bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338CA] text-xs px-4 py-3 rounded-xl">
                                <p className="font-bold flex items-center gap-1.5 mb-1">
                                    <span>💻</span> Development Sandbox Mode
                                </p>
                                <p className="leading-relaxed mb-2">
                                    SMS transmission is bypassed. Please check your developer <strong>terminal server console log</strong> for the 6-digit code.
                                </p>
                                {devOtpCode && (
                                    <div className="bg-white border border-[#C7D2FE] p-2.5 rounded-lg text-center mt-2">
                                        <p className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">Sandbox Verification Code</p>
                                        <p className="text-lg font-mono font-extrabold text-[#1E3A5F] tracking-widest">{devOtpCode}</p>
                                    </div>
                                )}
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-start gap-2">
                                    <span className="text-red-500 mt-0.5">⚠️</span>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full h-12 bg-[#1E3A5F] hover:bg-[#152C4A] disabled:bg-[#1E3A5F]/50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <span>Verify & Login</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-3 text-[#94A3B8]">How it works</span>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        {[
                            {
                                step: '1',
                                icon: '📱',
                                title: 'Enter your phone',
                                desc: 'Provide your 10-digit mobile number',
                            },
                            {
                                step: '2',
                                icon: '🔑',
                                title: 'Get the OTP code',
                                desc: 'Look at the server terminal log to retrieve the code',
                            },
                            {
                                step: '3',
                                icon: '🚀',
                                title: 'Start studying',
                                desc: 'Instantly access your personalized profile page',
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                                    <span className="text-base">{item.icon}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#1E3A5F]">{item.title}</p>
                                    <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Privacy Note */}
                <p className="text-center text-xs text-[#94A3B8] mt-6 px-4">
                    🔒 Secure development login sandbox.
                    <br />
                    No real SMS API calls or data sharing.
                </p>
            </div>
        </div>
    );
}
