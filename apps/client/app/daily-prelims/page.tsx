'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DatePicker from '@/components/DatePicker';
import TagChips from '@/components/TagChips';
import RichTextRenderer from '@/components/RichTextRenderer';
import { getArticlesByDate, getAdjacentDates, formatDate, type Article } from '@/lib/api';
import { useRef } from 'react';

function DailyPrelimsInner() {
    const searchParams = useSearchParams();
    const [selectedDate, setSelectedDate] = useState(() => {
        const paramDate = searchParams.get('date');
        if (paramDate) return paramDate;
        return new Date().toISOString().split('T')[0];
    });
    const [articles, setArticles] = useState<Article[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [adjacentDates, setAdjacentDates] = useState<{ previous: string | null; next: string | null }>({ previous: null, next: null });
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
                    getArticlesByDate('daily_prelims', selectedDate),
                    getAdjacentDates('daily_prelims', selectedDate)
                ]);
                setArticles(articlesData);
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

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (adjacentDates.previous) {
            pendingIndex.current = -1; // Last article of previous day
            setSelectedDate(adjacentDates.previous.split('T')[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToNext = () => {
        if (currentIndex < articles.length - 1) {
            setCurrentIndex(currentIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (adjacentDates.next) {
            pendingIndex.current = 0; // First article of next day
            setSelectedDate(adjacentDates.next.split('T')[0]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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
                        <div className="ca-empty-icon">📰</div>
                        <h2 className="ca-empty-title">No articles for this date</h2>
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
                    <div className="ca-article-wrapper">
                        {/* Article Card */}
                        <article className="ca-article-card">
                            {/* Title */}
                            <h1 className="ca-article-title">{currentArticle.title}</h1>

                            {/* Hero Image */}
                            {currentArticle.imageUrl && (
                                <figure className="ca-hero-image">
                                    <img src={currentArticle.imageUrl} alt={currentArticle.title} />
                                </figure>
                            )}

                            {/* Content */}
                            <RichTextRenderer content={currentArticle.content} />
                        </article>

                        {/* Source */}
                        {currentArticle.source && (() => {
                            const src = currentArticle.source!;
                            const name = typeof src === 'string' ? src : src.name;
                            const url = typeof src === 'object' ? src.url : null;
                            return (
                                <div className="ca-source">
                                    <span className="ca-source-icon">🔗</span>
                                    <span className="ca-source-label">Source: </span>
                                    {url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="ca-source-name ca-source-link">{name}</a>
                                    ) : (
                                        <span className="ca-source-name">{name}</span>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Tags */}
                        {currentArticle.tags && currentArticle.tags.length > 0 && (
                            <div className="ca-tags">
                                {currentArticle.tags.map((tag, idx) => (
                                    <Link
                                        key={tag}
                                        href={`/search?tag=${encodeURIComponent(tag)}`}
                                        className={`ca-tag ${idx === 0 ? 'ca-tag--primary' : ''}`}
                                    >
                                        {idx === 0 && <span className="ca-tag-icon">📄</span>}
                                        {tag}
                                        {idx === 0 && <span className="ca-tag-arrow">→</span>}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* CTA Buttons */}
                        <div className="ca-cta-section">
                            <Link href={`/daily-quiz?date=${selectedDate}`} className="ca-cta-card">
                                <div className="ca-cta-icon ca-cta-icon--quiz">📝</div>
                                <div className="ca-cta-content">
                                    <h3 className="ca-cta-title">Practice MCQs from today&apos;s CA</h3>
                                    <p className="ca-cta-subtitle">Test your understanding</p>
                                </div>
                                <span className="ca-cta-arrow">›</span>
                            </Link>

                            <Link href={`/daily-mains?date=${selectedDate}`} className="ca-cta-card">
                                <div className="ca-cta-icon ca-cta-icon--mains">✏️</div>
                                <div className="ca-cta-content">
                                    <h3 className="ca-cta-title">Read Mains Analysis</h3>
                                    <p className="ca-cta-subtitle">Detailed editorial perspective</p>
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
        </div>
    );
}

export default function DailyPrelimsPage() {
    return (
        <Suspense fallback={<div className="ca-loading"><div className="ca-spinner" /></div>}>
            <DailyPrelimsInner />
        </Suspense>
    );
}
