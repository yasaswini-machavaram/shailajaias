'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewArticlePage() {
    const { token } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [type, setType] = useState('daily_prelims');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [source, setSource] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [customTagInput, setCustomTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!content || content === '{"type":"doc","content":[{"type":"paragraph"}]}') {
            setError('Content is required. Please write some article content.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/api/articles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, type, date, tags, content, source, imageUrl: imageUrl || undefined }),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin/articles');
            } else {
                setError(data.message || 'Failed to create article');
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

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Create New Article</h1>
                <p className="text-gray-600 mt-1">Add a new article to the UPSC content library</p>
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
                        placeholder="Enter article title..."
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
                            Featured Image URL
                        </label>
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Paste image URL or Google Drive link"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        {imageUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                                <img
                                    src={imageUrl}
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

                {/* Content - Rich Text Editor */}
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
                        placeholder="Start writing your article content... Use H2 for section headers, blockquote for context, bullet lists for points."
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Article'}
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
