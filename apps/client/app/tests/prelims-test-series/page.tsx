'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { getTestSeriesList, getTestSeriesById, API_URL, type TestSeries, type TestSeriesItem, type Quiz, type Question } from '@/lib/api';

const optionLabels = ['A', 'B', 'C', 'D'];

// Helper to get soft tinted backgrounds for cards based on subject
function getSubjectStyles(subjectName: string) {
    const name = subjectName.toLowerCase();
    if (name.includes('polity')) {
        return {
            bg: 'bg-blue-50/60 hover:bg-blue-50 border-blue-100',
            badge: 'bg-blue-100 text-blue-800',
            accent: 'text-blue-600',
        };
    } else if (name.includes('economy')) {
        return {
            bg: 'bg-green-50/60 hover:bg-green-50 border-green-100',
            badge: 'bg-green-100 text-green-800',
            accent: 'text-green-600',
        };
    } else if (name.includes('env') || name.includes('ecology')) {
        return {
            bg: 'bg-teal-50/60 hover:bg-teal-50 border-teal-100',
            badge: 'bg-teal-100 text-teal-800',
            accent: 'text-teal-600',
        };
    } else if (name.includes('hist') || name.includes('culture')) {
        return {
            bg: 'bg-rose-50/60 hover:bg-rose-50 border-rose-100',
            badge: 'bg-rose-100 text-rose-800',
            accent: 'text-rose-600',
        };
    } else if (name.includes('geography')) {
        return {
            bg: 'bg-amber-50/60 hover:bg-amber-50 border-amber-100',
            badge: 'bg-amber-100 text-amber-800',
            accent: 'text-amber-600',
        };
    } else if (name.includes('science') || name.includes('tech') || name.includes('s&t')) {
        return {
            bg: 'bg-purple-50/60 hover:bg-purple-50 border-purple-100',
            badge: 'bg-purple-100 text-purple-800',
            accent: 'text-purple-600',
        };
    }
    return {
        bg: 'bg-slate-50/60 hover:bg-slate-50 border-slate-100',
        badge: 'bg-slate-100 text-slate-800',
        accent: 'text-slate-600',
    };
}

// Convert youtube watch URL to embed URL for iframe
function getYoutubeEmbedUrl(url?: string) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
}

export default function PrelimsTestSeriesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20 min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
            </div>
        }>
            <PrelimsTestSeriesInner />
        </Suspense>
    );
}

function PrelimsTestSeriesInner() {
    const [seriesList, setSeriesList] = useState<TestSeries[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<TestSeries | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [subjects, setSubjects] = useState<string[]>(['All']);
    const [filteredTests, setFilteredTests] = useState<TestSeriesItem[]>([]);
    
    // UI Expand / Collapse
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    // Video & Doubt Modal states
    const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
    const [showDoubtModal, setShowDoubtModal] = useState<TestSeriesItem | null>(null);

    // Online Exam Engine
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [activeTestItem, setActiveTestItem] = useState<TestSeriesItem | null>(null);
    const [learnMode, setLearnMode] = useState<boolean>(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showScorecard, setShowScorecard] = useState(false);
    const [showReview, setShowReview] = useState(false);

    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [testStartTime, setTestStartTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch initial published test series
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const list = await getTestSeriesList(false); // only published
                setSeriesList(list);
                // Auto-select only if exactly 1 group (skip landing page)
                if (list.length === 1) {
                    const detailedFirst = await getTestSeriesById(list[0]._id);
                    setSelectedSeries(detailedFirst);
                }
            } catch (error) {
                console.error('Failed to load test series:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch details when switching active series group
    const handleSelectSeries = async (id: string) => {
        setIsLoading(true);
        setExpandedIndex(null);
        setSelectedSubject('All');
        try {
            const detailed = await getTestSeriesById(id);
            setSelectedSeries(detailed);
        } catch (error) {
            console.error('Failed to load detailed test series:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate subjects & filter tests based on selected series
    useEffect(() => {
        if (!selectedSeries) return;

        // Categorize tests into subjects dynamically
        const getTestSubject = (test: TestSeriesItem) => {
            const title = test.title.toLowerCase();
            if (title.includes('polity')) return 'Polity';
            if (title.includes('economy')) return 'Economy';
            if (title.includes('env') || title.includes('ecology')) return 'Environment';
            if (title.includes('hist') || title.includes('culture')) return 'History';
            if (title.includes('geo')) return 'Geography';
            if (title.includes('sci') || title.includes('tech') || title.includes('s&t')) return 'S&T';
            
            // Check linked quiz questions
            const quiz = test.quizId;
            if (quiz && typeof quiz === 'object' && 'questions' in quiz) {
                for (const q of (quiz as Quiz).questions) {
                    if (q.subject) {
                        const s = q.subject.toLowerCase();
                        if (s.includes('polity')) return 'Polity';
                        if (s.includes('economy')) return 'Economy';
                        if (s.includes('env') || s.includes('ecology')) return 'Environment';
                        if (s.includes('hist') || s.includes('culture')) return 'History';
                        if (s.includes('geo')) return 'Geography';
                        if (s.includes('sci') || s.includes('tech') || s.includes('s&t')) return 'S&T';
                    }
                }
            }
            return 'General';
        };

        // Extract unique subjects
        const subjectTags = new Set<string>();
        selectedSeries.tests.forEach((t) => {
            subjectTags.add(getTestSubject(t));
        });

        const defaultList = ['Polity', 'Economy', 'Environment', 'History', 'Geography', 'S&T'];
        const mergedSubjects = Array.from(subjectTags).length > 0
            ? ['All', ...Array.from(subjectTags)]
            : ['All', ...defaultList];
        
        setSubjects(mergedSubjects);

        // Filter tests
        if (selectedSubject === 'All') {
            setFilteredTests(selectedSeries.tests);
        } else {
            const filtered = selectedSeries.tests.filter((t) => getTestSubject(t) === selectedSubject);
            setFilteredTests(filtered);
        }
    }, [selectedSeries, selectedSubject]);

    // Classification Helper
    const getTestSubjectLabel = (test: TestSeriesItem) => {
        const title = test.title.toLowerCase();
        if (title.includes('polity')) return 'Polity';
        if (title.includes('economy')) return 'Economy';
        if (title.includes('env') || title.includes('ecology')) return 'Environment';
        if (title.includes('hist') || title.includes('culture')) return 'History';
        if (title.includes('geo')) return 'Geography';
        if (title.includes('sci') || title.includes('tech') || title.includes('s&t')) return 'S&T';
        return 'General';
    };

    // Calculate Sectional vs Full Length Counts
    const getCounts = (tests: TestSeriesItem[]) => {
        const sectional = tests.filter(
            (t) => !t.title.toLowerCase().includes('full') && !t.title.toLowerCase().includes('flt')
        ).length;
        const fullLength = tests.filter(
            (t) => t.title.toLowerCase().includes('full') || t.title.toLowerCase().includes('flt')
        ).length;
        return { sectional, fullLength };
    };

    // Start Online Quiz
    const handleStartOnlineQuiz = (quiz: Quiz, testItem: TestSeriesItem) => {
        setActiveQuiz(quiz);
        setActiveTestItem(testItem);
        setLearnMode(true);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setShowScorecard(false);
        setShowReview(false);
        const totalSeconds = quiz.questions.length * 60;
        setTimeRemaining(totalSeconds);
        setTestStartTime(Date.now());
    };

    // Timer effect
    useEffect(() => {
        if (activeQuiz && !showScorecard && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        setShowScorecard(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeQuiz, showScorecard]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Compute time taken
    const getTimeTaken = () => {
        if (!activeQuiz) return '00:00';
        const totalSeconds = activeQuiz.questions.length * 60;
        const taken = totalSeconds - timeRemaining;
        return formatTime(taken);
    };

    const handleSelectOption = (qIdx: number, optIdx: number) => {
        setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    };

    // Scoring helpers
    const getStats = useCallback(() => {
        if (!activeQuiz) return { correct: 0, incorrect: 0, unattempted: 0, totalScore: 0, maxMarks: 0, negativeMarks: 0, accuracy: 0 };
        let correct = 0, incorrect = 0, unattempted = 0;
        activeQuiz.questions.forEach((q, idx) => {
            if (answers[idx] === undefined) unattempted++;
            else if (answers[idx] === q.correctIndex) correct++;
            else incorrect++;
        });
        const positiveMarks = correct * 2;
        const negativeMarks = parseFloat((incorrect * (2 / 3)).toFixed(2));
        const totalScore = parseFloat((positiveMarks - negativeMarks).toFixed(2));
        const maxMarks = activeQuiz.questions.length * 2;
        const attempted = correct + incorrect;
        const accuracy = attempted > 0 ? parseFloat(((correct / attempted) * 100).toFixed(1)) : 0;
        return { correct, incorrect, unattempted, totalScore, maxMarks, negativeMarks, accuracy };
    }, [activeQuiz, answers]);

    // Subject-wise breakdown
    const getSubjectBreakdown = useCallback(() => {
        if (!activeQuiz) return [];
        const map: Record<string, { correct: number; incorrect: number; unattempted: number; total: number }> = {};
        activeQuiz.questions.forEach((q, idx) => {
            const subj = q.subject || 'General';
            if (!map[subj]) map[subj] = { correct: 0, incorrect: 0, unattempted: 0, total: 0 };
            map[subj].total++;
            if (answers[idx] === undefined) map[subj].unattempted++;
            else if (answers[idx] === q.correctIndex) map[subj].correct++;
            else map[subj].incorrect++;
        });
        return Object.entries(map).map(([subject, data]) => ({ subject, ...data }));
    }, [activeQuiz, answers]);

    // Handle finish test (stop timer)
    const handleFinishTest = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowScorecard(true);
    }, []);

    if (activeQuiz) {
        const currentQuestion = activeQuiz.questions[currentQuestionIndex];
        const isAnswered = answers[currentQuestionIndex] !== undefined;
        const totalQuestions = activeQuiz.questions.length;
        const stats = getStats();
        const isTimerLow = timeRemaining <= 60;

        return (
            <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body animate-fade-in">
                <main className="pt-20 px-4 md:px-8 max-w-4xl mx-auto">
                    {/* Active Quiz Header Section */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-6">
                            <div>
                                <button
                                    onClick={() => {
                                        if (timerRef.current) clearInterval(timerRef.current);
                                        setActiveQuiz(null);
                                        setActiveTestItem(null);
                                    }}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:text-[#D97706] mb-3 transition-colors group"
                                >
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Series
                                </button>
                                <h1 className="text-2xl font-bold text-[#1E3A5F] font-headline">
                                    {activeQuiz.title}
                                </h1>
                                <p className="text-gray-500 text-sm mt-1">
                                    Online Exam • {totalQuestions} Questions • {totalQuestions * 2} Marks
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Timer Badge */}
                                {!showScorecard && (
                                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-mono text-lg font-extrabold border-2 transition-all ${
                                        isTimerLow
                                            ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                                            : 'bg-slate-50 border-gray-200 text-[#1E3A5F]'
                                    }`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {formatTime(timeRemaining)}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-[#1E3A5F] text-white text-xs font-bold rounded-full lowercase">
                                        test-series
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Metadata row */}
                        {!showScorecard && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
                                    <span className="text-xl font-bold text-blue-700">{Object.keys(answers).length}</span>
                                    <span className="text-[10px] font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">Attempted</span>
                                </div>
                                <div className="bg-slate-50 border border-gray-100 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
                                    <span className="text-xl font-bold text-gray-500">{totalQuestions - Object.keys(answers).length}</span>
                                    <span className="text-[10px] font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">Unattempted</span>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
                                    <span className="text-xl font-bold text-amber-600">{totalQuestions - Object.keys(answers).length}</span>
                                    <span className="text-[10px] font-semibold text-gray-500 mt-0.5 uppercase tracking-wider">Skipped</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quiz Content */}
                    <div className="space-y-6">
                        {showScorecard ? (
                            /* ─── DETAILED ANALYSIS DASHBOARD ─── */
                            <div className="space-y-6">
                                {/* Score Header */}
                                <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2A4E7D] rounded-3xl p-8 md:p-10 text-center text-white shadow-xl">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold font-headline mb-1">Test Completed!</h2>
                                    <p className="text-white/70 text-sm font-medium">{activeQuiz.title}</p>
                                    <div className="mt-6 inline-flex items-baseline gap-1">
                                        <span className="text-5xl md:text-6xl font-extrabold">{stats.totalScore}</span>
                                        <span className="text-xl text-white/60 font-bold">/ {stats.maxMarks}</span>
                                    </div>
                                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mt-2">Total Score</p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                                        <span className="block text-3xl font-extrabold text-green-600">{stats.correct}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Correct</span>
                                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${totalQuestions > 0 ? (stats.correct / totalQuestions) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                                        <span className="block text-3xl font-extrabold text-red-500">{stats.incorrect}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Incorrect</span>
                                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${totalQuestions > 0 ? (stats.incorrect / totalQuestions) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                                        <span className="block text-3xl font-extrabold text-gray-400">{stats.unattempted}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Unattempted</span>
                                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="bg-gray-300 h-1.5 rounded-full" style={{ width: `${totalQuestions > 0 ? (stats.unattempted / totalQuestions) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                                        <span className="block text-3xl font-extrabold text-[#1E3A5F]">{stats.accuracy}%</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Accuracy</span>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                                        <span className="block text-3xl font-extrabold text-red-400">-{stats.negativeMarks}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Negative Marks</span>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                                        <span className="block text-3xl font-extrabold text-[#1E3A5F]">{getTimeTaken()}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Time Taken</span>
                                    </div>
                                </div>

                                {/* Subject-wise Breakdown */}
                                {(() => {
                                    const breakdown = getSubjectBreakdown();
                                    if (breakdown.length <= 1 && breakdown[0]?.subject === 'General') return null;
                                    return (
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100">
                                                <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">📊 Subject-wise Breakdown</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50">
                                                            <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase">Subject</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-green-600 uppercase">✓ Correct</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-red-500 uppercase">✗ Wrong</th>
                                                            <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase">Skipped</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {breakdown.map(row => (
                                                            <tr key={row.subject} className="hover:bg-slate-50/50">
                                                                <td className="px-6 py-3 font-semibold text-[#1E3A5F]">{row.subject}</td>
                                                                <td className="text-center px-4 py-3 font-bold text-gray-600">{row.total}</td>
                                                                <td className="text-center px-4 py-3 font-bold text-green-600">{row.correct}</td>
                                                                <td className="text-center px-4 py-3 font-bold text-red-500">{row.incorrect}</td>
                                                                <td className="text-center px-4 py-3 font-bold text-gray-400">{row.unattempted}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Question Grid */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4">🗂️ Question Map</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {activeQuiz.questions.map((q, idx) => {
                                            const wasAnswered = answers[idx] !== undefined;
                                            const wasCorrect = wasAnswered && answers[idx] === q.correctIndex;
                                            let bg = 'bg-gray-100 text-gray-400 border-gray-200'; // unattempted
                                            if (wasAnswered && wasCorrect) bg = 'bg-green-100 text-green-700 border-green-300';
                                            else if (wasAnswered && !wasCorrect) bg = 'bg-red-100 text-red-700 border-red-300';
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => { setShowScorecard(false); setShowReview(true); setCurrentQuestionIndex(idx); }}
                                                    className={`w-10 h-10 rounded-xl border-2 text-xs font-bold flex items-center justify-center transition-all hover:scale-110 ${bg}`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-4 mt-4 text-xs font-semibold text-gray-500">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-200 border border-green-400"></div> Correct</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-200 border border-red-400"></div> Incorrect</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-200 border border-gray-300"></div> Unattempted</div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowScorecard(false);
                                            setShowReview(true);
                                            setCurrentQuestionIndex(0);
                                        }}
                                        className="px-6 py-3.5 bg-[#1E3A5F] text-white font-bold text-sm rounded-xl shadow-lg hover:bg-[#2A4E7D] transition-colors"
                                    >
                                        📖 Review All Answers
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAnswers({});
                                            setShowScorecard(false);
                                            setShowReview(false);
                                            setCurrentQuestionIndex(0);
                                            const totalSeconds = activeQuiz.questions.length * 60;
                                            setTimeRemaining(totalSeconds);
                                            setTestStartTime(Date.now());
                                        }}
                                        className="px-6 py-3.5 bg-white border-2 border-gray-200 text-[#1E3A5F] font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        🔄 Restart Test
                                    </button>
                                    {activeTestItem && (
                                        <button
                                            onClick={() => {
                                                setShowDoubtModal(activeTestItem);
                                            }}
                                            className="px-6 py-3.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            ❓ Ask Doubt
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (timerRef.current) clearInterval(timerRef.current);
                                            setActiveQuiz(null);
                                            setActiveTestItem(null);
                                        }}
                                        className="px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        ← Back to Series
                                    </button>
                                </div>
                            </div>
                        ) : showReview ? (
                            /* ─── REVIEW MODE (after test) ─── */
                            <div>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] p-6 md:p-10 mb-6">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <span className="px-3.5 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-xl text-xs uppercase">
                                            Review • Question {currentQuestionIndex + 1} of {totalQuestions}
                                        </span>
                                        {currentQuestion.subject && (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-xs uppercase">
                                                {currentQuestion.subject}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-gray-800 font-bold text-lg md:text-xl leading-relaxed whitespace-pre-line mb-8 font-headline">
                                        {currentQuestion.question}
                                    </h3>

                                    <div className="space-y-3.5">
                                        {currentQuestion.options.map((option, oIdx) => {
                                            const selectedIdx = answers[currentQuestionIndex];
                                            const isThisSelected = selectedIdx === oIdx;
                                            const isCorrect = currentQuestion.correctIndex === oIdx;
                                            
                                            let style = 'border-gray-100 bg-white opacity-50';
                                            if (isCorrect) style = 'border-green-500 bg-green-50/50 text-green-900';
                                            else if (isThisSelected) style = 'border-red-500 bg-red-50/50 text-red-900';

                                            return (
                                                <div
                                                    key={oIdx}
                                                    className={`w-full p-4 md:px-6 md:py-5 rounded-xl border-2 text-left font-semibold flex items-center justify-between text-gray-700 text-sm md:text-base ${style}`}
                                                >
                                                    <span>{optionLabels[oIdx]}. {option}</span>
                                                    {isCorrect && <span className="text-green-600 font-bold text-lg">✓</span>}
                                                    {isThisSelected && !isCorrect && <span className="text-red-600 font-bold text-lg">✗</span>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {answers[currentQuestionIndex] !== undefined && (
                                        <div className="mt-4 mb-2">
                                            {answers[currentQuestionIndex] === currentQuestion.correctIndex
                                                ? <span className="text-sm font-bold text-green-600">✅ You answered correctly</span>
                                                : <span className="text-sm font-bold text-red-500">❌ Your answer: {optionLabels[answers[currentQuestionIndex]]}. Correct: {optionLabels[currentQuestion.correctIndex]}</span>
                                            }
                                        </div>
                                    )}

                                    {answers[currentQuestionIndex] === undefined && (
                                        <div className="mt-4 mb-2">
                                            <span className="text-sm font-bold text-gray-400">⚪ Not attempted. Correct answer: {optionLabels[currentQuestion.correctIndex]}</span>
                                        </div>
                                    )}

                                    <div className="mt-6 p-6 bg-blue-50/40 border border-blue-100/50 rounded-2xl">
                                        <h4 className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">💡 Explanation</h4>
                                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{currentQuestion.explanation}</p>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between gap-4">
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="flex-1 max-w-[180px] flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-[#1E3A5F] font-bold text-sm shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ← Previous
                                    </button>
                                    <button
                                        onClick={() => { setShowReview(false); setShowScorecard(true); }}
                                        className="px-5 py-3.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-white font-bold text-sm shadow-md transition-all"
                                    >
                                        Back to Results
                                    </button>
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                                        disabled={currentQuestionIndex === totalQuestions - 1}
                                        className="flex-1 max-w-[180px] flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1E3A5F] rounded-xl text-white font-bold text-sm shadow-md hover:bg-[#2A4E7D] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ─── TEST MODE: Single question navigation ─── */
                            <div>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] p-6 md:p-10 mb-6">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <span className="px-3.5 py-1.5 bg-[#1E3A5F]/10 text-[#1E3A5F] font-bold rounded-xl text-xs uppercase">
                                            Question {currentQuestionIndex + 1} of {totalQuestions}
                                        </span>
                                        {currentQuestion.subject && (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-xs uppercase">
                                                {currentQuestion.subject}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-gray-800 font-bold text-lg md:text-xl leading-relaxed whitespace-pre-line mb-8 font-headline">
                                        {currentQuestion.question}
                                    </h3>

                                    <div className="space-y-3.5">
                                        {currentQuestion.options.map((option, oIdx) => {
                                            const selectedIdx = answers[currentQuestionIndex];
                                            const isThisSelected = selectedIdx === oIdx;
                                            
                                            let style = 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50 cursor-pointer';
                                            if (selectedIdx !== undefined) {
                                                if (isThisSelected) {
                                                    style = 'border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]';
                                                } else {
                                                    style = 'border-gray-100 bg-white text-gray-500';
                                                }
                                            }

                                            return (
                                                <button
                                                    key={oIdx}
                                                    onClick={() => handleSelectOption(currentQuestionIndex, oIdx)}
                                                    className={`w-full p-4 md:px-6 md:py-5 rounded-xl border-2 text-left transition-all font-semibold flex items-center justify-between text-gray-700 text-sm md:text-base ${style}`}
                                                >
                                                    <span>{optionLabels[oIdx]}. {option}</span>
                                                    {isThisSelected && (
                                                        <span className="text-[#1E3A5F] font-bold text-sm">✔ Selected</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Question Navigation Grid */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeQuiz.questions.map((_, idx) => {
                                            const isActive = idx === currentQuestionIndex;
                                            const isAttempted = answers[idx] !== undefined;
                                            let bg = 'bg-gray-100 text-gray-400';
                                            if (isActive) bg = 'bg-[#1E3A5F] text-white ring-2 ring-[#1E3A5F]/30';
                                            else if (isAttempted) bg = 'bg-blue-100 text-blue-700';
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentQuestionIndex(idx)}
                                                    className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-105 ${bg}`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Navigation Row */}
                                <div className="flex items-center justify-between gap-4">
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-200 rounded-xl text-[#1E3A5F] font-bold text-sm shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    
                                    {currentQuestionIndex < totalQuestions - 1 ? (
                                        <button
                                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-[#1E3A5F] rounded-xl text-white font-bold text-sm shadow-md hover:bg-[#2A4E7D] transition-all"
                                        >
                                            Next
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleFinishTest}
                                            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-green-600 rounded-xl text-white font-bold text-sm shadow-md hover:bg-green-700 transition-all"
                                        >
                                            Finish Test
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body animate-fade-in">
            <main className="pt-20 px-4 md:px-8 max-w-5xl mx-auto">
                <section className="animate-fade-in-up">
                    {/* Title Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm text-3xl">
                            ⏰
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[#1E3A5F] font-headline">
                                Prelims Test Series
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">
                                Structured exam simulator with downloadable papers, answer keys, and online testing.
                            </p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                        </div>
                    ) : seriesList.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                            <span className="text-4xl">📭</span>
                            <h3 className="text-lg font-bold text-[#1E3A5F] mt-4">No test series published yet</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                                Tests are currently being uploaded by our administrators. Please check back later.
                            </p>
                        </div>
                    ) : !selectedSeries ? (
                        /* ─── GROUPS LANDING PAGE ─── */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {seriesList.map((series) => {
                                const counts = getCounts(series.tests || []);
                                return (
                                    <div
                                        key={series._id}
                                        className="bg-white border-2 border-gray-100 hover:border-[#1E3A5F]/30 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all group cursor-pointer"
                                        onClick={() => handleSelectSeries(series._id)}
                                    >
                                        {/* Card Header Gradient Strip */}
                                        <div className="h-2 bg-gradient-to-r from-[#1E3A5F] via-[#2A4E7D] to-[#D97706]"></div>

                                        <div className="p-6 md:p-8">
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex-1">
                                                    <h2 className="text-xl font-bold text-[#1E3A5F] font-headline group-hover:text-[#D97706] transition-colors">
                                                        {series.title}
                                                    </h2>
                                                    {series.description && (
                                                        <p className="text-gray-500 text-sm mt-1.5 leading-relaxed line-clamp-2">
                                                            {series.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 flex items-center justify-center shrink-0 group-hover:bg-[#1E3A5F]/10 transition-colors">
                                                    <span className="text-2xl">📝</span>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="grid grid-cols-3 gap-3 mb-5">
                                                <div className="bg-slate-50 border border-gray-100 rounded-xl p-3 text-center">
                                                    <span className="block text-xl font-extrabold text-[#1E3A5F]">{(series.tests || []).length}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Tests</span>
                                                </div>
                                                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-center">
                                                    <span className="block text-xl font-extrabold text-[#D97706]">{counts.sectional}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sectional</span>
                                                </div>
                                                <div className="bg-green-50/60 border border-green-100 rounded-xl p-3 text-center">
                                                    <span className="block text-xl font-extrabold text-green-700">{counts.fullLength}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Length</span>
                                                </div>
                                            </div>

                                            {/* Quick Actions + CTA */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-2">
                                                    {series.brochureUrl && (
                                                        <a
                                                            href={`${API_URL}${series.brochureUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold shadow-sm transition-colors"
                                                        >
                                                            📄 Brochure
                                                        </a>
                                                    )}
                                                    {series.introVideoUrl && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setVideoModalUrl(series.introVideoUrl || null); }}
                                                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-[10px] font-bold shadow-sm transition-colors"
                                                        >
                                                            ▶️ Intro
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-[#1E3A5F] group-hover:text-[#D97706] transition-colors">
                                                    View Tests
                                                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div>
                            {/* Selected Series Header Info */}
                            <div className="bg-white border border-gray-150/60 rounded-3xl p-6 md:p-8 shadow-sm mb-8 space-y-6">
                                {/* Back to All Series button (only if multiple groups) */}
                                {seriesList.length > 1 && (
                                    <button
                                        onClick={() => { setSelectedSeries(null); setExpandedIndex(null); setSelectedSubject('All'); }}
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:text-[#D97706] transition-colors group mb-2"
                                    >
                                        <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back to All Series
                                    </button>
                                )}
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#1E3A5F] font-headline">{selectedSeries.title}</h2>
                                        {selectedSeries.description && (
                                            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed max-w-2xl">{selectedSeries.description}</p>
                                        )}
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="flex flex-wrap gap-3">
                                        {selectedSeries.brochureUrl && (
                                            <a
                                                href={`${API_URL}${selectedSeries.brochureUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                                            >
                                                📄 Download Brochure
                                            </a>
                                        )}
                                        {selectedSeries.introVideoUrl && (
                                            <button
                                                onClick={() => setVideoModalUrl(selectedSeries.introVideoUrl || null)}
                                                className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                                            >
                                                ▶️ INTRO Video
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic counts based on tests */}
                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 max-w-md">
                                    {(() => {
                                        const { sectional, fullLength } = getCounts(selectedSeries.tests);
                                        return (
                                            <>
                                                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-center">
                                                    <span className="block text-2xl font-extrabold text-[#D97706]">{sectional}</span>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sectional Tests</span>
                                                </div>
                                                <div className="bg-green-50/60 border border-green-100 rounded-2xl p-4 text-center">
                                                    <span className="block text-2xl font-extrabold text-green-700">{fullLength}</span>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Length Tests</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Subject filter bar */}
                            <div className="flex items-center gap-3 bg-[#1E3A5F]/5 border border-gray-200/50 rounded-2xl p-3 mb-8 overflow-x-auto no-scrollbar">
                                <div className="flex-shrink-0 text-[#1E3A5F] px-2 flex items-center gap-1">
                                    <span className="text-lg">⚙️</span>
                                </div>
                                <div className="flex gap-2">
                                    {subjects.map(subject => (
                                        <button
                                            key={subject}
                                            onClick={() => {
                                                setSelectedSubject(subject);
                                                setExpandedIndex(null);
                                            }}
                                            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex-shrink-0 ${
                                                selectedSubject === subject
                                                    ? 'bg-[#1E3A5F] text-white shadow-sm'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/60'
                                            }`}
                                        >
                                            {subject}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tests list */}
                            {filteredTests.length === 0 ? (
                                <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                    <span className="text-4xl">📭</span>
                                    <h3 className="text-lg font-bold text-[#1E3A5F] mt-4">No tests available</h3>
                                    <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                                        There are no tests in this series matching the selected subject at this time.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredTests.map((test, index) => {
                                        const subject = getTestSubjectLabel(test);
                                        const style = getSubjectStyles(subject);
                                        const isExpanded = expandedIndex === index;
                                        const testDate = new Date(test.date);
                                        const displayDate = testDate.toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        });

                                        return (
                                            <div
                                                key={index}
                                                className={`border-2 rounded-3xl overflow-hidden transition-all shadow-sm ${style.bg} ${
                                                    isExpanded ? 'ring-1 ring-[#1E3A5F]/20' : ''
                                                }`}
                                            >
                                                {/* Header Card Row */}
                                                <div
                                                    className="p-5 md:p-6 flex items-center justify-between gap-6 cursor-pointer"
                                                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-[10px] text-gray-400 font-bold">
                                                                📅 {displayDate}
                                                            </span>
                                                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                                                                {subject}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-[#1E3A5F] font-headline">
                                                            {test.title}
                                                        </h3>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        {test.quizId && typeof test.quizId === 'object' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStartOnlineQuiz(test.quizId as Quiz, test);
                                                                }}
                                                                className="bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white font-bold text-xs md:text-sm px-5 py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
                                                            >
                                                                START <span className="tracking-tighter">&gt;&gt;</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setExpandedIndex(isExpanded ? null : index)}
                                                            className="w-10 h-10 rounded-full hover:bg-slate-200/50 flex items-center justify-center text-slate-500 transition-colors"
                                                        >
                                                            <svg
                                                                className={`w-5 h-5 transform transition-transform ${
                                                                    isExpanded ? 'rotate-180' : ''
                                                                }`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded syllabus & resources box */}
                                                {isExpanded && (
                                                    <div className="px-5 pb-6 border-t border-gray-150/40 bg-white/40 pt-4 space-y-6 animate-fade-in-up">
                                                        {/* Syllabus Topics */}
                                                        {test.syllabus && (
                                                            <div className="bg-white/80 p-5 rounded-2xl border border-gray-100">
                                                                <h4 className="text-[#1E3A5F] font-bold text-xs uppercase tracking-wider mb-3">
                                                                    Syllabus & Topics Covered
                                                                </h4>
                                                                <ul className="space-y-1.5">
                                                                    {test.syllabus.split('\n').filter(line => line.trim()).map((line, lIdx) => (
                                                                        <li key={lIdx} className="text-gray-700 text-sm flex items-start gap-2">
                                                                            <span className="text-amber-500 font-bold shrink-0">•</span>
                                                                            <span>{line.replace(/^-\s*/, '')}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {/* Four Action Options */}
                                                        {(() => {
                                                            const quizId = test.quizId && typeof test.quizId === 'object' ? (test.quizId as any)._id : test.quizId;
                                                            return (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    {/* 1. Download Question Paper */}
                                                                    {test.questionPaperUrl || quizId ? (
                                                                        <a
                                                                            href={test.questionPaperUrl ? (test.questionPaperUrl.startsWith('http') ? test.questionPaperUrl : `${API_URL}${test.questionPaperUrl}`) : `/tests/print-test?id=${quizId}&mode=question`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-white hover:bg-slate-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm hover:border-[#1E3A5F]/20 group"
                                                                        >
                                                                            <span className="text-2xl mb-1.5">📥</span>
                                                                            <span className="text-xs font-bold text-[#1E3A5F] group-hover:text-[#D97706] transition-colors leading-snug">Download Question</span>
                                                                        </a>
                                                                    ) : (
                                                                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed">
                                                                            <span className="text-2xl mb-1.5">📥</span>
                                                                            <span className="text-xs font-bold text-gray-400 leading-snug">Question Pending</span>
                                                                        </div>
                                                                    )}

                                                                    {/* 2. Download Detailed Solution */}
                                                                    {test.solutionPaperUrl || quizId ? (
                                                                        <a
                                                                            href={test.solutionPaperUrl ? (test.solutionPaperUrl.startsWith('http') ? test.solutionPaperUrl : `${API_URL}${test.solutionPaperUrl}`) : `/tests/print-test?id=${quizId}&mode=solution`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-white hover:bg-slate-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm hover:border-[#1E3A5F]/20 group"
                                                                        >
                                                                            <span className="text-2xl mb-1.5">📝</span>
                                                                            <span className="text-xs font-bold text-[#1E3A5F] group-hover:text-[#D97706] transition-colors leading-snug">Detailed Solution</span>
                                                                        </a>
                                                                    ) : (
                                                                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed">
                                                                            <span className="text-2xl mb-1.5">📝</span>
                                                                            <span className="text-xs font-bold text-gray-400 leading-snug">Solution Pending</span>
                                                                        </div>
                                                                    )}

                                                                    {/* 3. Ask Doubt */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (!test.isLocked) {
                                                                                setShowDoubtModal(test);
                                                                            }
                                                                        }}
                                                                        disabled={test.isLocked}
                                                                        className={`bg-white border rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group ${
                                                                            test.isLocked 
                                                                                ? 'opacity-40 border-gray-100 cursor-not-allowed'
                                                                                : 'hover:bg-slate-50 border-gray-200/80 hover:border-[#1E3A5F]/20'
                                                                        }`}
                                                                    >
                                                                        <span className="text-2xl mb-1.5">❓{test.isLocked && '🔒'}</span>
                                                                        <span className={`text-xs font-bold leading-snug ${
                                                                            test.isLocked ? 'text-gray-400' : 'text-[#1E3A5F] group-hover:text-[#D97706] transition-colors'
                                                                        }`}>
                                                                            Ask Doubt
                                                                        </span>
                                                                    </button>

                                                                    {/* 4. Test Discussion Video */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (!test.isLocked && test.discussionVideoUrl) {
                                                                                setVideoModalUrl(test.discussionVideoUrl);
                                                                            }
                                                                        }}
                                                                        disabled={test.isLocked || !test.discussionVideoUrl}
                                                                        className={`bg-white border rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group ${
                                                                            test.isLocked || !test.discussionVideoUrl
                                                                                ? 'opacity-40 border-gray-100 cursor-not-allowed'
                                                                                : 'hover:bg-slate-50 border-gray-200/80 hover:border-[#1E3A5F]/20'
                                                                        }`}
                                                                    >
                                                                        <span className="text-2xl mb-1.5">🎥{test.isLocked && '🔒'}</span>
                                                                        <span className={`text-xs font-bold leading-snug ${
                                                                            test.isLocked || !test.discussionVideoUrl ? 'text-gray-400' : 'text-[#1E3A5F] group-hover:text-[#D97706] transition-colors'
                                                                        }`}>
                                                                            Discussion Video
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* Video overlay modal player */}
            {videoModalUrl && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#101827] rounded-3xl max-w-3xl w-full p-4 relative border border-gray-800 shadow-2xl flex flex-col aspect-video">
                        <button
                            onClick={() => setVideoModalUrl(null)}
                            className="absolute -top-12 right-0 md:-right-4 text-white hover:text-gray-300 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-2xl transition-colors font-bold"
                        >
                            ×
                        </button>
                        
                        <div className="flex-1 rounded-2xl overflow-hidden bg-black">
                            <iframe
                                src={getYoutubeEmbedUrl(videoModalUrl)}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                title="Orientation/Discussion Video Player"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Ask Doubt Info Modal */}
            {showDoubtModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-gray-100">
                        <button
                            onClick={() => setShowDoubtModal(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl transition-colors font-bold"
                        >
                            ×
                        </button>
                        <div className="mb-6 flex items-center gap-3">
                            <span className="text-3xl">❓</span>
                            <div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] font-headline">Ask Doubt</h3>
                                <p className="text-gray-400 text-xs">Direct support from mentors</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm text-gray-600 leading-relaxed mb-8">
                            <p>Do you have a question or confusion regarding **{showDoubtModal.title}**?</p>
                            <p>Our dedicated subject matter experts are ready to clarify your conceptual doubts directly.</p>
                            
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-900 font-semibold">
                                Tip: Please take a screenshot of the question or write down the question number so our mentors can resolve your query faster.
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <a
                                href={`https://wa.me/919999999999?text=Hi%20Shailaja%20IAS,%20I%20have%20a%20doubt%20on%20the%20test%20"${encodeURIComponent(showDoubtModal.title)}"`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white text-center font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                            >
                                Send doubt via WhatsApp
                            </a>
                            <a
                                href={`mailto:support@shailajaias.com?subject=Doubt%20on%20${encodeURIComponent(showDoubtModal.title)}&body=Dear%20Team,%20I%20have%20a%20doubt%20regarding%20the%20Prelims%20Test%20Series%20paper%20"${encodeURIComponent(showDoubtModal.title)}".`}
                                className="w-full py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white text-center font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                            >
                                Contact via Email
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
