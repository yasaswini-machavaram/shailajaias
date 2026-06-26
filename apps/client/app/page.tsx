'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

// ─── Motivational Quotes ─────────────────────────────────────────────────────
const QUOTES = [
    { text: 'Arise, Awake and stop not till the goal is reached', author: 'Swami Vivekananda' },
    { text: 'The future depends on what you do today', author: 'Mahatma Gandhi' },
    { text: 'Education is the most powerful weapon which you can use to change the world', author: 'Nelson Mandela' },
];

// ─── Topper Testimonials (YouTube) ───────────────────────────────────────────
const TESTIMONIALS = [
    {
        title: 'UPSC Hindi Medium Topper',
        videoId: 'dQw4w9WgXcQ',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    },
    {
        title: 'UPSC Result 2024 — Prem Singh',
        videoId: 'dQw4w9WgXcQ',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    },
    {
        title: 'UPSC Topper — Anju, Rank 60',
        videoId: 'dQw4w9WgXcQ',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    },
];

// ─── Announcements ───────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
    'Batch 1 starting from 3rd October',
    'Prelims Revision program starting soon',
    'New Mains Test Series launched — enroll now',
];

// ─── Module Navigation Cards ─────────────────────────────────────────────────
const MODULES = [
    {
        title: 'Mentorship',
        href: '/mentorship',
        icon: (
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
        ),
        free: false,
        accent: '#E65100',
        bg: '#FFF3E0',
    },
    {
        title: 'Video Courses',
        href: '/topics',
        icon: (
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
            </svg>
        ),
        free: true,
        accent: '#1565C0',
        bg: '#E3F2FD',
    },
    {
        title: 'Current Affairs',
        href: '/current-affairs',
        icon: (
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
        ),
        free: true,
        accent: '#2E7D32',
        bg: '#E8F5E9',
    },
    {
        title: 'Tests',
        subtitle: '(Pre & Mains)',
        href: '/tests',
        icon: (
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        free: true,
        accent: '#6A1B9A',
        bg: '#F3E5F5',
    },
    {
        title: 'Resources',
        subtitle: '(Books, PYQs)',
        href: '/resources',
        icon: (
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
        ),
        free: true,
        accent: '#00695C',
        bg: '#E0F2F1',
    },
    {
        title: 'My Profile',
        href: '/profile',
        icon: (
            <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        free: false,
        accent: '#D97706',
        bg: '#FEF3C7',
    },
];

// ─── Hero Banner Slides ──────────────────────────────────────────────────────
const BANNERS = [
    {
        title: 'Mains Evaluation & Mentorship',
        subtitle: 'For UPSC CSE',
        description: 'Bring Any GS / Essay Paper, Any Source',
        cta: 'Starting at just ₹2000/- • START ANYTIME',
        contact: '9900 691 648',
        gradient: 'from-[#1E3A5F] to-[#2563EB]',
    },
    {
        title: 'Free Current Affairs',
        subtitle: 'Daily Updates',
        description: 'Prelims + Mains + Quiz — Updated Every Day',
        cta: 'Start Learning Today — 100% Free',
        contact: '9900 691 648',
        gradient: 'from-[#059669] to-[#0D9488]',
    },
    {
        title: 'Complete Resources',
        subtitle: 'Study Materials',
        description: 'Standard Books, Topper Notes, PYQ Solutions',
        cta: 'All resources in one place',
        contact: '9900 691 648',
        gradient: 'from-[#7C3AED] to-[#4338CA]',
    },
];

export default function LandingPage() {
    const router = useRouter();
    const { isLoggedIn, user } = useStudentAuth();
    const [currentBanner, setCurrentBanner] = useState(0);
    const [quoteIdx, setQuoteIdx] = useState(0);
    const testimonialRef = useRef<HTMLDivElement>(null);

    // Auto-rotate banners
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % BANNERS.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    // Auto-rotate quotes
    useEffect(() => {
        const timer = setInterval(() => {
            setQuoteIdx((prev) => (prev + 1) % QUOTES.length);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    const scrollTestimonials = useCallback((dir: 'left' | 'right') => {
        if (testimonialRef.current) {
            const amount = 280;
            testimonialRef.current.scrollBy({
                left: dir === 'left' ? -amount : amount,
                behavior: 'smooth',
            });
        }
    }, []);

    const banner = BANNERS[currentBanner];
    const quote = QUOTES[quoteIdx];

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
            <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto space-y-8">

                {/* ══════════════════════════════════════════════════════════ */}
                {/* HERO BANNER CAROUSEL                                      */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up">
                    <div
                        className={`relative rounded-[2rem] overflow-hidden bg-gradient-to-r ${banner.gradient} p-6 md:p-10 min-h-[180px] md:min-h-[220px] transition-all duration-700`}
                    >
                        <div className="relative z-10 flex flex-col justify-center h-full">
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.15em] mb-1">{banner.subtitle}</p>
                            <h2 className="text-white text-xl md:text-3xl font-bold leading-tight mb-2">{banner.title}</h2>
                            <p className="text-white/80 text-sm md:text-base mb-3">{banner.description}</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold">
                                    {banner.cta}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-white/90 text-xs font-semibold">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                    {banner.contact}
                                </span>
                            </div>
                        </div>
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                    </div>

                    {/* Banner dots */}
                    <div className="flex justify-center gap-2 mt-4">
                        {BANNERS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentBanner(idx)}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentBanner
                                    ? 'bg-[#D97706] scale-125'
                                    : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                            />
                        ))}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* PROFILE GREETING CARD                                      */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
                    <div className="bg-white rounded-[2rem] p-5 md:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 w-full">
                            <div className="w-12 h-12 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center text-xl shrink-0">
                                👤
                            </div>
                            <div>
                                <h3 className="text-sm md:text-base font-bold text-[#1E3A5F]">
                                    {isLoggedIn ? `Welcome back, ${user?.name || 'Student'}!` : 'Welcome, Aspirant!'}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    {isLoggedIn 
                                        ? 'Track your test scores, view saved reports, and manage your doubts.' 
                                        : 'Log in to track your test reports, save practice tests, and ask doubts.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(isLoggedIn ? '/profile' : '/login')}
                            className="w-full md:w-auto px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#152C4A] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] shrink-0"
                        >
                            <span>{isLoggedIn ? 'Go to My Profile' : 'Sign In / Register'}</span>
                            <span>➡️</span>
                        </button>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* MODULE NAVIGATION CARDS                                   */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                    <div className="bg-white rounded-[2rem] p-5 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100">
                        <div className="flex items-center justify-around gap-2 md:gap-6 flex-wrap">
                            {MODULES.map((mod, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => router.push(mod.href)}
                                    className="relative flex flex-col items-center gap-2 group w-[60px] md:w-[100px]"
                                >
                                    {/* Free Badge */}
                                    {mod.free && (
                                        <span className="absolute -top-2 right-0 md:-top-1 md:right-1 text-[9px] md:text-[10px] font-extrabold text-red-500 tracking-wide z-10">
                                            Free
                                        </span>
                                    )}

                                    {/* Icon Container */}
                                    <div
                                        className="w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                                        style={{
                                            backgroundColor: mod.bg,
                                            borderColor: mod.accent + '40',
                                            color: mod.accent,
                                        }}
                                    >
                                        {mod.icon}
                                    </div>

                                    {/* Label */}
                                    <div className="text-center">
                                        <p className="text-[10px] md:text-[13px] font-bold text-[#1E3A5F] leading-tight group-hover:text-[#D97706] transition-colors">
                                            {mod.title}
                                        </p>
                                        {mod.subtitle && (
                                            <p className="text-[8px] md:text-[10px] text-gray-400 font-medium leading-tight mt-0.5">
                                                {mod.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* MOTIVATIONAL QUOTE                                        */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up" style={{ animationDelay: '180ms' }}>
                    <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center gap-4">
                        <div className="flex-1">
                            <p className="text-[13px] md:text-[15px] font-semibold text-[#1E3A5F] italic leading-relaxed transition-all duration-500">
                                &ldquo;{quote.text}&rdquo;
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium mt-1.5">— {quote.author}</p>
                        </div>
                        {/* Language toggle placeholder */}
                        <button className="shrink-0 w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-[#EEF2FF] hover:text-[#1E3A5F] transition-all">
                            अ
                        </button>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* TOPPERS TESTIMONIALS                                      */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                    <div className="bg-[#F3E5F5]/40 rounded-[2rem] p-5 md:p-8 border border-[#CE93D8]/20">
                        <h2 className="text-base md:text-lg font-bold text-[#1E3A5F] text-center mb-5">
                            Toppers Testimonials
                        </h2>

                        {/* Scrollable Row */}
                        <div
                            ref={testimonialRef}
                            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {TESTIMONIALS.map((t, idx) => (
                                <a
                                    key={idx}
                                    href={`https://www.youtube.com/watch?v=${t.videoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="snap-start shrink-0 w-[240px] md:w-[280px] group"
                                >
                                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-200">
                                        {/* Thumbnail placeholder */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p className="absolute bottom-2 left-3 right-3 text-white text-xs font-semibold line-clamp-1">{t.title}</p>
                                    </div>
                                </a>
                            ))}
                        </div>

                        {/* Nav arrows */}
                        <div className="flex items-center justify-center gap-3 mt-3">
                            <button
                                onClick={() => scrollTestimonials('left')}
                                className="w-8 h-8 rounded-full bg-[#D97706] text-white flex items-center justify-center hover:bg-[#B45309] transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => scrollTestimonials('right')}
                                className="w-8 h-8 rounded-full bg-[#D97706] text-white flex items-center justify-center hover:bg-[#B45309] transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* View All */}
                        <div className="text-right mt-2">
                            <a
                                href="https://www.youtube.com/@ShailajaIAS"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] font-bold text-[#1E3A5F] hover:text-[#D97706] transition-colors"
                            >
                                View All &gt;&gt;
                            </a>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* ANNOUNCEMENTS                                             */}
                {/* ══════════════════════════════════════════════════════════ */}
                <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-gray-100">
                        <h2 className="text-base font-bold text-[#1E3A5F] text-center mb-4">Announcements</h2>
                        <ul className="space-y-2.5">
                            {ANNOUNCEMENTS.map((text, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                    <span className="mt-1 w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
                                    <p className="text-sm text-gray-700">{text}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="text-right mt-3">
                            <button className="text-[12px] font-bold text-[#1E3A5F] hover:text-[#D97706] transition-colors">
                                View All &gt;&gt;
                            </button>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* FOOTER                                                    */}
                {/* ══════════════════════════════════════════════════════════ */}
                <footer className="animate-fade-in-up" style={{ animationDelay: '360ms' }}>
                    <div className="bg-[#1E3A5F] rounded-[2rem] p-6 md:p-8 text-white">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-12">
                            {/* Brand */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center">
                                    <span className="text-lg font-bold text-white">S</span>
                                </div>
                                <div>
                                    <p className="font-bold text-lg">SHAILAJA</p>
                                    <p className="text-[10px] text-white/60 font-medium tracking-wider">IAS</p>
                                </div>
                            </div>

                            {/* Links */}
                            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/70">
                                <a href="#" className="hover:text-white transition-colors font-medium">About Us</a>
                                <a href="#" className="hover:text-white transition-colors font-medium">Privacy Policy</a>
                                <a href="#" className="hover:text-white transition-colors font-medium">Refund Policy</a>
                                <a href="#" className="hover:text-white transition-colors font-medium">Our Team</a>
                                <a href="#" className="hover:text-white transition-colors font-medium">FAQs</a>
                                <a href="#" className="hover:text-white transition-colors font-medium">Contact Us</a>
                            </div>

                            {/* Contact button */}
                            <div className="shrink-0 ml-auto hidden md:block">
                                <a
                                    href="tel:9900691648"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 rounded-full text-white text-sm font-semibold transition-colors shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                    Contact Us
                                </a>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 text-center">
                            <p className="text-[11px] text-white/40">© {new Date().getFullYear()} Shailaja IAS. All rights reserved.</p>
                        </div>
                    </div>
                </footer>

            </main>

            {/* Mobile Contact FAB */}
            <a
                href="tel:9900691648"
                className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-green-500 shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
            >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
            </a>
        </div>
    );
}
