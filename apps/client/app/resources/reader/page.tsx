import { Suspense } from 'react';
import PdfViewerClient from './PdfViewerClient';

export default function ResourceReaderPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1E3A5F]"></div>
                </div>
            }
        >
            <PdfViewerClient />
        </Suspense>
    );
}
