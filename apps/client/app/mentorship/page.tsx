'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Course {
    _id?: string;
    id?: string;
    title: string;
    tagline: string;
    price: string;
    audience: 'Beginner' | 'Veteran' | 'Both';
    stages: ('Prelims' | 'Mains' | 'Both')[];
    levels: ('Beginner' | 'Veteran')[];
    coverage: string;
    deliverables: string[];
    availability: string;
    bundleNote?: string;
    description: string;
}

const DEFAULT_COURSES: Course[] = [
    {
        id: 'gs-foundation',
        title: 'GS Foundation Mentorship',
        tagline: 'For freshers',
        price: '₹9,999',
        audience: 'Beginner',
        stages: ['Mains'],
        levels: ['Beginner'],
        coverage: 'GS1-4 & Essay',
        deliverables: ['Mentor-set daily tasks', 'Weekly review'],
        availability: 'Start Now',
        description: 'Complete end-to-end guidance for freshers starting their UPSC Civil Services preparation. Personal mentor assigns daily study plans, monitors progress, evaluates answer scripts, and conducts weekly 1-on-1 strategy sessions.'
    },
    {
        id: 'advanced-revision-mains',
        title: 'Advanced Revision Mains Mentorship',
        tagline: 'For veterans',
        price: '₹8,999',
        audience: 'Veteran',
        stages: ['Mains'],
        levels: ['Veteran'],
        coverage: 'GS1-4 & Essay',
        deliverables: ['35 Tests', 'Daily Practice'],
        availability: 'Start Now',
        description: 'Targeted Mains revision for candidates who have covered the syllabus at least once. Includes 35 high-yield sectional & full-length tests with expert feedback within 48 hours.'
    },
    {
        id: 'prelims-crash',
        title: 'Prelims Revision/Crash Course Mentorship',
        tagline: 'For beginners & veterans',
        price: '₹999',
        audience: 'Both',
        stages: ['Prelims'],
        levels: ['Beginner', 'Veteran'],
        coverage: 'Prelims — full syllabus revision',
        deliverables: ['45 Tests', 'Revision Videos', 'Daily Targets'],
        availability: 'Opens December',
        description: 'Comprehensive high-intensity crash course covering GS Paper 1 and CSAT. Daily schedule, subject-wise revision videos, formula sheets, and 45 full-scale prelims tests.'
    },
    {
        id: 'yearlong-bundle',
        title: 'Yearlong Advanced Mains + Prelims Mentorship',
        tagline: 'Bundle',
        price: '₹9,899',
        audience: 'Both',
        stages: ['Both', 'Prelims', 'Mains'],
        levels: ['Beginner', 'Veteran'],
        coverage: 'Mains GS1-4 & Essay + Prelims',
        deliverables: ['35 Tests', '45 Tests', 'Daily Practice'],
        availability: 'Start Now',
        bundleNote: 'Bundles Advanced Revision Mains + Prelims Crash Course · saves ₹99',
        description: 'Integrated yearlong program bundling both Mains Advanced Revision and Prelims Crash Course with complete mentor tracking and test evaluation.'
    }
];

const STAGES = ['Prelims', 'Mains', 'Both'];
const LEVELS = ['Beginner', 'Veteran'];

export default function MentorshipLandingPage() {
    // ─── State Management ──────────────────────────────────────────────────────
    const [coursesList, setCoursesList] = useState<Course[]>(DEFAULT_COURSES);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedCourseIndex, setSelectedCourseIndex] = useState<number>(0);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

    // Modals
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [enquiryCourse, setEnquiryCourse] = useState<Course>(DEFAULT_COURSES[0]);

    // Sticky Scroll Bar
    const [scrolled, setScrolled] = useState(false);

    // Interactive Preview State (Detail View Mentorship Shell)
    const [activeTab, setActiveTab] = useState<'daily' | 'roadmap' | 'chat' | 'uploads'>('daily');
    const [hoursLog, setHoursLog] = useState<string>('6.5');
    const [hoursReason, setHoursReason] = useState<string>('');
    const [loggedHours, setLoggedHours] = useState<number>(34.5);
    const [logSubmitted, setLogSubmitted] = useState<boolean>(false);

    // Interactive Task completion checkmarks in Dashboard preview
    const [task1Done, setTask1Done] = useState(true);
    const [task2Done, setTask2Done] = useState(true);
    const [task3Done, setTask3Done] = useState(false);
    const [task4Done, setTask4Done] = useState(false);
    const [overallCompleted, setOverallCompleted] = useState(false);

    // Chat Preview State
    const [chatMessages, setChatMessages] = useState<Array<{ sender: 'mentor' | 'student'; text: string; time: string }>>([
        { sender: 'mentor', text: 'Hi! Welcome to ShailajaIAS Mentorship. Have you completed today\'s Polity answer writing task?', time: '10:15 AM' },
        { sender: 'student', text: 'Yes ma\'am, I uploaded the script for GS2 Federalism question.', time: '10:30 AM' },
        { sender: 'mentor', text: 'Great! I checked your script. Good introduction on Article 246. Work on structuring conclusion with committee recommendations.', time: '11:05 AM' }
    ]);
    const [chatInput, setChatInput] = useState('');

    // Enrollment Form State
    const [enquiryForm, setEnquiryForm] = useState({
        name: '',
        phone: '',
        email: '',
        year: '2025',
        stage: 'Both'
    });
    const [enquirySubmitted, setEnquirySubmitted] = useState(false);

    // Fetch dynamic mentorship courses from backend API
    useEffect(() => {
        const fetchDynamicCourses = async () => {
            try {
                const res = await fetch(`${API_URL}/api/mentorship-courses`);
                const data = await res.json();
                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                    setCoursesList(data.data);
                }
            } catch (err) {
                console.log('Using default mentorship courses');
            }
        };
        fetchDynamicCourses();
    }, []);

    // Scroll listener for sticky bar
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 140) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Active course detail
    const currentCourse = coursesList[selectedCourseIndex] || coursesList[0] || DEFAULT_COURSES[0];

    // Filtered courses list
    const filteredCourses = coursesList.filter(c => {
        const stageMatch = !selectedStage || (c.stages && c.stages.includes(selectedStage as any));
        const levelMatch = !selectedLevel || (c.levels && c.levels.includes(selectedLevel as any));
        return stageMatch && levelMatch;
    });

    const activeFilterCount = (selectedStage ? 1 : 0) + (selectedLevel ? 1 : 0);

    const handleOpenEnrollModal = (course?: Course) => {
        if (course) {
            setEnquiryCourse(course);
        } else {
            setEnquiryCourse(currentCourse);
        }
        setEnquirySubmitted(false);
        setIsEnrollModalOpen(true);
    };

    const handleEnquirySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setEnquirySubmitted(true);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatMessages(prev => [
            ...prev,
            { sender: 'student', text: chatInput, time: 'Just now' }
        ]);
        setChatInput('');
        setTimeout(() => {
            setChatMessages(prev => [
                ...prev,
                { sender: 'mentor', text: 'Thank you for your message! Your assigned mentor will review and respond shortly.', time: 'Just now' }
            ]);
        }, 1000);
    };

    const handleLogHoursSubmit = () => {
        const hrs = parseFloat(hoursLog) || 0;
        setLoggedHours(prev => Math.min(42, prev + hrs));
        setLogSubmitted(true);
        setTimeout(() => setLogSubmitted(false), 3000);
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#1E3A5F] font-sans pb-24">
            {/* ─── Sticky Join Bar (Scrolled Detail Mode) ────────────────────────────── */}
            {view === 'detail' && scrolled && (
                <div className="fixed top-16 left-0 right-0 z-30 bg-amber-50 border-b border-amber-200 shadow-sm animate-in slide-in-from-top duration-200">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[#1E3A5F] truncate">{currentCourse.title}</h3>
                            <p className="text-xs text-gray-600">{currentCourse.coverage}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-base font-bold text-[#1E3A5F]">{currentCourse.price}</span>
                            <button
                                onClick={() => handleOpenEnrollModal(currentCourse)}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl shadow-sm transition-all"
                            >
                                Join Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── LIST VIEW ───────────────────────────────────────────────────────── */}
            {view === 'list' && (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                    {/* Hero Section */}
                    <section className="bg-[#1E3A5F] text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                            {/* Hero Text */}
                            <div className="lg:col-span-7 space-y-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-400/40 rounded-full uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                    Structured 1-on-1 Mentorship
                                </span>
                                <h1 className="text-3xl sm:text-4xl font-extrabold font-serif text-white leading-tight">
                                    Built for the serious aspirant
                                </h1>
                                <div className="space-y-2 text-sm sm:text-base text-slate-200 font-medium">
                                    <div className="flex items-center gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-[#1E3A5F] text-xs font-bold flex items-center justify-center">1</span>
                                        <p>Complete given task</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-[#1E3A5F] text-xs font-bold flex items-center justify-center">2</span>
                                        <p>Log your efforts</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-[#1E3A5F] text-xs font-bold flex items-center justify-center">3</span>
                                        <p>Stay in touch with your Mentor</p>
                                    </div>
                                </div>
                            </div>

                            {/* Walkthrough Video Card Trigger */}
                            <div className="lg:col-span-5">
                                <button
                                    onClick={() => setIsVideoModalOpen(true)}
                                    className="w-full relative group rounded-2xl overflow-hidden border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gray-900 aspect-video text-left focus:outline-none"
                                >
                                    {/* Video Thumbnail Background */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:scale-105 transition-transform duration-500">
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"></div>
                                    </div>

                                    {/* Play Button Badge */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-[#D97706] text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
                                            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5.5v13l11-6.5z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Video Card Title */}
                                    <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between gap-3 text-white">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block">
                                                Walkthrough
                                            </span>
                                            <span className="font-serif font-bold text-base text-white group-hover:text-amber-200 transition-colors">
                                                How Mentorship Works
                                            </span>
                                        </div>
                                        <span className="text-xs bg-black/60 px-2.5 py-1 rounded-md text-gray-300 font-mono">
                                            6 min
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </section>


                    {/* Filter Bar */}
                    <section className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">
                                    Filter
                                </span>

                                {/* Stage Chips */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {STAGES.map(s => {
                                        const isActive = selectedStage === s;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setSelectedStage(isActive ? null : s)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                    isActive
                                                        ? 'bg-[#1E3A5F] text-white font-semibold shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block"></div>

                                {/* Level Chips */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {LEVELS.map(l => {
                                        const isActive = selectedLevel === l;
                                        return (
                                            <button
                                                key={l}
                                                onClick={() => setSelectedLevel(isActive ? null : l)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                    isActive
                                                        ? 'bg-[#1E3A5F] text-white font-semibold shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                }`}
                                            >
                                                {l}
                                            </button>
                                        );
                                    })}
                                </div>

                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={() => {
                                            setSelectedStage(null);
                                            setSelectedLevel(null);
                                        }}
                                        className="ml-2 text-xs font-semibold text-[#D97706] hover:underline"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>

                            <div className="text-xs font-medium text-gray-500 font-mono">
                                {activeFilterCount === 0
                                    ? `${coursesList.length} courses`
                                    : `${filteredCourses.length} of ${coursesList.length} courses`}
                            </div>
                        </div>
                    </section>

                    {/* Courses Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCourses.map((course, idx) => {
                            const isAvailable = course.availability === 'Start Now';
                            return (
                                <div
                                    key={course._id || course.id || idx}
                                    onClick={() => {
                                        const originalIndex = coursesList.findIndex(c => (c._id && c._id === course._id) || c.title === course.title);
                                        setSelectedCourseIndex(originalIndex >= 0 ? originalIndex : idx);
                                        setView('detail');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-amber-300 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                                >
                                    <div className="space-y-4">
                                        {/* Header Tags */}
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] uppercase font-bold tracking-widest text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80">
                                                {course.audience}
                                            </span>
                                            <span
                                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                                    isAvailable
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-gray-100 text-gray-600 border-gray-300'
                                                }`}
                                            >
                                                {course.availability}
                                            </span>
                                        </div>

                                        {/* Course Title & Tagline */}
                                        <div>
                                            <h3 className="text-xl font-bold font-serif text-[#1E3A5F] group-hover:text-[#D97706] transition-colors leading-snug">
                                                {course.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">{course.tagline}</p>
                                        </div>

                                        {/* Bundle Note */}
                                        {course.bundleNote && (
                                            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
                                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {course.bundleNote}
                                            </div>
                                        )}

                                        {/* Coverage */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                                                Coverage
                                            </span>
                                            <p className="text-xs font-semibold text-gray-800 mt-0.5">{course.coverage}</p>
                                        </div>

                                        {/* Deliverables Badges */}
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {course.deliverables.map((d, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 font-medium"
                                                >
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer Price & Preview Action */}
                                    <div className="pt-5 mt-6 border-t border-gray-100 flex items-center justify-between gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500 block">Course Fee</span>
                                            <span className="text-2xl font-bold font-serif text-[#1E3A5F]">
                                                {course.price}
                                            </span>
                                        </div>
                                        <button className="text-xs font-bold text-[#D97706] group-hover:text-amber-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            View Preview
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {filteredCourses.length === 0 && (
                        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-300 space-y-3">
                            <h3 className="text-lg font-bold text-gray-800">No course matches the selected filters</h3>
                            <p className="text-sm text-gray-500">Try resetting filters to view all available mentorship programs.</p>
                            <button
                                onClick={() => {
                                    setSelectedStage(null);
                                    setSelectedLevel(null);
                                }}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#1E3A5F] rounded-xl hover:bg-[#152C4A]"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}
                </main>
            )}

            {/* ─── DETAIL VIEW ──────────────────────────────────────────────────────── */}
            {view === 'detail' && (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                    {/* Top Detail Navigation Bar */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setView('list')}
                            className="px-4 py-2 text-xs font-bold text-[#1E3A5F] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Back to All Mentorship Courses
                        </button>
                        <button
                            onClick={() => handleOpenEnrollModal(currentCourse)}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl shadow-sm"
                        >
                            Talk to us
                        </button>
                    </div>

                    {/* Course Overview Banner */}
                    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-3xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] uppercase font-bold tracking-widest text-[#D97706] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                        {currentCourse.audience}
                                    </span>
                                    <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {currentCourse.availability}
                                    </span>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#1E3A5F]">
                                    {currentCourse.title}
                                </h1>
                                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                    {currentCourse.description}
                                </p>

                                <div className="flex items-center gap-4 text-xs font-medium text-gray-600 pt-1">
                                    <span>Coverage: <strong className="text-gray-800">{currentCourse.coverage}</strong></span>
                                    <span>•</span>
                                    <button
                                        onClick={() => setIsVideoModalOpen(true)}
                                        className="text-[#D97706] font-bold hover:underline flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5.5v13l11-6.5z" />
                                        </svg>
                                        Watch orientation
                                    </button>
                                </div>
                            </div>

                            {/* Price & CTA Box */}
                            <div className="lg:border-l lg:border-gray-200 lg:pl-8 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 bg-gray-50 lg:bg-transparent p-4 lg:p-0 rounded-2xl">
                                <div className="text-left lg:text-right">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                                        One-Time Fee
                                    </span>
                                    <span className="text-3xl font-extrabold font-serif text-[#1E3A5F]">
                                        {currentCourse.price}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleOpenEnrollModal(currentCourse)}
                                    className="px-6 py-3 text-sm font-bold text-white bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl shadow-md transition-all hover:scale-[1.02]"
                                >
                                    Join Now
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Interactive Mentorship Shell Dashboard Preview */}
                    <section className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden">
                        {/* Shell Header Bar */}
                        <div className="bg-[#1E3A5F] text-white px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow">
                                    IAS
                                </div>
                                <div>
                                    <h2 className="text-base font-bold font-serif">ShailajaIAS Live Mentorship Console</h2>
                                    <p className="text-xs text-amber-200">Interactive Student Dashboard Preview</p>
                                </div>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex items-center gap-1 bg-[#152C4A] p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('daily')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'daily' ? 'bg-white text-[#1E3A5F]' : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    Daily Console
                                </button>
                                <button
                                    onClick={() => setActiveTab('roadmap')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'roadmap' ? 'bg-white text-[#1E3A5F]' : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    Subject Roadmap
                                </button>
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'chat' ? 'bg-white text-[#1E3A5F]' : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    Mentor Chat
                                </button>
                                <button
                                    onClick={() => setActiveTab('uploads')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'uploads' ? 'bg-white text-[#1E3A5F]' : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    Evaluated Scripts
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: DAILY CONSOLE */}
                        {activeTab === 'daily' && (
                            <div className="p-6 space-y-6">
                                {/* Study Hours Logger Console */}
                                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                                                Log Daily Target Hours
                                            </span>
                                            <h4 className="text-sm font-bold text-[#1E3A5F]">
                                                Today&apos;s Target: 6.0 Hours • Logged: {loggedHours.toFixed(1)} / 42.0 h this week
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="16"
                                                value={hoursLog}
                                                onChange={e => setHoursLog(e.target.value)}
                                                className="w-20 px-3 py-2 text-sm font-bold text-center border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
                                            />
                                            <span className="text-xs font-semibold text-gray-600">hrs</span>
                                            <button
                                                onClick={handleLogHoursSubmit}
                                                className="px-4 py-2 text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl shadow-sm transition-all"
                                            >
                                                Log Effort
                                            </button>
                                        </div>
                                    </div>

                                    {parseFloat(hoursLog) < 6 && (
                                        <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                                            <span className="text-xs font-semibold text-amber-800 whitespace-nowrap">Reason for under target:</span>
                                            <select
                                                value={hoursReason}
                                                onChange={e => setHoursReason(e.target.value)}
                                                className="text-xs p-1.5 border border-amber-300 rounded-lg bg-white text-gray-800 focus:outline-none"
                                            >
                                                <option value="">Select reason...</option>
                                                <option value="Health">Health issue</option>
                                                <option value="Work">College / Work commitment</option>
                                                <option value="Revision">Extra revision time needed</option>
                                            </select>
                                        </div>
                                    )}

                                    {logSubmitted && (
                                        <div className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                                            ✓ Daily hours successfully recorded in your mentor dashboard!
                                        </div>
                                    )}
                                </div>

                                {/* Today's Structured Tasks */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold font-serif text-[#1E3A5F]">
                                        Today&apos;s Mentor Assigned Tasks (Polity & Governance)
                                    </h3>

                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Task 01 */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center">01</span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800">Watch Concept Video</h4>
                                                    <p className="text-xs text-gray-500">Federal Structure & Emergency Provisions (45 min)</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setTask1Done(!task1Done)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                                                    task1Done
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : 'bg-white text-[#1E3A5F] border border-gray-300 hover:bg-gray-100'
                                                }`}
                                            >
                                                {task1Done ? 'Completed ✓' : 'Mark Done'}
                                            </button>
                                        </div>

                                        {/* Task 02 */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center">02</span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800">Recall Notes & Standard Reading</h4>
                                                    <p className="text-xs text-gray-500">Laxmikanth Ch. 14-16 & Mentor Value Add Notes</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setTask2Done(!task2Done)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                                                    task2Done
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : 'bg-white text-[#1E3A5F] border border-gray-300 hover:bg-gray-100'
                                                }`}
                                            >
                                                {task2Done ? 'Completed ✓' : 'Mark Done'}
                                            </button>
                                        </div>

                                        {/* Task 03 */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center">03</span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800">Take Prelims Daily Mini Test</h4>
                                                    <p className="text-xs text-gray-500">15 Questions on Centre-State Relations</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setTask3Done(!task3Done)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                                                    task3Done
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : 'bg-white text-[#1E3A5F] border border-gray-300 hover:bg-gray-100'
                                                }`}
                                            >
                                                {task3Done ? 'Completed ✓' : 'Take Test'}
                                            </button>
                                        </div>

                                        {/* Task 04 */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center">04</span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800">Upload Mains Daily Answer Script</h4>
                                                    <p className="text-xs text-gray-500">15-marker question on Governor role in Federalism</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setTask4Done(!task4Done)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                                                    task4Done
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        : 'bg-white text-[#1E3A5F] border border-gray-300 hover:bg-gray-100'
                                                }`}
                                            >
                                                {task4Done ? 'Uploaded ✓' : 'Upload PDF'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2 text-center">
                                        <button
                                            onClick={() => setOverallCompleted(!overallCompleted)}
                                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${
                                                overallCompleted
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : 'bg-[#1E3A5F] text-white hover:bg-[#152C4A]'
                                            }`}
                                        >
                                            {overallCompleted ? '🎉 All Tasks Submitted for Mentor Review!' : 'Yay! I completed today\'s targets 🎉'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SUBJECT ROADMAP */}
                        {activeTab === 'roadmap' && (
                            <div className="p-6 space-y-6">
                                <h3 className="text-base font-bold font-serif text-[#1E3A5F]">
                                    Syllabus Coverage & Subject Timelines
                                </h3>

                                <div className="space-y-4">
                                    {/* Active Subject */}
                                    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D97706] bg-amber-100 px-2.5 py-0.5 rounded-full">
                                                Active Subject
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500">Test Date: 12th Sept</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-[#1E3A5F]">Indian Polity & Governance</h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-gray-600 font-semibold">
                                                <span>Completion Rate</span>
                                                <span>75%</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#D97706] rounded-full w-[75%]"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upcoming Subjects */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Upcoming Subject</span>
                                            <h4 className="text-base font-bold text-gray-800">Modern Indian History</h4>
                                            <p className="text-xs text-gray-500">Scheduled: 14 Sept - 28 Sept • 12 Daily Tasks</p>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Upcoming Subject</span>
                                            <h4 className="text-base font-bold text-gray-800">Indian Economy & Macroeconomics</h4>
                                            <p className="text-xs text-gray-500">Scheduled: 29 Sept - 15 Oct • 16 Daily Tasks</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: MENTOR CHAT */}
                        {activeTab === 'chat' && (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                                    <div className="w-10 h-10 rounded-full bg-[#1E3A5F] text-white font-bold flex items-center justify-center text-xs">
                                        AK
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800">Senior Mentor (Anju Kumari, UPSC Rank 60)</h4>
                                        <span className="text-xs text-emerald-600 font-medium">● Online — Ready to guide</span>
                                    </div>
                                </div>

                                {/* Chat Thread */}
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 min-h-[220px] max-h-[350px] overflow-y-auto space-y-3">
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                                    msg.sender === 'student'
                                                        ? 'bg-[#1E3A5F] text-white rounded-br-none'
                                                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
                                                }`}
                                            >
                                                <p>{msg.text}</p>
                                                <span
                                                    className={`text-[10px] block mt-1 ${
                                                        msg.sender === 'student' ? 'text-gray-300 text-right' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {msg.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Input Box */}
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask your mentor a doubt or request strategy guidance..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
                                    />
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl shadow-sm"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* TAB 4: EVALUATED SCRIPTS */}
                        {activeTab === 'uploads' && (
                            <div className="p-6 space-y-4">
                                <h3 className="text-base font-bold font-serif text-[#1E3A5F]">
                                    Evaluated Mains Answer Scripts & Mentor Reviews
                                </h3>

                                <div className="space-y-3">
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                Evaluated • Score: 9.5 / 15
                                            </span>
                                            <h4 className="text-sm font-bold text-gray-800 mt-1">GS2 Federal Structure & Inter-State Council</h4>
                                            <p className="text-xs text-gray-500">Submitted 04 Sept • Reviewed by Mentor AK within 24h</p>
                                        </div>
                                        <button className="px-4 py-2 text-xs font-bold text-[#1E3A5F] bg-white border border-gray-300 rounded-xl hover:bg-gray-100">
                                            Download Reviewed PDF ↗
                                        </button>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                Under Evaluation
                                            </span>
                                            <h4 className="text-sm font-bold text-gray-800 mt-1">GS2 Constitutional Amendment Process</h4>
                                            <p className="text-xs text-gray-500">Submitted Today • Expected Feedback by Tomorrow 10 AM</p>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">In Queue</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </main>
            )}

            {/* ─── VIDEO ORIENTATION MODAL ─────────────────────────────────────────── */}
            {isVideoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-gray-200 space-y-0">
                        <div className="bg-[#1E3A5F] text-white p-4 px-6 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                                    Mentorship Orientation
                                </span>
                                <h3 className="text-base font-bold font-serif">How ShailajaIAS Mentorship Works</h3>
                            </div>
                            <button
                                onClick={() => setIsVideoModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-black aspect-video relative flex items-center justify-center">
                            {/* Embedded Sample Video Player Container */}
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                                title="ShailajaIAS Mentorship Orientation"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-600">
                            <span>Includes daily target demo, mentor log console & live evaluation flow</span>
                            <button
                                onClick={() => setIsVideoModalOpen(false)}
                                className="px-4 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100"
                            >
                                Close Video
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── ENROLLMENT / ENQUIRY MODAL ("Talk to us" / "Join Now") ───────────── */}
            {isEnrollModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-gray-200">
                        {/* Modal Header */}
                        <div className="bg-[#1E3A5F] text-white p-6 flex items-start justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                                    Direct Mentor Enquiry
                                </span>
                                <h3 className="text-xl font-bold font-serif mt-0.5">
                                    Enroll in {enquiryCourse.title}
                                </h3>
                                <p className="text-xs text-amber-100/80 mt-1">
                                    Course Fee: <strong className="text-white font-bold">{enquiryCourse.price}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setIsEnrollModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Form / Success Content */}
                        {!enquirySubmitted ? (
                            <form onSubmit={handleEnquirySubmit} className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your full name"
                                        value={enquiryForm.name}
                                        onChange={e => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">Phone / WhatsApp *</label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="+91 98765 43210"
                                            value={enquiryForm.phone}
                                            onChange={e => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">Target UPSC Year *</label>
                                        <select
                                            value={enquiryForm.year}
                                            onChange={e => setEnquiryForm({ ...enquiryForm, year: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
                                        >
                                            <option value="2025">UPSC CSE 2025</option>
                                            <option value="2026">UPSC CSE 2026</option>
                                            <option value="2027">UPSC CSE 2027</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Email Address (Optional)</label>
                                    <input
                                        type="email"
                                        placeholder="aspirant@gmail.com"
                                        value={enquiryForm.email}
                                        onChange={e => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        className="w-full py-3 text-sm font-bold text-white bg-[#1E3A5F] hover:bg-[#152C4A] rounded-xl shadow-md transition-all hover:shadow-lg"
                                    >
                                        Confirm & Submit Enquiry
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-500 text-center">
                                    Our mentor team will call you within 24 hours to explain schedule & enrollment details.
                                </p>
                            </form>
                        ) : (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                                    ✓
                                </div>
                                <h4 className="text-xl font-bold font-serif text-[#1E3A5F]">
                                    Enquiry Received!
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                                    Thank you, <strong className="text-gray-900">{enquiryForm.name}</strong>. Your mentorship enquiry for{' '}
                                    <strong className="text-[#1E3A5F]">{enquiryCourse.title}</strong> has been submitted. Our Senior Mentor will reach out at <strong className="text-gray-900">{enquiryForm.phone}</strong> shortly.
                                </p>
                                <button
                                    onClick={() => setIsEnrollModalOpen(false)}
                                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#1E3A5F] rounded-xl hover:bg-[#152C4A]"
                                >
                                    Close Window
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
