'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getQuizzesByTag } from '@/lib/api';

interface Question {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    subject?: string;
}

interface Quiz {
    _id: string;
    title: string;
    setName?: string;
    date: string;
    questions: Question[];
    tags: string[];
}

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

export default function PrelimsPracticeTestPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20 min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
            </div>
        }>
            <PrelimsPracticeTestInner />
        </Suspense>
    );
}

function PrelimsPracticeTestInner() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [subjects, setSubjects] = useState<string[]>(['All']);
    
    // Guidelines & Video Modal State
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    // Active Quiz Execution State
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [learnMode, setLearnMode] = useState<boolean>(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
    const [showScorecard, setShowScorecard] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [hasStartedTest, setHasStartedTest] = useState(false);

    // Timer state (test mode only)
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [testStartTime, setTestStartTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch prelims practice quizzes
    useEffect(() => {
        const fetchQuizzes = async () => {
            setIsLoading(true);
            try {
                // Fetch quizzes tagged with 'prelims-practice'
                const data = await getQuizzesByTag('prelims-practice');
                setQuizzes(data);
                
                // Extract unique subjects from quizzes (based on tags or questions)
                const subjectTags = new Set<string>();
                data.forEach(quiz => {
                    // Check other tags (excluding 'prelims-practice')
                    quiz.tags.forEach(tag => {
                        if (tag !== 'prelims-practice') {
                            const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
                            subjectTags.add(formattedTag);
                        }
                    });
                    // Check subjects inside questions
                    quiz.questions.forEach(q => {
                        if (q.subject) {
                            const formattedSubj = q.subject.charAt(0).toUpperCase() + q.subject.slice(1).toLowerCase();
                            subjectTags.add(formattedSubj);
                        }
                    });
                });

                // Fallback subjects if none found yet
                const defaultList = ['Polity', 'Economy', 'Environment', 'History', 'Geography', 'S&T'];
                const mergedSubjects = Array.from(subjectTags).length > 0 
                    ? ['All', ...Array.from(subjectTags)] 
                    : ['All', ...defaultList];
                
                setSubjects(mergedSubjects);
            } catch (error) {
                console.error('Failed to load practice tests:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    // Filter quizzes by selected subject
    useEffect(() => {
        if (selectedSubject === 'All') {
            setFilteredQuizzes(quizzes);
        } else {
            const filtered = quizzes.filter(quiz => {
                // Match quiz tag or question subject
                const hasTag = quiz.tags.some(t => t.toLowerCase() === selectedSubject.toLowerCase());
                const hasQuestionSubject = quiz.questions.some(q => q.subject?.toLowerCase() === selectedSubject.toLowerCase());
                return hasTag || hasQuestionSubject;
            });
            setFilteredQuizzes(filtered);
        }
    }, [selectedSubject, quizzes]);

    // Handle Start Quiz Click
    const handleStartQuiz = (quiz: Quiz) => {
        setActiveQuiz(quiz);
        setLearnMode(true);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview({});
        setShowScorecard(false);
        setShowReview(false);
        setHasStartedTest(false);
        const totalSeconds = quiz.questions.length * 60;
        setTimeRemaining(totalSeconds);
        setTestStartTime(Date.now());
    };

    // Timer effect (test mode only)
    useEffect(() => {
        if (activeQuiz && !learnMode && !showScorecard && timeRemaining > 0) {
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
    }, [activeQuiz, learnMode, showScorecard]);

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

    // Option Selection
    const handleSelectOption = (qIdx: number, optIdx: number) => {
        if (answers[qIdx] !== undefined) return;
        if (!learnMode) setHasStartedTest(true);
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

    // Subtitle extractor
    const getQuizTopics = (quiz: Quiz) => {
        // Extract subjects/chapters from quiz setName, title, or tags
        if (quiz.setName) return quiz.setName;
        
        // Alternatively, gather unique subjects from questions
        const distinctSubjects = Array.from(
            new Set(quiz.questions.map(q => q.subject).filter(Boolean))
        );
        if (distinctSubjects.length > 0) return distinctSubjects.join(', ');
        
        return 'General Practice & Revision';
    };

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
                                    }}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:text-[#D97706] mb-3 transition-colors group"
                                >
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to list
                                </button>
                                <h1 className="text-2xl font-bold text-[#1E3A5F] font-headline">
                                    {activeQuiz.title}
                                </h1>
                                <p className="text-gray-500 text-sm mt-1">
                                    {getQuizTopics(activeQuiz)} • {totalQuestions} Questions{!learnMode ? ` • ${totalQuestions * 2} Marks` : ''}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Timer & Submit Badge (Test mode only) */}
                                {!learnMode && !showScorecard && (
                                    <div className="flex items-center gap-3">
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
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to end the test and submit?')) {
                                                    handleFinishTest();
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
                                        >
                                            Submit Test
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-[#1E3A5F] text-white text-xs font-bold rounded-full lowercase">
                                        {learnMode ? 'learning' : 'test'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Mode Toggle + Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Mode Toggle */}
                            <div className="bg-slate-50 border border-gray-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                                <span className="text-xs font-bold text-gray-400 mb-2.5 uppercase tracking-wider">Mode</span>
                                <div className="flex bg-gray-200/80 rounded-xl p-1 w-full max-w-[240px]">
                                    <button
                                        onClick={() => {
                                            if (!hasStartedTest) {
                                                if (timerRef.current) clearInterval(timerRef.current);
                                                setLearnMode(true);
                                                setShowScorecard(false);
                                                setShowReview(false);
                                                setAnswers({});
                                                setMarkedForReview({});
                                                setCurrentQuestionIndex(0);
                                            }
                                        }}
                                        disabled={hasStartedTest && !learnMode}
                                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                                            learnMode
                                                ? 'bg-[#1E3A5F] text-white shadow-sm'
                                                : hasStartedTest ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Learning
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!hasStartedTest || learnMode) {
                                                setLearnMode(false);
                                                setShowScorecard(false);
                                                setShowReview(false);
                                                setAnswers({});
                                                setMarkedForReview({});
                                                setCurrentQuestionIndex(0);
                                                setHasStartedTest(false);
                                                const totalSeconds = activeQuiz.questions.length * 60;
                                                setTimeRemaining(totalSeconds);
                                                setTestStartTime(Date.now());
                                            }
                                        }}
                                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                                            !learnMode
                                                ? 'bg-[#1E3A5F] text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Test
                                    </button>
                                </div>
                                {hasStartedTest && !learnMode && (
                                    <p className="text-[10px] text-amber-600 font-semibold mt-1.5">Mode locked during test</p>
                                )}
                            </div>

                            {/* Live Stats (shown during quiz, not on scorecard) */}
                            {!showScorecard && !showReview && (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-2.5 flex flex-col justify-center items-center text-center">
                                        <span className="text-lg font-bold text-green-700">{stats.correct}</span>
                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Correct</span>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-2.5 flex flex-col justify-center items-center text-center">
                                        <span className="text-lg font-bold text-red-600">{stats.incorrect}</span>
                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Wrong</span>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-2.5 flex flex-col justify-center items-center text-center">
                                        <span className="text-lg font-bold text-gray-500">{stats.unattempted}</span>
                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Left</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quiz Content */}
                    <div className="space-y-6">
                        {showScorecard && !learnMode ? (
                            /* ─── DETAILED ANALYSIS DASHBOARD (Test mode only) ─── */
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
                                            let bg = 'bg-gray-100 text-gray-400 border-gray-200';
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
                                            setMarkedForReview({});
                                            setShowScorecard(false);
                                            setShowReview(false);
                                            setCurrentQuestionIndex(0);
                                            setHasStartedTest(false);
                                            const totalSeconds = activeQuiz.questions.length * 60;
                                            setTimeRemaining(totalSeconds);
                                            setTestStartTime(Date.now());
                                        }}
                                        className="px-6 py-3.5 bg-white border-2 border-gray-200 text-[#1E3A5F] font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        🔄 Restart Test
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (timerRef.current) clearInterval(timerRef.current);
                                            setActiveQuiz(null);
                                        }}
                                        className="px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        ← Back to List
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
                            /* ─── QUESTION VIEW (both Learning & Test modes) ─── */
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
                                            const isCorrect = currentQuestion.correctIndex === oIdx;
                                            
                                            let style = 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50 cursor-pointer';
                                            if (selectedIdx !== undefined) {
                                                if (learnMode) {
                                                    // Learning Mode: Immediate green/red evaluation
                                                    if (isCorrect) {
                                                        style = 'border-green-500 bg-green-50/50 text-green-900';
                                                    } else if (isThisSelected) {
                                                        style = 'border-red-500 bg-red-50/50 text-red-900';
                                                    } else {
                                                        style = 'border-gray-100 bg-white opacity-50';
                                                    }
                                                } else {
                                                    // Test Mode: Only highlight selected in blue
                                                    if (isThisSelected) {
                                                        style = 'border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]';
                                                    } else {
                                                        style = 'border-gray-100 bg-white text-gray-500';
                                                    }
                                                }
                                            }

                                            return (
                                                <button
                                                    key={oIdx}
                                                    onClick={() => handleSelectOption(currentQuestionIndex, oIdx)}
                                                    disabled={learnMode && selectedIdx !== undefined}
                                                    className={`w-full p-4 md:px-6 md:py-5 rounded-xl border-2 text-left transition-all font-semibold flex items-center justify-between text-gray-700 text-sm md:text-base ${style}`}
                                                >
                                                    <span>{optionLabels[oIdx]}. {option}</span>
                                                    {selectedIdx !== undefined && learnMode && isCorrect && (
                                                        <span className="text-green-600 font-bold text-lg">✓</span>
                                                    )}
                                                    {selectedIdx !== undefined && learnMode && isThisSelected && !isCorrect && (
                                                        <span className="text-red-600 font-bold text-lg">✗</span>
                                                    )}
                                                    {selectedIdx !== undefined && !learnMode && isThisSelected && (
                                                        <span className="text-[#1E3A5F] font-bold text-sm">✔ Selected</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Explanation (shown after answering in Learning mode) */}
                                    {isAnswered && learnMode && (
                                        <div className="mt-8 p-6 bg-blue-50/40 border border-blue-100/50 rounded-2xl animate-fade-in-up">
                                            <h4 className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                                                💡 Explanation
                                            </h4>
                                            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                                                {currentQuestion.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Question Navigation Grid */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeQuiz.questions.map((_, idx) => {
                                            const isActive = idx === currentQuestionIndex;
                                            const isAttempted = answers[idx] !== undefined;
                                            const isMarked = markedForReview[idx] === true;
                                            let bg = 'bg-gray-100 text-gray-400';
                                            if (isActive) bg = 'bg-[#1E3A5F] text-white ring-2 ring-[#1E3A5F]/30';
                                            else if (isMarked) bg = 'bg-purple-600 text-white';
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
                                <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-[#1E3A5F] font-bold text-sm shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAnswers(prev => {
                                                const next = { ...prev };
                                                delete next[currentQuestionIndex];
                                                return next;
                                            })}
                                            className="px-5 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-gray-800 font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
                                        >
                                            Clear Response
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMarkedForReview(prev => ({
                                                    ...prev,
                                                    [currentQuestionIndex]: !prev[currentQuestionIndex]
                                                }));
                                                if (currentQuestionIndex < totalQuestions - 1) {
                                                    setCurrentQuestionIndex(prev => prev + 1);
                                                }
                                            }}
                                            className="px-5 py-3.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-sm rounded-xl transition-all"
                                        >
                                            {markedForReview[currentQuestionIndex]
                                                ? (currentQuestionIndex === totalQuestions - 1 ? 'Unmark Review' : 'Unmark & Next')
                                                : (currentQuestionIndex === totalQuestions - 1 ? 'Mark for Review' : 'Mark for Review & Next')
                                            }
                                        </button>
                                    </div>
                                    
                                    {currentQuestionIndex < totalQuestions - 1 ? (
                                        <button
                                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-[#1E3A5F] rounded-xl text-white font-bold text-sm shadow-md hover:bg-[#2A4E7D] transition-all"
                                        >
                                            {answers[currentQuestionIndex] !== undefined ? 'Save & Next' : 'Skip & Next'}
                                        </button>
                                    ) : !learnMode ? (
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to end the test and submit?')) {
                                                    handleFinishTest();
                                                }
                                            }}
                                            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-green-600 rounded-xl text-white font-bold text-sm shadow-md hover:bg-green-700 transition-all"
                                        >
                                            Submit
                                        </button>
                                    ) : (
                                        <div className="flex-1 max-w-[200px]"></div>
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
                    {/* Header Section */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            <span className="text-3xl">📋</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-[#1E3A5F] font-headline">
                                Prelims Practice Test
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">
                                Subject wise MCQ tests with Learning and Test modes.
                            </p>
                        </div>
                    </div>

                    {/* Row of Guidelines and Intro Video */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Guidelines Card */}
                        <button
                            onClick={() => setShowGuidelines(true)}
                            className="bg-white hover:bg-blue-50/20 border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between text-left transition-all hover:border-[#1E3A5F]/40 shadow-sm group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                                    📘
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1E3A5F] group-hover:text-[#D97706] transition-colors">Download Guidelines</h3>
                                    <p className="text-gray-500 text-xs mt-0.5">How to make best use of practice tests?</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1E3A5F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Intro Video Card */}
                        <button
                            onClick={() => setShowVideo(true)}
                            className="bg-white hover:bg-amber-50/20 border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between text-left transition-all hover:border-[#1E3A5F]/40 shadow-sm group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl">
                                    ▶️
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1E3A5F] group-hover:text-[#D97706] transition-colors">INTRO Video</h3>
                                    <p className="text-gray-500 text-xs mt-0.5">Watch intro and exam guide video</p>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1E3A5F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Filter bar */}
                    <div className="flex items-center gap-3 bg-[#1E3A5F]/5 border border-gray-200/50 rounded-2xl p-3 mb-8 overflow-x-auto no-scrollbar">
                        <div className="flex-shrink-0 text-[#1E3A5F] px-2 flex items-center gap-1">
                            <span className="text-lg">⚙️</span>
                        </div>
                        <div className="flex gap-2">
                            {subjects.map(subject => (
                                <button
                                    key={subject}
                                    onClick={() => setSelectedSubject(subject)}
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

                    {/* List of tests */}
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                        </div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-gray-100 rounded-3xl p-8">
                            <span className="text-4xl">📭</span>
                            <h3 className="text-lg font-bold text-[#1E3A5F] mt-4">No tests available</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                                There are no Prelims Practice tests uploaded for the selected subject at this time.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredQuizzes.map(quiz => {
                                const subjectTag = quiz.tags.find(t => t !== 'prelims-practice') || quiz.questions[0]?.subject || 'General';
                                const formattedSubject = subjectTag.charAt(0).toUpperCase() + subjectTag.slice(1).toLowerCase();
                                const style = getSubjectStyles(formattedSubject);

                                return (
                                    <div
                                        key={quiz._id}
                                        className={`border-2 rounded-2xl p-5 md:p-6 flex items-center justify-between gap-6 transition-all shadow-sm ${style.bg}`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                                                    {formattedSubject}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold">
                                                    {quiz.questions.length} Questions
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-[#1E3A5F] font-headline">
                                                {quiz.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xl">
                                                {getQuizTopics(quiz)}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleStartQuiz(quiz)}
                                            className="bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white font-bold text-xs md:text-sm px-5 py-3 rounded-xl shadow-md transition-colors flex-shrink-0 flex items-center gap-1 active:scale-[0.98]"
                                        >
                                            START <span className="tracking-tighter">&gt;&gt;</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* Modal: Download Guidelines */}
            {showGuidelines && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 max-h-[85vh] overflow-y-auto">
                        <button
                            onClick={() => setShowGuidelines(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl transition-colors"
                        >
                            ×
                        </button>
                        <div className="mb-6 flex items-center gap-3">
                            <span className="text-3xl">📘</span>
                            <div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] font-headline">Practice Guidelines</h3>
                                <p className="text-gray-400 text-xs">Maximize your score and concepts</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm text-gray-600 leading-relaxed mb-6">
                            <div className="flex gap-3">
                                <span className="font-bold text-[#1E3A5F] text-base">1.</span>
                                <p><strong className="text-gray-800">Learning Mode:</strong> Use this to read questions, analyze options, and view detailed solutions immediately. Best for the initial learning phase.</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold text-[#1E3A5F] text-base">2.</span>
                                <p><strong className="text-gray-800">Test Mode:</strong> Simulates exam-like conditions. Options are interactive, and detailed solutions appear after answering. Recommended during revision.</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold text-[#1E3A5F] text-base">3.</span>
                                <p><strong className="text-gray-800">Subject Filters:</strong> Focus your revision topic-wise by selecting Polity, Economy, Environment, etc., from the filter bar.</p>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-bold text-[#1E3A5F] text-base">4.</span>
                                <p><strong className="text-gray-800">Review:</strong> Go through the solution explanation for every incorrect answer. Understanding why an option is incorrect is as vital as knowing why another is correct.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowGuidelines(false)}
                            className="w-full py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                        >
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: Intro Video */}
            {showVideo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative border border-gray-100">
                        <button
                            onClick={() => setShowVideo(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl transition-colors"
                        >
                            ×
                        </button>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="text-2xl">🎥</span>
                            <div>
                                <h3 className="text-lg font-bold text-[#1E3A5F] font-headline">Intro & Strategy Video</h3>
                                <p className="text-gray-400 text-xs">Prelims Practice Test Module Orientation</p>
                            </div>
                        </div>

                        {/* Video Player Placeholder with premium overlay styling */}
                        <div className="bg-slate-900 aspect-video rounded-2xl relative overflow-hidden flex items-center justify-center mb-6 shadow-inner border border-slate-800 group">
                            <div className="absolute inset-0 bg-cover bg-center opacity-60 filter blur-sm" style={{ backgroundImage: "url('/img/video_thumbnail_placeholder.jpg')" }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            
                            {/* Inner Mock Player Content */}
                            <div className="text-center z-10 p-4">
                                <div className="w-16 h-16 bg-[#D97706]/95 hover:bg-[#D97706] hover:scale-105 transition-all text-white rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer shadow-lg shadow-amber-500/20">
                                    <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                                <h4 className="text-white font-bold text-base leading-tight">UPSC Prelims Practice: Orientation Session</h4>
                                <p className="text-slate-300 text-xs mt-1">Duration: 8 mins | Instructor: Shailaja IAS Faculty</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-400 font-semibold">
                            <span>Orientation Guide v1.2</span>
                            <span>Powered by Shailaja IAS Portal</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
