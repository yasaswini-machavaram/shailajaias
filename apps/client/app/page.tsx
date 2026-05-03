'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BurningIssuesGallery } from '@/components';
import { getBurningIssuesList, getMagazines, type BurningIssue, type Magazine } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [burningIssues, setBurningIssues] = useState<BurningIssue[]>([]);
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [issuesData, magsData] = await Promise.all([
          getBurningIssuesList(),
          getMagazines()
        ]);
        setBurningIssues(issuesData || []);
        // Only show first 5 magazines for the home page grid
        setMagazines(magsData?.slice(0, 5) || []);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const dailyUpdates = [
    { title: 'Daily Prelims', href: '/daily-prelims', icon: '/images/icons/daily_prelims.png' },
    { title: 'Daily Mains', href: '/daily-mains', icon: '/images/icons/daily_mains.png' },
    { title: 'Daily Quiz', href: '/daily-quiz', icon: '/images/icons/daily_quiz.png' },
  ];

  const resources = [
    { title: 'Magazines', href: '/magazines', icon: '/images/icons/magazines.png' },
    { title: 'CA Videos', href: '/ca-videos', icon: '/images/icons/ca_videos.png' },
    { title: 'Browse Topic', href: '/topics', icon: '/images/icons/browse_topic.png' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
      {/* Main Content — pt-16 accounts for global fixed Header */}
      <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">

        {/* Daily Updates Section */}
        <section className="animate-fade-in-up">
          <h2 className="text-[11px] font-bold text-[#64748B] mb-4 tracking-[0.2em] uppercase">
            Daily Updates
          </h2>
          <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-white/50 flex items-center justify-between gap-2 md:gap-8">
            {dailyUpdates.map((item, idx) => (
              <button
                key={idx}
                onClick={() => router.push(item.href)}
                className="flex flex-col items-center gap-3 group flex-1"
              >
                <div className="relative w-16 h-16 md:w-32 md:h-32 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                  <Image
                    src={item.icon}
                    alt={item.title}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-[10px] md:text-[15px] font-bold text-[#1E3A5F] text-center leading-tight tracking-tight uppercase group-hover:text-[#D97706] transition-colors">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Resources Section */}
        <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-[11px] font-bold text-[#64748B] mb-4 tracking-[0.2em] uppercase">
            Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map((item, idx) => (
              <button
                key={idx}
                onClick={() => router.push(item.href)}
                className="w-full bg-white rounded-2xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-white/60 flex items-center gap-5 group hover:shadow-lg hover:border-[#EEF2FF] transition-all text-left"
              >
                <div className="relative w-14 h-14 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <Image
                    src={item.icon}
                    alt={item.title}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-[15px] md:text-[18px] font-bold text-[#1E3A5F] tracking-tight uppercase group-hover:text-[#D97706] transition-colors">
                  {item.title}
                </span>
                <div className="ml-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#EEF2FF] transition-all">
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-[#1E3A5F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Burning Issues Section */}
        <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] font-bold text-[#64748B] tracking-[0.2em] uppercase">
              Burning Issues
            </h2>
            <button
              onClick={() => router.push('/burning-issues')}
              className="px-4 py-1.5 rounded-full bg-[#EEF2FF] text-[11px] font-bold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition-all uppercase tracking-widest"
            >
              View All
            </button>
          </div>
          <BurningIssuesGallery issues={burningIssues} />
        </section>

        {/* Latest Magazines */}
        <section className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] font-bold text-[#64748B] tracking-[0.2em] uppercase">
              Latest Magazines
            </h2>
            <button
              onClick={() => router.push('/magazines')}
              className="px-4 py-1.5 rounded-full bg-[#EEF2FF] text-[11px] font-bold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition-all uppercase tracking-widest"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {(magazines.length > 0 ? magazines : Array.from({ length: 5 })).map((mag, idx) => {
              const isMagazineObject = mag && typeof mag === 'object' && '_id' in mag;
              const magazine = isMagazineObject ? (mag as Magazine) : null;

              return (
                <div
                  key={isMagazineObject ? magazine!._id : idx}
                  onClick={() => isMagazineObject && router.push('/magazines')}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[3/4.2] bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2 group-active:scale-95 group-active:translate-y-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAF8] via-[#FAFAF8] to-[#1E3A5F]/5 flex items-center justify-center p-4">
                      <div className="text-center space-y-4 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="mx-auto w-12 h-12 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-white shadow-sm">
                          <svg className="w-6 h-6 text-slate-400 group-hover:text-[#1E3A5F] group-hover:rotate-12 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em]">Mag Edition</p>
                      </div>
                    </div>
                    {/* Subtle gloss effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="mt-3.5 text-[12px] md:text-[14px] font-bold text-[#1E3A5F] line-clamp-1 group-hover:text-[#D97706] transition-colors uppercase tracking-tight">
                    {isMagazineObject ? magazine!.title : `Magazine v.${idx + 1}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
