'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function PdfViewerClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);

    const rawUrl = searchParams.get('url') || '';
    const title = searchParams.get('title') || 'Magazine';
    const pdfUrl = getFullUrl(decodeURIComponent(rawUrl));

    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    }, []);

    const onDocumentLoadError = useCallback((err: Error) => {
        console.error('PDF load error:', err);
        setError('Could not load PDF.');
        setIsLoading(false);
    }, []);

    const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const goToPrev = () => { setCurrentPage((p) => Math.max(1, p - 1)); scrollToTop(); };
    const goToNext = () => { setCurrentPage((p) => Math.min(numPages, p + 1)); scrollToTop(); };
    const zoomIn = () => setScale((s) => Math.min(2.5, parseFloat((s + 0.25).toFixed(2))));
    const zoomOut = () => setScale((s) => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))));

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* App Header - Breadcrumb bar like VisionIAS */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    {/* Breadcrumb */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors min-w-0"
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-medium whitespace-nowrap">Current Affairs</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-medium whitespace-nowrap">Magazines</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-semibold text-blue-600 truncate">{decodeURIComponent(title)}</span>
                    </button>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Zoom */}
                        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                            <button
                                onClick={zoomOut}
                                disabled={scale <= 0.5}
                                className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 font-bold text-base w-5 h-5 flex items-center justify-center"
                            >−</button>
                            <span className="text-gray-700 text-xs font-semibold min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                            <button
                                onClick={zoomIn}
                                disabled={scale >= 2.5}
                                className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 font-bold text-base w-5 h-5 flex items-center justify-center"
                            >+</button>
                        </div>

                        {/* Download */}
                        <a
                            href={pdfUrl}
                            download={`${decodeURIComponent(title)}.pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </a>

                        {/* Full screen open */}
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            {/* PDF Viewer Box */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* PDF toolbar strip */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                            </svg>
                            <span className="font-medium text-gray-700 truncate max-w-xs">{decodeURIComponent(title)}</span>
                            {numPages > 0 && (
                                <span className="text-gray-400">• {numPages} pages</span>
                            )}
                        </div>
                        {numPages > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToPrev}
                                    disabled={currentPage <= 1}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min={1}
                                        max={numPages}
                                        value={currentPage}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            if (v >= 1 && v <= numPages) { setCurrentPage(v); scrollToTop(); }
                                        }}
                                        className="w-12 text-center border border-gray-300 rounded-md text-sm px-1.5 py-1 focus:outline-none focus:border-blue-400"
                                    />
                                    <span className="text-gray-400 text-sm">/ {numPages}</span>
                                </div>
                                <button
                                    onClick={goToNext}
                                    disabled={currentPage >= numPages}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* PDF canvas container */}
                    <div
                        ref={scrollRef}
                        className="overflow-auto bg-gray-100 flex flex-col items-center py-8 px-4"
                        style={{ minHeight: '75vh', maxHeight: '80vh' }}
                    >
                        {isLoading && !error && (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                                <p className="text-gray-500 text-sm">Loading PDF…</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                                <p className="text-red-500 text-lg">⚠️ {error}</p>
                                <a
                                    href={pdfUrl}
                                    download
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
                                >
                                    Download instead
                                </a>
                            </div>
                        )}

                        {!error && (
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading=""
                            >
                                <Page
                                    pageNumber={currentPage}
                                    scale={scale}
                                    renderTextLayer
                                    renderAnnotationLayer
                                    className="shadow-lg rounded-lg overflow-hidden"
                                />
                            </Document>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
