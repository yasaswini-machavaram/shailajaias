'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DatePicker from '@/components/DatePicker';
import TagChips from '@/components/TagChips';
import RichTextRenderer from '@/components/RichTextRenderer';
import { getArticlesByDate, formatDate, type Article } from '@/lib/api';

export default function DailyPrelimsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [articles, setArticles] = useState<Article[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchArticles();
    }, [selectedDate]);

    const fetchArticles = async () => {
        setIsLoading(true);
        try {
            const data = await getArticlesByDate('daily_prelims', formatDate(selectedDate));
            setArticles(data);
            setCurrentIndex(0);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
            setArticles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const currentArticle = articles[currentIndex];

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToNext = () => {
        if (currentIndex < articles.length - 1) {
            setCurrentIndex(currentIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="ca-page">
            {/* Breadcrumb Header */}
            <header className="ca-header">
                <div className="ca-header-inner">
                    <p className="ca-breadcrumb">
                        Current Affairs → <span className="ca-breadcrumb-active">Daily Prelims</span>
                    </p>
                    <div className="ca-header-row">
                        <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
                        {articles.length > 0 && (
                            <span className="ca-counter">
                                {currentIndex + 1} / {articles.length}
                            </span>
                        )}
                    </div>
                </div>
            </header>

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
                    </div>
                ) : currentArticle ? (
                    <div className="ca-article-wrapper">
                        {/* Article Card */}
                        <article className="ca-article-card">
                            {/* Title */}
                            <h1 className="ca-article-title">{currentArticle.title}</h1>

                            {/* Content */}
                            <RichTextRenderer content={currentArticle.content} />
                        </article>

                        {/* Source */}
                        {currentArticle.source && (
                            <div className="ca-source">
                                <span className="ca-source-icon">🔗</span>
                                <span className="ca-source-label">Source: </span>
                                <span className="ca-source-name">{currentArticle.source}</span>
                            </div>
                        )}

                        {/* Tags */}
                        {currentArticle.tags && currentArticle.tags.length > 0 && (
                            <div className="ca-tags">
                                {currentArticle.tags.map((tag, idx) => (
                                    <span
                                        key={tag}
                                        className={`ca-tag ${idx === 0 ? 'ca-tag--primary' : ''}`}
                                    >
                                        {idx === 0 && <span className="ca-tag-icon">📄</span>}
                                        {tag}
                                        {idx === 0 && <span className="ca-tag-arrow">→</span>}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* CTA Buttons */}
                        <div className="ca-cta-section">
                            <Link href="/daily-quiz" className="ca-cta-card">
                                <div className="ca-cta-icon ca-cta-icon--quiz">📝</div>
                                <div className="ca-cta-content">
                                    <h3 className="ca-cta-title">Practice MCQs from today&apos;s CA</h3>
                                    <p className="ca-cta-subtitle">Test your understanding</p>
                                </div>
                                <span className="ca-cta-arrow">›</span>
                            </Link>

                            <Link href="/daily-mains" className="ca-cta-card">
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
                                disabled={currentIndex === 0}
                                className="ca-nav-btn ca-nav-btn--prev"
                            >
                                ‹ Previous Article
                            </button>
                            <button
                                onClick={goToNext}
                                disabled={currentIndex === articles.length - 1}
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
