'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Question {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
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
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, number>>({}); // "quizId-qIdx" -> optionIdx

    useEffect(() => {
        fetchQuizzes(date);
    }, [date]);

    const fetchQuizzes = async (targetDate: string) => {
        setIsLoading(true);
        setAnswers({});

        try {
            const response = await fetch(
                `${API_URL}/api/quizzes?date=${targetDate}&includeQuestions=true&limit=20`
            );
            const data = await response.json();
            if (data.success) {
                setQuizzes(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch quizzes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectOption = (quizId: string, qIdx: number, optIdx: number) => {
        const key = `${quizId}-${qIdx}`;
        if (answers[key] !== undefined) return; // Already answered

        setAnswers((prev) => ({ ...prev, [key]: optIdx }));
    };

    const changeDate = (delta: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + delta);
        setDate(d.toISOString().split('T')[0]);
    };

    const formatDate = (d: string) => {
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">📝 Test Series</h1>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => changeDate(-1)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                        >
                            ← Previous
                        </button>
                        <div className="flex-1 text-center">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">{formatDate(date)}</p>
                        </div>
                        <button
                            onClick={() => changeDate(1)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-5xl mb-4">📝</p>
                        <p className="text-lg">No quizzes available for this date</p>
                        <p className="text-sm mt-2">Try selecting a different date</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {quizzes.map((quiz) => {
                            const score = getScore(quiz);

                            return (
                                <div key={quiz._id}>
                                    {/* Quiz Header */}
                                    <div className="mb-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">{quiz.title}</h2>
                                                {quiz.setName && (
                                                    <span className="inline-block mt-1.5 px-3 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                        {quiz.setName}
                                                    </span>
                                                )}
                                            </div>
                                            {score.answered > 0 && (
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-amber-600">
                                                        {score.correct}/{score.answered}
                                                    </p>
                                                    <p className="text-xs text-gray-500">correct</p>
                                                </div>
                                            )}
                                        </div>
                                        {quiz.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {quiz.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Questions — vertical list */}
                                    <div className="space-y-5">
                                        {quiz.questions.map((q, qIdx) => {
                                            const key = `${quiz._id}-${qIdx}`;
                                            const selectedAnswer = answers[key];
                                            const isAnswered = selectedAnswer !== undefined;
                                            const isCorrect = isAnswered && selectedAnswer === q.correctIndex;

                                            return (
                                                <div
                                                    key={qIdx}
                                                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 relative"
                                                >
                                                    {/* Question number & text */}
                                                    <div className="flex gap-3 mb-4">
                                                        <span className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold">
                                                            {qIdx + 1}
                                                        </span>
                                                        <p className="text-gray-900 font-medium leading-relaxed pt-1">
                                                            {q.question}
                                                        </p>
                                                    </div>

                                                    {/* Options */}
                                                    <div className="space-y-2.5 ml-11">
                                                        {q.options.map((option, oIdx) => {
                                                            const isSelectedOption = selectedAnswer === oIdx;
                                                            const isCorrectOption = q.correctIndex === oIdx;

                                                            let optionStyles = 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50 cursor-pointer';
                                                            let labelStyles = 'bg-gray-200 text-gray-600';

                                                            if (isAnswered) {
                                                                if (isCorrectOption) {
                                                                    optionStyles = 'border-green-500 bg-green-50';
                                                                    labelStyles = 'bg-green-500 text-white';
                                                                } else if (isSelectedOption && !isCorrectOption) {
                                                                    optionStyles = 'border-red-500 bg-red-50';
                                                                    labelStyles = 'bg-red-500 text-white';
                                                                } else {
                                                                    optionStyles = 'border-gray-200 bg-gray-50 opacity-60 cursor-default';
                                                                }
                                                            }

                                                            return (
                                                                <button
                                                                    key={oIdx}
                                                                    onClick={() => handleSelectOption(quiz._id, qIdx, oIdx)}
                                                                    disabled={isAnswered}
                                                                    className={`w-full min-h-[44px] p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${optionStyles}`}
                                                                >
                                                                    <span
                                                                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${labelStyles}`}
                                                                    >
                                                                        {optionLabels[oIdx]}
                                                                    </span>
                                                                    <span className="flex-1 pt-0.5 text-sm">{option}</span>
                                                                    {isAnswered && isCorrectOption && (
                                                                        <span className="ml-auto text-green-600 text-lg flex-shrink-0">✓</span>
                                                                    )}
                                                                    {isAnswered && isSelectedOption && !isCorrectOption && (
                                                                        <span className="ml-auto text-red-600 text-lg flex-shrink-0">✗</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Explanation — shown after answering */}
                                                    {isAnswered && q.explanation && (
                                                        <div className={`mt-4 ml-11 p-4 rounded-xl text-sm leading-relaxed ${isCorrect
                                                            ? 'bg-green-50 border border-green-200 text-green-800'
                                                            : 'bg-red-50 border border-red-200 text-red-800'
                                                            }`}>
                                                            <p className="font-semibold mb-1">
                                                                {isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
                                                            </p>
                                                            <p>{q.explanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Quiz summary */}
                                    {score.answered === score.total && score.total > 0 && (
                                        <div className="mt-5 bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl border border-amber-200 p-5 text-center">
                                            <p className="text-3xl font-bold text-amber-700 mb-1">
                                                {score.correct} / {score.total}
                                            </p>
                                            <p className="text-sm text-amber-600">
                                                {score.correct === score.total
                                                    ? '🎉 Perfect Score! Amazing!'
                                                    : score.correct >= score.total * 0.7
                                                        ? '👏 Great job! Keep it up!'
                                                        : '📚 Keep practicing!'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Previous / Next Day Navigation at bottom */}
                {!isLoading && (
                    <div className="flex justify-between items-center mt-8 pb-20">
                        <button
                            onClick={() => changeDate(-1)}
                            className="px-5 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 shadow-sm transition-colors"
                        >
                            ← Previous Day
                        </button>
                        <button
                            onClick={() => changeDate(1)}
                            className="px-5 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 shadow-sm transition-colors"
                        >
                            Next Day →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
