'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getQuizzesByDate, getAdjacentQuizDates } from '@/lib/api';


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

export default function DailyQuizPage() {
    return <InnerPageWrapper />;
}

function DailyQuizInner() {
    const searchParams = useSearchParams();
    const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(initialDate);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0); // Quiz index in current day
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Question index in current quiz
    const [isLoading, setIsLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, number>>({}); // "quizId-qIdx" -> optionIdx
    const [adjacentDates, setAdjacentDates] = useState<{ previous: string | null; next: string | null }>({ previous: null, next: null });
    const pendingIndex = useRef<{ qz: number; qu: number } | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            setAnswers({});
            try {
                const [data, datesData] = await Promise.all([
                    getQuizzesByDate(date),
                    getAdjacentQuizDates(date)
                ]);
                setQuizzes(data);
                setAdjacentDates(datesData);

                if (pendingIndex.current !== null) {
                    const qzIdx = pendingIndex.current.qz === -1 ? data.length - 1 : pendingIndex.current.qz;
                    setCurrentIndex(qzIdx);

                    if (pendingIndex.current.qu === -1 && data[qzIdx]) {
                        setCurrentQuestionIndex(data[qzIdx].questions.length - 1);
                    } else {
                        setCurrentQuestionIndex(pendingIndex.current.qu || 0);
                    }
                    pendingIndex.current = null;
                } else {
                    setCurrentIndex(0);
                    setCurrentQuestionIndex(0);
                }
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [date]);

    const handleSelectOption = (quizId: string, qIdx: number, optIdx: number) => {
        const key = `${quizId}-${qIdx}`;
        if (answers[key] !== undefined) return; // Already answered

        setAnswers((prev) => ({ ...prev, [key]: optIdx }));
    };

    const goToPrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        } else if (currentIndex > 0) {
            const prevQuizIdx = currentIndex - 1;
            setCurrentIndex(prevQuizIdx);
            setCurrentQuestionIndex(quizzes[prevQuizIdx].questions.length - 1);
        } else if (adjacentDates.previous) {
            pendingIndex.current = { qz: -1, qu: -1 }; // Last quiz, last question
            setDate(adjacentDates.previous.split('T')[0]);
        }
    };

    const goToNext = () => {
        if (currentQuestionIndex < (quizzes[currentIndex]?.questions.length || 0) - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if (currentIndex < quizzes.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCurrentQuestionIndex(0);
        } else if (adjacentDates.next) {
            pendingIndex.current = { qz: 0, qu: 0 }; // First quiz, first question
            setDate(adjacentDates.next.split('T')[0]);
        }
    };

    const formatDateStr = (d: string) => {
        return new Date(d).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Calculate score for a quiz
    const getScore = (quiz: Quiz) => {
        let correct = 0;
        let answered = 0;
        quiz.questions.forEach((q, qIdx) => {
            const key = `${quiz._id}-${qIdx}`;
            if (answers[key] !== undefined) {
                answered++;
                if (answers[key] === q.correctIndex) correct++;
            }
        });
        return { correct, answered, total: quiz.questions.length };
    };

    const currentQuiz = quizzes[currentIndex];
    const currentQuestion = currentQuiz?.questions[currentQuestionIndex];
    const totalQuestionsInQuiz = currentQuiz?.questions.length || 0;

    const totalQuestionsForDay = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    const overallQuestionIndex = 
        quizzes.slice(0, currentIndex).reduce((sum, quiz) => sum + quiz.questions.length, 0) + 
        currentQuestionIndex + 1;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Breadcrumbs & Header Space */}
            <div className="max-w-4xl mx-auto w-full px-4 pt-6 pb-2">
                <nav className="flex items-center text-xs font-medium mb-4">
                    <span className="text-gray-400">Current Affairs</span>
                    <span className="mx-2 text-gray-400 font-bold">›</span>
                    <span className="text-[#1E3A5F] font-bold">Daily quiz</span>
                </nav>

                <div className="flex items-center justify-between gap-4 mb-4">
                    {/* Date Picker Button-style */}
                    <div className="relative group">
                        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:border-gray-300 transition-all cursor-pointer">
                            <span className="text-[#1E3A5F]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="text-sm font-bold text-gray-700 outline-none bg-transparent cursor-pointer"
                                />
                            </div>
                            <span className="text-gray-400 ml-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    {!isLoading && quizzes.length > 0 && totalQuestionsForDay > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm text-sm font-bold text-gray-700">
                            {overallQuestionIndex}/{totalQuestionsForDay}
                        </div>
                    )}
                </div>

                {/* Tags row */}
                {!isLoading && currentQuiz && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {currentQuiz.setName && (
                            <span className="px-5 py-2 bg-[#1E3A5F] text-white text-xs font-bold rounded-full lowercase">
                                {currentQuiz.setName}
                            </span>
                        )}
                        {currentQuiz.tags?.map((tag: string) => (
                            <span key={tag} className="px-5 py-2 bg-[#1E3A5F] text-white text-xs font-bold rounded-full lowercase">
                                {tag}
                            </span>
                        ))}
                        {currentQuestion?.subject && (
                            <span className="px-5 py-2 bg-amber-500 text-white text-xs font-bold rounded-full lowercase">
                                {currentQuestion.subject}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-4 pb-12">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-4">Empty</p>
                        <p className="text-sm text-gray-500">No quizzes for this date.</p>
                    </div>
                ) : currentQuiz && currentQuestion ? (
                    <div className="flex flex-col gap-8">
                        {/* Question Card */}
                        <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] p-6 md:p-10">
                            {/* Quiz Title as subheader if present */}
                            <h3 className="text-[#1E3A5F] font-bold text-lg mb-4 leading-relaxed">
                                {currentQuiz.title}
                            </h3>

                            {/* Question text */}
                            <div className="mb-8">
                                <p className="text-[#1E3A5F] font-bold text-lg leading-relaxed whitespace-pre-line">
                                    {currentQuestion.question}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {currentQuestion.options.map((option: string, oIdx: number) => {
                                    const key = `${currentQuiz._id}-${currentQuestionIndex}`;
                                    const selectedAnswer = answers[key];
                                    const isAnswered = selectedAnswer !== undefined;
                                    const isSelectedOption = selectedAnswer === oIdx;
                                    const isCorrectOption = currentQuestion.correctIndex === oIdx;

                                    let styles = 'border-gray-100 bg-white hover:border-gray-200 shadow-sm';
                                    if (isAnswered) {
                                        if (isCorrectOption) styles = 'border-green-500 bg-green-50 shadow-none';
                                        else if (isSelectedOption) styles = 'border-red-500 bg-red-50 shadow-none';
                                        else styles = 'opacity-50 grayscale shadow-none';
                                    }

                                    return (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleSelectOption(currentQuiz._id, currentQuestionIndex, oIdx)}
                                            disabled={isAnswered}
                                            className={`w-full p-4 md:px-6 md:py-5 rounded-xl border-2 text-left transition-all font-medium text-gray-700 flex items-center justify-between ${styles}`}
                                        >
                                            <span className="flex-1">{optionLabels[oIdx]}. {option}</span>
                                            {isAnswered && isCorrectOption && <span className="text-green-600 font-bold ml-2 text-xl">✓</span>}
                                            {isAnswered && isSelectedOption && !isCorrectOption && <span className="text-red-600 font-bold ml-2 text-xl">✗</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {answers[`${currentQuiz._id}-${currentQuestionIndex}`] !== undefined && currentQuestion.explanation && (
                                <div className="mt-8 p-6 bg-blue-50/40 rounded-2xl border border-blue-100/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-blue-600 font-bold text-xs uppercase tracking-wider">Solution</span>
                                    </div>
                                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                                        {currentQuestion.explanation}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Navigation Buttons Row */}
                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={goToPrev}
                                className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-200 rounded-xl text-[#1E3A5F] font-bold text-sm shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous
                            </button>
                            <button
                                onClick={goToNext}
                                className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 bg-[#1E3A5F] rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-900/10 hover:bg-[#2A4E7D] transition-all active:scale-[0.98]"
                            >
                                Next
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function InnerPageWrapper() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div></div>}>
            <DailyQuizInner />
        </Suspense>
    );
}
