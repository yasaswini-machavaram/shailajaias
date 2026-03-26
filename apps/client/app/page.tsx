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
    { title: 'Browse Topic', href: '/topics', icon: '/images/icons/browse_topic.png' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24 font-body">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center px-4 md:px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="w-8 md:hidden" />
          <h1 className="text-[17px] md:text-[20px] font-bold text-[#1E3A5F] tracking-[0.05em] uppercase font-headline">
            Current Affairs
          </h1>
          <button
            onClick={() => router.push('/search')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} className="w-5 h-5 stroke-gray-500 group-hover:stroke-[#D97706] transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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


      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 flex items-center justify-around h-[80px] px-2 md:hidden z-50">
        {[
          { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', href: '/' },
          { icon: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z', label: 'Search', href: '/search' },
          { icon: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z', label: 'Quiz', href: '/daily-quiz' },
          { icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25', label: 'Books', href: '/magazines' },
          { icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z', label: 'User', href: '/profile' }
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all group ${item.href === '/' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${item.href === '/' ? 'bg-blue-50 shadow-sm' : 'group-hover:bg-slate-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={item.href === '/' ? 2.5 : 2} stroke="currentColor" className="w-5.5 h-5.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <span className="text-[10px] font-black tracking-[0.05em] uppercase">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
