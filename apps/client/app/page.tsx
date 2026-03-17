'use client';

import { useState } from 'react';
import {
  Header,
  SearchBar,
  QuickAccessCard,
  PrelimsIcon,
  MainsIcon,
  QuizIcon,
  MagazineIcon,
  VideoIcon,
  TopicIcon,
  BurningIssuesGallery,
} from '@/components';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
        {/* Search Bar */}
        <section className="mb-8 animate-fade-in-up">
          <SearchBar />
        </section>

        {/* Daily Updates Section */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 tracking-tight">
            DAILY UPDATES
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickAccessCard
              title="Daily Prelims"
              href="/daily-prelims"
              icon={<PrelimsIcon />}
              color="#f5a623"
            />
            <QuickAccessCard
              title="Daily Mains"
              href="/daily-mains"
              icon={<MainsIcon />}
              color="#f5a623"
            />
            <QuickAccessCard
              title="Daily Quiz"
              href="/daily-quiz"
              icon={<QuizIcon />}
              color="#f5a623"
            />
          </div>
        </section>

        {/* Resources Section */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 tracking-tight">
            RESOURCES
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickAccessCard
              title="Magazines"
              href="/magazines"
              icon={<MagazineIcon />}
              color="#1a73e8"
            />
            <QuickAccessCard
              title="Videos"
              href="/videos"
              icon={<VideoIcon />}
              color="#1a73e8"
            />
            <QuickAccessCard
              title="Browse Topic"
              href="/topics"
              icon={<TopicIcon />}
              color="#e8453c"
            />
          </div>
        </section>

        {/* Burning Issues Gallery */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
              BURNING ISSUES
            </h2>
            <a
              href="/burning-issues"
              className="text-sm font-medium text-[var(--secondary)] hover:underline"
            >
              View All
            </a>
          </div>
          <BurningIssuesGallery issues={[]} />
        </section>

        {/* Latest Magazines */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
              LATEST MAGAZINES
            </h2>
            <a
              href="/magazines"
              className="text-sm font-medium text-[var(--secondary)] hover:underline"
            >
              View All
            </a>
          </div>
          <a
            href="/magazines"
            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Browse All Magazines</p>
                <p className="text-sm text-gray-500">Prelims Monthly • Mains Monthly • MCQ Monthly • Quarterly</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </section>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-[var(--card-border)] md:hidden">
        <div className="flex items-center justify-around h-16">
          <a href="/" className="flex flex-col items-center gap-1 text-[var(--primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <a href="/daily-prelims" className="flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
            <span className="text-[10px] font-medium">News</span>
          </a>
          <a href="/daily-quiz" className="flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            <div className="relative">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium">Quiz</span>
          </a>
          <a href="/magazines" className="flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <span className="text-[10px] font-medium">Magazines</span>
          </a>
          <a href="/profile" className="flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span className="text-[10px] font-medium">Profile</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
