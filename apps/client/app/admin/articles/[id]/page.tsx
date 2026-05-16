'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import RichTextEditor from '../../../../components/admin/RichTextEditor';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const articleTypes = [
    { value: 'daily_prelims', label: 'Daily Prelims' },
    { value: 'mains', label: 'Mains' },
    { value: 'burning_issue', label: 'Burning Issue' },
];

const tagOptions = [
    'Polity', 'Economy', 'History', 'Geography', 'Science', 'Environment',
    'Current Affairs', 'Ethics', 'International Relations', 'Society',
    'Schemes', 'AYUSH', 'Defence', 'Agriculture', 'Education', 'Health',
];

interface QAPair {
    question: string;
    answer: string;
}

const EMPTY_QA: QAPair = { question: '', answer: '' };

export default function EditArticlePage() {
    const { token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [title, setTitle] = useState('');
    const [type, setType] = useState('daily_prelims');
    const [date, setDate] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [source, setSource] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [customTagInput, setCustomTagInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // ─── Mains-specific structured fields ─────────────────────────────────
    const [context, setContext] = useState('');
    const [practice, setPractice] = useState('');
    const [valueAdditions, setValueAdditions] = useState('');
    const [visualSummaryUrl, setVisualSummaryUrl] = useState('');
    const [qaPairs, setQaPairs] = useState<QAPair[]>([
        { ...EMPTY_QA }, { ...EMPTY_QA }, { ...EMPTY_QA },
        { ...EMPTY_QA }, { ...EMPTY_QA }, { ...EMPTY_QA },
    ]);

    const isMains = type === 'mains';

    const updateQA = (index: number, field: 'question' | 'answer', value: string) => {
        setQaPairs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    useEffect(() => {
        fetchArticle();
    }, [id, token]);

    const fetchArticle = async () => {
        if (!token || !id) return;

        try {
            const response = await fetch(`${API_URL}/api/articles/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (data.success) {
                const article = data.data;
                setTitle(article.title);
                setType(article.type);
                setDate(new Date(article.date).toISOString().split('T')[0]);
                setTags(article.tags || []);
                setContent(article.content || '');
                setSource(article.source || '');
                setImageUrl(article.imageUrl || '');

                // Populate Mains-specific fields if available
                if (article.type === 'mains') {
                    setContext(article.context || '');
                    setPractice(article.practice || '');
                    setValueAdditions(article.valueAdditions || '');
                    setVisualSummaryUrl(article.visualSummaryUrl || '');

                    // Populate Q&A pairs
                    if (article.questions && article.questions.length > 0) {
                        const pairs: QAPair[] = [];
                        for (let i = 0; i < 6; i++) {
                            if (article.questions[i]) {
                                pairs.push({
                                    question: article.questions[i].question || '',
                                    answer: article.questions[i].answer || '',
                                });
                            } else {
                                pairs.push({ ...EMPTY_QA });
                            }
                        }
                        setQaPairs(pairs);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch article:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Build request body
            const body: Record<string, unknown> = {
                title,
                type,
                date,
                tags,
                source,
                imageUrl: imageUrl || undefined,
            };

            if (isMains) {
                // Filter non-empty Q&A pairs
                const questions = qaPairs
                    .filter(qa => qa.question.trim() && qa.answer.trim())
                    .map(qa => ({ question: qa.question.trim(), answer: qa.answer.trim() }));

                body.context = context.trim() || undefined;
                body.questions = questions.length > 0 ? questions : undefined;
                body.practice = practice.trim() || undefined;
                body.valueAdditions = valueAdditions.trim() || undefined;
                body.visualSummaryUrl = visualSummaryUrl.trim() || undefined;

                // Build minimal content fallback (required field)
                const contentParts: string[] = [];
                if (context.trim()) contentParts.push(`<blockquote>${context.trim()}</blockquote>`);
                if (questions.length > 0) {
                    contentParts.push(`<h3>${questions[0].question}</h3>`);
                    contentParts.push(questions[0].answer);
                }
                body.content = contentParts.length > 0 ? contentParts.join('\n') : `<p>${title}</p>`;
            } else {
                body.content = content;
            }

            const response = await fetch(`${API_URL}/api/articles/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin/articles');
            } else {
                setError(data.message || 'Failed to update article');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTag = (tag: string) => {
        setTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const addCustomTag = () => {
        const tag = customTagInput.trim();
        if (tag && !tags.includes(tag)) {
            setTags(prev => [...prev, tag]);
        }
        setCustomTagInput('');
    };

    const removeTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Edit Article</h1>
                <p className="text-gray-600 mt-1">Update article content and metadata</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Title */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>

                {/* Type, Date, Source & Image */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Article Type *
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            {articleTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Publication Date *
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Source
                        </label>
                        <input
                            type="text"
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            placeholder="e.g. The Hindu, Indian Express"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {isMains ? 'Visual Summary Image URL' : 'Featured Image URL'}
                        </label>
                        <input
                            type="text"
                            value={isMains ? visualSummaryUrl : imageUrl}
                            onChange={(e) => isMains ? setVisualSummaryUrl(e.target.value) : setImageUrl(e.target.value)}
                            placeholder="Paste image URL or Google Drive link"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        {(isMains ? visualSummaryUrl : imageUrl) && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                                <img
                                    src={isMains ? visualSummaryUrl : imageUrl}
                                    alt="Preview"
                                    className="w-full max-h-40 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tagOptions.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tags.includes(tag)
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    {/* Custom tag input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                            placeholder="Add custom tag…"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <button
                            type="button"
                            onClick={addCustomTag}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            + Add
                        </button>
                    </div>
                    {/* Show non-preset tags as removable chips */}
                    {tags.filter(t => !tagOptions.includes(t)).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500 self-center">Custom:</span>
                            {tags.filter(t => !tagOptions.includes(t)).map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="text-blue-400 hover:text-blue-600 ml-0.5">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── MAINS: Structured Fields ──────────────────────────────── */}
                {isMains ? (
                    <>
                        {/* Context */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-amber-500">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📋 Context
                            </label>
                            <p className="text-sm text-gray-500 mb-3">
                                Background context for the topic. Supports HTML formatting.
                            </p>
                            <textarea
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                rows={4}
                                placeholder="Enter the context / background information..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Q&A Pairs */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-blue-500">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ❓ Questions & Answers
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                                Up to 6 Q&A pairs. Empty pairs will be skipped. Answers support HTML.
                            </p>
                            <div className="space-y-5">
                                {qaPairs.map((qa, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold">
                                                Q{index + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-700">Question {index + 1}</span>
                                            {qa.question.trim() && qa.answer.trim() && (
                                                <span className="ml-auto text-xs text-green-600 font-medium">✓ Complete</span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={qa.question}
                                            onChange={(e) => updateQA(index, 'question', e.target.value)}
                                            placeholder={`Question ${index + 1}...`}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3"
                                        />
                                        <textarea
                                            value={qa.answer}
                                            onChange={(e) => updateQA(index, 'answer', e.target.value)}
                                            rows={3}
                                            placeholder={`Answer ${index + 1}... (HTML supported)`}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Practice */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-teal-500">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📝 Practice
                            </label>
                            <p className="text-sm text-gray-500 mb-3">
                                Practice questions or prompts for the student. HTML supported.
                            </p>
                            <textarea
                                value={practice}
                                onChange={(e) => setPractice(e.target.value)}
                                rows={3}
                                placeholder="Enter practice content..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Value Additions */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-orange-500">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ✨ Value Additions
                            </label>
                            <p className="text-sm text-gray-500 mb-3">
                                Extra value-add content, quotes, data, or facts. HTML supported.
                            </p>
                            <textarea
                                value={valueAdditions}
                                onChange={(e) => setValueAdditions(e.target.value)}
                                rows={3}
                                placeholder="Enter value additions..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </>
                ) : (
                    /* ─── DEFAULT: Rich Text Editor (Prelims / Burning Issue) ── */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Content *
                        </label>
                        <p className="text-sm text-gray-500 mb-3">
                            Use the toolbar to format content: headings for sections, blockquote for &quot;Context&quot; blocks, bullet lists for points, and insert images via URL.
                        </p>
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                            placeholder="Start writing your article content..."
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/articles')}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
