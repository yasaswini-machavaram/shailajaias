'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DatePicker from '@/components/DatePicker';
import RichTextRenderer from '@/components/RichTextRenderer';
import { getArticlesByDate, getAdjacentDates, type Article } from '@/lib/api';
import { useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MainsQuestion {
    question: string;
    answer: string;
}

interface MainsArticle extends Article {
    context?: string;
    questions?: MainsQuestion[];
    practice?: string;
    valueAdditions?: string;
    visualSummaryUrl?: string;
}

// ─── Visual Summary Modal ───────────────────────────────────────────────────

function VisualSummaryModal({
    imageUrl,
    title,
    onClose,
}: {
    imageUrl: string;
    title: string;
    onClose: () => void;
}) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="mains-modal-overlay"
            onClick={onClose}
        >
            <div
                className="mains-modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="mains-modal-close"
                    aria-label="Close"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Image */}
                <div className="mains-modal-image-wrap">
                    <img
                        src={imageUrl}
                        alt={`Visual Summary — ${title}`}
                        className="mains-modal-image"
                    />
                </div>

                {/* Title */}
                <p className="mains-modal-title">{title}</p>
            </div>
        </div>
    );
}

// ─── Q&A Accordion ──────────────────────────────────────────────────────────

function QAAccordion({ questions }: { questions: MainsQuestion[] }) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="mains-qa-section">
            <div className="mains-section-header">
                <span className="mains-section-icon">❓</span>
                <h2 className="mains-section-title">Questions & Answers</h2>
            </div>
            <div className="mains-accordion">
                {questions.map((qa, index) => (
                    <div
                        key={index}
                        className={`mains-accordion-item ${expandedIndex === index ? 'mains-accordion-item--active' : ''}`}
                    >
                        {/* Question header */}
                        <button
                            onClick={() => toggle(index)}
                            className="mains-accordion-header"
                        >
                            <span className="mains-accordion-number">Q{index + 1}</span>
                            <span className="mains-accordion-question">{qa.question}</span>
                            <span className={`mains-accordion-chevron ${expandedIndex === index ? 'mains-accordion-chevron--open' : ''}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                        </button>

                        {/* Answer panel */}
                        <div className={`mains-accordion-panel ${expandedIndex === index ? 'mains-accordion-panel--open' : ''}`}>
                            <div className="mains-accordion-answer">
                                <div
                                    className="mains-rich-content"
                                    dangerouslySetInnerHTML={{ __html: qa.answer }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page Component ────────────────────────────────────────────────────

function DailyMainsInner() {
    const searchParams = useSearchParams();
    const [selectedDate, setSelectedDate] = useState(() => {
        const paramDate = searchParams.get('date');
        if (paramDate) return paramDate;
        return new Date().toISOString().split('T')[0];
    });
    const [articles, setArticles] = useState<MainsArticle[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [adjacentDates, setAdjacentDates] = useState<{ previous: string | null; next: string | null }>({ previous: null, next: null });
    const [showVisualSummary, setShowVisualSummary] = useState(false);
    const pendingIndex = useRef<number | null>(null);

    // Update URL when date changes
    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('date', selectedDate);
        window.history.replaceState(null, '', url.toString());
    }, [selectedDate]);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const [articlesData, datesData] = await Promise.all([
                    getArticlesByDate('mains', selectedDate),
                    getAdjacentDates('mains', selectedDate)
                ]);
                setArticles(articlesData as MainsArticle[]);
                setAdjacentDates(datesData);

                if (pendingIndex.current !== null) {
                    setCurrentIndex(pendingIndex.current === -1 ? articlesData.length - 1 : pendingIndex.current);
                    pendingIndex.current = null;
                } else {
                    setCurrentIndex(0);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                setArticles([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [selectedDate]);

    const currentArticle = articles[currentIndex];

    // Check if current article has structured mains fields
    const isStructured = currentArticle && (
        currentArticle.context ||
        (currentArticle.questions && currentArticle.questions.length > 0) ||
        currentArticle.practice ||
        currentArticle.valueAdditions ||
        currentArticle.visualSummaryUrl
    );

    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (adjacentDates.previous) {
            pendingIndex.current = -1;
            setSelectedDate(adjacentDates.previous.split('T')[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentIndex, adjacentDates.previous]);

    const goToNext = useCallback(() => {
        if (currentIndex < articles.length - 1) {
            setCurrentIndex(currentIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (adjacentDates.next) {
            pendingIndex.current = 0;
            setSelectedDate(adjacentDates.next.split('T')[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentIndex, articles.length, adjacentDates.next]);

    return (
        <div className="ca-page pt-2">
            {/* DatePicker & Counter */}
            <div className="ca-header-inner">
                <div className="ca-header-row">
                    <DatePicker
                        selectedDate={new Date(selectedDate)}
                        onDateChange={(date) => setSelectedDate(date.toISOString().split('T')[0])}
                    />
                    {articles.length > 0 && (
                        <span className="ca-counter">
                            {currentIndex + 1} / {articles.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <main className="ca-main">
                {isLoading ? (
                    <div className="ca-loading">
                        <div className="ca-spinner" />
                    </div>
                ) : articles.length === 0 ? (
                    <div className="ca-empty">
                        <div className="ca-empty-icon">📝</div>
                        <h2 className="ca-empty-title">No mains content for this date</h2>
                        <p className="ca-empty-text">Try selecting a different date</p>
                        {adjacentDates.previous && (
                            <button
                                onClick={() => {
                                    pendingIndex.current = 0;
                                    setSelectedDate(adjacentDates.previous!.split('T')[0]);
                                }}
                                className="ca-latest-btn"
                            >
                                <svg className="ca-latest-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Go to latest article
                                <span className="ca-latest-btn-date">
                                    {new Date(adjacentDates.previous).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                                </span>
                            </button>
                        )}
                    </div>
                ) : currentArticle ? (
                    <div className="mains-article-wrapper">
                        {/* Title */}
                        <h1 className="mains-title">{currentArticle.title}</h1>

                        {isStructured ? (
                            <>
                                {/* Visual Summary Button */}
                                {currentArticle.visualSummaryUrl && (
                                    <button
                                        onClick={() => setShowVisualSummary(true)}
                                        className="mains-visual-summary-btn"
                                    >
                                        <span className="mains-visual-summary-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                            </svg>
                                        </span>
                                        <span className="mains-visual-summary-text">
                                            <span className="mains-visual-summary-label">Visual Summary</span>
                                            <span className="mains-visual-summary-hint">Tap to view mind map / infographic</span>
                                        </span>
                                        <span className="mains-visual-summary-arrow">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                            </svg>
                                        </span>
                                    </button>
                                )}

                                {/* Context */}
                                {currentArticle.context && (
                                    <div className="mains-context-section">
                                        <div className="mains-section-header">
                                            <span className="mains-section-icon">📋</span>
                                            <h2 className="mains-section-title">Context</h2>
                                        </div>
                                        <div className="mains-context-body">
                                            <div
                                                className="mains-rich-content"
                                                dangerouslySetInnerHTML={{ __html: currentArticle.context }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Q&A Accordion */}
                                {currentArticle.questions && currentArticle.questions.length > 0 && (
                                    <QAAccordion questions={currentArticle.questions} />
                                )}

                                {/* Source */}
                                {currentArticle.source && (
                                    <div className="mains-source">
                                        <span className="mains-source-icon">🔗</span>
                                        <span className="mains-source-label">Source: </span>
                                        <span className="mains-source-name">{currentArticle.source}</span>
                                    </div>
                                )}

                                {/* Tags */}
                                {currentArticle.tags && currentArticle.tags.length > 0 && (
                                    <div className="mains-tags">
                                        {currentArticle.tags.map((tag, idx) => (
                                            <Link
                                                key={tag}
                                                href={`/search?tag=${encodeURIComponent(tag)}`}
                                                className={`mains-tag ${idx === 0 ? 'mains-tag--primary' : ''}`}
                                            >
                                                {idx === 0 && <span className="mains-tag-icon">📄</span>}
                                                {tag}
                                                {idx === 0 && <span className="mains-tag-arrow">→</span>}
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* Practice */}
                                {currentArticle.practice && (
                                    <div className="mains-practice-section">
                                        <div className="mains-section-header">
                                            <span className="mains-section-icon">📝</span>
                                            <h2 className="mains-section-title">Practice</h2>
                                        </div>
                                        <div className="mains-practice-body">
                                            <div
                                                className="mains-rich-content"
                                                dangerouslySetInnerHTML={{ __html: currentArticle.practice }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Value Additions */}
                                {currentArticle.valueAdditions && (
                                    <div className="mains-value-section">
                                        <div className="mains-section-header">
                                            <span className="mains-section-icon">✨</span>
                                            <h2 className="mains-section-title">Value Additions</h2>
                                        </div>
                                        <div className="mains-value-body">
                                            <div
                                                className="mains-rich-content"
                                                dangerouslySetInnerHTML={{ __html: currentArticle.valueAdditions }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ── Legacy fallback: render content via RichTextRenderer ── */
                            <article className="ca-article-card">
                                {currentArticle.imageUrl && (
                                    <figure className="ca-hero-image">
                                        <img src={currentArticle.imageUrl} alt={currentArticle.title} />
                                    </figure>
                                )}
                                <RichTextRenderer content={currentArticle.content} />

                                {currentArticle.source && (
                                    <div className="mains-source" style={{ marginTop: '24px' }}>
                                        <span className="mains-source-icon">🔗</span>
                                        <span className="mains-source-label">Source: </span>
                                        <span className="mains-source-name">{currentArticle.source}</span>
                                    </div>
                                )}

                                {currentArticle.tags && currentArticle.tags.length > 0 && (
                                    <div className="mains-tags" style={{ marginTop: '16px' }}>
                                        {currentArticle.tags.map((tag, idx) => (
                                            <Link
                                                key={tag}
                                                href={`/search?tag=${encodeURIComponent(tag)}`}
                                                className={`mains-tag ${idx === 0 ? 'mains-tag--primary' : ''}`}
                                            >
                                                {tag}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </article>
                        )}

                        {/* CTA: Practice MCQs */}
                        <div className="ca-cta-section" style={{ marginTop: '24px' }}>
                            <Link href={`/daily-quiz?date=${selectedDate}`} className="ca-cta-card">
                                <div className="ca-cta-icon ca-cta-icon--quiz">📝</div>
                                <div className="ca-cta-content">
                                    <h3 className="ca-cta-title">Practice MCQs from today&apos;s CA</h3>
                                    <p className="ca-cta-subtitle">Test your understanding</p>
                                </div>
                                <span className="ca-cta-arrow">›</span>
                            </Link>
                        </div>

                        {/* Previous / Next Navigation */}
                        <div className="ca-nav">
                            <button
                                onClick={goToPrev}
                                disabled={!adjacentDates.previous && currentIndex === 0}
                                className="ca-nav-btn ca-nav-btn--prev"
                            >
                                ‹ Previous Article
                            </button>
                            <button
                                onClick={goToNext}
                                disabled={!adjacentDates.next && currentIndex === articles.length - 1}
                                className="ca-nav-btn ca-nav-btn--next"
                            >
                                Next Article ›
                            </button>
                        </div>
                    </div>
                ) : null}
            </main>

            {/* Visual Summary Modal */}
            {showVisualSummary && currentArticle?.visualSummaryUrl && (
                <VisualSummaryModal
                    imageUrl={currentArticle.visualSummaryUrl}
                    title={currentArticle.title}
                    onClose={() => setShowVisualSummary(false)}
                />
            )}
        </div>
    );
}

export default function DailyMainsPage() {
    return (
        <Suspense fallback={<div className="ca-loading"><div className="ca-spinner" /></div>}>
            <DailyMainsInner />
        </Suspense>
    );
}
