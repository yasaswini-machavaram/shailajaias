'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTestSeriesList, getTestSeriesById, API_URL, type TestSeries, type TestSeriesItem, type Quiz, type Question } from '@/lib/api';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

const optionLabels = ['A', 'B', 'C', 'D'];

const getSubjectFromTitle = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('polity')) return 'Polity';
    if (lower.includes('economy') || lower.includes('econ')) return 'Economy';
    if (lower.includes('env') || lower.includes('ecology')) return 'Environment';
    if (lower.includes('history') || lower.includes('hist')) return 'History';
    if (lower.includes('geography') || lower.includes('geo')) return 'Geography';
    if (lower.includes('science') || lower.includes('tech') || lower.includes('s&t')) return 'Science & Technology';
    if (lower.includes('csat')) return 'CSAT';
    return 'General';
};

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
    const router = useRouter();
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

    // Doubt states
    const studentAuth = useStudentAuth();
    const studentUser = studentAuth?.user || null;
    const studentToken = studentAuth?.token || null;
    const [doubtSubject, setDoubtSubject] = useState('Polity');
    const [doubtTitle, setDoubtTitle] = useState('');
    const [doubtDescription, setDoubtDescription] = useState('');
    const [doubtQuestionIndex, setDoubtQuestionIndex] = useState<number | null>(null);
    const [doubtQuestionText, setDoubtQuestionText] = useState('');
    const [isSubmittingDoubt, setIsSubmittingDoubt] = useState(false);
    const [doubtSubmitSuccess, setDoubtSubmitSuccess] = useState(false);
    const [doubtError, setDoubtError] = useState('');

    // Online Exam Engine
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [activeTestItem, setActiveTestItem] = useState<TestSeriesItem | null>(null);
    const [learnMode, setLearnMode] = useState<boolean>(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
    const [showScorecard, setShowScorecard] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [showOverview, setShowOverview] = useState(false);

    // Custom warning and submit modals
    const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
    const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState(false);

    // Test Reports saving states
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [saveError, setSaveError] = useState('');

    // Bookmark states
    const [bookmarkedKeys, setBookmarkedKeys] = useState<Record<string, boolean>>({});

    const fetchBookmarks = useCallback(async () => {
        if (!studentToken) return;
        try {
            const res = await fetch(`${API_URL}/api/bookmarks`, {
                headers: {
                    'Authorization': `Bearer ${studentToken}`
                }
            });
            const data = await res.json();
            if (data.success) {
                const keys: Record<string, boolean> = {};
                data.data.forEach((bookmark: any) => {
                    keys[`${bookmark.quizId}_${bookmark.questionIndex}`] = true;
                });
                setBookmarkedKeys(keys);
            }
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
        }
    }, [studentToken]);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    const handleToggleBookmark = async (qIndex: number) => {
        if (!studentToken) {
            alert('Please login to bookmark questions.');
            return;
        }
        if (!activeQuiz) return;
        const q = activeQuiz.questions[qIndex];
        const key = `${activeQuiz._id}_${qIndex}`;
        const isBookmarked = bookmarkedKeys[key];

        try {
            const res = await fetch(`${API_URL}/api/bookmarks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${studentToken}`
                },
                body: JSON.stringify({
                    quizId: activeQuiz._id,
                    questionIndex: qIndex,
                    question: q.question,
                    options: q.options,
                    correctIndex: q.correctIndex,
                    explanation: q.explanation,
                    subject: q.subject || 'General',
                    testTitle: activeTestItem?.title || activeQuiz.title,
                    testSeriesId: selectedSeries?.uniqueId || undefined,
                    source: 'prelims_test_series'
                })
            });
            const data = await res.json();
            if (data.success) {
                setBookmarkedKeys(prev => ({
                    ...prev,
                    [key]: !isBookmarked
                }));
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    // Timer state
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [testStartTime, setTestStartTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const totalQuestions = activeQuiz?.questions?.length || 0;

    // Prevent accidental reload or close during active test
    useEffect(() => {
        if (!activeQuiz || showScorecard) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to discard this test?';
            return 'Are you sure you want to discard this test?';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeQuiz, showScorecard]);

    // Auto-scroll active question number into view in scrollable grid
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeBtn = scrollContainerRef.current.children[currentQuestionIndex] as HTMLElement;
            if (activeBtn) {
                activeBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                });
            }
        }
    }, [currentQuestionIndex]);

    // Auto-save pending report after login redirect
    useEffect(() => {
        const checkPendingReport = async () => {
            const pendingReportStr = localStorage.getItem('pending_test_report');
            if (pendingReportStr && studentAuth?.isLoggedIn && studentAuth?.token) {
                try {
                    const payload = JSON.parse(pendingReportStr);
                    const res = await fetch(`${API_URL}/api/reports`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${studentAuth.token}`
                        },
                        body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Your previous test report was successfully saved to your profile!');
                        setSaveStatus('saved');
                    } else {
                        console.error('Failed to auto-save pending report:', data.message);
                    }
                } catch (err) {
                    console.error('Error auto-saving pending report:', err);
                } finally {
                    localStorage.removeItem('pending_test_report');
                }
            }
        };

        if (!isLoading) {
            checkPendingReport();
        }
    }, [isLoading, studentAuth?.isLoggedIn, studentAuth?.token]);

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

        const formatSubject = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

        // Categorize tests into subjects dynamically based ONLY on whole-test subjectTags
        const getTestSubjects = (test: TestSeriesItem): string[] => {
            if (test.subjectTags && test.subjectTags.length > 0) {
                return test.subjectTags.map(formatSubject);
            }
            return ['General'];
        };

        // Extract unique subjects
        const subjectTags = new Set<string>();
        selectedSeries.tests.forEach((t) => {
            getTestSubjects(t).forEach((sub) => subjectTags.add(sub));
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
            const filtered = selectedSeries.tests.filter((t) =>
                getTestSubjects(t).some((sub) => sub.toLowerCase() === selectedSubject.toLowerCase())
            );
            setFilteredTests(filtered);
        }
    }, [selectedSeries, selectedSubject]);

    // Classification Helper
    const getTestSubjectLabel = (test: TestSeriesItem) => {
        if (test.subjectTags && test.subjectTags.length > 0) {
            return test.subjectTags.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
        }
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

    // Submit doubt to database
    const handleSubmitDoubt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentToken) {
            setDoubtError('You must be logged in to submit a doubt.');
            return;
        }
        if (!doubtDescription.trim()) {
            setDoubtError('Please provide a description for your doubt.');
            return;
        }
        setIsSubmittingDoubt(true);
        setDoubtError('');
        try {
            const body: any = {
                subject: doubtSubject,
                title: doubtTitle || `Doubt: ${showDoubtModal?.title}`,
                description: doubtDescription,
            };

            if (activeQuiz) {
                body.quiz = activeQuiz._id;
            }
            if (selectedSeries) {
                body.testSeries = selectedSeries._id;
                if (selectedSeries.uniqueId) {
                    body.testSeriesUniqueId = selectedSeries.uniqueId;
                }
            }
            // Track which specific test item the doubt is about
            body.testItemTitle = activeTestItem?.title || showDoubtModal?.title || undefined;
            if (doubtQuestionIndex !== null) {
                body.questionIndex = doubtQuestionIndex;
                body.questionText = doubtQuestionText;
            }

            const res = await fetch(`${API_URL}/api/doubts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${studentToken}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                setDoubtSubmitSuccess(true);
                setDoubtDescription('');
            } else {
                setDoubtError(data.message || 'Failed to submit doubt.');
            }
        } catch (error) {
            console.error('Submit doubt error:', error);
            setDoubtError('Failed to submit doubt. Please check your connection.');
        } finally {
            setIsSubmittingDoubt(false);
        }
    };

    // Start Online Quiz
    const handleStartOnlineQuiz = (quiz: Quiz, testItem: TestSeriesItem) => {
        setActiveQuiz(quiz);
        setActiveTestItem(testItem);
        setLearnMode(true);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview({});
        setShowScorecard(false);
        setShowReview(false);
        setShowOverview(false);
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

    const handleSaveReport = async () => {
        if (!activeQuiz) return;

        const stats = getStats();
        const totalSeconds = activeQuiz.questions.length * 60;
        const timeTakenSeconds = totalSeconds - timeRemaining;

        const payload = {
            quiz: activeQuiz._id,
            testSeries: selectedSeries?._id,
            testSeriesUniqueId: selectedSeries?.uniqueId || undefined,
            testItemTitle: activeTestItem?.title || undefined,
            scorecard: {
                totalScore: stats.totalScore,
                maxMarks: stats.maxMarks,
                correct: stats.correct,
                incorrect: stats.incorrect,
                unattempted: stats.unattempted,
                accuracy: stats.accuracy,
                negativeMarks: stats.negativeMarks,
                timeTaken: timeTakenSeconds
            },
            answers: answers
        };

        if (!studentAuth?.isLoggedIn) {
            // Save payload to localStorage for midway authentication
            localStorage.setItem('pending_test_report', JSON.stringify(payload));
            localStorage.setItem('redirect_after_login', '/tests/prelims-test-series');
            alert('Please login to save this report. Redirecting to login page...');
            router.push('/login');
            return;
        }

        setSaveStatus('saving');
        setSaveError('');
        try {
            const res = await fetch(`${API_URL}/api/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${studentAuth.token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus('saved');
            } else {
                setSaveStatus('error');
                setSaveError(data.message || 'Failed to save report.');
            }
        } catch {
            setSaveStatus('error');
            setSaveError('Failed to connect to the server.');
        }
    };

    // Handle finish test (stop timer)
    const handleFinishTest = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowScorecard(true);
    }, []);

    const renderAllModals = () => {
        return (
            <>
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
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 animate-scale-in">
                            <button
                                onClick={() => {
                                    setShowDoubtModal(null);
                                    setDoubtSubmitSuccess(false);
                                }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl transition-colors font-bold"
                            >
                                ×
                            </button>
                            <div className="mb-6 flex items-center gap-3">
                                <span className="text-3xl">❓</span>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1E3A5F] font-headline">Ask Doubt</h3>
                                    <p className="text-gray-400 text-xs">Direct support from UPSC mentors</p>
                                </div>
                            </div>

                            {!studentToken ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-600 text-sm mb-6">
                                        You must be logged in to submit a doubt to our subject matter experts.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href="/login"
                                            className="w-full py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white text-center font-bold text-sm rounded-xl shadow-md transition-colors"
                                        >
                                            Log In Now
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setShowDoubtModal(null)}
                                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center font-bold text-sm rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : doubtSubmitSuccess ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                                        ✓
                                    </div>
                                    <h4 className="text-lg font-bold text-[#1E3A5F] mb-2 font-headline">Doubt Submitted!</h4>
                                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                        Your doubt regarding <strong>{showDoubtModal.title}</strong> has been logged. Our subject experts will review it and reply shortly.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href="/profile"
                                            onClick={() => {
                                                localStorage.setItem('active_profile_tab', 'doubts');
                                                setShowDoubtModal(null);
                                                setDoubtSubmitSuccess(false);
                                            }}
                                            className="w-full py-3 bg-[#D97706] hover:bg-[#B45309] text-white text-center font-bold text-sm rounded-xl shadow-md transition-colors"
                                        >
                                            Go to My Doubts
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDoubtModal(null);
                                                setDoubtSubmitSuccess(false);
                                            }}
                                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center font-bold text-sm rounded-xl transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitDoubt} className="space-y-4">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-600">
                                        <p className="font-semibold text-[#1E3A5F] mb-0.5">Context:</p>
                                        {selectedSeries?.uniqueId && (
                                            <p className="mb-1">
                                                <strong>Series ID:</strong> <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{selectedSeries.uniqueId}</span>
                                            </p>
                                        )}
                                        <p className="truncate"><strong>Test:</strong> {showDoubtModal.title}</p>
                                        {doubtQuestionIndex !== null && (
                                            <p className="mt-1">
                                                <strong>Question #{doubtQuestionIndex + 1}:</strong>{" "}
                                                <span className="italic">{doubtQuestionText.slice(0, 60)}...</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Subject/Topic is auto-derived from the context and sent automatically */}

                                    <div>
                                        <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5 uppercase tracking-wider">
                                            Doubt Title
                                        </label>
                                        <input
                                            type="text"
                                            value={doubtTitle}
                                            onChange={(e) => setDoubtTitle(e.target.value)}
                                            placeholder="Brief title for your doubt"
                                            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5 uppercase tracking-wider">
                                            Doubt Description
                                        </label>
                                        <textarea
                                            value={doubtDescription}
                                            onChange={(e) => setDoubtDescription(e.target.value)}
                                            rows={4}
                                            placeholder="Explain exactly what you find confusing (e.g., conceptual clarification, explanation mismatch, etc.)"
                                            className="w-full p-3 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                                            required
                                        />
                                    </div>

                                    {doubtError && (
                                        <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                                            ⚠️ {doubtError}
                                        </p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowDoubtModal(null)}
                                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                                            disabled={isSubmittingDoubt}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-[#1E3A5F] hover:bg-[#2A4E7D] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                                            disabled={isSubmittingDoubt}
                                        >
                                            {isSubmittingDoubt ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span>Submit Doubt</span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* Submit Test Confirmation Modal */}
                {showSubmitConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 animate-scale-in text-center">
                            <div className="w-16 h-16 bg-blue-50 text-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                                📥
                            </div>
                            <h3 className="text-xl font-bold text-[#1E3A5F] mb-2 font-headline">Submit Test?</h3>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                Are you sure you want to end this test and view your scorecard? You will not be able to modify your answers after submitting.
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-500 bg-slate-50 p-4 rounded-2xl mb-6 border border-gray-100">
                                <div className="text-center">
                                    <span className="block text-lg font-bold text-[#1E3A5F]">{Object.keys(answers).length}</span>
                                    <span>Answered</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-lg font-bold text-gray-500">{totalQuestions - Object.keys(answers).length}</span>
                                    <span>Unanswered</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitConfirmModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                                >
                                    Keep Answering
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSubmitConfirmModal(false);
                                        handleFinishTest();
                                    }}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                                >
                                    Yes, Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Discard Progress Warning Modal */}
                {showDiscardConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 animate-scale-in text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                                ⚠️
                            </div>
                            <h3 className="text-xl font-bold text-red-600 mb-2 font-headline">Discard Test Progress?</h3>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                Are you sure you want to exit? Your current test progress and all marked answers will be discarded. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDiscardConfirmModal(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                                >
                                    Resume Test
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDiscardConfirmModal(false);
                                        if (timerRef.current) clearInterval(timerRef.current);
                                        setActiveQuiz(null);
                                        setActiveTestItem(null);
                                        setShowOverview(false);
                                    }}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                                >
                                    Yes, Discard
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    if (activeQuiz) {
        const currentQuestion = activeQuiz.questions[currentQuestionIndex];
        const isAnswered = answers[currentQuestionIndex] !== undefined;
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
                                        if (showScorecard || showReview) {
                                            if (timerRef.current) clearInterval(timerRef.current);
                                            setActiveQuiz(null);
                                            setActiveTestItem(null);
                                            setShowOverview(false);
                                            setShowReview(false);
                                        } else {
                                            setShowDiscardConfirmModal(true);
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:text-[#D97706] mb-3 transition-colors group"
                                >
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Series
                                </button>
                                <h2 className="text-lg md:text-xl font-bold text-[#1E3A5F] font-headline truncate">
                                    {activeTestItem?.title || activeQuiz.title}
                                </h2>
                                {selectedSeries?.uniqueId && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 tracking-wider">
                                        {selectedSeries.uniqueId}
                                    </span>
                                )}
                                <p className="text-gray-500 text-sm mt-1">
                                    Online Exam • {totalQuestions} Questions • {totalQuestions * 2} Marks
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Timer & Submit Badge */}
                                {!showScorecard && !showReview && (
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-mono text-lg font-extrabold border-2 transition-all ${isTimerLow
                                            ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                                            : 'bg-slate-50 border-gray-200 text-[#1E3A5F]'
                                            }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {formatTime(timeRemaining)}
                                        </div>
                                        {!showOverview ? (
                                            <button
                                                onClick={() => setShowOverview(true)}
                                                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
                                            >
                                                Overview
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowOverview(false)}
                                                className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
                                            >
                                                Back to Test
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowSubmitConfirmModal(true)}
                                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
                                        >
                                            Submit Test
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Metadata row */}
                        {!showScorecard && !showOverview && !showReview && (
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
                                        onClick={handleSaveReport}
                                        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                                        className={`px-6 py-3.5 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${saveStatus === 'saved'
                                            ? 'bg-green-600 text-white cursor-default'
                                            : saveStatus === 'saving'
                                                ? 'bg-gray-400 text-white cursor-wait'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]'
                                            }`}
                                    >
                                        {saveStatus === 'saved' ? (
                                            <>✓ Saved to Profile</>
                                        ) : saveStatus === 'saving' ? (
                                            <>Saving...</>
                                        ) : (
                                            <>💾 Save Report</>
                                        )}
                                    </button>
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
                                            const testItem = activeTestItem || { title: activeQuiz.title } as TestSeriesItem;
                                            setDoubtQuestionIndex(null);
                                            setDoubtQuestionText('');
                                            setDoubtTitle(`Doubt regarding ${testItem.title}`);
                                            setDoubtSubject(testItem.title ? getSubjectFromTitle(testItem.title) : 'General');
                                            setDoubtSubmitSuccess(false);
                                            setDoubtError('');
                                            setShowDoubtModal(testItem);
                                        }}
                                        className="px-6 py-3.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        ❓ Ask Doubt
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (timerRef.current) clearInterval(timerRef.current);
                                            setActiveQuiz(null);
                                            setActiveTestItem(null);
                                            setShowOverview(false);
                                        }}
                                        className="px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        ← Back to Series
                                    </button>
                                </div>
                                {saveError && (
                                    <div className="text-center text-red-500 text-sm font-semibold mt-4 bg-red-50 border border-red-200 py-3 rounded-xl max-w-md mx-auto">
                                        ⚠️ {saveError}
                                    </div>
                                )}
                            </div>
                        ) : showOverview ? (
                            /* ─── TEST OVERVIEW SCREEN ─── */
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] p-6 md:p-10">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-6">
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setShowOverview(false)}
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:text-[#D97706] mb-3 transition-colors group bg-none border-none p-0 cursor-pointer"
                                        >
                                            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Back to Test
                                        </button>
                                        <h2 className="text-2xl font-bold text-[#1E3A5F] font-headline">
                                            Test Overview
                                        </h2>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Review your progress. Click on any question card to jump back to it.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowOverview(false)}
                                            className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition-all bg-white"
                                        >
                                            Resume Test
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowSubmitConfirmModal(true)}
                                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
                                        >
                                            Submit Test
                                        </button>
                                    </div>
                                </div>

                                {/* Stats summary cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                                        <span className="block text-2xl font-extrabold text-blue-700">{Object.keys(answers).length}</span>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Answered</span>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
                                        <span className="block text-2xl font-extrabold text-purple-700">
                                            {Object.keys(markedForReview).filter(k => markedForReview[Number(k)]).length}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Marked for Review</span>
                                    </div>
                                    <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 text-center">
                                        <span className="block text-2xl font-extrabold text-gray-600">
                                            {totalQuestions - Object.keys(answers).length}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unanswered / Skipped</span>
                                    </div>
                                </div>

                                {/* Questions map grid in multiple rows */}
                                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 md:p-8">
                                    <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
                                        {activeQuiz.questions.map((_, idx) => {
                                            const isAttempted = answers[idx] !== undefined;
                                            const isMarked = markedForReview[idx] === true;
                                            const isActive = idx === currentQuestionIndex;
                                            
                                            let bg = 'bg-gray-100 text-gray-400 border-gray-200'; // Unattempted
                                            if (isMarked) {
                                                bg = 'bg-purple-600 text-white border-purple-700'; // Marked for Review
                                            } else if (isAttempted) {
                                                bg = 'bg-blue-100 text-blue-700 border-blue-200'; // Answered
                                            }
                                            if (isActive) {
                                                bg += ' ring-2 ring-[#1E3A5F]/30';
                                            }
                                            
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setCurrentQuestionIndex(idx);
                                                        setShowOverview(false);
                                                    }}
                                                    className={`w-12 h-12 rounded-xl border-2 text-sm font-bold flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${bg}`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* KPI Legend */}
                                    <div className="flex flex-wrap justify-center md:justify-start gap-5 mt-6 border-t border-gray-200/60 pt-4 text-xs font-bold text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
                                            <span>Answered ({Object.keys(answers).length})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-purple-600 border border-purple-700"></div>
                                            <span>Marked for Review ({Object.keys(markedForReview).filter(k => markedForReview[Number(k)]).length})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                                            <span>Unattempted ({totalQuestions - Object.keys(answers).length})</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom submit strip */}
                                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <span className="text-xs text-gray-500 font-medium">
                                        Ensure you have reviewed all flagged and skipped questions.
                                    </span>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => setShowOverview(false)}
                                            className="flex-1 sm:flex-initial px-6 h-11 border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all bg-white"
                                        >
                                            Resume Test
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowSubmitConfirmModal(true)}
                                            className="flex-1 sm:flex-initial px-6 h-11 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all shadow-md"
                                        >
                                            End & Submit Test
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : showReview ? (
                            /* ─── REVIEW MODE (after test) ─── */
                            <div>
                                {/* Question Navigation Grid */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Question Map</h4>
                                        <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400">
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block"></span> Correct</span>
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> Wrong</span>
                                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block"></span> Skipped</span>
                                        </div>
                                    </div>
                                    <div 
                                        ref={scrollContainerRef}
                                        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scroll-smooth"
                                    >
                                        {activeQuiz.questions.map((q, idx) => {
                                            const isActive = idx === currentQuestionIndex;
                                            const selectedAnswer = answers[idx];
                                            const wasAttempted = selectedAnswer !== undefined;
                                            const wasCorrect = wasAttempted && selectedAnswer === q.correctIndex;

                                            let bg = 'bg-gray-200 text-gray-500'; // unattempted
                                            if (isActive) {
                                                bg = 'ring-2 ring-[#1E3A5F]/40 ';
                                                if (!wasAttempted) bg += 'bg-gray-300 text-gray-600';
                                                else if (wasCorrect) bg += 'bg-green-600 text-white';
                                                else bg += 'bg-red-600 text-white';
                                            } else if (wasCorrect) {
                                                bg = 'bg-green-500 text-white';
                                            } else if (wasAttempted) {
                                                bg = 'bg-red-500 text-white';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentQuestionIndex(idx)}
                                                    className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 ${bg}`}
                                                >
                                                    {idx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] p-6 md:p-10 mb-6">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <span className="px-3.5 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-xl text-xs uppercase">
                                            Review • Question {currentQuestionIndex + 1} of {totalQuestions}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {currentQuestion.subject && (
                                                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-[10px] md:text-xs uppercase">
                                                    {currentQuestion.subject}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBookmark(currentQuestionIndex)}
                                                className={`p-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 text-[10px] md:text-xs font-bold ${
                                                    bookmarkedKeys[`${activeQuiz._id}_${currentQuestionIndex}`]
                                                        ? 'border-[#D97706] bg-amber-50 text-[#D97706]'
                                                        : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                <span>{bookmarkedKeys[`${activeQuiz._id}_${currentQuestionIndex}`] ? '🔖' : '🎗️'}</span>
                                                <span>{bookmarkedKeys[`${activeQuiz._id}_${currentQuestionIndex}`] ? 'Bookmarked' : 'Bookmark'}</span>
                                            </button>
                                        </div>
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
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        className="flex-1 max-w-[140px] flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-[#1E3A5F] font-bold text-sm shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ← Previous
                                    </button>
                                    <button
                                        onClick={() => { setShowReview(false); setShowScorecard(true); }}
                                        className="px-4 py-3.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-white font-bold text-sm shadow-md transition-all"
                                    >
                                        Back to Results
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDoubtQuestionIndex(currentQuestionIndex);
                                            setDoubtQuestionText(currentQuestion.question);
                                            setDoubtTitle(`Question ${currentQuestionIndex + 1} Doubt - ${activeTestItem?.title || 'Test'}`);
                                            setDoubtSubject(currentQuestion.subject || (activeTestItem ? getSubjectFromTitle(activeTestItem.title) : 'General'));
                                            setDoubtSubmitSuccess(false);
                                            setDoubtError('');
                                            setShowDoubtModal(activeTestItem || { title: 'Test Paper' } as any);
                                        }}
                                        className="px-4 py-3.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                                    >
                                        ❓ Ask Doubt
                                    </button>
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                                        disabled={currentQuestionIndex === totalQuestions - 1}
                                        className="flex-1 max-w-[140px] flex items-center justify-center gap-2 px-4 py-3.5 bg-[#1E3A5F] rounded-xl text-white font-bold text-sm shadow-md hover:bg-[#2A4E7D] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <div className="flex items-center gap-2">
                                            {currentQuestion.subject && (
                                                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold rounded-full text-[10px] md:text-xs uppercase">
                                                    {currentQuestion.subject}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleBookmark(currentQuestionIndex)}
                                                className={`p-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 text-[10px] md:text-xs font-bold ${
                                                    bookmarkedKeys[`${activeQuiz._id}_${currentQuestionIndex}`]
                                                        ? 'border-[#D97706] bg-amber-50 text-[#D97706]'
                                                        : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                <span>{bookmarkedKeys[`${activeQuiz._id}_${currentQuestionIndex}`] ? '🔖' : '🎗️'}</span>
                                                <span>{bookmarkedKeys[`${activeQuiz._id}_${currentQuestionIndex}`] ? 'Bookmarked' : 'Bookmark'}</span>
                                            </button>
                                        </div>
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
                                    <div 
                                        ref={scrollContainerRef}
                                        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scroll-smooth"
                                    >
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
                                                    className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 ${bg}`}
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
                                            onClick={() => setShowOverview(true)}
                                            className="px-5 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
                                        >
                                            Overview
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
                                    ) : (
                                        <button
                                            onClick={() => setShowSubmitConfirmModal(true)}
                                            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-green-600 rounded-xl text-white font-bold text-sm shadow-md hover:bg-green-700 transition-all"
                                        >
                                            Submit
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {renderAllModals()}
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
                                            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex-shrink-0 ${selectedSubject === subject
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
                                                className={`border-2 rounded-3xl overflow-hidden transition-all shadow-sm ${style.bg} ${isExpanded ? 'ring-1 ring-[#1E3A5F]/20' : ''
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
                                                                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''
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
                                                                                setDoubtQuestionIndex(null);
                                                                                setDoubtQuestionText('');
                                                                                setDoubtTitle(`Doubt regarding ${test.title}`);
                                                                                setDoubtSubject(getSubjectFromTitle(test.title));
                                                                                setDoubtSubmitSuccess(false);
                                                                                setDoubtError('');
                                                                                setShowDoubtModal(test);
                                                                            }
                                                                        }}
                                                                        disabled={test.isLocked}
                                                                        className={`bg-white border rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group ${test.isLocked
                                                                            ? 'opacity-40 border-gray-100 cursor-not-allowed'
                                                                            : 'hover:bg-slate-50 border-gray-200/80 hover:border-[#1E3A5F]/20'
                                                                            }`}
                                                                    >
                                                                        <span className="text-2xl mb-1.5">❓{test.isLocked && '🔒'}</span>
                                                                        <span className={`text-xs font-bold leading-snug ${test.isLocked ? 'text-gray-400' : 'text-[#1E3A5F] group-hover:text-[#D97706] transition-colors'
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
                                                                        className={`bg-white border rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all shadow-sm group ${test.isLocked || !test.discussionVideoUrl
                                                                            ? 'opacity-40 border-gray-100 cursor-not-allowed'
                                                                            : 'hover:bg-slate-50 border-gray-200/80 hover:border-[#1E3A5F]/20'
                                                                            }`}
                                                                    >
                                                                        <span className="text-2xl mb-1.5">🎥{test.isLocked && '🔒'}</span>
                                                                        <span className={`text-xs font-bold leading-snug ${test.isLocked || !test.discussionVideoUrl ? 'text-gray-400' : 'text-[#1E3A5F] group-hover:text-[#D97706] transition-colors'
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

            {renderAllModals()}
        </div>
    );
}
