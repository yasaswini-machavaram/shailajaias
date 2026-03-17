import dynamic from 'next/dynamic';

// Disable SSR for the PDF viewer entirely — pdfjs-dist requires browser APIs
const PdfViewerClient = dynamic(() => import('./PdfViewerClient'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-gray-900">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400"></div>
        </div>
    ),
});

export default function ReaderPage() {
    return <PdfViewerClient />;
}
