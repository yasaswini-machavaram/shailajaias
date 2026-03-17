'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ImagePreview {
    file: File;
    preview: string;
    id: string;
}

export default function NewBurningIssuePage() {
    const { token } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [topic, setTopic] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [images, setImages] = useState<ImagePreview[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleFilesSelected = (files: FileList | null) => {
        if (!files) return;

        const newImages: ImagePreview[] = [];
        const errors: string[] = [];

        Array.from(files).forEach((file) => {
            // Validate type
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                errors.push(`${file.name}: Only JPG, PNG, WebP allowed`);
                return;
            }
            // Validate size
            if (file.size > 5 * 1024 * 1024) {
                errors.push(`${file.name}: Exceeds 5MB limit`);
                return;
            }

            newImages.push({
                file,
                preview: URL.createObjectURL(file),
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            });
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
        }

        setImages((prev) => [...prev, ...newImages]);
    };

    const removeImage = (id: string) => {
        setImages((prev) => {
            const img = prev.find((i) => i.id === id);
            if (img) URL.revokeObjectURL(img.preview);
            return prev.filter((i) => i.id !== id);
        });
    };

    // Drag-and-drop reorder
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const reordered = [...images];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(index, 0, moved);
        setImages(reordered);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (images.length === 0) {
            setError('Please add at least one image');
            return;
        }

        if (!topic.trim()) {
            setError('Please enter a topic');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('topic', topic);
            formData.append('date', date);

            // Append images in display order
            images.forEach((img) => {
                formData.append('images', img.file);
            });

            const response = await fetch(`${API_URL}/api/burning-issues`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                router.push('/admin/burning-issues');
            } else {
                setError(data.message || 'Failed to create burning issue');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Create Burning Issue</h1>
                <p className="text-gray-600 mt-1">Upload images to create an image-based burning issue carousel</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 whitespace-pre-line">
                        {error}
                    </div>
                )}

                {/* Topic & Date */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Topic *
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            required
                            placeholder="e.g., New Labour Codes"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Image Format Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h3 className="font-semibold text-blue-900 mb-2">📸 Image Upload Guidelines</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm text-blue-700">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                            <span><b>Format:</b> JPG, PNG, WebP</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                            <span><b>Max Size:</b> 5MB per image</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                            <span><b>Best:</b> 1080×1920px (9:16)</span>
                        </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                        💡 Drag images to reorder them. Image #1 will be the cover displayed in the list.
                    </p>
                </div>

                {/* Image Upload Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Images * ({images.length} added)
                    </label>

                    {/* Upload drop zone */}
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-amber-400', 'bg-amber-50'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-amber-400', 'bg-amber-50'); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-amber-400', 'bg-amber-50');
                            handleFilesSelected(e.dataTransfer.files);
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            multiple
                            onChange={(e) => handleFilesSelected(e.target.files)}
                            className="hidden"
                        />
                        <div className="text-gray-500">
                            <span className="text-5xl">📷</span>
                            <p className="mt-3 font-medium">Click or drag images here</p>
                            <p className="text-sm">JPG, PNG, WebP • Max 5MB each</p>
                        </div>
                    </div>

                    {/* Image Previews — Reorderable */}
                    {images.length > 0 && (
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            {images.map((img, index) => (
                                <div
                                    key={img.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`relative group rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index
                                        ? 'border-amber-500 opacity-50 scale-95'
                                        : 'border-gray-200 hover:border-amber-300'
                                        }`}
                                >
                                    {/* Order badge */}
                                    <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-black/70 text-white text-sm font-bold rounded-full flex items-center justify-center">
                                        {index + 1}
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                        className="absolute top-2 right-2 z-10 w-7 h-7 bg-red-500 text-white text-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ✕
                                    </button>

                                    <img
                                        src={img.preview}
                                        alt={`Slide ${index + 1}`}
                                        className="w-full aspect-[9/16] object-cover"
                                    />

                                    <div className="p-2 bg-gray-50 text-xs text-gray-500 truncate">
                                        {img.file.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Burning Issue'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/burning-issues')}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
