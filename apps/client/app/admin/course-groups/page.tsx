'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectCourseGroupsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/courses');
    }, [router]);

    return (
        <div className="flex justify-center items-center py-20 font-body text-slate-500">
            <p>Redirecting to Unified Courses &amp; Bundles CMS...</p>
        </div>
    );
}
